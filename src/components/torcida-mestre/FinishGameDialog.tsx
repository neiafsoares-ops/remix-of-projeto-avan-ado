import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import type { TorcidaMestreGameWithRounds, TorcidaMestrePool } from '@/types/torcida-mestre';

interface FinishGameDialogProps {
  game: TorcidaMestreGameWithRounds;
  pool: TorcidaMestrePool;
  onFinished?: () => void;
}

export function FinishGameDialog({ game, pool, onFinished }: FinishGameDialogProps) {
  const [isFinishing, setIsFinishing] = useState(false);

  const unfinishedRounds = game.rounds?.filter(r => !r.is_finished) || [];
  const hasUnfinishedRounds = unfinishedRounds.length > 0;

  const handleFinish = async () => {
    if (hasUnfinishedRounds) {
      toast.error('Finalize todas as rodadas antes de encerrar o jogo');
      return;
    }

    setIsFinishing(true);
    try {
      // Use type assertion since torcida_mestre_games is a new table
      const { error } = await (supabase as any)
        .from('torcida_mestre_games')
        .update({ 
          is_finished: true,
          is_active: false,
        })
        .eq('id', game.id);

      if (error) throw error;

      // Show appropriate message based on accumulated prize
      if (game.total_accumulated > 0) {
        toast.success(`Jogo ${game.game_number} finalizado! ${formatPrize(game.total_accumulated)} será transferido para o próximo jogo.`);
      } else {
        toast.success(`Jogo ${game.game_number} finalizado!`);
      }
      
      onFinished?.();
    } catch (error: any) {
      console.error('Error finishing game:', error);
      toast.error(error.message || 'Erro ao finalizar jogo');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline"
          disabled={hasUnfinishedRounds}
          className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Finalizar Jogo
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Finalizar Jogo {game.game_number}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Ao finalizar este jogo, ele será movido para o histórico e você poderá criar um novo jogo.
            </p>
            
            {game.total_accumulated > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm">
                  <span className="text-muted-foreground">Prêmio acumulado: </span>
                  <span className="font-bold text-amber-600">{formatPrize(game.total_accumulated)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Este valor será transferido para o próximo jogo se não houver vencedores.
                </p>
              </div>
            )}

            {hasUnfinishedRounds && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">
                  Você tem {unfinishedRounds.length} rodada(s) não finalizada(s).
                  Finalize todas as rodadas antes de encerrar o jogo.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isFinishing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFinish}
            disabled={isFinishing || hasUnfinishedRounds}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isFinishing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Finalizar Jogo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
