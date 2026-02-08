import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Clock, Ticket, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from '@/components/ui/carousel';

export interface TicketCarouselItem {
  id: string;
  ticket_number: number;
  prediction?: { home_score: number; away_score: number } | null;
  status: 'filled' | 'empty';
  progress?: { filled: number; total: number };
}

interface TicketCarouselProps {
  tickets: TicketCarouselItem[];
  activeTicketId: string;
  onTicketSelect: (ticketId: string) => void;
  variant: 'torcida-mestre' | 'pool' | 'quiz';
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function TicketCarousel({
  tickets,
  activeTicketId,
  onTicketSelect,
  variant,
  className,
  disabled = false,
  title = 'Tickets da Rodada',
}: TicketCarouselProps) {
  const carouselApiRef = useRef<CarouselApi | null>(null);

  // Sync carousel position with activeTicketId
  useEffect(() => {
    if (!carouselApiRef.current) return;
    const activeIndex = tickets.findIndex(t => t.id === activeTicketId);
    if (activeIndex >= 0) {
      carouselApiRef.current.scrollTo(activeIndex);
    }
  }, [activeTicketId, tickets]);

  // Handle carousel slide change
  const handleSlideChange = useCallback(() => {
    if (!carouselApiRef.current) return;
    const selectedIndex = carouselApiRef.current.selectedScrollSnap();
    const selectedTicket = tickets[selectedIndex];
    if (selectedTicket && selectedTicket.id !== activeTicketId && !disabled) {
      onTicketSelect(selectedTicket.id);
    }
  }, [tickets, activeTicketId, onTicketSelect, disabled]);

  const setApi = useCallback((api: CarouselApi) => {
    carouselApiRef.current = api;
    if (!api) return;
    
    api.on('select', handleSlideChange);
    
    // Sync to current active ticket on mount
    const activeIndex = tickets.findIndex(t => t.id === activeTicketId);
    if (activeIndex >= 0) {
      api.scrollTo(activeIndex, true);
    }
  }, [tickets, activeTicketId, handleSlideChange]);

  if (tickets.length <= 1) return null;

  const getStatusIcon = (ticket: TicketCarouselItem) => {
    if (variant === 'torcida-mestre') {
      return ticket.status === 'filled' ? (
        <Check className="h-5 w-5 text-emerald-500" />
      ) : (
        <Clock className="h-5 w-5 text-amber-500" />
      );
    }
    return ticket.status === 'filled' ? (
      <Check className="h-5 w-5 text-emerald-500" />
    ) : (
      <Clock className="h-5 w-5 text-muted-foreground" />
    );
  };

  const getTicketLabel = (ticket: TicketCarouselItem) => {
    if (variant === 'torcida-mestre') {
      if (ticket.status === 'filled' && ticket.prediction) {
        return `${ticket.prediction.home_score}x${ticket.prediction.away_score}`;
      }
      return 'Não palpitou';
    }

    if (ticket.progress) {
      return `${ticket.progress.filled}/${ticket.progress.total} jogos`;
    }

    return ticket.status === 'filled' ? 'Completo' : 'Pendente';
  };

  const getProgressPercent = (ticket: TicketCarouselItem) => {
    if (ticket.progress) {
      return (ticket.progress.filled / ticket.progress.total) * 100;
    }
    return ticket.status === 'filled' ? 100 : 0;
  };

  const currentIndex = tickets.findIndex(t => t.id === activeTicketId);
  const filledCount = tickets.filter(t => t.status === 'filled').length;
  const unusedCount = tickets.filter(t => t.status === 'empty').length;

  const variantStyles = {
    'torcida-mestre': 'border-amber-500/20',
    'pool': 'border-primary/20',
    'quiz': 'border-accent/20',
  };

  const goToPrevious = () => {
    if (carouselApiRef.current) {
      carouselApiRef.current.scrollPrev();
    }
  };

  const goToNext = () => {
    if (carouselApiRef.current) {
      carouselApiRef.current.scrollNext();
    }
  };

  return (
    <Card className={cn('mb-4', variantStyles[variant], className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            {title}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {filledCount}/{tickets.length} completos
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Unused tickets warning */}
        {unusedCount > 0 && !disabled && (
          <div className="flex items-center gap-2 p-2 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Você possui {unusedCount} ticket(s) não preenchidos.
            </p>
          </div>
        )}

        {/* Navigation controls */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            disabled={disabled || currentIndex <= 0}
            className="h-8 px-3"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <span className="text-sm font-medium">
            Ticket {currentIndex + 1} de {tickets.length}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={disabled || currentIndex >= tickets.length - 1}
            className="h-8 px-3"
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Carousel */}
        <Carousel
          setApi={setApi}
          opts={{
            align: 'center',
            containScroll: 'trimSnaps',
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {tickets.map((ticket) => {
              const isActive = ticket.id === activeTicketId;
              const progressPercent = getProgressPercent(ticket);

              return (
                <CarouselItem key={ticket.id} className="pl-2 basis-full">
                  <div
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      isActive
                        ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20'
                        : 'bg-muted/30 border-transparent',
                      disabled && 'opacity-50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          ticket.status === 'filled' 
                            ? 'bg-emerald-500/20' 
                            : 'bg-muted'
                        )}>
                          {getStatusIcon(ticket)}
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            Ticket #{ticket.ticket_number}
                          </h4>
                          <p className={cn(
                            'text-sm',
                            ticket.status === 'filled' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-muted-foreground'
                          )}>
                            {getTicketLabel(ticket)}
                          </p>
                        </div>
                      </div>
                      
                      {isActive && (
                        <Badge variant="default" className="bg-primary">
                          Ativo
                        </Badge>
                      )}
                    </div>

                    {variant !== 'torcida-mestre' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    )}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-3">
          {tickets.map((ticket, index) => (
            <button
              key={ticket.id}
              onClick={() => !disabled && onTicketSelect(ticket.id)}
              disabled={disabled}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                ticket.id === activeTicketId
                  ? 'bg-primary w-4'
                  : ticket.status === 'filled'
                    ? 'bg-emerald-500'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Ir para ticket ${ticket.ticket_number}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
