import { DollarSign, Trophy } from 'lucide-react';
import { formatBRL } from '@/lib/prize-utils';

interface PrizeDisplayCardProps {
  entryFee: number;
  estimatedPrize: number;
  accumulatedPrize?: number;
  compact?: boolean;
}

export function PrizeDisplayCard({
  entryFee,
  estimatedPrize,
  accumulatedPrize = 0,
  compact = false,
}: PrizeDisplayCardProps) {
  const showEntryFee = entryFee > 0;
  const showEstimatedPrize = estimatedPrize > 0;
  const showAccumulatedPrize = accumulatedPrize > 0 && !showEstimatedPrize;

  if (!showEntryFee && !showEstimatedPrize && !showAccumulatedPrize) {
    return null;
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'mt-2'}`}>
      {/* Taxa de Inscrição - Sub-quadro escuro */}
      {showEntryFee && (
        <div className="prize-box-dark">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground font-medium">
              <DollarSign className="h-3.5 w-3.5" />
              Taxa de Inscrição
            </span>
            <span className="font-bold text-foreground text-base">
              {formatBRL(entryFee)}
            </span>
          </div>
        </div>
      )}

      {/* Prêmio Estimado - Sub-quadro com destaque laranja */}
      {showEstimatedPrize && (
        <div className="prize-box-highlight">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-accent-foreground/80 font-medium">
              <Trophy className="h-3.5 w-3.5" />
              Prêmio Estimado
            </span>
            <span className={`font-bold text-warning ${compact ? 'text-base' : 'text-lg'}`}>
              {formatBRL(estimatedPrize)}
            </span>
          </div>
        </div>
      )}

      {/* Prêmio Acumulado (para quizzes sem taxa) */}
      {showAccumulatedPrize && (
        <div className="prize-box-highlight">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-accent-foreground/80 font-medium">
              <Trophy className="h-3.5 w-3.5" />
              Prêmio Acumulado
            </span>
            <span className={`font-bold text-warning ${compact ? 'text-base' : 'text-lg'}`}>
              {formatBRL(accumulatedPrize)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
