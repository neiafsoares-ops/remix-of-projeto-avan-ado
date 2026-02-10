import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { GroupStandingsTable } from './GroupStandingsTable';
import { ChevronLeft, ChevronRight, Target, Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image: string | null;
  away_team_image: string | null;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  prediction_deadline: string;
  is_finished: boolean;
  round_id: string;
}

interface Round {
  id: string;
  name: string | null;
  round_number: number;
}

interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
  points_earned: number | null;
}

interface CupFormatViewProps {
  rounds: Round[];
  matches: Match[];
  predictions: Record<string, Prediction>;
  selectedRoundIndex: number;
  onRoundChange: (index: number) => void;
  isParticipant: boolean;
  onPredictionChange: (matchId: string, homeScore: number, awayScore: number) => Promise<void> | void;
  onGroupComplete?: (groupName: string, matchCount: number) => void;
}

// Utility to calculate group standings from matches
function calculateGroupStandings(
  matches: Match[], 
  groupName: string
): Array<{
  position: number;
  teamName: string;
  teamImage?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  percentage: number;
}> {
  const teams: Record<string, {
    teamName: string;
    teamImage?: string | null;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
  }> = {};

  // Only use finished matches
  const finishedMatches = matches.filter(m => m.is_finished && m.home_score !== null && m.away_score !== null);

  finishedMatches.forEach((match) => {
    // Initialize teams if not exists
    if (!teams[match.home_team]) {
      teams[match.home_team] = {
        teamName: match.home_team,
        teamImage: match.home_team_image,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
      };
    }
    if (!teams[match.away_team]) {
      teams[match.away_team] = {
        teamName: match.away_team,
        teamImage: match.away_team_image,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
      };
    }

    const homeTeam = teams[match.home_team];
    const awayTeam = teams[match.away_team];
    const homeScore = match.home_score!;
    const awayScore = match.away_score!;

    homeTeam.played++;
    awayTeam.played++;
    homeTeam.goalsFor += homeScore;
    homeTeam.goalsAgainst += awayScore;
    awayTeam.goalsFor += awayScore;
    awayTeam.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeTeam.won++;
      awayTeam.lost++;
    } else if (awayScore > homeScore) {
      awayTeam.won++;
      homeTeam.lost++;
    } else {
      homeTeam.drawn++;
      awayTeam.drawn++;
    }
  });

  // Also add teams from non-finished matches
  matches.forEach((match) => {
    if (!teams[match.home_team]) {
      teams[match.home_team] = {
        teamName: match.home_team,
        teamImage: match.home_team_image,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
      };
    }
    if (!teams[match.away_team]) {
      teams[match.away_team] = {
        teamName: match.away_team,
        teamImage: match.away_team_image,
        played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
      };
    }
  });

  // Calculate standings
  const standings = Object.values(teams).map((team) => {
    const points = team.won * 3 + team.drawn;
    const goalDifference = team.goalsFor - team.goalsAgainst;
    const percentage = team.played > 0 ? Math.round((points / (team.played * 3)) * 100) : 0;

    return {
      ...team,
      points,
      goalDifference,
      percentage,
      position: 0, // Will be set after sorting
    };
  });

  // Sort by points, then goal difference, then goals for
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Assign positions
  standings.forEach((team, index) => {
    team.position = index + 1;
  });

  return standings;
}

// Calculate number of matches per round based on team count
// n teams play (n-1) rounds with n/2 matches each round
function calculateMatchesPerRound(teamCount: number): number {
  if (teamCount <= 2) return 1;
  return Math.floor(teamCount / 2);
}

export function CupFormatView({
  rounds,
  matches,
  predictions,
  selectedRoundIndex,
  onRoundChange,
  isParticipant,
  onPredictionChange,
  onGroupComplete,
}: CupFormatViewProps) {
  const [localPredictions, setLocalPredictions] = useState<Record<string, { home: string; away: string }>>({});
  const [groupRoundSelection, setGroupRoundSelection] = useState<Record<string, number>>({});
  const [notifiedGroups, setNotifiedGroups] = useState<Set<string>>(new Set());
  const [saveStatuses, setSaveStatuses] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const savedScores = useRef<Record<string, { home: string; away: string }>>({});

  // Reset local predictions when the predictions prop changes (e.g., ticket switch)
  useEffect(() => {
    setLocalPredictions({});
    setSaveStatuses({});
    // Rebuild savedScores from current predictions
    const newSaved: Record<string, { home: string; away: string }> = {};
    Object.entries(predictions).forEach(([matchId, pred]) => {
      newSaved[matchId] = { home: pred.home_score.toString(), away: pred.away_score.toString() };
    });
    savedScores.current = newSaved;
  }, [predictions]);

  // Debounced auto-save function
  const debouncedSave = useCallback((matchId: string, home: string, away: string, groupName?: string) => {
    if (debounceTimers.current[matchId]) {
      clearTimeout(debounceTimers.current[matchId]);
    }

    const homeNum = parseInt(home);
    const awayNum = parseInt(away);
    if (isNaN(homeNum) || isNaN(awayNum) || homeNum < 0 || awayNum < 0 || homeNum > 99 || awayNum > 99) return;

    const prev = savedScores.current[matchId];
    if (prev && prev.home === home && prev.away === away) return;

    setSaveStatuses(s => ({ ...s, [matchId]: 'saving' }));

    debounceTimers.current[matchId] = setTimeout(async () => {
      try {
        await onPredictionChange(matchId, homeNum, awayNum);
        savedScores.current[matchId] = { home, away };
        setSaveStatuses(s => ({ ...s, [matchId]: 'saved' }));
        setTimeout(() => setSaveStatuses(s => ({ ...s, [matchId]: 'idle' })), 2000);

        if (groupName) {
          const updatedPredictions = {
            ...predictions,
            [matchId]: { match_id: matchId, home_score: homeNum, away_score: awayNum, points_earned: null }
          };
          checkGroupCompletion(groupName, matchId, updatedPredictions);
        }
      } catch (err) {
        console.error('Error saving prediction:', err);
        setSaveStatuses(s => ({ ...s, [matchId]: 'error' }));
      }
    }, 800);
  }, [onPredictionChange, predictions]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  const renderSaveStatus = (matchId: string) => {
    const status = saveStatuses[matchId];
    if (!status || status === 'idle') return null;
    if (status === 'saving') {
      return (
        <div className="flex items-center gap-1 text-muted-foreground mt-1 justify-center">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-xs">Salvando...</span>
        </div>
      );
    }
    if (status === 'saved') {
      return (
        <div className="flex items-center gap-1 text-green-600 mt-1 justify-center">
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-xs">Salvo</span>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="flex items-center gap-1 text-destructive mt-1 justify-center">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs">Erro</span>
        </div>
      );
    }
    return null;
  };

  const getSelectedRound = (groupName: string) => groupRoundSelection[groupName] || 1;
  const setSelectedRound = (groupName: string, round: number) => {
    setGroupRoundSelection(prev => ({ ...prev, [groupName]: round }));
  };

  // Identify group rounds (rounds with names starting with "Grupo")
  const groupRounds = useMemo(() => 
    rounds.filter(r => r.name?.startsWith('Grupo')),
    [rounds]
  );

  // Get unique group names (e.g., "Grupo A", "Grupo B")
  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    groupRounds.forEach(r => {
      if (r.name) {
        // Extract group name (e.g., "Grupo A" from "Grupo A - Rodada 1")
        const groupMatch = r.name.match(/^Grupo\s+[A-Za-z]/);
        if (groupMatch) {
          groups.add(groupMatch[0]);
        } else if (r.name.startsWith('Grupo')) {
          groups.add(r.name.split(' - ')[0] || r.name);
        }
      }
    });
    return Array.from(groups).sort();
  }, [groupRounds]);

  // Get current round
  const currentRound = rounds[selectedRoundIndex];
  const isGroupRound = currentRound?.name?.startsWith('Grupo');

  // Organize matches by group
  const matchesByGroup = useMemo(() => {
    const byGroup: Record<string, { rounds: Record<number, Match[]>; teamCount: number }> = {};
    
    uniqueGroups.forEach(groupName => {
      byGroup[groupName] = { rounds: {}, teamCount: 0 };
      
      // Find all rounds for this group
      const groupRoundsList = groupRounds.filter(r => 
        r.name?.startsWith(groupName)
      ).sort((a, b) => a.round_number - b.round_number);
      
      // Get all teams in this group to calculate team count
      const teamsInGroup = new Set<string>();
      
      groupRoundsList.forEach((round, idx) => {
        const roundMatches = matches.filter(m => m.round_id === round.id);
        byGroup[groupName].rounds[idx + 1] = roundMatches;
        
        roundMatches.forEach(m => {
          teamsInGroup.add(m.home_team);
          teamsInGroup.add(m.away_team);
        });
      });
      
      byGroup[groupName].teamCount = teamsInGroup.size;
    });
    
    return byGroup;
  }, [uniqueGroups, groupRounds, matches]);

  // Calculate standings for each group (all matches from all rounds)
  const groupStandings = useMemo(() => {
    const standings: Record<string, ReturnType<typeof calculateGroupStandings>> = {};
    
    uniqueGroups.forEach(groupName => {
      const allGroupMatches: Match[] = [];
      const groupData = matchesByGroup[groupName];
      
      if (groupData) {
        Object.values(groupData.rounds).forEach(roundMatches => {
          allGroupMatches.push(...roundMatches);
        });
      }
      
      standings[groupName] = calculateGroupStandings(allGroupMatches, groupName);
    });
    
    return standings;
  }, [uniqueGroups, matchesByGroup]);

  // Get max rounds for groups
  const maxGroupRounds = useMemo(() => {
    let max = 1;
    Object.values(matchesByGroup).forEach(group => {
      const roundCount = Object.keys(group.rounds).length;
      if (roundCount > max) max = roundCount;
    });
    return max;
  }, [matchesByGroup]);

  // Handle prediction input with auto-save
  const handlePredictionInput = (matchId: string, type: 'home' | 'away', value: string, groupName?: string) => {
    const numValue = value === '' ? '' : value;
    const newLocal = {
      ...localPredictions,
      [matchId]: {
        ...localPredictions[matchId],
        [type]: numValue,
        home: type === 'home' ? numValue : (localPredictions[matchId]?.home ?? predictions[matchId]?.home_score?.toString() ?? ''),
        away: type === 'away' ? numValue : (localPredictions[matchId]?.away ?? predictions[matchId]?.away_score?.toString() ?? ''),
      }
    };
    setLocalPredictions(newLocal);

    // Trigger debounced auto-save if both values are present
    const home = newLocal[matchId].home;
    const away = newLocal[matchId].away;
    if (home !== '' && away !== '') {
      debouncedSave(matchId, home, away, groupName);
    }
  };

  // Get prediction value for display
  const getPredictionValue = (matchId: string, type: 'home' | 'away') => {
    if (localPredictions[matchId]?.[type] !== undefined) {
      return localPredictions[matchId][type];
    }
    const pred = predictions[matchId];
    if (pred) {
      return type === 'home' ? pred.home_score?.toString() : pred.away_score?.toString();
    }
    return '';
  };

  // Check if predictions can be made
  const canPredict = (match: Match) => {
    if (!isParticipant) return false;
    const deadline = new Date(match.prediction_deadline);
    return deadline > new Date() && !match.is_finished;
  };

  // Check if all predictions for a group are complete
  const checkGroupCompletion = (groupName: string, currentMatchId: string, updatedPredictions: Record<string, Prediction>) => {
    if (notifiedGroups.has(groupName)) return;
    
    const groupData = matchesByGroup[groupName];
    if (!groupData) return;
    
    // Get all matches from all rounds in this group
    const allGroupMatches: Match[] = [];
    Object.values(groupData.rounds).forEach(roundMatches => {
      allGroupMatches.push(...roundMatches);
    });
    
    // Filter only open matches (can predict)
    const openMatches = allGroupMatches.filter(m => canPredict(m));
    
    if (openMatches.length === 0) return;
    
    // Check if all open matches have predictions
    const allFilled = openMatches.every(m => {
      // Check both actual predictions and local predictions
      const hasPrediction = updatedPredictions[m.id] !== undefined;
      const hasLocalPrediction = localPredictions[m.id]?.home !== '' && 
                                  localPredictions[m.id]?.away !== '' &&
                                  !isNaN(parseInt(localPredictions[m.id]?.home || '')) &&
                                  !isNaN(parseInt(localPredictions[m.id]?.away || ''));
      return hasPrediction || hasLocalPrediction;
    });
    
    if (allFilled) {
      setNotifiedGroups(prev => new Set([...prev, groupName]));
      onGroupComplete?.(groupName, openMatches.length);
    }
  };

  // Check if a group is complete (for badge display)
  const isGroupComplete = (groupName: string): boolean => {
    const groupData = matchesByGroup[groupName];
    if (!groupData) return false;
    
    const allGroupMatches: Match[] = [];
    Object.values(groupData.rounds).forEach(roundMatches => {
      allGroupMatches.push(...roundMatches);
    });
    
    const openMatches = allGroupMatches.filter(m => canPredict(m));
    if (openMatches.length === 0) return false;
    
    return openMatches.every(m => predictions[m.id] !== undefined);
  };

  // Render match card for group view
  const renderGroupMatchCard = (match: Match, groupName: string) => {
    const canPred = canPredict(match);
    const prediction = predictions[match.id];
    
    return (
      <div 
        key={match.id}
        className="py-4 first:pt-2 last:pb-2"
      >
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            <div className="text-right min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {match.home_team}
              </p>
            </div>
            <Avatar className="h-7 w-7 flex-shrink-0">
              {match.home_team_image ? (
                <AvatarImage src={match.home_team_image} alt={match.home_team} />
              ) : null}
              <AvatarFallback className="bg-muted text-[10px]">
                <Shield className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Score / Prediction */}
          <div className="flex items-center justify-center flex-shrink-0">
            {match.is_finished ? (
              <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-4 py-2 min-w-[100px] justify-center">
                <span className={`text-xl font-bold w-8 text-center ${
                  match.home_score! > match.away_score! ? 'text-primary' : 'text-foreground'
                }`}>{match.home_score}</span>
                <span className="text-muted-foreground font-medium">x</span>
                <span className={`text-xl font-bold w-8 text-center ${
                  match.away_score! > match.home_score! ? 'text-primary' : 'text-foreground'
                }`}>{match.away_score}</span>
              </div>
            ) : canPred ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-3 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={getPredictionValue(match.id, 'home')}
                    onChange={(e) => handlePredictionInput(match.id, 'home', e.target.value, groupName)}
                    className="w-12 h-9 text-center p-0 text-lg font-bold bg-background"
                  />
                  <span className="text-muted-foreground font-medium">x</span>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={getPredictionValue(match.id, 'away')}
                    onChange={(e) => handlePredictionInput(match.id, 'away', e.target.value, groupName)}
                    className="w-12 h-9 text-center p-0 text-lg font-bold bg-background"
                  />
                </div>
                {renderSaveStatus(match.id)}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-4 py-2 min-w-[100px] justify-center">
                {prediction ? (
                  <>
                    <span className="text-xl font-bold w-8 text-center text-primary">{prediction.home_score}</span>
                    <span className="text-muted-foreground font-medium">x</span>
                    <span className="text-xl font-bold w-8 text-center text-primary">{prediction.away_score}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-sm">vs</span>
                )}
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="h-7 w-7 flex-shrink-0">
              {match.away_team_image ? (
                <AvatarImage src={match.away_team_image} alt={match.away_team} />
              ) : null}
              <AvatarFallback className="bg-muted text-[10px]">
                <Shield className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {match.away_team}
              </p>
            </div>
          </div>
        </div>

        {/* Points earned */}
        {match.is_finished && prediction?.points_earned !== undefined && (
          <div className="mt-2 text-center">
            <span className={`text-xs px-2 py-0.5 rounded ${
              prediction.points_earned === 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              prediction.points_earned === 5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              prediction.points_earned === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {prediction.points_earned} pts
            </span>
          </div>
        )}
      </div>
    );
  };

  // If in group phase, show the new World Cup style layout
  if (isGroupRound && uniqueGroups.length > 0) {
    return (
      <div className="space-y-8">
        {uniqueGroups.map((groupName) => {
          const groupData = matchesByGroup[groupName];
          const standings = groupStandings[groupName] || [];
          const matchesPerRound = calculateMatchesPerRound(groupData?.teamCount || 4);
          const currentGroupRoundMatches = groupData?.rounds[getSelectedRound(groupName)] || [];
          const totalGroupRounds = Object.keys(groupData?.rounds || {}).length;
          
          return (
            <div key={groupName} className="grid gap-4 lg:grid-cols-2">
              {/* Left Column: Group Standings Table */}
              <div>
                <GroupStandingsTable
                  groupName={groupName.toUpperCase()}
                  standings={standings}
                  classifiedCount={2}
                />
              </div>

              {/* Right Column: Matches for Selected Round */}
              <div>
                <Card className="overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                        Rodada {getSelectedRound(groupName)}
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedRound(groupName, getSelectedRound(groupName) - 1)}
                          disabled={getSelectedRound(groupName) <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground min-w-[50px] text-center">
                          {getSelectedRound(groupName)}/{totalGroupRounds}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setSelectedRound(groupName, getSelectedRound(groupName) + 1)}
                          disabled={getSelectedRound(groupName) >= totalGroupRounds}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    {currentGroupRoundMatches.length === 0 ? (
                      <div className="text-center py-6">
                        <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum jogo nesta rodada</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {currentGroupRoundMatches.slice(0, matchesPerRound).map(match => renderGroupMatchCard(match, groupName))}
                      </div>
                    )}
                    
                    {/* Badge visual when all group predictions are complete */}
                    {isGroupComplete(groupName) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Todos os palpites do {groupName} salvos!
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}

      </div>
    );
  }

  // Non-group rounds (knockout phase)
  const currentRoundMatches = matches.filter(m => m.round_id === currentRound?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Round Navigation and Matches */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {currentRound?.name || `Rodada ${selectedRoundIndex + 1}`}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRoundChange(Math.max(0, selectedRoundIndex - 1))}
                disabled={selectedRoundIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                {selectedRoundIndex + 1}/{rounds.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRoundChange(Math.min(rounds.length - 1, selectedRoundIndex + 1))}
                disabled={selectedRoundIndex >= rounds.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {currentRoundMatches.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum jogo nesta rodada</p>
                </div>
              ) : (
                currentRoundMatches.map((match) => {
                  const canPred = canPredict(match);
                  const prediction = predictions[match.id];
                  
                  return (
                    <div 
                      key={match.id}
                      className={`p-4 rounded-lg border ${
                        match.is_finished ? 'bg-muted/30' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-sm font-medium text-right truncate max-w-[120px]">
                            {match.home_team}
                          </span>
                          <Avatar className="h-8 w-8">
                            {match.home_team_image ? (
                              <AvatarImage src={match.home_team_image} alt={match.home_team} />
                            ) : null}
                            <AvatarFallback className="bg-muted text-xs">
                              <Shield className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Score / Prediction */}
                        <div className="flex items-center gap-2 px-4 min-w-[120px] justify-center">
                          {match.is_finished ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold">{match.home_score}</span>
                              <span className="text-muted-foreground">x</span>
                              <span className="text-xl font-bold">{match.away_score}</span>
                            </div>
                          ) : canPred ? (
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={getPredictionValue(match.id, 'home')}
                                  onChange={(e) => handlePredictionInput(match.id, 'home', e.target.value)}
                                  className="w-12 h-10 text-center p-0 text-lg font-medium"
                                />
                                <span className="text-muted-foreground">x</span>
                                <Input
                                  type="number"
                                  min={0}
                                  max={99}
                                  value={getPredictionValue(match.id, 'away')}
                                  onChange={(e) => handlePredictionInput(match.id, 'away', e.target.value)}
                                  className="w-12 h-10 text-center p-0 text-lg font-medium"
                                />
                              </div>
                              {renderSaveStatus(match.id)}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {prediction ? (
                                <>
                                  <span className="text-lg font-medium text-primary">{prediction.home_score}</span>
                                  <span className="text-muted-foreground">x</span>
                                  <span className="text-lg font-medium text-primary">{prediction.away_score}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">vs</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 flex-1">
                          <Avatar className="h-8 w-8">
                            {match.away_team_image ? (
                              <AvatarImage src={match.away_team_image} alt={match.away_team} />
                            ) : null}
                            <AvatarFallback className="bg-muted text-xs">
                              <Shield className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium truncate max-w-[120px]">
                            {match.away_team}
                          </span>
                        </div>
                      </div>

                      {/* Points earned */}
                      {match.is_finished && prediction?.points_earned !== undefined && (
                        <div className="mt-3 text-center">
                          <span className={`text-sm px-3 py-1 rounded-full ${
                            prediction.points_earned === 10 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            prediction.points_earned === 5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            prediction.points_earned === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            +{prediction.points_earned} pontos
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right: Round selector quick access */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-base font-semibold">Navegação Rápida</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {rounds.map((round, index) => (
              <Button
                key={round.id}
                variant={index === selectedRoundIndex ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => onRoundChange(index)}
              >
                {round.name || `Rodada ${index + 1}`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
