import { 
  Mail, 
  MessageSquare, 
  Calendar, 
  Star, 
  AlertTriangle, 
  UserPlus, 
  Shield, 
  Trophy,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  Megaphone,
  Bell
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification, NotificationType } from '@/hooks/use-notifications';

const iconMap: Record<NotificationType, { icon: typeof Mail; colorClass: string }> = {
  invitation_received: { icon: Mail, colorClass: 'text-primary' },
  invitation_accepted: { icon: CheckCircle, colorClass: 'text-green-500' },
  invitation_rejected: { icon: XCircle, colorClass: 'text-red-500' },
  message_received: { icon: MessageSquare, colorClass: 'text-blue-500' },
  round_updated: { icon: Calendar, colorClass: 'text-green-500' },
  new_round: { icon: Bell, colorClass: 'text-primary' },
  new_suggestion: { icon: Star, colorClass: 'text-yellow-500' },
  plan_expiring: { icon: AlertTriangle, colorClass: 'text-orange-500' },
  plan_expiring_30: { icon: Clock, colorClass: 'text-yellow-500' },
  plan_expiring_15: { icon: Clock, colorClass: 'text-orange-400' },
  plan_expiring_7: { icon: AlertTriangle, colorClass: 'text-orange-500' },
  plan_expiring_1: { icon: AlertTriangle, colorClass: 'text-red-500' },
  plan_expired: { icon: AlertTriangle, colorClass: 'text-red-600' },
  became_mestre: { icon: Crown, colorClass: 'text-yellow-500' },
  new_participant: { icon: UserPlus, colorClass: 'text-green-500' },
  moderator_action: { icon: Shield, colorClass: 'text-purple-500' },
  scores_updated: { icon: Trophy, colorClass: 'text-primary' },
  admin_broadcast: { icon: Megaphone, colorClass: 'text-accent' },
  torcida_mestre_participant_request: { icon: UserPlus, colorClass: 'text-amber-500' },
  torcida_mestre_approved: { icon: CheckCircle, colorClass: 'text-green-500' },
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  onClick 
}: NotificationItemProps) {
  const { icon: Icon, colorClass } = iconMap[notification.type] || iconMap.message_received;
  
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors group",
        notification.is_read 
          ? "bg-transparent hover:bg-muted/50" 
          : "bg-primary/5 hover:bg-primary/10"
      )}
      onClick={handleClick}
    >
      <div className={cn("mt-0.5 p-1.5 rounded-full bg-muted", colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium truncate",
            !notification.is_read && "font-semibold"
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
        
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
