import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Check, X, Trophy, Clock, User } from 'lucide-react';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

export function ReceivedInvitations() {
  const navigate = useNavigate();
  const { myInvitations, loadingMyInvitations, acceptInvitation, rejectInvitation } = usePoolInvitations();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    const result = await acceptInvitation(invitationId);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
    
    if (result.success && result.poolId) {
      navigate(`/pools/${result.poolId}`);
    }
  };

  const handleReject = async (invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    await rejectInvitation(invitationId);
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(invitationId);
      return next;
    });
  };

  if (loadingMyInvitations) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (myInvitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-primary" />
          Convites Pendentes
          <Badge variant="secondary" className="ml-2">
            {myInvitations.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Você foi convidado para participar destes bolões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {myInvitations.map((invitation) => (
          <div 
            key={invitation.id}
            className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg bg-background"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {invitation.pool?.name || 'Bolão'}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>
                      Convidado por {invitation.inviter?.full_name || invitation.inviter?.public_id || 'Usuário'}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(invitation.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(invitation.id)}
                disabled={processingIds.has(invitation.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Recusar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAccept(invitation.id)}
                disabled={processingIds.has(invitation.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Aceitar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
