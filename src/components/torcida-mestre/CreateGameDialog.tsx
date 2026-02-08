import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPrize } from '@/lib/torcida-mestre-utils';

interface CreateGameDialogProps {
  poolId: string;
  poolName: string;
  currentGameNumber: number;
  previousAccumulated?: number;
  onCreated?: () => void;
  trigger?: React.ReactNode;
}

export function CreateGameDialog({
  poolId,
  poolName,
  currentGameNumber,
  previousAccumulated = 0,
  onCreated,
  trigger,
}: CreateGameDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      // Use type assertion since torcida_mestre_games is a new table
      const { error } = await (supabase as any)
        .from('torcida_mestre_games')
        .insert({
          pool_id: poolId,
          game_number: currentGameNumber + 1,
          is_active: true,
          is_finished: false,
          total_accumulated: previousAccumulated,
        });

      if (error) throw error;

      toast.success(`Jogo ${currentGameNumber + 1} criado com sucesso!`);
      setOpen(false);
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast.error(error.message || 'Erro ao criar jogo');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-amber-500 hover:bg-amber-600 text-amber-950">
            <Plus className="h-4 w-4 mr-2" />
            Novo Jogo
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Criar Novo Jogo
          </DialogTitle>
          <DialogDescription>
            Inicie um novo ciclo de rodadas para o {poolName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Número do Jogo:</span>
              <span className="font-bold">Jogo {currentGameNumber + 1}</span>
            </div>
            {previousAccumulated > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prêmio Acumulado:</span>
                <span className="font-bold text-amber-600">{formatPrize(previousAccumulated)}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Ao criar um novo jogo, o prêmio acumulado será zerado (ou transferido se houver acúmulo).
            Você poderá criar rodadas dentro deste jogo.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating}
            className="bg-amber-500 hover:bg-amber-600 text-amber-950"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Jogo {currentGameNumber + 1}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
