import { Check, Clock, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export interface TicketStatus {
  id: string;
  ticket_number: number;
  prediction?: { home_score: number; away_score: number } | null;
  status: 'filled' | 'empty';
  progress?: { filled: number; total: number };
}

interface TicketStatusPanelProps {
  tickets: TicketStatus[];
  activeTicketId: string;
  onTicketSelect: (ticketId: string) => void;
  variant: 'torcida-mestre' | 'pool' | 'quiz';
  className?: string;
  disabled?: boolean;
}

export function TicketStatusPanel({
  tickets,
  activeTicketId,
  onTicketSelect,
  variant,
  className,
  disabled = false,
}: TicketStatusPanelProps) {
  if (tickets.length <= 1) return null;

  const getStatusIcon = (ticket: TicketStatus) => {
    if (variant === 'torcida-mestre') {
      return ticket.status === 'filled' ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Clock className="h-4 w-4 text-amber-500" />
      );
    }
    return ticket.status === 'filled' ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <Clock className="h-4 w-4 text-muted-foreground" />
    );
  };

  const getTicketLabel = (ticket: TicketStatus) => {
    if (variant === 'torcida-mestre') {
      if (ticket.status === 'filled' && ticket.prediction) {
        return `${ticket.prediction.home_score}x${ticket.prediction.away_score}`;
      }
      return 'Não palpitou';
    }

    if (ticket.progress) {
      return `${ticket.progress.filled}/${ticket.progress.total}`;
    }

    return ticket.status === 'filled' ? 'Completo' : 'Pendente';
  };

  const getProgressPercent = (ticket: TicketStatus) => {
    if (ticket.progress) {
      return (ticket.progress.filled / ticket.progress.total) * 100;
    }
    return ticket.status === 'filled' ? 100 : 0;
  };

  const variantStyles = {
    'torcida-mestre': 'border-amber-500/20',
    'pool': 'border-primary/20',
    'quiz': 'border-accent/20',
  };

  return (
    <Card className={cn('mb-4', variantStyles[variant], className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          Tickets da Rodada
          <Badge variant="secondary" className="ml-auto">
            {tickets.filter(t => t.status === 'filled').length}/{tickets.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const isActive = ticket.id === activeTicketId;
            const progressPercent = getProgressPercent(ticket);

            return (
              <button
                key={ticket.id}
                onClick={() => !disabled && onTicketSelect(ticket.id)}
                disabled={disabled}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  isActive
                    ? 'bg-primary/10 border-primary/30 ring-2 ring-primary/20'
                    : 'bg-muted/30 border-transparent hover:bg-muted/50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(ticket)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      Ticket #{ticket.ticket_number}
                    </span>
                    <span className={cn(
                      'text-xs',
                      ticket.status === 'filled' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                    )}>
                      {getTicketLabel(ticket)}
                    </span>
                  </div>

                  {variant !== 'torcida-mestre' && (
                    <Progress 
                      value={progressPercent} 
                      className="h-1.5"
                    />
                  )}
                </div>

                {isActive && (
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    Ativo
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
