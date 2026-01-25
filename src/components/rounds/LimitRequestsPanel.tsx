import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { LimitRequest, useLimitRequests } from '@/hooks/use-rounds';
import { formatDateTimeBR } from '@/lib/date-utils';

export function LimitRequestsPanel() {
  const { 
    requests, 
    loading, 
    approveRequest, 
    rejectRequest,
    pendingCount 
  } = useLimitRequests();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<LimitRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleApprove = async (request: LimitRequest) => {
    setProcessingId(request.id);
    await approveRequest(request.id, request.round_id, request.requested_extra_matches);
    setProcessingId(null);
  };

  const openRejectDialog = (request: LimitRequest) => {
    setRejectingRequest(request);
    setRejectNotes('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    setProcessingId(rejectingRequest.id);
    await rejectRequest(rejectingRequest.id, rejectNotes);
    setRejectDialogOpen(false);
    setRejectingRequest(null);
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Solicitações de Exceção de Limite
            </CardTitle>
            <CardDescription>
              Aprove ou rejeite solicitações para exceder o limite de jogos por rodada
            </CardDescription>
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma solicitação de exceção registrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className={`p-4 rounded-lg border ${
                  request.status === 'pending' 
                    ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20' 
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{request.pool_name}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-muted-foreground">{request.round_name}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      Solicitado por: <span className="font-medium">@{request.requester_public_id}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>{request.requested_extra_matches}</strong> jogos extras solicitados
                      </span>
                      <span className="text-muted-foreground">
                        {formatDateTimeBR(request.created_at)}
                      </span>
                    </div>

                    {request.justification && (
                      <div className="mt-2 p-2 rounded bg-muted text-sm">
                        <strong>Justificativa:</strong> {request.justification}
                      </div>
                    )}

                    {request.notes && request.status === 'rejected' && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 text-sm text-destructive">
                        <strong>Motivo da rejeição:</strong> {request.notes}
                      </div>
                    )}

                    {request.reviewed_at && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {request.status === 'approved' ? 'Aprovado' : 'Rejeitado'} em {formatDateTimeBR(request.reviewed_at)}
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => openRejectDialog(request)}
                        disabled={processingId === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição (opcional).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da rejeição</Label>
              <Input
                placeholder="Ex: Limite suficiente para a competição"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId === rejectingRequest?.id}
            >
              {processingId === rejectingRequest?.id && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
