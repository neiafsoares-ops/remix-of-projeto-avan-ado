import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Ticket, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketOption {
  id: string;
  ticket_number: number;
  total_points?: number;
}

interface TicketSelectorProps {
  tickets: TicketOption[];
  activeTicketId: string | undefined;
  onTicketChange: (ticketId: string) => void;
  onCreateTicket?: () => Promise<void>;
  allowMultipleTickets?: boolean;
  maxTickets?: number;
  className?: string;
  disabled?: boolean;
}

export function TicketSelector({
  tickets,
  activeTicketId,
  onTicketChange,
  onCreateTicket,
  allowMultipleTickets = false,
  maxTickets = 10,
  className,
  disabled = false,
}: TicketSelectorProps) {
  const [creating, setCreating] = useState(false);

  const handleCreateTicket = async () => {
    if (!onCreateTicket) return;
    setCreating(true);
    try {
      await onCreateTicket();
    } finally {
      setCreating(false);
    }
  };

  // If no multiple tickets, don't show selector
  if (!allowMultipleTickets || tickets.length <= 1) {
    return null;
  }

  const canCreateMore = tickets.length < maxTickets;
  const activeTicket = tickets.find(t => t.id === activeTicketId);

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Palpite:</span>
      </div>

      <Select
        value={activeTicketId}
        onValueChange={onTicketChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-auto min-w-[140px]">
          <SelectValue placeholder="Selecione o ticket">
            {activeTicket && (
              <span className="flex items-center gap-2">
                #{activeTicket.ticket_number}
                {activeTicket.total_points !== undefined && activeTicket.total_points > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {activeTicket.total_points} pts
                  </Badge>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tickets.map((ticket) => (
            <SelectItem key={ticket.id} value={ticket.id}>
              <span className="flex items-center gap-2">
                Palpite #{ticket.ticket_number}
                {ticket.total_points !== undefined && ticket.total_points > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {ticket.total_points} pts
                  </Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onCreateTicket && canCreateMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateTicket}
          disabled={disabled || creating}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Novo Palpite
            </>
          )}
        </Button>
      )}

      <span className="text-xs text-muted-foreground">
        ({tickets.length}/{maxTickets} tickets)
      </span>
    </div>
  );
}
