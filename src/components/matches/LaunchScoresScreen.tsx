import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getPointsDescription } from '@/lib/points-utils';
import { 
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  Clock,
  Shield,
  X
} from 'lucide-react';
import { formatDateTimeBR, isBeforeDeadline } from '@/lib/date-utils';

interface Round {
  id: string;
  pool_id: string;
  round_number: number;
  name: string | null;
  match_limit: number;
  extra_matches_allowed: number;
  is_finalized: boolean | null;
  finalized_at: string | null;
}

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

interface ScoreEntry {
  match: Match;
  home_score: string;
  away_score: string;
  isModified: boolean;
}

interface LaunchScoresScreenProps {
  poolId: string;
  rounds: Round[];
  matches: Match[];
  onBack: () => void;
  onMatchesUpdate: () => void;
  initialRoundId?: string;
}

export function LaunchScoresScreen({ 
  poolId, 
  rounds, 
  matches, 
  onBack,
  onMatchesUpdate,
  initialRoundId
}: LaunchScoresScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get rounds that have matches
  const roundsWithMatches = rounds.filter(r => 
    matches.some(m => m.round_id === r.id)
  );
  
  // Find initial index based on initialRoundId
  const getInitialIndex = () => {
    if (initialRoundId) {
      const index = roundsWithMatches.findIndex(r => r.id === initialRoundId);
      return index >= 0 ? index : 0;
    }
    return 0;
  };
  
  const [currentRoundIndex, setCurrentRoundIndex] = useState(getInitialIndex);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  
  const currentRound = roundsWithMatches[currentRoundIndex];
  
  // Initialize score entries when round changes
  useEffect(() => {
    if (!currentRound) return;
    
    const roundMatches = matches.filter(m => m.round_id === currentRound.id);
    
    const entries: ScoreEntry[] = roundMatches.map(match => ({
      match,
      home_score: match.home_score?.toString() || '',
      away_score: match.away_score?.toString() || '',
      isModified: false,
    }));
    
    setScoreEntries(entries);
  }, [currentRound?.id, matches]);
  
  const updateScore = (matchId: string, field: 'home_score' | 'away_score', value: string) => {
    // Only allow numbers
    if (value && !/^\d*$/.test(value)) return;
    
    setScoreEntries(prev => prev.map(entry => 
      entry.match.id === matchId 
        ? { ...entry, [field]: value, isModified: true } 
        : entry
    ));
  };
  
  const canLaunchScore = (match: Match) => {
    // Check if deadline has passed
    if (isBeforeDeadline(match.prediction_deadline)) return false;
    // Check if already finished
    if (match.is_finished) return false;
    return true;
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
    
    const homeScore = parseInt(entry.home_score);
    const awayScore = parseInt(entry.away_score);
    
    try {
      // 1. Update the match score
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          is_finished: true,
        })
        .eq('id', matchId);
        
      if (matchError) throw matchError;
      
      // 2. Fetch all predictions for this match (each ticket is a separate prediction)
      const { data: predictionsData, error: predError } = await supabase
        .from('predictions')
        .select('id, home_score, away_score, user_id, participant_id')
        .eq('match_id', matchId);
      
      if (predError) throw predError;
      
      // 3. Calculate and update points for each prediction (per ticket)
      if (predictionsData && predictionsData.length > 0) {
        for (const prediction of predictionsData) {
          const result = getPointsDescription(
            prediction.home_score,
            prediction.away_score,
            homeScore,
            awayScore
          );
          
          // Update points_earned for this specific prediction (by participant_id)
          await supabase
            .from('predictions')
            .update({ points_earned: result.points })
            .eq('id', prediction.id);
        }
        
        // 4. Update total_points for each participant (ticket) individually
        // Get unique participant IDs from predictions
        const participantIds = [...new Set(predictionsData.map(p => p.participant_id).filter(Boolean))];
        
        for (const participantId of participantIds) {
          // Sum all points_earned for this participant across all finished matches
          const { data: participantPredictions } = await supabase
            .from('predictions')
            .select('points_earned')
            .eq('participant_id', participantId);
          
          const totalPoints = participantPredictions?.reduce(
            (sum, p) => sum + (p.points_earned || 0), 
            0
          ) || 0;
          
          await supabase
            .from('pool_participants')
            .update({ total_points: totalPoints })
            .eq('id', participantId);
        }
      }
      
      toast({
        title: 'Placar registrado!',
        description: `${entry.match.home_team} ${entry.home_score} x ${entry.away_score} ${entry.match.away_team}`,
      });
      
      setScoreEntries(prev => prev.map(e => 
        e.match.id === matchId ? { ...e, isModified: false } : e
      ));
      
      onMatchesUpdate();
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
  
  const saveAllScores = async () => {
    if (!user) return;
    
    const modifiedEntries = scoreEntries.filter(
      e => e.isModified && e.home_score !== '' && e.away_score !== '' && canLaunchScore(e.match)
    );
    
    if (modifiedEntries.length === 0) {
      toast({
        title: 'Nenhuma alteração',
        description: 'Não há placares para salvar.',
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
        description: `${modifiedEntries.length} placar(es) registrado(s) com sucesso.`,
      });
    } finally {
      setSaving(false);
    }
  };
  
  const goToPreviousRound = () => {
    if (currentRoundIndex > 0) {
      setCurrentRoundIndex(prev => prev - 1);
    }
  };
  
  const goToNextRound = () => {
    if (currentRoundIndex < roundsWithMatches.length - 1) {
      setCurrentRoundIndex(prev => prev + 1);
    }
  };
  
  const finishedCount = scoreEntries.filter(e => e.match.is_finished).length;
  const totalMatches = scoreEntries.length;
  const modifiedCount = scoreEntries.filter(e => e.isModified && e.home_score !== '' && e.away_score !== '').length;
  const pendingCount = scoreEntries.filter(e => !e.match.is_finished && canLaunchScore(e.match)).length;
  
  if (!currentRound || roundsWithMatches.length === 0) {
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
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum jogo cadastrado</h3>
            <p className="text-muted-foreground">
              Adicione jogos às rodadas para poder lançar placares.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const renderTeamImage = (imageUrl: string | null, teamName: string) => {
    if (imageUrl) {
      return (
        <img 
          src={imageUrl} 
          alt={teamName}
          className="w-10 h-10 object-contain rounded"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
        <Shield className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  };
  
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
            <h2 className="text-xl font-semibold">Lançar Placares</h2>
            <p className="text-sm text-muted-foreground">
              Registre os resultados dos jogos
            </p>
          </div>
        </div>
        
        {modifiedCount > 0 && (
          <Button 
            variant="hero" 
            onClick={saveAllScores}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Todos ({modifiedCount})
          </Button>
        )}
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
                {currentRound.name || `Rodada ${currentRound.round_number}`}
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {finishedCount}/{totalMatches} finalizados
                </Badge>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {pendingCount} pendente(s)
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Rodada {currentRoundIndex + 1} de {roundsWithMatches.length}
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={goToNextRound}
              disabled={currentRoundIndex >= roundsWithMatches.length - 1}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Match Scores Grid */}
      <div className="space-y-3">
        {scoreEntries.map((entry) => {
          const { match } = entry;
          const canEdit = canLaunchScore(match);
          const isPending = !match.is_finished && !canEdit;
          
          return (
            <Card 
              key={match.id} 
              className={`transition-all ${
                match.is_finished 
                  ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/20' 
                  : isPending 
                    ? 'opacity-60' 
                    : ''
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Home Team */}
                  <div className="flex items-center gap-3 flex-1 min-w-[140px]">
                    {renderTeamImage(match.home_team_image, match.home_team)}
                    <span className="font-medium text-sm">{match.home_team}</span>
                  </div>
                  
                  {/* Score Inputs */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={entry.home_score}
                      onChange={(e) => updateScore(match.id, 'home_score', e.target.value)}
                      disabled={!canEdit || match.is_finished}
                      className="w-14 h-12 text-center text-xl font-bold"
                      placeholder="-"
                    />
                    <span className="text-lg font-bold text-muted-foreground">x</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={entry.away_score}
                      onChange={(e) => updateScore(match.id, 'away_score', e.target.value)}
                      disabled={!canEdit || match.is_finished}
                      className="w-14 h-12 text-center text-xl font-bold"
                      placeholder="-"
                    />
                  </div>
                  
                  {/* Away Team */}
                  <div className="flex items-center gap-3 flex-1 min-w-[140px] justify-end">
                    <span className="font-medium text-sm text-right">{match.away_team}</span>
                    {renderTeamImage(match.away_team_image, match.away_team)}
                  </div>
                  
                  {/* Action/Status */}
                  <div className="flex items-center gap-2 min-w-[120px] justify-end">
                    {match.is_finished ? (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Finalizado
                      </Badge>
                    ) : isPending ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        Aguardando
                      </Badge>
                    ) : entry.isModified && entry.home_score !== '' && entry.away_score !== '' ? (
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => saveScore(match.id)}
                        disabled={savingMatchId === match.id}
                      >
                        {savingMatchId === match.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                          </>
                        )}
                      </Button>
                    ) : (
                      <Badge variant="secondary">
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Match Date */}
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  {formatDateTimeBR(match.match_date)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}