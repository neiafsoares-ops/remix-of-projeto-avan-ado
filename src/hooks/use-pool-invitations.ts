import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface PoolInvitation {
  id: string;
  pool_id: string;
  inviter_id: string;
  invitee_email: string | null;
  invitee_username: string | null;
  token: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  created_at: string;
  expires_at: string | null;
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
  invitee_profile?: {
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
  sendInvitation: (userId: string, username: string) => Promise<boolean>;
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
      // Fetch invitations without join (profiles doesn't have fkey from invitations)
      const { data, error } = await supabase
        .from('pool_invitations')
        .select('*')
        .eq('pool_id', poolId)
        .in('status', ['pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // For each invitation with invitee_username, fetch the profile
      const invitationsWithProfiles = await Promise.all(
        (data || []).map(async (inv: any) => {
          if (inv.invitee_username) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, public_id, avatar_url, numeric_id')
              .eq('public_id', inv.invitee_username)
              .maybeSingle();
            
            return { ...inv, invitee_profile: profile };
          }
          return inv;
        })
      );
      
      setPoolInvitations(invitationsWithProfiles as PoolInvitation[]);
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
      // First get the user's public_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('public_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.public_id) {
        setMyInvitations([]);
        return;
      }
      
      // Fetch invitations where invitee_username matches
      const { data, error } = await supabase
        .from('pool_invitations')
        .select(`
          *,
          pool:pools(id, name, description)
        `)
        .eq('invitee_username', profile.public_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch inviter profiles
      const invitationsWithInviters = await Promise.all(
        (data || []).map(async (inv: any) => {
          if (inv.inviter_id) {
            const { data: inviterProfile } = await supabase
              .from('profiles')
              .select('id, full_name, public_id')
              .eq('id', inv.inviter_id)
              .maybeSingle();
            
            return { ...inv, inviter: inviterProfile };
          }
          return inv;
        })
      );
      
      setMyInvitations(invitationsWithInviters as PoolInvitation[]);
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
      
      // Check if has pending invitation (by username)
      const { data: invitation } = await supabase
        .from('pool_invitations')
        .select('id')
        .eq('pool_id', poolId)
        .eq('invitee_username', users.public_id)
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
  const sendInvitation = async (userId: string, username: string): Promise<boolean> => {
    if (!poolId || !user) return false;
    
    try {
      const { error } = await supabase
        .from('pool_invitations')
        .insert({
          pool_id: poolId,
          invitee_username: username,
          inviter_id: user.id,
          status: 'pending'
        });

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
        .from('pool_invitations')
        .update({ status: 'cancelled' })
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
      const tokenValue = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      
      const { error } = await supabase
        .from('pool_invitations')
        .insert({
          pool_id: poolId,
          inviter_id: user.id,
          token: tokenValue,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;
      
      const baseUrl = window.location.origin;
      return `${baseUrl}/pools/${poolId}?invite=${tokenValue}`;
    } catch (error) {
      console.error('Error generating shareable link:', error);
      toast.error('Erro ao gerar link de convite');
      return null;
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitationId: string): Promise<{ success: boolean; poolId?: string }> => {
    if (!user) return { success: false };
    
    try {
      // Get the invitation details first
      const { data: invitation, error: invError } = await supabase
        .from('pool_invitations')
        .select('pool_id, status')
        .eq('id', invitationId)
        .single();
      
      if (invError || !invitation) {
        toast.error('Convite não encontrado');
        return { success: false };
      }
      
      if (invitation.status !== 'pending') {
        toast.error('Este convite não está mais disponível');
        return { success: false };
      }
      
      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('pool_participants')
        .select('id')
        .eq('pool_id', invitation.pool_id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingParticipant) {
        // Update invitation to accepted and return
        await supabase
          .from('pool_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitationId);
        
        toast.info('Você já é participante deste bolão');
        return { success: true, poolId: invitation.pool_id };
      }
      
      // Add as participant
      const { error: participantError } = await supabase
        .from('pool_participants')
        .insert({
          pool_id: invitation.pool_id,
          user_id: user.id,
          status: 'active'
        });
      
      if (participantError) {
        throw participantError;
      }
      
      // Update invitation status
      await supabase
        .from('pool_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);
      
      toast.success('Convite aceito! Você agora é participante do bolão.');
      await fetchMyInvitations();
      return { success: true, poolId: invitation.pool_id };
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
        .from('pool_invitations')
        .update({ status: 'rejected' })
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
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    
    try {
      // Find invitation by token
      const { data: invitation, error: invError } = await supabase
        .from('pool_invitations')
        .select('id, pool_id, status, expires_at')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (invError || !invitation) {
        return { success: false, error: 'Convite não encontrado ou expirado' };
      }
      
      // Check expiry
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return { success: false, error: 'Este convite expirou' };
      }
      
      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('pool_participants')
        .select('id')
        .eq('pool_id', invitation.pool_id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingParticipant) {
        return { success: true, poolId: invitation.pool_id };
      }
      
      // Add as participant
      const { error: participantError } = await supabase
        .from('pool_participants')
        .insert({
          pool_id: invitation.pool_id,
          user_id: user.id,
          status: 'active'
        });
      
      if (participantError) {
        throw participantError;
      }
      
      toast.success('Você entrou no bolão!');
      return { success: true, poolId: invitation.pool_id };
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
