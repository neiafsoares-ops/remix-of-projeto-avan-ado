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
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteQuizParticipantInlineProps {
  quizId: string;
  existingParticipants: { user_id: string }[];
  onSuccess: () => void;
}

interface SearchedUser {
  id: string;
  full_name: string | null;
  public_id: string | null;
  avatar_url: string | null;
  numeric_id: number | null;
  isAlreadyParticipant: boolean;
}

export function InviteQuizParticipantInline({ 
  quizId, 
  existingParticipants,
  onSuccess 
}: InviteQuizParticipantInlineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setHasSearched(true);
    
    try {
      const query = searchQuery.trim();
      const isNumeric = /^\d+$/.test(query);
      const cleanUsername = query.startsWith('@') ? query.slice(1) : query;

      let profile = null;

      if (isNumeric) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, public_id, avatar_url, numeric_id')
          .eq('numeric_id', parseInt(query))
          .maybeSingle();
        profile = data;
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, public_id, avatar_url, numeric_id')
          .ilike('public_id', cleanUsername)
          .maybeSingle();
        profile = data;
      }

      if (profile) {
        const isAlreadyParticipant = existingParticipants.some(p => p.user_id === profile.id);
        setSearchedUser({
          ...profile,
          isAlreadyParticipant,
        });
      } else {
        setSearchedUser(null);
      }
      setPopoverOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchedUser(null);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInvite = async () => {
    if (!searchedUser || !searchedUser.public_id) return;
    
    setSending(true);
    try {
      // Get next ticket number for this user
      const { data: existingTickets } = await supabase
        .from('quiz_participants')
        .select('ticket_number')
        .eq('quiz_id', quizId)
        .eq('user_id', searchedUser.id);

      const nextTicket = (existingTickets?.length || 0) + 1;

      const { error } = await supabase
        .from('quiz_participants')
        .insert({
          quiz_id: quizId,
          user_id: searchedUser.id,
          ticket_number: nextTicket,
          status: 'active',
        });

      if (error) throw error;

      toast.success(`${searchedUser.public_id} adicionado como participante!`);
      setSearchQuery('');
      setSearchedUser(null);
      setHasSearched(false);
      setPopoverOpen(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar participante');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePopoverChange = (open: boolean) => {
    setPopoverOpen(open);
    if (!open) {
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
            disabled={searching || !searchQuery.trim()}
            size="sm"
            variant="outline"
            className="h-9 w-9 p-0"
          >
            {searching ? (
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
                <span>Já é participante deste quiz</span>
              </div>
            ) : (
              <Button 
                onClick={handleInvite} 
                className="w-full"
                size="sm"
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar Participante
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
