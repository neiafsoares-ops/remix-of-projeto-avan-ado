import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notifyNewRoundCreated } from '@/lib/notification-utils';

export interface Round {
  id: string;
  pool_id: string;
  round_number: number;
  name: string | null;
  match_limit: number;
  is_limit_approved: boolean;
  extra_matches_allowed: number;
  is_finalized: boolean | null;
  finalized_at: string | null;
  created_at: string;
  match_count?: number;
}

export interface LimitRequest {
  id: string;
  round_id: string;
  requested_by: string;
  requested_extra_matches: number;
  justification: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  round_name?: string;
  pool_name?: string;
  requester_public_id?: string;
}

export function useRounds(poolId: string | undefined) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalRoundCount, setGlobalRoundCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const checkAdminRole = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.user.id);
      
      const hasAdmin = roles?.some(r => r.role === 'admin') || false;
      setIsAdmin(hasAdmin);
      return hasAdmin;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  };

  const fetchGlobalRoundCount = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return 0;
      
      const { data, error } = await supabase.rpc('count_user_rounds', {
        user_uuid: user.user.id
      });
      
      if (error) {
        console.error('Error fetching global round count:', error);
        return 0;
      }
      
      return data || 0;
    } catch (error) {
      console.error('Error in fetchGlobalRoundCount:', error);
      return 0;
    }
  };

  const fetchRounds = async () => {
    if (!poolId) return;
    
    try {
      const { data: roundsData, error } = await supabase
        .from('rounds')
        .select('*')
        .eq('pool_id', poolId)
        .order('round_number', { ascending: true });

      if (error) throw error;

      // Fetch global round count and check admin status
      const globalCount = await fetchGlobalRoundCount();
      setGlobalRoundCount(globalCount);
      await checkAdminRole();

      // Get match counts for each round
      if (roundsData && roundsData.length > 0) {
        const roundIds = roundsData.map(r => r.id);
        const { data: matches } = await supabase
          .from('matches')
          .select('round_id')
          .in('round_id', roundIds);

        const roundsWithCounts = roundsData.map(round => ({
          ...round,
          match_count: matches?.filter(m => m.round_id === round.id).length || 0,
        }));

        setRounds(roundsWithCounts);
      } else {
        setRounds([]);
      }
    } catch (error) {
      console.error('Error fetching rounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRound = async (roundNumber: number, name?: string) => {
    if (!poolId) return false;

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Verificar se é admin (admins não têm limite de rodadas)
      const userIsAdmin = await checkAdminRole();
      
      // Verificar limite global de rodadas (20 rodadas no total) - apenas para não-admins
      if (!userIsAdmin) {
        const currentGlobalCount = await fetchGlobalRoundCount();
        if (currentGlobalCount >= 20) {
          toast({
            title: 'Limite de rodadas atingido',
            description: 'Você atingiu o limite de 20 rodadas do plano Mestre do Bolão. Distribua seus jogos nas rodadas existentes.',
            variant: 'destructive',
          });
          return false;
        }
      }

      const roundName = name || `Rodada ${roundNumber}`;

      const { error } = await supabase
        .from('rounds')
        .insert({
          pool_id: poolId,
          round_number: roundNumber,
          name: roundName,
          created_by: user.user.id,
          match_limit: 15,
        });

      if (error) throw error;

      // Buscar nome do bolão para notificação
      const { data: poolData } = await supabase
        .from('pools')
        .select('name')
        .eq('id', poolId)
        .single();

      // Notificar participantes sobre nova rodada
      if (poolData) {
        await notifyNewRoundCreated(
          poolId,
          poolData.name,
          roundName,
          user.user.id
        );
      }

      toast({
        title: 'Rodada criada!',
        description: `Rodada ${roundNumber} adicionada ao bolão.`,
      });

      await fetchRounds();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a rodada.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteRound = async (roundId: string) => {
    try {
      // First, update matches to remove round association
      await supabase
        .from('matches')
        .update({ round_id: null })
        .eq('round_id', roundId);

      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);

      if (error) throw error;

      toast({
        title: 'Rodada excluída!',
        description: 'A rodada foi removida. Os jogos não foram excluídos.',
      });

      await fetchRounds();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir a rodada.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateRound = async (roundId: string, updates: { name?: string }) => {
    try {
      const { error } = await supabase
        .from('rounds')
        .update(updates)
        .eq('id', roundId);

      if (error) throw error;

      toast({
        title: 'Rodada atualizada!',
      });

      await fetchRounds();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar a rodada.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const requestLimitIncrease = async (roundId: string, extraMatches: number, justification: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('round_limit_requests')
        .insert({
          round_id: roundId,
          requested_by: user.user.id,
          user_id: user.user.id,
          requested_extra_matches: extraMatches,
          justification,
        } as any);

      if (error) throw error;

      toast({
        title: 'Solicitação enviada!',
        description: 'Aguarde a aprovação para adicionar mais jogos.',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a solicitação.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [poolId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!poolId) return;

    const channel = supabase
      .channel(`rounds-${poolId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `pool_id=eq.${poolId}` },
        () => fetchRounds()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poolId]);

  return {
    rounds,
    loading,
    fetchRounds,
    createRound,
    deleteRound,
    updateRound,
    requestLimitIncrease,
    globalRoundCount,
    maxRoundsReached: !isAdmin && globalRoundCount >= 20,
    isAdmin,
  };
}

export function useLimitRequests() {
  const [requests, setRequests] = useState<LimitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('round_limit_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch round and pool info
        const roundIds = [...new Set(data.map(r => r.round_id))];
        const { data: roundsData } = await supabase
          .from('rounds')
          .select('id, name, round_number, pool_id')
          .in('id', roundIds);

        const poolIds = [...new Set(roundsData?.map(r => r.pool_id) || [])];
        const { data: poolsData } = await supabase
          .from('pools')
          .select('id, name')
          .in('id', poolIds);

        const requesterIds = [...new Set(data.map(r => r.requested_by))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, public_id')
          .in('id', requesterIds);

        const requestsWithDetails = data.map(request => {
          const round = roundsData?.find(r => r.id === request.round_id);
          const pool = poolsData?.find(p => p.id === round?.pool_id);
          const requester = profilesData?.find(p => p.id === request.requested_by);

          return {
            ...request,
            round_name: round?.name || `Rodada ${round?.round_number}`,
            pool_name: pool?.name || 'Bolão',
            requester_public_id: requester?.public_id || 'Usuário',
          };
        });

        setRequests(requestsWithDetails);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching limit requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string, roundId: string, extraMatches: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      // Update request status
      const { error: reqError } = await supabase
        .from('round_limit_requests')
        .update({
          status: 'approved',
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // Update round to allow extra matches
      const { data: currentRound } = await supabase
        .from('rounds')
        .select('extra_matches_allowed')
        .eq('id', roundId)
        .single();

      const { error: roundError } = await supabase
        .from('rounds')
        .update({
          is_limit_approved: true,
          extra_matches_allowed: (currentRound?.extra_matches_allowed || 0) + extraMatches,
          limit_approved_by: user.user.id,
          limit_approved_at: new Date().toISOString(),
        })
        .eq('id', roundId);

      if (roundError) throw roundError;

      // Log audit
      await supabase.rpc('insert_audit_log', {
        p_action: 'LIMIT_EXCEPTION_APPROVED',
        p_table_name: 'round_limit_requests',
        p_record_id: requestId,
        p_new_data: { round_id: roundId, extra_matches: extraMatches },
      });

      toast({
        title: 'Solicitação aprovada!',
        description: `Foram liberados ${extraMatches} jogos extras.`,
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível aprovar a solicitação.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const rejectRequest = async (requestId: string, notes?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('round_limit_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.user.id,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Solicitação rejeitada.',
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível rejeitar a solicitação.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('limit-requests')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'round_limit_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    requests,
    loading,
    fetchRequests,
    approveRequest,
    rejectRequest,
    pendingCount: requests.filter(r => r.status === 'pending').length,
  };
}
