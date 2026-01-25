import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface PoolInvitation {
  id: string;
  pool_id: string;
  invited_user_id: string | null;
  invited_by: string;
  invite_token: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  // Joined data
  pool?: {
    id: string;
    name: string;
    description: string | null;
  };
  inviter?: {
    id: string;
    full_name: string | null;
    public_id: string | null;
  };
  invited_user?: {
    id: string;
    full_name: string | null;
    public_id: string | null;
    avatar_url: string | null;
    numeric_id: number | null;
  };
}

interface UsePoolInvitationsResult {
  // For pool managers
  poolInvitations: PoolInvitation[];
  loadingPoolInvitations: boolean;
  sendInvitation: (userId: string) => Promise<boolean>;
  cancelInvitation: (invitationId: string) => Promise<boolean>;
  generateShareableLink: () => Promise<string | null>;
  refreshPoolInvitations: () => Promise<void>;
  
  // For invited users
  myInvitations: PoolInvitation[];
  loadingMyInvitations: boolean;
  acceptInvitation: (invitationId: string) => Promise<{ success: boolean; poolId?: string }>;
  rejectInvitation: (invitationId: string) => Promise<boolean>;
  acceptInvitationByToken: (token: string) => Promise<{ success: boolean; poolId?: string; error?: string }>;
  refreshMyInvitations: () => Promise<void>;
  
  // User search
  searchUser: (query: string) => Promise<SearchedUser | null>;
  searchingUser: boolean;
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

export function usePoolInvitations(poolId?: string): UsePoolInvitationsResult {
  const { user } = useAuth();
  const [poolInvitations, setPoolInvitations] = useState<PoolInvitation[]>([]);
  const [loadingPoolInvitations, setLoadingPoolInvitations] = useState(false);
  const [myInvitations, setMyInvitations] = useState<PoolInvitation[]>([]);
  const [loadingMyInvitations, setLoadingMyInvitations] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);

  // Fetch invitations for a specific pool (for managers)
  const fetchPoolInvitations = useCallback(async () => {
    if (!poolId || !user) return;
    
    setLoadingPoolInvitations(true);
    try {
      // Use raw query since table may not be in types yet
      const { data, error } = await supabase
        .from('pool_invitations' as any)
        .select(`
          *,
          invited_user:profiles!pool_invitations_invited_user_id_fkey(
            id,
            full_name,
            public_id,
            avatar_url,
            numeric_id
          )
        `)
        .eq('pool_id', poolId)
        .in('status', ['pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPoolInvitations((data as unknown as PoolInvitation[]) || []);
    } catch (error) {
      console.error('Error fetching pool invitations:', error);
      setPoolInvitations([]);
    } finally {
      setLoadingPoolInvitations(false);
    }
  }, [poolId, user]);

  // Fetch invitations received by the current user
  const fetchMyInvitations = useCallback(async () => {
    if (!user) return;
    
    setLoadingMyInvitations(true);
    try {
      const { data, error } = await supabase
        .from('pool_invitations' as any)
        .select(`
          *,
          pool:pools(id, name, description),
          inviter:profiles!pool_invitations_invited_by_fkey(
            id,
            full_name,
            public_id
          )
        `)
        .eq('invited_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyInvitations((data as unknown as PoolInvitation[]) || []);
    } catch (error) {
      console.error('Error fetching my invitations:', error);
      setMyInvitations([]);
    } finally {
      setLoadingMyInvitations(false);
    }
  }, [user]);

  useEffect(() => {
    if (poolId) {
      fetchPoolInvitations();
    }
    fetchMyInvitations();
  }, [fetchPoolInvitations, fetchMyInvitations, poolId]);

  // Search user by numeric_id or public_id
  const searchUser = async (query: string): Promise<SearchedUser | null> => {
    if (!query.trim() || !poolId) return null;
    
    setSearchingUser(true);
    try {
      const cleanQuery = query.trim().replace('@', '').replace('#', '');
      
      // Determine if it's a numeric search or username search
      const isNumeric = /^\d+$/.test(cleanQuery);
      
      let userQuery = supabase
        .from('profiles')
        .select('id, full_name, public_id, avatar_url, numeric_id');
      
      if (isNumeric) {
        userQuery = userQuery.eq('numeric_id', parseInt(cleanQuery, 10));
      } else {
        userQuery = userQuery.ilike('public_id', `%${cleanQuery}%`);
      }
      
      const { data: users, error } = await userQuery.limit(1).maybeSingle();
      
      if (error) throw error;
      if (!users) return null;
      
      // Check if already participant
      const { data: participant } = await supabase
        .from('pool_participants')
        .select('id')
        .eq('pool_id', poolId)
        .eq('user_id', users.id)
        .maybeSingle();
      
      // Check if has pending invitation
      const { data: invitation } = await supabase
        .from('pool_invitations' as any)
        .select('id')
        .eq('pool_id', poolId)
        .eq('invited_user_id', users.id)
        .eq('status', 'pending')
        .maybeSingle();
      
      return {
        ...users,
        isAlreadyParticipant: !!participant,
        hasPendingInvitation: !!invitation
      };
    } catch (error) {
      console.error('Error searching user:', error);
      return null;
    } finally {
      setSearchingUser(false);
    }
  };

  // Send invitation to a specific user
  const sendInvitation = async (userId: string): Promise<boolean> => {
    if (!poolId || !user) return false;
    
    try {
      const { error } = await supabase
        .from('pool_invitations' as any)
        .insert({
          pool_id: poolId,
          invited_user_id: userId,
          invited_by: user.id,
          status: 'pending'
        } as any);

      if (error) {
        if (error.code === '23505') {
          toast.error('Este usuário já possui um convite pendente');
        } else {
          throw error;
        }
        return false;
      }
      
      toast.success('Convite enviado com sucesso!');
      await fetchPoolInvitations();
      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Erro ao enviar convite');
      return false;
    }
  };

  // Cancel an invitation
  const cancelInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pool_invitations' as any)
        .update({ status: 'cancelled' } as any)
        .eq('id', invitationId);

      if (error) throw error;
      
      toast.success('Convite cancelado');
      await fetchPoolInvitations();
      return true;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Erro ao cancelar convite');
      return false;
    }
  };

  // Generate shareable link
  const generateShareableLink = async (): Promise<string | null> => {
    if (!poolId || !user) return null;
    
    try {
      // Generate a unique token
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      
      const { error } = await supabase
        .from('pool_invitations' as any)
        .insert({
          pool_id: poolId,
          invited_by: user.id,
          invite_token: token,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        } as any);

      if (error) throw error;
      
      const baseUrl = window.location.origin;
      return `${baseUrl}/pools/${poolId}?invite=${token}`;
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast.error('Erro ao gerar link de convite');
      return null;
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitationId: string): Promise<{ success: boolean; poolId?: string }> => {
    try {
      const { data, error } = await supabase
        .rpc('accept_pool_invitation' as any, { _invitation_id: invitationId });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; message?: string; error?: string; pool_id?: string };
      
      if (result.success) {
        toast.success(result.message || 'Convite aceito!');
        await fetchMyInvitations();
        return { success: true, poolId: result.pool_id };
      } else {
        toast.error(result.error || 'Erro ao aceitar convite');
        return { success: false };
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Erro ao aceitar convite');
      return { success: false };
    }
  };

  // Reject invitation
  const rejectInvitation = async (invitationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pool_invitations' as any)
        .update({ status: 'rejected' } as any)
        .eq('id', invitationId);

      if (error) throw error;
      
      toast.success('Convite recusado');
      await fetchMyInvitations();
      return true;
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('Erro ao recusar convite');
      return false;
    }
  };

  // Accept invitation by token (shareable link)
  const acceptInvitationByToken = async (token: string): Promise<{ success: boolean; poolId?: string; error?: string }> => {
    try {
      const { data, error } = await supabase
        .rpc('accept_pool_invitation_by_token' as any, { _token: token });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; message?: string; error?: string; pool_id?: string };
      
      if (result.success) {
        toast.success(result.message || 'Você entrou no bolão!');
        return { success: true, poolId: result.pool_id };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error accepting invitation by token:', error);
      return { success: false, error: 'Erro ao processar convite' };
    }
  };

  return {
    poolInvitations,
    loadingPoolInvitations,
    sendInvitation,
    cancelInvitation,
    generateShareableLink,
    refreshPoolInvitations: fetchPoolInvitations,
    
    myInvitations,
    loadingMyInvitations,
    acceptInvitation,
    rejectInvitation,
    acceptInvitationByToken,
    refreshMyInvitations: fetchMyInvitations,
    
    searchUser,
    searchingUser
  };
}
