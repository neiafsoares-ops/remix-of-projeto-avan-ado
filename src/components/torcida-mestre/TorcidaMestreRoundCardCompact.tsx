import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Save, Loader2 } from 'lucide-react';
import type { TorcidaMestreRound, TorcidaMestrePool, TorcidaMestrePrediction } from '@/types/torcida-mestre';
import { isAfterDeadline, formatDateShortBR, formatTimeBR } from '@/lib/date-utils';
import { toast } from 'sonner';

interface TorcidaMestreRoundCardCompactProps {
  round: TorcidaMestreRound;
  pool: TorcidaMestrePool;
  userPrediction?: TorcidaMestrePrediction | null;
  isApproved: boolean;
  hasPendingRequest?: boolean;
  onSavePrediction?: (homeScore: number, awayScore: number) => Promise<void>;
  activeTicketNumber?: number;
}

export function TorcidaMestreRoundCardCompact({ 
  round, 
  pool, 
  userPrediction, 
  isApproved,
  hasPendingRequest = false,
  onSavePrediction,
  activeTicketNumber = 1,
}: TorcidaMestreRoundCardCompactProps) {
  const [homeScore, setHomeScore] = useState<string>(userPrediction?.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState<string>(userPrediction?.away_score?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    setHomeScore(userPrediction?.home_score?.toString() ?? '');
    setAwayScore(userPrediction?.away_score?.toString() ?? '');
  }, [userPrediction]);
  
  const deadlinePassed = isAfterDeadline(round.prediction_deadline);
  
  const handleSave = async () => {
    if (!onSavePrediction) return;
    
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error('Por favor, insira placares válidos');
      return;
    }
    
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
      <CardContent className="p-4 space-y-3">
        {/* Header with round name and status */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {round.name || `Rodada ${round.round_number}`}
          </h3>
          {round.is_finished ? (
            <Badge variant="secondary" className="text-xs">Encerrada</Badge>
          ) : deadlinePassed ? (
            <Badge variant="destructive" className="text-xs">Prazo encerrado</Badge>
          ) : (
            <Badge className="bg-emerald-500 text-xs">Aberta</Badge>
          )}
        </div>
        
        {/* Match Display - Compact */}
        <div className="flex items-center justify-center gap-2">
          <div className="text-center flex-1">
            {pool.club_image ? (
              <img 
                src={pool.club_image} 
                alt={pool.club_name}
                className="h-8 w-8 mx-auto mb-1 object-contain"
              />
            ) : (
              <div className="h-8 w-8 mx-auto mb-1 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
            )}
            <p className="text-xs font-medium truncate">{pool.club_name}</p>
            {round.is_home && <Badge variant="outline" className="text-[10px] mt-0.5 px-1">Casa</Badge>}
          </div>
          
          <div className="text-lg font-bold text-muted-foreground px-2">
            {round.is_finished ? (
              <span className="text-base">
                {round.is_home 
                  ? `${round.home_score ?? '-'}x${round.away_score ?? '-'}`
                  : `${round.away_score ?? '-'}x${round.home_score ?? '-'}`
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
                className="h-8 w-8 mx-auto mb-1 object-contain"
              />
            ) : (
              <div className="h-8 w-8 mx-auto mb-1 rounded-full bg-muted flex items-center justify-center">
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <p className="text-xs font-medium truncate">{round.opponent_name}</p>
            {!round.is_home && <Badge variant="outline" className="text-[10px] mt-0.5 px-1">Casa</Badge>}
          </div>
        </div>
        
        {/* Date/Time - compact */}
        <p className="text-[10px] text-center text-muted-foreground">
          {formatDateShortBR(round.match_date)} • {formatTimeBR(round.match_date)}
        </p>
        
        {/* Prediction Input - Compact */}
        {!round.is_finished && isApproved && !deadlinePassed && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-center text-muted-foreground">
              Ticket #{activeTicketNumber}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Input
                type="number"
                min="0"
                max="99"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-12 h-9 text-center text-base font-bold p-0"
                placeholder="-"
              />
              <span className="text-base font-bold text-muted-foreground">x</span>
              <Input
                type="number"
                min="0"
                max="99"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-12 h-9 text-center text-base font-bold p-0"
                placeholder="-"
              />
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 h-9"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
        
        {/* User Prediction Display (after deadline or if finished) */}
        {userPrediction && (deadlinePassed || round.is_finished) && (
          <div className={`p-2 rounded-lg text-center ${userPrediction.is_winner ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-muted/50'}`}>
            <p className="text-xs text-muted-foreground mb-0.5">Seu palpite</p>
            <p className="text-base font-bold">
              {userPrediction.home_score} x {userPrediction.away_score}
            </p>
            {userPrediction.is_winner && (
              <Badge className="mt-1 bg-emerald-500 text-[10px]">
                <Trophy className="h-3 w-3 mr-1" />
                Vencedor!
              </Badge>
            )}
          </div>
        )}
        
        {/* Pending Approval Message */}
        {!isApproved && hasPendingRequest && !round.is_finished && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Solicitação pendente de aprovação
            </p>
          </div>
        )}
        
        {/* Deadline Info - compact */}
        {!round.is_finished && !deadlinePassed && (
          <p className="text-[10px] text-center text-muted-foreground">
            Prazo: {formatDateShortBR(round.prediction_deadline)} às {formatTimeBR(round.prediction_deadline)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
