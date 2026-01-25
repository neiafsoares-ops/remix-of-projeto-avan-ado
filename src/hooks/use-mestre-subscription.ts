import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MestrePlanType = 'iniciante' | 'intermediario' | 'supremo';

export interface MestreSubscription {
  subscriptionId: string;
  planType: MestrePlanType;
  planName: string;
  poolLimit: number | null;
  startedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface CanCreatePoolResult {
  canCreate: boolean;
  reason: string;
  currentPools: number;
  poolLimit: number | null;
  planType: MestrePlanType | null;
  planExpired: boolean;
  isCommonMember?: boolean;
}

interface MestrePlan {
  id: string;
  plan_type: MestrePlanType;
  name: string;
  pool_limit: number | null;
}

interface MestreSubscriptionRow {
  id: string;
  plan_id: string;
  started_at: string;
  expires_at: string;
  is_active: boolean;
  mestre_plans: MestrePlan;
}

export function useMestreSubscription(userId: string | undefined) {
  const [subscription, setSubscription] = useState<MestreSubscription | null>(null);
  const [canCreateResult, setCanCreateResult] = useState<CanCreatePoolResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMestreBolao, setIsMestreBolao] = useState(false);

  const countUserPools = useCallback(async (currentUserId: string): Promise<number> => {
    try {
      const { count, error: countError } = await supabase
        .from('pools')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', currentUserId);

      if (countError) {
        console.error('Error counting pools:', countError);
        return 0;
      }
      return count || 0;
    } catch {
      return 0;
    }
  }, []);

  const checkCanCreate = useCallback(async (
    sub: MestreSubscription | null, 
    userIsAdmin: boolean,
    userIsMestre: boolean,
    currentUserId: string
  ): Promise<CanCreatePoolResult> => {
    // Admins have unlimited access
    if (userIsAdmin) {
      return {
        canCreate: true,
        reason: 'Administrador tem acesso ilimitado',
        currentPools: 0,
        poolLimit: null,
        planType: null,
        planExpired: false,
      };
    }

    // If user has mestre_bolao role but no subscription data yet
    // (tables may not exist or subscription logic is pending)
    if (userIsMestre && !sub) {
      const currentPools = await countUserPools(currentUserId);
      return {
        canCreate: true,
        reason: 'Mestre do Bolão - permissão concedida',
        currentPools,
        poolLimit: null,
        planType: null,
        planExpired: false,
      };
    }

    // No active subscription and not a mestre - allow common members 1 pool with limits
    if (!sub || !sub.isActive) {
      const currentPools = await countUserPools(currentUserId);
      const memberPoolLimit = 1; // Common members can create 1 pool
      
      if (currentPools < memberPoolLimit) {
        return {
          canCreate: true,
          reason: 'Membro comum: você pode criar 1 bolão com limites de estrutura',
          currentPools,
          poolLimit: memberPoolLimit,
          planType: null,
          planExpired: false,
          isCommonMember: true,
        };
      }
      
      return {
        canCreate: false,
        reason: 'Limite de 1 bolão atingido. Torne-se Mestre para criar mais!',
        currentPools,
        poolLimit: memberPoolLimit,
        planType: null,
        planExpired: false,
        isCommonMember: true,
      };
    }

    // Count active pools for this user
    const currentPools = await countUserPools(currentUserId);

    // Supremo plan has unlimited pools
    if (sub.poolLimit === null) {
      return {
        canCreate: true,
        reason: 'Plano Supremo: bolões ilimitados',
        currentPools,
        poolLimit: null,
        planType: sub.planType,
        planExpired: false,
      };
    }

    // Check against limit
    if (currentPools < sub.poolLimit) {
      return {
        canCreate: true,
        reason: `Você pode criar mais ${sub.poolLimit - currentPools} bolão(ões)`,
        currentPools,
        poolLimit: sub.poolLimit,
        planType: sub.planType,
        planExpired: false,
      };
    }

    return {
      canCreate: false,
      reason: `Limite de ${sub.poolLimit} bolões atingido. Faça upgrade para criar mais.`,
      currentPools,
      poolLimit: sub.poolLimit,
      planType: sub.planType,
      planExpired: false,
      isCommonMember: false,
    };
  }, [countUserPools]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check user roles
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        const roles = rolesData?.map(r => r.role) || [];
        const userIsAdmin = roles.includes('admin');
        const userIsMestre = roles.includes('mestre_bolao');
        setIsAdmin(userIsAdmin);
        setIsMestreBolao(userIsMestre);

        let currentSub: MestreSubscription | null = null;

        // Try to get subscription data (tables may not exist yet)
        try {
          const { data: subData, error: subError } = await (supabase as any)
            .from('mestre_subscriptions')
            .select(`
              id,
              plan_id,
              started_at,
              expires_at,
              is_active,
              mestre_plans (
                id,
                plan_type,
                name,
                pool_limit
              )
            `)
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('expires_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!subError && subData?.mestre_plans) {
            const plan = subData.mestre_plans as MestrePlan;
            currentSub = {
              subscriptionId: subData.id,
              planType: plan.plan_type,
              planName: plan.name,
              poolLimit: plan.pool_limit,
              startedAt: subData.started_at,
              expiresAt: subData.expires_at,
              isActive: subData.is_active,
            };
          }
        } catch (tableError) {
          // Tables don't exist yet - this is expected during initial setup
          console.log('Subscription tables not yet available');
        }

        setSubscription(currentSub);

        // Check if user can create pools
        const result = await checkCanCreate(currentSub, userIsAdmin, userIsMestre, userId);
        setCanCreateResult(result);

      } catch (err: any) {
        console.error('Error fetching subscription:', err);
        setError(err.message || 'Erro ao buscar assinatura');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [userId, checkCanCreate]);

  const refetch = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const result = await checkCanCreate(subscription, isAdmin, isMestreBolao, userId);
      setCanCreateResult(result);
    } catch (err: any) {
      console.error('Error refetching:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, subscription, isAdmin, isMestreBolao, checkCanCreate]);

  return {
    subscription,
    canCreateResult,
    loading,
    error,
    isAdmin,
    isMestreBolao,
    refetch,
  };
}
