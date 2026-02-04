import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DollarSign, Trophy, Users, Percent, Wallet } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestrePrediction, TorcidaMestreRound, TorcidaMestrePool } from '@/types/torcida-mestre';

interface RoundFinancialSummaryProps {
  round: TorcidaMestreRound;
  pool: TorcidaMestrePool;
  winners: TorcidaMestrePrediction[];
  participantsCount: number;
  shouldAccumulate: boolean;
  accumulationReason?: 'team_lost' | 'no_winners' | 'draw_not_allowed';
  totalPrize: number; // Calculated externally: entry_fee × participants + previous_accumulated
}

export function RoundFinancialSummary({
  round,
  pool,
  winners,
  participantsCount,
  shouldAccumulate,
  accumulationReason,
  totalPrize,
}: RoundFinancialSummaryProps) {
  const adminFee = totalPrize * (pool.admin_fee_percent / 100);
  const netPrize = totalPrize - adminFee;
  const prizePerWinner = winners.length > 0 ? netPrize / winners.length : 0;

  if (!round.is_finished) {
    return null;
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-amber-500" />
          Resumo Financeiro da Rodada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Financial Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Wallet className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Valor Bruto</p>
            <p className="font-bold text-lg">{formatPrize(totalPrize)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Percent className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Taxa Admin ({pool.admin_fee_percent}%)</p>
            <p className="font-bold text-lg text-amber-600">{formatPrize(adminFee)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Prêmio Líquido</p>
            <p className="font-bold text-lg text-emerald-600">{formatPrize(netPrize)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Participantes</p>
            <p className="font-bold text-lg">{participantsCount}</p>
          </div>
        </div>

        {/* Result */}
        {shouldAccumulate ? (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {accumulationReason === 'team_lost' && `${pool.club_name} perdeu a partida`}
              {accumulationReason === 'no_winners' && 'Ninguém acertou o placar exato'}
              {accumulationReason === 'draw_not_allowed' && 'Empate não premiado'}
            </p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              Prêmio de {formatPrize(totalPrize)} acumulado para próxima rodada!
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              O valor total será automaticamente transferido ao criar nova rodada.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {winners.length} vencedor(es) • {formatPrize(prizePerWinner)} cada
              </p>
            </div>
            
            {/* Winners List */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Vencedores:</p>
              <div className="grid grid-cols-2 gap-2">
                {winners.map((winner) => (
                  <div key={winner.id} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={winner.profiles?.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {(winner.profiles?.public_id || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">@{winner.profiles?.public_id || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground">
                        {winner.home_score} x {winner.away_score}
                      </p>
                    </div>
                    <Badge className="bg-emerald-500 text-xs">
                      {formatPrize(prizePerWinner)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
