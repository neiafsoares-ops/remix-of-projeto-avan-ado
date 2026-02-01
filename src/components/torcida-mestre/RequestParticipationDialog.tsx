import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Users, Ticket } from 'lucide-react';
import { formatPrize } from '@/lib/torcida-mestre-utils';

interface RequestParticipationDialogProps {
  entryFee: number;
  onConfirm: (ticketCount: number) => Promise<void>;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function RequestParticipationDialog({
  entryFee,
  onConfirm,
  trigger,
  disabled = false,
}: RequestParticipationDialogProps) {
  const [open, setOpen] = useState(false);
  const [ticketCount, setTicketCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const estimatedTotal = entryFee * ticketCount;

  const handleConfirm = async () => {
    if (ticketCount < 1) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(ticketCount);
      setOpen(false);
      setTicketCount(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" disabled={disabled}>
            <Users className="h-4 w-4 mr-2" />
            Solicitar Participação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-amber-500" />
            Solicitar Participação
          </DialogTitle>
          <DialogDescription>
            Informe quantos tickets você deseja adquirir. Após a confirmação, aguarde a aprovação do administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ticketCount">Quantidade de Tickets</Label>
            <Input
              id="ticketCount"
              type="number"
              min={1}
              max={10}
              value={ticketCount}
              onChange={(e) => setTicketCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="text-center text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground text-center">
              Máximo de 10 tickets por rodada
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor por ticket:</span>
              <span>{formatPrize(entryFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantidade:</span>
              <span>{ticketCount} ticket(s)</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Estimado:</span>
              <span className="text-amber-600">{formatPrize(estimatedTotal)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            O administrador receberá sua solicitação e entrará em contato para confirmar o pagamento.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || ticketCount < 1}
            className="bg-amber-500 hover:bg-amber-600 text-amber-950"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Ticket className="h-4 w-4 mr-2" />
                Confirmar Solicitação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
