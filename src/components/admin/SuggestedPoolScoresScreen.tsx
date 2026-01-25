import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { 
  SuggestedPool, 
  SuggestedPoolRound, 
  SuggestedPoolMatch 
} from '@/types/suggested-pools';
import { formatDateTimeBR } from '@/lib/date-utils';

interface ScoreEntry {
  match: SuggestedPoolMatch;
  home_score: string;
  away_score: string;
  isModified: boolean;
}

interface SyncResult {
  poolName: string;
  matchesUpdated: number;
  success: boolean;
  error?: string;
}

interface SuggestedPoolScoresScreenProps {
  pool: SuggestedPool;
  onBack: () => void;
}

export function SuggestedPoolScoresScreen({ pool, onBack }: SuggestedPoolScoresScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rounds, setRounds] = useState<SuggestedPoolRound[]>([]);
  const [matches, setMatches] = useState<SuggestedPoolMatch[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);

  const currentRound = rounds[currentRoundIndex];

  useEffect(() => {
    fetchRoundsAndMatches();
  }, [pool.id]);

  useEffect(() => {
    if (currentRound) {
      initializeEntries();
    }
  }, [currentRound?.id, matches]);

  const fetchRoundsAndMatches = async () => {
    try {
      const { data: roundsData, error: roundsError } = await supabase
        .from('suggested_pool_rounds' as any)
        .select('*')
        .eq('suggested_pool_id', pool.id)
        .order('round_number');

      if (roundsError) throw roundsError;

      const { data: matchesData, error: matchesError } = await supabase
        .from('suggested_pool_matches' as any)
        .select('*')
        .eq('suggested_pool_id', pool.id);

      if (matchesError) throw matchesError;

      setRounds((roundsData || []) as unknown as SuggestedPoolRound[]);
      setMatches((matchesData || []) as unknown as SuggestedPoolMatch[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeEntries = () => {
    if (!currentRound) return;

    const roundMatches = matches.filter(m => m.round_id === currentRound.id);
    
    const entries: ScoreEntry[] = roundMatches.map(match => ({
      match,
      home_score: match.home_score?.toString() || '',
      away_score: match.away_score?.toString() || '',
      isModified: false,
    }));

    setScoreEntries(entries);
  };

  const updateScore = (matchId: string, field: 'home_score' | 'away_score', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    setScoreEntries(prev => prev.map(entry =>
      entry.match.id === matchId 
        ? { ...entry, [field]: value, isModified: true } 
        : entry
    ));
  };

  const saveScore = async (matchId: string) => {
    if (!user) return;
    
    const entry = scoreEntries.find(e => e.match.id === matchId);
    if (!entry) return;
    
    if (entry.home_score === '' || entry.away_score === '') {
      toast({
        title: 'Erro',
        description: 'Preencha o placar completo.',
        variant: 'destructive',
      });
      return;
    }
    
    setSavingMatchId(matchId);
    
    try {
      const homeScore = parseInt(entry.home_score);
      const awayScore = parseInt(entry.away_score);

      // Update the suggested pool match
      const { error } = await supabase
        .from('suggested_pool_matches' as any)
        .update({
          home_score: homeScore,
          away_score: awayScore,
          is_finished: true,
        })
        .eq('id', matchId);
        
      if (error) throw error;

      // Sync to adopted pools
      const syncResult = await syncScoreToAdoptedPools(entry.match, homeScore, awayScore);
      
      toast({
        title: 'Placar registrado!',
        description: `${entry.match.home_team} ${homeScore} x ${awayScore} ${entry.match.away_team}${syncResult.length > 0 ? ` - Sincronizado com ${syncResult.filter(r => r.success).length} bolão(s)` : ''}`,
      });
      
      setScoreEntries(prev => prev.map(e => 
        e.match.id === matchId ? { ...e, isModified: false, match: { ...e.match, home_score: homeScore, away_score: awayScore, is_finished: true } } : e
      ));
      
      // Update matches state
      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, home_score: homeScore, away_score: awayScore, is_finished: true } : m
      ));
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o placar.',
        variant: 'destructive',
      });
    } finally {
      setSavingMatchId(null);
    }
  };

  const syncScoreToAdoptedPools = async (
    suggestedMatch: SuggestedPoolMatch, 
    homeScore: number, 
    awayScore: number
  ): Promise<SyncResult[]> => {
    const results: SyncResult[] = [];

    try {
      // Get all pool instances that adopted this suggested pool
      const { data: instances, error: instancesError } = await supabase
        .from('mestre_pool_instances' as any)
        .select('pool_id')
        .eq('suggested_pool_id', pool.id);

      if (instancesError) throw instancesError;
      if (!instances || instances.length === 0) return results;

      const poolIds = instances.map((i: any) => i.pool_id);

      // Get pool names for better feedback
      const { data: pools } = await supabase
        .from('pools')
        .select('id, name')
        .in('id', poolIds);

      // For each pool, find and update the matching match
      for (const poolId of poolIds) {
        const poolInfo = pools?.find((p: any) => p.id === poolId);
        const poolName = poolInfo?.name || 'Bolão';

        try {
          // Find the match by matching teams and date
          const { data: matchingMatches, error: matchError } = await supabase
            .from('matches')
            .select('id')
            .eq('pool_id', poolId)
            .eq('home_team', suggestedMatch.home_team)
            .eq('away_team', suggestedMatch.away_team)
            .eq('match_date', suggestedMatch.match_date);

          if (matchError) throw matchError;

          if (matchingMatches && matchingMatches.length > 0) {
            const matchId = matchingMatches[0].id;

            const { error: updateError } = await supabase
              .from('matches')
              .update({
                home_score: homeScore,
                away_score: awayScore,
                is_finished: true,
              })
              .eq('id', matchId);

            if (updateError) throw updateError;

            results.push({
              poolName,
              matchesUpdated: 1,
              success: true,
            });
          }
        } catch (error: any) {
          results.push({
            poolName,
            matchesUpdated: 0,
            success: false,
            error: error.message,
          });
        }
      }
    } catch (error) {
      console.error('Error syncing scores:', error);
    }

    return results;
  };

  const saveAllScores = async () => {
    const modifiedEntries = scoreEntries.filter(e => e.isModified && e.home_score !== '' && e.away_score !== '');
    
    if (modifiedEntries.length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há placares modificados para salvar.',
      });
      return;
    }
    
    setSaving(true);
    
    try {
      for (const entry of modifiedEntries) {
        await saveScore(entry.match.id);
      }
      
      toast({
        title: 'Placares salvos!',
        description: `${modifiedEntries.length} placar(es) registrado(s) e sincronizado(s).`,
      });
    } finally {
      setSaving(false);
    }
  };

  const syncAllScoresForRound = async () => {
    const finishedMatches = scoreEntries.filter(e => e.match.is_finished);
    
    if (finishedMatches.length === 0) {
      toast({
        title: 'Nenhum placar finalizado',
        description: 'Não há placares finalizados para sincronizar.',
        variant: 'destructive',
      });
      return;
    }
    
    setSyncing(true);
    const allResults: SyncResult[] = [];
    
    try {
      for (const entry of finishedMatches) {
        const results = await syncScoreToAdoptedPools(
          entry.match, 
          entry.match.home_score!, 
          entry.match.away_score!
        );
        allResults.push(...results);
      }
      
      setSyncResults(allResults);
      
      const successCount = allResults.filter(r => r.success).length;
      const failCount = allResults.filter(r => !r.success).length;
      
      toast({
        title: 'Sincronização concluída!',
        description: `${successCount} atualizações bem sucedidas${failCount > 0 ? `, ${failCount} falhas` : ''}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Não foi possível sincronizar os placares.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const goToPreviousRound = () => {
    if (currentRoundIndex > 0) {
      setCurrentRoundIndex(prev => prev - 1);
    }
  };

  const goToNextRound = () => {
    if (currentRoundIndex < rounds.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
    }
  };

  const finishedCount = scoreEntries.filter(e => e.match.is_finished).length;
  const modifiedCount = scoreEntries.filter(e => e.isModified).length;
  const pendingCount = scoreEntries.filter(e => !e.match.is_finished).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma rodada encontrada</h3>
            <p className="text-muted-foreground">
              Este bolão não possui rodadas configuradas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Lançar Placares - {pool.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Os placares serão sincronizados automaticamente com todos os bolões que adotaram esta sugestão
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={syncAllScoresForRound}
            disabled={syncing || finishedCount === 0}
            className="gap-2"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Ressincronizar
          </Button>
          
          {modifiedCount > 0 && (
            <Button
              onClick={saveAllScores}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Todos ({modifiedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Round Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousRound}
              disabled={currentRoundIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <div className="text-center">
              <h3 className="font-semibold text-lg">
                {currentRound?.name || `Rodada ${currentRound?.round_number}`}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">
                  {finishedCount} finalizados
                </Badge>
                <Badge variant="outline">
                  {pendingCount} pendentes
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Rodada {currentRoundIndex + 1} de {rounds.length}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextRound}
              disabled={currentRoundIndex >= rounds.length - 1}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Match Scores */}
      {scoreEntries.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum jogo cadastrado</h3>
            <p className="text-muted-foreground">
              Esta rodada não possui jogos cadastrados ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scoreEntries.map((entry) => (
            <Card 
              key={entry.match.id}
              className={`transition-all ${entry.isModified ? 'ring-2 ring-accent' : ''} ${entry.match.is_finished ? 'bg-muted/30' : ''}`}
            >
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeBR(entry.match.match_date)}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.isModified && (
                      <Badge variant="outline" className="text-accent border-accent">
                        Modificado
                      </Badge>
                    )}
                    {entry.match.is_finished && !entry.isModified && (
                      <Badge className="bg-success">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Finalizado
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 text-right">
                    <p className="font-medium text-sm truncate" title={entry.match.home_team}>
                      {entry.match.home_team}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="w-12 text-center font-bold"
                      value={entry.home_score}
                      onChange={(e) => updateScore(entry.match.id, 'home_score', e.target.value)}
                      maxLength={2}
                    />
                    <span className="text-muted-foreground font-bold">x</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      className="w-12 text-center font-bold"
                      value={entry.away_score}
                      onChange={(e) => updateScore(entry.match.id, 'away_score', e.target.value)}
                      maxLength={2}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-sm truncate" title={entry.match.away_team}>
                      {entry.match.away_team}
                    </p>
                  </div>
                </div>
                
                {entry.isModified && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveScore(entry.match.id)}
                      disabled={savingMatchId === entry.match.id}
                      className="gap-1"
                    >
                      {savingMatchId === entry.match.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sync Results */}
      {syncResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultados da Sincronização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-2 rounded-lg ${result.success ? 'bg-success/10' : 'bg-destructive/10'}`}
                >
                  <span className="font-medium">{result.poolName}</span>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm text-success">{result.matchesUpdated} atualizado(s)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">{result.error}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
