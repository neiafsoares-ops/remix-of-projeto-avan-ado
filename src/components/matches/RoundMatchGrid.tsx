import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, ChevronDown, ChevronUp, Lock, Trophy, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isBeforeDeadline } from '@/lib/date-utils';

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image?: string;
  away_team_image?: string;
  match_date: string;
  prediction_deadline: string;
  home_score?: number;
  away_score?: number;
  is_finished: boolean;
}

interface Round {
  id: string;
  round_number: number;
  name?: string;
  match_limit: number;
  extra_matches_allowed: number;
  is_finalized?: boolean;
  finalized_at?: string;
  matchCount?: number;
}

interface RoundMatchGridProps {
  rounds: Round[];
  matches: Match[];
  onAddMatch: (roundId: string, roundNumber: number) => void;
  onEditMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
  onLaunchScore?: (match: Match) => void;
  canManagePool?: boolean;
  loading?: boolean;
}

export function RoundMatchGrid({
  rounds,
  matches,
  onAddMatch,
  onEditMatch,
  onDeleteMatch,
  onLaunchScore,
  canManagePool = false,
  loading,
}: RoundMatchGridProps) {
  const [openRounds, setOpenRounds] = useState<Set<string>>(new Set(rounds.slice(0, 3).map(r => r.id)));

  const toggleRound = (roundId: string) => {
    setOpenRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const getMatchesForRound = (roundId: string) => {
    return matches.filter(m => {
      // Match by round_id - we need to check this via the round association
      return true; // This will be filtered properly when we pass matches per round
    });
  };

  const getRoundStatus = (round: Round, roundMatches: Match[]) => {
    const totalLimit = round.match_limit + (round.extra_matches_allowed || 0);
    const matchCount = roundMatches.length;
    const finishedCount = roundMatches.filter(m => m.is_finished).length;
    
    if (round.is_finalized || finishedCount === matchCount && matchCount > 0) {
      return 'finalized';
    }
    if (matchCount === 0) {
      return 'empty';
    }
    if (matchCount < totalLimit) {
      return 'incomplete';
    }
    return 'complete';
  };

  const getStatusBadge = (status: string, round: Round, matchCount: number) => {
    const totalLimit = round.match_limit + (round.extra_matches_allowed || 0);
    
    switch (status) {
      case 'finalized':
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            <Lock className="h-3 w-3 mr-1" />
            Finalizada
          </Badge>
        );
      case 'empty':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            0/{totalLimit} jogos
          </Badge>
        );
      case 'incomplete':
        return (
          <Badge variant="secondary">
            {matchCount}/{totalLimit} jogos
          </Badge>
        );
      case 'complete':
        return (
          <Badge variant="default" className="bg-primary">
            <Trophy className="h-3 w-3 mr-1" />
            {matchCount}/{totalLimit} jogos
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="py-3">
              <div className="h-6 bg-muted rounded w-1/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhuma rodada encontrada</h3>
          <p className="text-muted-foreground">
            Configure as rodadas do bolão primeiro
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rounds.map((round) => {
        const roundMatches = matches.filter(m => (m as any).round_id === round.id);
        const status = getRoundStatus(round, roundMatches);
        const isOpen = openRounds.has(round.id);
        const totalLimit = round.match_limit + (round.extra_matches_allowed || 0);
        const canAddMore = roundMatches.length < totalLimit && status !== 'finalized';

        return (
          <Card 
            key={round.id} 
            className={`transition-all ${status === 'finalized' ? 'opacity-75 bg-muted/30' : ''}`}
          >
            <Collapsible open={isOpen} onOpenChange={() => toggleRound(round.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {round.round_number}
                      </div>
                      <CardTitle className="text-base">
                        {round.name || `Rodada ${round.round_number}`}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status, round, roundMatches.length)}
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  {roundMatches.length === 0 ? (
                    <div className="text-center py-6 bg-muted/30 rounded-lg border-2 border-dashed">
                      <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Nenhum jogo cadastrado nesta rodada
                      </p>
                      {canAddMore && (
                        <Button
                          size="sm"
                          onClick={() => onAddMatch(round.id, round.round_number)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Jogo
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {roundMatches.map((match) => {
                        const deadlinePassed = !isBeforeDeadline(match.prediction_deadline);
                        const canLaunch = canManagePool && deadlinePassed && !match.is_finished;
                        
                        return (
                          <div
                            key={match.id}
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-3 ${
                              match.is_finished ? 'bg-muted/50' : 
                              canLaunch ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/30' : 
                              'bg-background hover:bg-muted/30'
                            } transition-colors cursor-pointer`}
                            onClick={() => onEditMatch(match)}
                          >
                            {/* Teams Row - Stack on mobile */}
                            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:flex-1 w-full">
                              {/* Home Team */}
                              <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                                {match.home_team_image && (
                                  <img src={match.home_team_image} alt="" className="w-7 h-7 sm:w-6 sm:h-6 object-contain flex-shrink-0" />
                                )}
                                <span className="font-medium text-sm truncate">
                                  {match.home_team}
                                </span>
                              </div>
                              
                              {/* Score or VS */}
                              <div className="flex items-center justify-center px-3 sm:px-2 flex-shrink-0">
                                {match.is_finished ? (
                                  <span className="font-bold text-base sm:text-sm bg-muted/50 px-3 py-1 rounded-md">
                                    {match.home_score} x {match.away_score}
                                  </span>
                                ) : (
                                  <span className="text-sm sm:text-xs text-muted-foreground font-medium">vs</span>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end min-w-0">
                                <span className="font-medium text-sm truncate text-right">
                                  {match.away_team}
                                </span>
                                {match.away_team_image && (
                                  <img src={match.away_team_image} alt="" className="w-7 h-7 sm:w-6 sm:h-6 object-contain flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Status & Actions Row - Full width on mobile */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto sm:ml-4">
                              {/* Status Badge */}
                              {match.is_finished ? (
                                <Badge variant="default" className="bg-green-600 text-white text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Finalizado
                                </Badge>
                              ) : deadlinePassed ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                                  Aguardando
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(match.match_date), "dd/MM HH:mm", { locale: ptBR })}
                                </span>
                              )}
                              
                              {/* Botão Lançar Resultado - Larger touch area for mobile */}
                              {canLaunch && onLaunchScore && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700 text-white text-sm h-10 sm:h-9 px-4 sm:px-3 min-w-[100px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onLaunchScore(match);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Lançar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {canAddMore && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 border-dashed"
                          onClick={() => onAddMatch(round.id, round.round_number)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Jogo ({roundMatches.length}/{totalLimit})
                        </Button>
                      )}
                    </div>
                  )}

                  {status === 'finalized' && (
                    <div className="mt-3 p-2 bg-green-500/10 rounded-lg text-center">
                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                        <Lock className="h-3 w-3" />
                        Rodada finalizada - alterações bloqueadas
                      </p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
