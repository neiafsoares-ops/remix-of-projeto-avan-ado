import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Trophy, Users, ChevronRight, UserPlus } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestrePoolWithRounds } from '@/types/torcida-mestre';

interface TorcidaMestreCardProps {
  pool: TorcidaMestrePoolWithRounds;
}

export function TorcidaMestreCard({ pool }: TorcidaMestreCardProps) {
  const currentRound = pool.current_round;
  const hasAccumulated = (pool.total_accumulated ?? 0) > 0;
  const participantsCount = pool.participants_count ?? 0;
  
  // Estimativa de premiação: (participantes * entrada + acumulado) - taxa administrativa
  const grossPrize = (pool.entry_fee * participantsCount) + (pool.total_accumulated ?? 0);
  const adminFee = pool.admin_fee_percent ?? 0;
  const estimatedPrize = grossPrize * (1 - adminFee / 100);
  
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-amber-500/30 bg-gradient-to-br from-background to-amber-500/5 overflow-hidden">
      {/* Cover Image or Club Badge */}
      <div className="relative h-32 bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
        {pool.club_image ? (
          <img 
            src={pool.club_image} 
            alt={pool.club_name}
            className="h-20 w-20 object-contain drop-shadow-lg"
          />
        ) : (
          <Crown className="h-16 w-16 text-amber-500" />
        )}
        
        {hasAccumulated && (
          <Badge className="absolute top-3 right-3 bg-amber-500 text-amber-950 hover:bg-amber-400">
            <Trophy className="h-3 w-3 mr-1" />
            Acumulado!
          </Badge>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold line-clamp-1">
              {pool.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {pool.club_name}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {pool.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {pool.description}
          </p>
        )}
        
        {/* Participantes e Entrada */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participantsCount} participante{participantsCount !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-muted-foreground">
            Entrada: {formatPrize(pool.entry_fee)}
          </span>
        </div>
        
        {/* Empates valem */}
        {pool.allow_draws && (
          <Badge variant="outline" className="text-xs">
            Empates valem
          </Badge>
        )}
        
        {/* Estimativa de Premiação */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {hasAccumulated ? 'Prêmio Acumulado' : 'Estimativa de Prêmio'}
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatPrize(estimatedPrize)}
            </span>
          </div>
        </div>
        
        {currentRound && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Próximo jogo</p>
            <p className="text-sm font-medium">
              {pool.club_name} vs {currentRound.opponent_name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(currentRound.match_date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
        
        {/* Botões lado a lado */}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/torcida-mestre/${pool.id}`}>
              Ver Bolão
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button asChild className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950">
            <Link to={`/torcida-mestre/${pool.id}`}>
              <UserPlus className="h-4 w-4 mr-1" />
              Participar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
