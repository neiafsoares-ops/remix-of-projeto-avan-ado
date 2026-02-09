import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, Trophy, Minus, Plus } from 'lucide-react';
import { formatBRL } from '@/lib/prize-utils';
import { cn } from '@/lib/utils';

interface PreviousTicketScore {
  id: string;
  ticket_number: number;
  total_points: number;
}

interface SmartTicketJoinDialogProps {
  entryFee: number;
  previousTickets: PreviousTicketScore[];
  onConfirm: (selectedTicketNumbers: number[]) => Promise<void>;
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  maxTickets?: number;
  requiresApproval?: boolean;
  disabled?: boolean;
}

export function SmartTicketJoinDialog({
  entryFee,
  previousTickets,
  onConfirm,
  trigger,
  title = 'Participar da Nova Rodada',
  description = 'Selecione os palpites que deseja manter para esta rodada.',
  maxTickets = 10,
  requiresApproval = false,
  disabled = false,
}: SmartTicketJoinDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());

  // Sort tickets by points descending
  const sortedTickets = useMemo(() => {
    return [...previousTickets].sort((a, b) => b.total_points - a.total_points);
  }, [previousTickets]);

  // Pre-select all tickets when dialog opens
  useEffect(() => {
    if (open && previousTickets.length > 0) {
      // Pre-select all previous tickets
      const ticketNumbers = previousTickets.map(t => t.ticket_number);
      setSelectedTickets(new Set(ticketNumbers));
    }
  }, [open, previousTickets]);

  const toggleTicket = (ticketNumber: number) => {
    setSelectedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketNumber)) {
        newSet.delete(ticketNumber);
      } else {
        if (newSet.size < maxTickets) {
          newSet.add(ticketNumber);
        }
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const ticketNumbers = previousTickets.map(t => t.ticket_number).slice(0, maxTickets);
    setSelectedTickets(new Set(ticketNumbers));
  };

  const deselectAll = () => {
    setSelectedTickets(new Set());
  };

  const estimatedTotal = entryFee * selectedTickets.size;

  const handleConfirm = async () => {
    if (selectedTickets.size < 1) return;
    
    setIsSubmitting(true);
    try {
      await onConfirm(Array.from(selectedTickets).sort((a, b) => a - b));
      setOpen(false);
      setSelectedTickets(new Set());
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get position indicator based on ranking
  const getPositionBadge = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-accent" />;
    if (index === 1) return <span className="text-xs text-muted-foreground">2º</span>;
    if (index === 2) return <span className="text-xs text-muted-foreground">3º</span>;
    return <span className="text-xs text-muted-foreground">{index + 1}º</span>;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
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
          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedTickets.size} de {previousTickets.length} selecionados
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                disabled={selectedTickets.size === 0}
              >
                <Minus className="h-3 w-3 mr-1" />
                Limpar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={selectedTickets.size === previousTickets.length}
              >
                <Plus className="h-3 w-3 mr-1" />
                Todos
              </Button>
            </div>
          </div>

          {/* Ticket List - Sorted by score */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {sortedTickets.map((ticket, index) => {
              const isSelected = selectedTickets.has(ticket.ticket_number);
              
              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                    isSelected
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/30 border-transparent hover:bg-muted/50'
                  )}
                  onClick={() => toggleTicket(ticket.ticket_number)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleTicket(ticket.ticket_number)}
                    className="pointer-events-none"
                  />
                  
                  <div className="flex-shrink-0 w-6 flex justify-center">
                    {getPositionBadge(index)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Palpite #{ticket.ticket_number}</span>
                    </div>
                  </div>
                  
                  <Badge variant="outline" className="flex-shrink-0">
                    {ticket.total_points} pts
                  </Badge>
                  
                  {entryFee > 0 && (
                    <span className="text-sm text-muted-foreground flex-shrink-0">
                      {formatBRL(entryFee)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total Section */}
          {entryFee > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor por palpite:</span>
                <span>{formatBRL(entryFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Palpites selecionados:</span>
                <span>{selectedTickets.size}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total a Pagar:</span>
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
            disabled={isSubmitting || selectedTickets.size < 1 || disabled}
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
