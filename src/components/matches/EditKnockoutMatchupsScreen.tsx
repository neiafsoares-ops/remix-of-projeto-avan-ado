import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ClubAutocomplete, Club } from '@/components/ClubAutocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AutomaticDrawDialog, TeamFromGroup, DrawMatchup } from './AutomaticDrawDialog';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Users, 
  Lock, 
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Swords,
  Sparkles
} from 'lucide-react';

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
  round_id: string | null;
}

interface Round {
  id: string;
  pool_id: string;
  round_number: number;
  name: string | null;
  match_limit: number;
  is_finalized: boolean;
}

interface EditKnockoutMatchupsScreenProps {
  poolId: string;
  rounds: Round[];
  matches: Match[];
  onBack: () => void;
  onMatchesUpdate: () => void;
}

// Identifica rodadas de mata-mata pelo nome
const isKnockoutRound = (roundName: string | null): boolean => {
  if (!roundName) return false;
  const name = roundName.toLowerCase();
  return (
    name.includes('oitavas') ||
    name.includes('quartas') ||
    name.includes('semi') ||
    name.includes('final') ||
    name.includes('16 avos') ||
    name.includes('32 avos')
  );
};

// Ordem das fases para navegação
const knockoutOrder = ['32 avos', '16 avos', 'oitavas', 'quartas', 'semi', 'final'];

const getKnockoutSortOrder = (name: string | null): number => {
  if (!name) return 999;
  const lowerName = name.toLowerCase();
  for (let i = 0; i < knockoutOrder.length; i++) {
    if (lowerName.includes(knockoutOrder[i])) return i;
  }
  return 999;
};

export function EditKnockoutMatchupsScreen({
  poolId,
  rounds,
  matches,
  onBack,
  onMatchesUpdate,
}: EditKnockoutMatchupsScreenProps) {
  const { toast } = useToast();

  // Filtra apenas rodadas de mata-mata e ordena
  const knockoutRounds = rounds
    .filter(r => isKnockoutRound(r.name))
    .sort((a, b) => getKnockoutSortOrder(a.name) - getKnockoutSortOrder(b.name));

  // Filtra rodadas de grupo
  const groupRounds = rounds.filter(r => r.name?.toLowerCase().includes('grupo'));

  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [matchEdits, setMatchEdits] = useState<Record<string, {
    home_team: string;
    away_team: string;
    home_team_image: string | null;
    away_team_image: string | null;
  }>>({});
  const [predictionCounts, setPredictionCounts] = useState<Record<string, number>>({});
  const [savingMatch, setSavingMatch] = useState<string | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [showDrawDialog, setShowDrawDialog] = useState(false);
  const [isApplyingDraw, setIsApplyingDraw] = useState(false);
  const [groupStandings, setGroupStandings] = useState<Record<string, TeamFromGroup[]>>({});

  const currentRound = knockoutRounds[currentRoundIndex];
  const roundMatches = matches.filter(m => m.round_id === currentRound?.id);

  // Carregar contagem de palpites
  useEffect(() => {
    const fetchPredictionCounts = async () => {
      if (roundMatches.length === 0) {
        setLoadingPredictions(false);
        return;
      }

      setLoadingPredictions(true);
      const matchIds = roundMatches.map(m => m.id);
      
      const { data } = await supabase
        .from('predictions')
        .select('match_id')
        .in('match_id', matchIds);

      if (data) {
        const counts: Record<string, number> = {};
        matchIds.forEach(id => {
          counts[id] = data.filter(p => p.match_id === id).length;
        });
        setPredictionCounts(counts);
      }
      setLoadingPredictions(false);
    };

    fetchPredictionCounts();
  }, [currentRound?.id, matches]);

  // Inicializar edições com valores atuais
  useEffect(() => {
    const initialEdits: typeof matchEdits = {};
    roundMatches.forEach(match => {
      if (!matchEdits[match.id]) {
        initialEdits[match.id] = {
          home_team: match.home_team,
          away_team: match.away_team,
          home_team_image: match.home_team_image,
          away_team_image: match.away_team_image,
        };
      }
    });
    if (Object.keys(initialEdits).length > 0) {
      setMatchEdits(prev => ({ ...prev, ...initialEdits }));
    }
  }, [currentRound?.id, roundMatches]);

  const handleSelectClub = (matchId: string, side: 'home' | 'away', club: Club) => {
    setMatchEdits(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side === 'home' ? 'home_team' : 'away_team']: club.name,
        [side === 'home' ? 'home_team_image' : 'away_team_image']: club.logo_url,
      }
    }));
  };

  const handleSaveMatch = async (matchId: string) => {
    const edit = matchEdits[matchId];
    if (!edit) return;

    setSavingMatch(matchId);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team: edit.home_team,
          away_team: edit.away_team,
          home_team_image: edit.home_team_image,
          away_team_image: edit.away_team_image,
        })
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: 'Confronto atualizado!',
        description: 'Os times foram atualizados. Os palpites existentes foram preservados.',
      });

      onMatchesUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível atualizar o confronto.',
        variant: 'destructive',
      });
    } finally {
      setSavingMatch(null);
    }
  };

  const hasChanges = (match: Match) => {
    const edit = matchEdits[match.id];
    if (!edit) return false;
    return (
      edit.home_team !== match.home_team ||
      edit.away_team !== match.away_team
    );
  };

  // Calcular classificação dos grupos com base nos jogos finalizados
  const qualifiedTeams = useMemo(() => {
    const teams: TeamFromGroup[] = [];
    
    groupRounds.forEach(round => {
      const groupLetter = round.name?.replace(/Grupo\s*/i, '').trim() || '';
      const groupMatches = matches.filter(m => m.round_id === round.id && m.is_finished);
      
      // Extrair todos os times únicos deste grupo
      const teamStats: Record<string, { 
        name: string; 
        image: string | null; 
        points: number; 
        gf: number; 
        gc: number;
        wins: number;
      }> = {};
      
      groupMatches.forEach(match => {
        // Time da casa
        if (!teamStats[match.home_team]) {
          teamStats[match.home_team] = { 
            name: match.home_team, 
            image: match.home_team_image, 
            points: 0, 
            gf: 0, 
            gc: 0,
            wins: 0
          };
        }
        // Time visitante
        if (!teamStats[match.away_team]) {
          teamStats[match.away_team] = { 
            name: match.away_team, 
            image: match.away_team_image, 
            points: 0, 
            gf: 0, 
            gc: 0,
            wins: 0
          };
        }
        
        const homeScore = match.home_score ?? 0;
        const awayScore = match.away_score ?? 0;
        
        teamStats[match.home_team].gf += homeScore;
        teamStats[match.home_team].gc += awayScore;
        teamStats[match.away_team].gf += awayScore;
        teamStats[match.away_team].gc += homeScore;
        
        if (homeScore > awayScore) {
          teamStats[match.home_team].points += 3;
          teamStats[match.home_team].wins += 1;
        } else if (awayScore > homeScore) {
          teamStats[match.away_team].points += 3;
          teamStats[match.away_team].wins += 1;
        } else {
          teamStats[match.home_team].points += 1;
          teamStats[match.away_team].points += 1;
        }
      });
      
      // Ordenar por pontos, saldo de gols, gols feitos
      const sortedTeams = Object.values(teamStats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const sgA = a.gf - a.gc;
        const sgB = b.gf - b.gc;
        if (sgB !== sgA) return sgB - sgA;
        return b.gf - a.gf;
      });
      
      // Adicionar times classificados (por padrão, 2 primeiros)
      sortedTeams.slice(0, 2).forEach((team, index) => {
        teams.push({
          teamName: team.name,
          teamImage: team.image,
          groupLetter,
          position: index + 1,
        });
      });
    });
    
    return teams;
  }, [groupRounds, matches]);

  // Handler para aplicar sorteio
  const handleApplyDraw = async (drawMatchups: DrawMatchup[]) => {
    if (drawMatchups.length === 0 || roundMatches.length === 0) return;
    
    setIsApplyingDraw(true);
    try {
      // Mapear confrontos sorteados para os jogos existentes
      const updates = drawMatchups.map((matchup, index) => {
        const match = roundMatches[index];
        if (!match) return null;
        
        return {
          id: match.id,
          home_team: matchup.home.teamName,
          away_team: matchup.away.teamName,
          home_team_image: matchup.home.teamImage,
          away_team_image: matchup.away.teamImage,
        };
      }).filter(Boolean);

      // Atualizar todos os jogos
      for (const update of updates) {
        if (!update) continue;
        const { error } = await supabase
          .from('matches')
          .update({
            home_team: update.home_team,
            away_team: update.away_team,
            home_team_image: update.home_team_image,
            away_team_image: update.away_team_image,
          })
          .eq('id', update.id);
          
        if (error) throw error;
      }

      toast({
        title: 'Sorteio aplicado!',
        description: `${updates.length} confrontos foram definidos com sucesso.`,
      });

      setShowDrawDialog(false);
      onMatchesUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao aplicar sorteio',
        description: error.message || 'Não foi possível aplicar os confrontos.',
        variant: 'destructive',
      });
    } finally {
      setIsApplyingDraw(false);
    }
  };

  const renderTeamImage = (imageUrl: string | null) => {
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt="Escudo"
          className="w-10 h-10 object-contain rounded"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
        <Shield className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  };

  if (knockoutRounds.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="text-center py-12">
          <CardContent>
            <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma fase mata-mata encontrada</h3>
            <p className="text-muted-foreground">
              Este bolão não possui rodadas de mata-mata configuradas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Navegação de Fases */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Editar Confrontos - {currentRound?.name || 'Mata-mata'}</CardTitle>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentRoundIndex(i => Math.max(0, i - 1))}
                disabled={currentRoundIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentRoundIndex + 1} / {knockoutRounds.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentRoundIndex(i => Math.min(knockoutRounds.length - 1, i + 1))}
                disabled={currentRoundIndex === knockoutRounds.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <CardDescription>
              Altere os times de cada confronto. Os palpites dos participantes serão preservados.
            </CardDescription>
            {groupRounds.length > 0 && roundMatches.some(m => !m.is_finished) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDrawDialog(true)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Sorteio Automático
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Aviso sobre palpites */}
      {!loadingPredictions && Object.values(predictionCounts).some(c => c > 0) && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-600">Existem palpites nesta fase</p>
            <p className="text-sm text-muted-foreground">
              Ao alterar os times, os palpites existentes permanecerão vinculados ao jogo.
              Quando o placar for lançado, a pontuação será calculada normalmente.
            </p>
          </div>
        </div>
      )}

      {/* Lista de Jogos */}
      <div className="space-y-4">
        {roundMatches.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-muted-foreground">
                Nenhum jogo cadastrado nesta fase.
              </p>
            </CardContent>
          </Card>
        ) : (
          roundMatches.map((match, index) => {
            const edit = matchEdits[match.id] || {
              home_team: match.home_team,
              away_team: match.away_team,
              home_team_image: match.home_team_image,
              away_team_image: match.away_team_image,
            };
            const predCount = predictionCounts[match.id] || 0;
            const isFinished = match.is_finished;
            const changed = hasChanges(match);

            return (
              <Card key={match.id} className={isFinished ? 'opacity-75' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Jogo {index + 1}</Badge>
                      {predCount > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {predCount} palpites
                        </Badge>
                      )}
                    </div>
                    {isFinished ? (
                      <Badge className="bg-green-600/10 text-green-600 border-green-600/20">
                        <Lock className="h-3 w-3 mr-1" />
                        Finalizado
                      </Badge>
                    ) : changed ? (
                      <Badge className="bg-amber-600/10 text-amber-600 border-amber-600/20">
                        Alterado
                      </Badge>
                    ) : null}
                  </div>

                  {isFinished ? (
                    // Jogo finalizado - apenas exibir
                    <div className="flex items-center justify-between gap-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        {renderTeamImage(match.home_team_image)}
                        <span className="font-medium">{match.home_team}</span>
                      </div>
                      <div className="text-center px-4">
                        <span className="font-bold text-lg">
                          {match.home_score} x {match.away_score}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className="font-medium">{match.away_team}</span>
                        {renderTeamImage(match.away_team_image)}
                      </div>
                    </div>
                  ) : (
                    // Jogo editável
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        {/* Time da Casa */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Time da Casa</Label>
                          <ClubAutocomplete
                            value={edit.home_team}
                            logoValue={edit.home_team_image || undefined}
                            onSelect={(club) => handleSelectClub(match.id, 'home', club)}
                            onCreate={(name) => {
                              setMatchEdits(prev => ({
                                ...prev,
                                [match.id]: { ...prev[match.id], home_team: name, home_team_image: null }
                              }));
                            }}
                            poolId={poolId}
                            placeholder="Mandante..."
                          />
                        </div>

                        <div className="flex items-center justify-center">
                          <span className="text-xl font-bold text-muted-foreground">VS</span>
                        </div>

                        {/* Time Visitante */}
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Time Visitante</Label>
                          <ClubAutocomplete
                            value={edit.away_team}
                            logoValue={edit.away_team_image || undefined}
                            onSelect={(club) => handleSelectClub(match.id, 'away', club)}
                            onCreate={(name) => {
                              setMatchEdits(prev => ({
                                ...prev,
                                [match.id]: { ...prev[match.id], away_team: name, away_team_image: null }
                              }));
                            }}
                            poolId={poolId}
                            placeholder="Visitante..."
                          />
                        </div>
                      </div>

                      {/* Botão Salvar */}
                      <div className="flex justify-end">
                        <Button
                          variant={changed ? 'hero' : 'outline'}
                          size="sm"
                          onClick={() => handleSaveMatch(match.id)}
                          disabled={!changed || savingMatch === match.id}
                        >
                          {savingMatch === match.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : changed ? (
                            <Save className="h-4 w-4 mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          {changed ? 'Salvar Alterações' : 'Sem alterações'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de Sorteio Automático */}
      <AutomaticDrawDialog
        open={showDrawDialog}
        onOpenChange={setShowDrawDialog}
        qualifiedTeams={qualifiedTeams}
        knockoutRoundName={currentRound?.name || 'Mata-mata'}
        onApplyDraw={handleApplyDraw}
        isApplying={isApplyingDraw}
      />
    </div>
  );
}
