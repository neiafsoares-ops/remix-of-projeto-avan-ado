import React from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationItem } from './NotificationItem';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    const poolId = notification.data?.pool_id as string | undefined;
    const quizId = notification.data?.quiz_id as string | undefined;
    
    switch (notification.type) {
      // Torcida Mestre notifications - navigate to management
      case 'torcida_mestre_participant_request':
        if (poolId) navigate(`/torcida-mestre/${poolId}/manage`);
        break;
      
      // User approved - navigate to pool detail
      case 'torcida_mestre_approved':
        if (poolId) navigate(`/torcida-mestre/${poolId}`);
        break;
      
      // New round notifications
      case 'new_round':
        if (quizId) {
          navigate(`/quiz/${quizId}`);
        } else if (poolId) {
          // Check if it's a torcida mestre pool by checking notification message
          const message = notification.message || '';
          if (message.includes('Time Mestre') || message.includes('Solicite participação')) {
            navigate(`/torcida-mestre/${poolId}`);
          } else {
            navigate(`/pools/${poolId}`);
          }
        }
        break;
      
      // New participant requesting approval - navigate to management
      case 'new_participant':
        if (poolId) navigate(`/pools/${poolId}/manage`);
        break;
      
      // Regular pool notifications
      default:
        if (poolId) navigate(`/pools/${poolId}`);
        break;
    }
  };

  const NotificationList = () => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="font-semibold text-sm">Notificações</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={markAllAsRead}
          >
            <Check className="h-3 w-3" />
            Marcar todas
          </Button>
        )}
      </div>
      
      <ScrollArea className="max-h-[400px]">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          </div>
        ) : (
          <div className="p-1">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const BellButton = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
    (props, ref) => (
      <Button 
        ref={ref}
        variant="ghost" 
        size="icon" 
        className="relative" 
        aria-label="Notificações"
        {...props}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className={cn(
              "absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold",
              unreadCount > 9 && "px-1.5"
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    )
  );
  BellButton.displayName = 'BellButton';

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <BellButton />
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notificações</SheetTitle>
          </SheetHeader>
          <NotificationList />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <BellButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <NotificationList />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
