import { useState, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  UserPlus, 
  Loader2, 
  UserCheck, 
  Clock,
  AlertCircle 
} from 'lucide-react';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';

interface InviteUserInlineProps {
  poolId: string;
}

interface SearchedUser {
  id: string;
  full_name: string | null;
  public_id: string | null;
  avatar_url: string | null;
  numeric_id: number | null;
  isAlreadyParticipant: boolean;
  hasPendingInvitation: boolean;
}

export function InviteUserInline({ poolId }: InviteUserInlineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { searchUser, searchingUser, sendInvitation } = usePoolInvitations(poolId);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setHasSearched(true);
    const result = await searchUser(searchQuery);
    setSearchedUser(result);
    setPopoverOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSendInvite = async () => {
    if (!searchedUser || !searchedUser.public_id) return;
    
    setSending(true);
    const success = await sendInvitation(searchedUser.id, searchedUser.public_id);
    setSending(false);
    
    if (success) {
      setSearchQuery('');
      setSearchedUser(null);
      setHasSearched(false);
      setPopoverOpen(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePopoverChange = (open: boolean) => {
    setPopoverOpen(open);
    if (!open) {
      // Delay reset to allow animation
      setTimeout(() => {
        if (!popoverOpen) {
          setHasSearched(false);
          setSearchedUser(null);
        }
      }, 150);
    }
  };

  return (
    <Popover open={popoverOpen && hasSearched} onOpenChange={handlePopoverChange}>
      <PopoverTrigger asChild>
        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            placeholder="ID ou @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-40 sm:w-48 h-9 text-sm"
          />
          <Button 
            onClick={handleSearch} 
            disabled={searchingUser || !searchQuery.trim()}
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0"
          >
            {searchingUser ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 bg-popover">
        {searchedUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={searchedUser.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{getInitials(searchedUser.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {searchedUser.full_name || 'Usuário sem nome'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {searchedUser.public_id && (
                    <span>@{searchedUser.public_id}</span>
                  )}
                  {searchedUser.numeric_id != null && (
                    <span className="bg-muted px-1 py-0.5 rounded">
                      #{String(searchedUser.numeric_id).padStart(5, '0')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {searchedUser.isAlreadyParticipant ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <UserCheck className="h-4 w-4 text-accent-foreground shrink-0" />
                <span>Já é participante</span>
              </div>
            ) : searchedUser.hasPendingInvitation ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Convite pendente</span>
              </div>
            ) : (
              <Button 
                onClick={handleSendInvite} 
                className="w-full"
                size="sm"
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-3 text-muted-foreground">
            <AlertCircle className="h-6 w-6" />
            <p className="text-xs">Nenhum usuário encontrado</p>
            <p className="text-xs text-center opacity-70">
              Verifique o ID ou username
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
