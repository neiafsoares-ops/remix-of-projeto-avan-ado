import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Trophy, Save, Loader2 } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestreRound, TorcidaMestrePool, TorcidaMestrePrediction } from '@/types/torcida-mestre';
import { isAfterDeadline, formatDateBR, formatTimeBR, formatDateShortBR } from '@/lib/date-utils';
import { toast } from 'sonner';

interface TorcidaMestreRoundCardProps {
  round: TorcidaMestreRound;
  pool: TorcidaMestrePool;
  userPrediction?: TorcidaMestrePrediction | null;
  isApproved: boolean;
  hasPendingRequest?: boolean;
  onSavePrediction?: (homeScore: number, awayScore: number) => Promise<void>;
}

export function TorcidaMestreRoundCard({ 
  round, 
  pool, 
  userPrediction, 
  isApproved,
  hasPendingRequest = false,
  onSavePrediction 
}: TorcidaMestreRoundCardProps) {
  const [homeScore, setHomeScore] = useState<string>(userPrediction?.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState<string>(userPrediction?.away_score?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Sincronizar estado quando userPrediction mudar (ex: após aprovação)
  useEffect(() => {
    setHomeScore(userPrediction?.home_score?.toString() ?? '');
    setAwayScore(userPrediction?.away_score?.toString() ?? '');
  }, [userPrediction]);
  
  const deadlinePassed = isAfterDeadline(round.prediction_deadline);
  
  const totalPrize = round.accumulated_prize + round.previous_accumulated;
  
  const handleSave = async () => {
    if (!onSavePrediction) return;
    
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Por favor, insira placares válidos');
      return;
    }
    
    // Validar se o palpite é uma vitória do clube (ou empate se permitido)
    const clubWins = round.is_home ? home > away : away > home;
    const isDraw = home === away;
    
    if (!clubWins && !isDraw) {
      toast.error(`Você não pode apostar em derrota do ${pool.club_name}!`);
      return;
    }
    
    if (isDraw && !pool.allow_draws) {
      toast.error('Empates não são permitidos neste bolão. Aposte em vitória do clube!');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSavePrediction(home, away);
      toast.success('Palpite salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar palpite');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card className={`overflow-hidden ${round.is_finished ? 'opacity-80' : ''}`}>
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 to-amber-600/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {round.name || `Rodada ${round.round_number}`}
          </CardTitle>
          {round.is_finished ? (
            <Badge variant="secondary">Encerrada</Badge>
          ) : deadlinePassed ? (
            <Badge variant="destructive">Prazo encerrado</Badge>
          ) : (
            <Badge className="bg-emerald-500">Aberta</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Match Display */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center flex-1">
            {pool.club_image ? (
              <img 
                src={pool.club_image} 
                alt={pool.club_name}
                className="h-12 w-12 mx-auto mb-2 object-contain"
              />
            ) : (
              <div className="h-12 w-12 mx-auto mb-2 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
            )}
            <p className="text-sm font-medium truncate">{pool.club_name}</p>
            {round.is_home && <Badge variant="outline" className="text-xs mt-1">Casa</Badge>}
          </div>
          
          <div className="text-2xl font-bold text-muted-foreground px-4">
            {round.is_finished ? (
              <span>
                {round.is_home 
                  ? `${round.home_score ?? '-'} x ${round.away_score ?? '-'}`
                  : `${round.away_score ?? '-'} x ${round.home_score ?? '-'}`
                }
              </span>
            ) : (
              <span>vs</span>
            )}
          </div>
          
          <div className="text-center flex-1">
            {round.opponent_image ? (
              <img 
                src={round.opponent_image} 
                alt={round.opponent_name}
                className="h-12 w-12 mx-auto mb-2 object-contain"
              />
            ) : (
              <div className="h-12 w-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                <Trophy className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm font-medium truncate">{round.opponent_name}</p>
            {!round.is_home && <Badge variant="outline" className="text-xs mt-1">Casa</Badge>}
          </div>
        </div>
        
        {/* Date and Time */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDateShortBR(round.match_date)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatTimeBR(round.match_date)}
          </div>
        </div>
        
        {/* Prize Info */}
        {totalPrize > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-sm text-muted-foreground">Prêmio: </span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {formatPrize(totalPrize)}
            </span>
            {round.previous_accumulated > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                (+ {formatPrize(round.previous_accumulated)} acumulado)
              </span>
            )}
          </div>
        )}
        
        {/* Prediction Input */}
        {!round.is_finished && isApproved && !deadlinePassed && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Seu palpite</p>
            <div className="flex items-center justify-center gap-3">
              <Input
                type="number"
                min="0"
                max="99"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-16 text-center text-lg font-bold"
                placeholder="-"
              />
              <span className="text-lg font-bold text-muted-foreground">x</span>
              <Input
                type="number"
                min="0"
                max="99"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-16 text-center text-lg font-bold"
                placeholder="-"
              />
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Palpite
            </Button>
          </div>
        )}
        
        {/* User Prediction Display (after deadline or if finished) */}
        {userPrediction && (deadlinePassed || round.is_finished) && (
          <div className={`p-3 rounded-lg text-center ${userPrediction.is_winner ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-muted/50'}`}>
            <p className="text-sm text-muted-foreground mb-1">Seu palpite</p>
            <p className="text-xl font-bold">
              {userPrediction.home_score} x {userPrediction.away_score}
            </p>
            {userPrediction.is_winner && (
              <Badge className="mt-2 bg-emerald-500">
                <Trophy className="h-3 w-3 mr-1" />
                Vencedor!
              </Badge>
            )}
          </div>
        )}
        
        {/* Pending Approval Message - Only show if user has pending request */}
        {!isApproved && hasPendingRequest && !round.is_finished && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Sua solicitação está pendente de aprovação
            </p>
          </div>
        )}
        
        {/* Deadline Info */}
        {!round.is_finished && !deadlinePassed && (
          <p className="text-xs text-center text-muted-foreground">
            Prazo: {formatDateBR(round.prediction_deadline)} às {formatTimeBR(round.prediction_deadline)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
