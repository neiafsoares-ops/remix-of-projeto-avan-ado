import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { GroupStandingsTable } from './GroupStandingsTable';
import { ChevronLeft, ChevronRight, Target, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';

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
  onPredictionChange: (matchId: string, homeScore: number, awayScore: number) => void;
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
}: CupFormatViewProps) {
  const [localPredictions, setLocalPredictions] = useState<Record<string, { home: string; away: string }>>({});
  const [selectedGroupRound, setSelectedGroupRound] = useState<number>(1);

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

  // Handle prediction input
  const handlePredictionInput = (matchId: string, type: 'home' | 'away', value: string) => {
    const numValue = value === '' ? '' : value;
    setLocalPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [type]: numValue,
        home: type === 'home' ? numValue : (prev[matchId]?.home ?? predictions[matchId]?.home_score?.toString() ?? ''),
        away: type === 'away' ? numValue : (prev[matchId]?.away ?? predictions[matchId]?.away_score?.toString() ?? ''),
      }
    }));
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

  // Render match card for group view
  const renderGroupMatchCard = (match: Match) => {
    const canPred = canPredict(match);
    const prediction = predictions[match.id];
    
    return (
      <div 
        key={match.id}
        className="py-3 border-b last:border-b-0"
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
          <div className="flex items-center gap-1 px-2 min-w-[90px] justify-center flex-shrink-0">
            {match.is_finished ? (
              <div className="flex items-center gap-1">
                <span className={`text-lg font-bold ${
                  match.home_score! > match.away_score! ? 'text-primary' : 'text-foreground'
                }`}>{match.home_score}</span>
                <span className="text-muted-foreground text-sm mx-1">x</span>
                <span className={`text-lg font-bold ${
                  match.away_score! > match.home_score! ? 'text-primary' : 'text-foreground'
                }`}>{match.away_score}</span>
              </div>
            ) : canPred ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={getPredictionValue(match.id, 'home')}
                  onChange={(e) => handlePredictionInput(match.id, 'home', e.target.value)}
                  onBlur={() => {
                    const home = parseInt(localPredictions[match.id]?.home || '');
                    const away = parseInt(localPredictions[match.id]?.away || '');
                    if (!isNaN(home) && !isNaN(away)) {
                      onPredictionChange(match.id, home, away);
                    }
                  }}
                  className="w-10 h-8 text-center p-0 text-sm font-bold"
                />
                <span className="text-muted-foreground text-xs">x</span>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={getPredictionValue(match.id, 'away')}
                  onChange={(e) => handlePredictionInput(match.id, 'away', e.target.value)}
                  onBlur={() => {
                    const home = parseInt(localPredictions[match.id]?.home || '');
                    const away = parseInt(localPredictions[match.id]?.away || '');
                    if (!isNaN(home) && !isNaN(away)) {
                      onPredictionChange(match.id, home, away);
                    }
                  }}
                  className="w-10 h-8 text-center p-0 text-sm font-bold"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {prediction ? (
                  <>
                    <span className="text-lg font-bold text-primary">{prediction.home_score}</span>
                    <span className="text-muted-foreground text-sm mx-1">x</span>
                    <span className="text-lg font-bold text-primary">{prediction.away_score}</span>
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
          const currentGroupRoundMatches = groupData?.rounds[selectedGroupRound] || [];
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
                  <CardHeader className="py-2 px-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold text-foreground">
                          RODADA {selectedGroupRound}
                        </CardTitle>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <button className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Filter className="h-3 w-3" /> equipes
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    {currentGroupRoundMatches.length === 0 ? (
                      <div className="text-center py-6">
                        <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhum jogo nesta rodada</p>
                      </div>
                    ) : (
                      <div>
                        {currentGroupRoundMatches.slice(0, matchesPerRound).map(renderGroupMatchCard)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}

        {/* Round Navigation for Groups */}
        {maxGroupRounds > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroupRound(prev => Math.max(1, prev - 1))}
              disabled={selectedGroupRound <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              Rodada {selectedGroupRound} de {maxGroupRounds}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroupRound(prev => Math.min(maxGroupRounds, prev + 1))}
              disabled={selectedGroupRound >= maxGroupRounds}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
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
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                value={getPredictionValue(match.id, 'home')}
                                onChange={(e) => handlePredictionInput(match.id, 'home', e.target.value)}
                                onBlur={() => {
                                  const home = parseInt(localPredictions[match.id]?.home || '');
                                  const away = parseInt(localPredictions[match.id]?.away || '');
                                  if (!isNaN(home) && !isNaN(away)) {
                                    onPredictionChange(match.id, home, away);
                                  }
                                }}
                                className="w-12 h-10 text-center p-0 text-lg font-medium"
                              />
                              <span className="text-muted-foreground">x</span>
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                value={getPredictionValue(match.id, 'away')}
                                onChange={(e) => handlePredictionInput(match.id, 'away', e.target.value)}
                                onBlur={() => {
                                  const home = parseInt(localPredictions[match.id]?.home || '');
                                  const away = parseInt(localPredictions[match.id]?.away || '');
                                  if (!isNaN(home) && !isNaN(away)) {
                                    onPredictionChange(match.id, home, away);
                                  }
                                }}
                                className="w-12 h-10 text-center p-0 text-lg font-medium"
                              />
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
