import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Users, ChevronRight, CheckCircle } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestreGameWithRounds } from '@/types/torcida-mestre';

interface GameCardProps {
  game: TorcidaMestreGameWithRounds;
  isSelected?: boolean;
  onClick?: () => void;
}

export function GameCard({ game, isSelected, onClick }: GameCardProps) {
  const roundsCount = game.rounds?.length || 0;
  const finishedRounds = game.rounds?.filter(r => r.is_finished).length || 0;
  const currentRound = game.current_round;
  const participantsCount = game.participants_count || 0;

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-amber-500 bg-amber-500/5' 
          : game.is_finished 
            ? 'opacity-75 hover:opacity-100' 
            : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Jogo {game.game_number}
          </CardTitle>
          <div className="flex items-center gap-2">
            {game.is_finished ? (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Finalizado
              </Badge>
            ) : game.is_active ? (
              <Badge className="bg-emerald-500 text-xs">Ativo</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Pendente</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{finishedRounds}/{roundsCount} rodadas</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{participantsCount}</span>
            </div>
          </div>
        </div>

        {/* Prize Info */}
        {game.total_accumulated > 0 && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-600 dark:text-amber-400">
                {game.is_finished ? 'Prêmio Final' : 'Acumulado'}
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {formatPrize(game.total_accumulated)}
              </span>
            </div>
          </div>
        )}

        {/* Current Round Preview */}
        {currentRound && !game.is_finished && (
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Rodada atual</p>
            <p className="text-sm font-medium truncate">
              {currentRound.name || `Rodada ${currentRound.round_number}`}
            </p>
            <p className="text-xs text-muted-foreground">
              vs {currentRound.opponent_name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
