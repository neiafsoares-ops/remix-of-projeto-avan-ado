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
import { Loader2, Ticket } from 'lucide-react';
import { formatBRL } from '@/lib/prize-utils';

interface JoinWithTicketsDialogProps {
  entryFee: number;
  onConfirm: (ticketCount: number) => Promise<void>;
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  maxTickets?: number;
  requiresApproval?: boolean;
  disabled?: boolean;
}

export function JoinWithTicketsDialog({
  entryFee,
  onConfirm,
  trigger,
  title = 'Participar',
  description = 'Informe quantos palpites você deseja adquirir.',
  maxTickets = 10,
  requiresApproval = false,
  disabled = false,
}: JoinWithTicketsDialogProps) {
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
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ticketCount">Quantidade de Palpites</Label>
            <Input
              id="ticketCount"
              type="number"
              min={1}
              max={maxTickets}
              value={ticketCount}
              onChange={(e) => setTicketCount(Math.max(1, Math.min(maxTickets, parseInt(e.target.value) || 1)))}
              className="text-center text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground text-center">
              Máximo de {maxTickets} palpites
            </p>
          </div>

          {entryFee > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor por palpite:</span>
                <span>{formatBRL(entryFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantidade:</span>
                <span>{ticketCount} palpite(s)</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total Estimado:</span>
                <span className="text-primary">{formatBRL(estimatedTotal)}</span>
              </div>
            </div>
          )}

          {requiresApproval && (
            <p className="text-xs text-muted-foreground text-center">
              O administrador receberá sua solicitação e entrará em contato para confirmar o pagamento.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || ticketCount < 1 || disabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Ticket className="h-4 w-4 mr-2" />
                {requiresApproval ? 'Solicitar Participação' : 'Confirmar'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
