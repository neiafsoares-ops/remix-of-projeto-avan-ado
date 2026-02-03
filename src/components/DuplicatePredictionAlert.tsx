import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DuplicatePredictionAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  duplicateScore: { home: number; away: number };
  existingTicketNumber: number;
}

export function DuplicatePredictionAlert({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  duplicateScore,
  existingTicketNumber,
}: DuplicatePredictionAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Placar Repetido
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você já possui o placar{' '}
              <span className="font-bold text-foreground">
                {duplicateScore.home}x{duplicateScore.away}
              </span>{' '}
              no <span className="font-medium">Ticket #{existingTicketNumber}</span> desta rodada.
            </p>
            <p>Deseja continuar mesmo assim?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Alterar placar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Continuar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
