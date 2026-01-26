import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Clock, Mail } from 'lucide-react';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingInvitationsProps {
  poolId: string;
}

export function PendingInvitations({ poolId }: PendingInvitationsProps) {
  const { poolInvitations, loadingPoolInvitations, cancelInvitation } = usePoolInvitations(poolId);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loadingPoolInvitations) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (poolInvitations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-muted-foreground">
          Convites Pendentes ({poolInvitations.length})
        </h4>
      </div>
      
      <div className="space-y-2">
        {poolInvitations.map((invitation) => (
          <div 
            key={invitation.id} 
            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={invitation.invitee_profile?.avatar_url || undefined} />
              <AvatarFallback>
                {getInitials(invitation.invitee_profile?.full_name || invitation.invitee_username || null)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">
                {invitation.invitee_profile?.full_name || invitation.invitee_username || 'Usuário'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {(invitation.invitee_profile?.public_id || invitation.invitee_username) && (
                  <span>@{invitation.invitee_profile?.public_id || invitation.invitee_username}</span>
                )}
                {invitation.invitee_profile?.numeric_id != null && (
                  <span className="bg-muted px-1 rounded">
                    #{String(invitation.invitee_profile.numeric_id).padStart(5, '0')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(invitation.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => cancelInvitation(invitation.id)}
                title="Cancelar convite"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
