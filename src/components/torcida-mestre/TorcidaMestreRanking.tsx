import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Crown, Award } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestrePrediction } from '@/types/torcida-mestre';

interface TorcidaMestreRankingProps {
  winners: TorcidaMestrePrediction[];
  totalPrize: number;
  adminFeePercent: number;
  isFinished: boolean;
  resultMessage?: string;
}

export function TorcidaMestreRanking({
  winners,
  totalPrize,
  adminFeePercent,
  isFinished,
  resultMessage
}: TorcidaMestreRankingProps) {
  if (!isFinished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Vencedores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            A rodada ainda não foi encerrada
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate prize per winner
  const prizeAfterFee = totalPrize * (1 - adminFeePercent / 100);
  const prizePerWinner = winners.length > 0 ? prizeAfterFee / winners.length : 0;
  
  if (winners.length === 0) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="bg-gradient-to-r from-amber-500/10 to-amber-600/10">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
              <Crown className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {resultMessage || 'Prêmio Acumulado!'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                O prêmio de {formatPrize(totalPrize)} será adicionado à próxima rodada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-emerald-500" />
          Vencedores ({winners.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-center mb-4 p-3 rounded-lg bg-emerald-500/10">
          <p className="text-sm text-muted-foreground">Prêmio por vencedor</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatPrize(prizePerWinner)}
          </p>
        </div>
        
        <div className="space-y-3">
          {winners.map((winner, index) => (
            <div 
              key={winner.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={winner.profiles?.avatar_url || ''} />
                  <AvatarFallback>
                    {winner.profiles?.public_id?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                {index === 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <Award className="h-3 w-3 text-amber-950" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  @{winner.profiles?.public_id || 'Usuário'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Palpite: {winner.home_score} x {winner.away_score}
                </p>
              </div>
              
              <Badge className="bg-emerald-500 text-emerald-950">
                {formatPrize(prizePerWinner)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
