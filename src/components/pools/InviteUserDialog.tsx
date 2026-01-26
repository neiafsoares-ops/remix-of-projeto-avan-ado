import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  UserPlus, 
  Loader2, 
  UserCheck, 
  Clock,
  AlertCircle 
} from 'lucide-react';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function InviteUserDialog({ open, onOpenChange, poolId }: InviteUserDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [sending, setSending] = useState(false);
  
  const { searchUser, searchingUser, sendInvitation } = usePoolInvitations(poolId);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setHasSearched(true);
    const result = await searchUser(searchQuery);
    setSearchedUser(result);
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
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchedUser(null);
    setHasSearched(false);
    onOpenChange(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            Busque por ID numérico (ex: 00123) ou nome de usuário (ex: @joao123)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar usuário</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Digite ID ou @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={searchingUser || !searchQuery.trim()}
                size="icon"
              >
                {searchingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search Result */}
          {hasSearched && (
            <div className="border rounded-lg p-4">
              {searchedUser ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={searchedUser.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(searchedUser.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {searchedUser.full_name || 'Usuário sem nome'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {searchedUser.public_id && (
                          <span>@{searchedUser.public_id}</span>
                        )}
                        {searchedUser.numeric_id != null && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            #{String(searchedUser.numeric_id).padStart(5, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {searchedUser.isAlreadyParticipant ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span>Este usuário já é participante do bolão</span>
                    </div>
                  ) : searchedUser.hasPendingInvitation ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span>Já existe um convite pendente para este usuário</span>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleSendInvite} 
                      className="w-full"
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
                <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <p className="text-sm">Nenhum usuário encontrado</p>
                  <p className="text-xs text-center">
                    Verifique se o ID numérico ou nome de usuário está correto
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
