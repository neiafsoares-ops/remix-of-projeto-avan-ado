import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, AlertCircle, ArrowRight, Users } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestrePrediction, TorcidaMestreRound, TorcidaMestrePool } from '@/types/torcida-mestre';

interface RoundResultCardProps {
  round: TorcidaMestreRound;
  pool: TorcidaMestrePool;
  winners: TorcidaMestrePrediction[];
  shouldAccumulate: boolean;
  accumulationReason?: 'team_lost' | 'no_winners' | 'draw_not_allowed';
  totalPrize: number; // Calculated externally: entry_fee × participants + previous_accumulated
  participantsCount: number;
}

export function RoundResultCard({
  round,
  pool,
  winners,
  shouldAccumulate,
  accumulationReason,
  totalPrize,
  participantsCount,
}: RoundResultCardProps) {
  const adminFee = totalPrize * (pool.admin_fee_percent / 100);
  const netPrize = totalPrize - adminFee;
  const prizePerWinner = winners.length > 0 ? netPrize / winners.length : 0;

  if (!round.is_finished) {
    return null;
  }

  // Get accumulation message
  const getAccumulationMessage = () => {
    switch (accumulationReason) {
      case 'team_lost':
        return `${pool.club_name} perdeu a partida`;
      case 'no_winners':
        return 'Ninguém acertou o placar exato';
      case 'draw_not_allowed':
        return 'Empate não é premiado neste bolão';
      default:
        return 'Prêmio acumulado';
    }
  };

  return (
    <Card className={`overflow-hidden ${shouldAccumulate ? 'border-amber-500/30' : 'border-emerald-500/30'}`}>
      <CardHeader className={`pb-3 ${shouldAccumulate ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/10' : 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/10'}`}>
        <CardTitle className="flex items-center gap-2 text-lg">
          {shouldAccumulate ? (
            <>
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Resultado: Prêmio Acumulado
            </>
          ) : (
            <>
              <Trophy className="h-5 w-5 text-emerald-500" />
              Resultado: {winners.length} Vencedor(es)!
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Match Result */}
        <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            {pool.club_image ? (
              <img src={pool.club_image} alt={pool.club_name} className="h-10 w-10 mx-auto mb-1 object-contain" />
            ) : (
              <div className="h-10 w-10 mx-auto mb-1 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
            )}
            <p className="text-sm font-medium">{pool.club_name}</p>
          </div>
          
          <div className="text-center px-4">
            <p className="text-3xl font-bold">
              {round.is_home 
                ? `${round.home_score} x ${round.away_score}`
                : `${round.away_score} x ${round.home_score}`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">Placar Final</p>
          </div>
          
          <div className="text-center">
            {round.opponent_image ? (
              <img src={round.opponent_image} alt={round.opponent_name} className="h-10 w-10 mx-auto mb-1 object-contain" />
            ) : (
              <div className="h-10 w-10 mx-auto mb-1 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <p className="text-sm font-medium">{round.opponent_name}</p>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Participantes</p>
            <p className="font-bold text-base">{participantsCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Valor Bruto</p>
            <p className="font-bold text-base">{formatPrize(totalPrize)}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Taxa ({pool.admin_fee_percent}%)</p>
            <p className="font-bold text-base text-amber-600">{formatPrize(adminFee)}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground">Prêmio Líquido</p>
            <p className="font-bold text-base text-emerald-600">{formatPrize(netPrize)}</p>
          </div>
        </div>

        {shouldAccumulate ? (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              {getAccumulationMessage()}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatPrize(totalPrize)}
              </span>
              <ArrowRight className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Próxima Rodada</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-sm text-muted-foreground mb-1">Prêmio por vencedor</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatPrize(prizePerWinner)}
              </p>
            </div>
            
            {/* Winners */}
            <div className="space-y-2">
              {winners.slice(0, 5).map((winner) => (
                <div key={winner.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={winner.profiles?.avatar_url || ''} />
                    <AvatarFallback>
                      {(winner.profiles?.public_id || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">@{winner.profiles?.public_id || 'Usuário'}</p>
                    <p className="text-sm text-muted-foreground">
                      Palpite: {winner.home_score} x {winner.away_score}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500">
                    <Trophy className="h-3 w-3 mr-1" />
                    {formatPrize(prizePerWinner)}
                  </Badge>
                </div>
              ))}
              {winners.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  +{winners.length - 5} outros vencedores
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
