import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProfileStatsCard } from './ProfileStatsCard';
import { Loader2, Target, HelpCircle, Heart } from 'lucide-react';

interface ProductStats {
  administered: number;
  participated: number;
  first: number;
  second: number;
  third: number;
}

interface ProfileStatsSummaryProps {
  userId: string;
}

export function ProfileStatsSummary({ userId }: ProfileStatsSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [poolStats, setPoolStats] = useState<ProductStats>({ administered: 0, participated: 0, first: 0, second: 0, third: 0 });
  const [quizStats, setQuizStats] = useState<ProductStats>({ administered: 0, participated: 0, first: 0, second: 0, third: 0 });
  const [torcidaStats, setTorcidaStats] = useState<ProductStats>({ administered: 0, participated: 0, first: 0, second: 0, third: 0 });

  useEffect(() => {
    if (userId) {
      fetchAllStats();
    }
  }, [userId]);

  const fetchAllStats = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPoolStats(),
        fetchQuizStats(),
        fetchTorcidaStats(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoolStats = async () => {
    // Count pools administered by user (finalized = all rounds finalized)
    const { data: adminPools } = await supabase
      .from('pools')
      .select('id')
      .eq('created_by', userId)
      .eq('is_active', false); // inactive = finalized
    
    // Count pools participated (active status, pool is finalized)
    const { data: participations } = await supabase
      .from('pool_participants')
      .select(`
        id,
        pool_id,
        total_points,
        status,
        pools!inner(id, is_active, created_by)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    // Filter only finalized pools
    const finalizedParticipations = participations?.filter(
      (p: any) => p.pools?.is_active === false
    ) || [];

    // For each finalized pool, get ranking position
    let first = 0, second = 0, third = 0;
    
    for (const participation of finalizedParticipations) {
      const poolId = participation.pool_id;
      
      // Get all participants of this pool ordered by points
      const { data: ranking } = await supabase
        .from('pool_participants')
        .select('user_id, total_points')
        .eq('pool_id', poolId)
        .eq('status', 'active')
        .order('total_points', { ascending: false });
      
      if (ranking) {
        const position = ranking.findIndex((r: any) => r.user_id === userId) + 1;
        if (position === 1) first++;
        else if (position === 2) second++;
        else if (position === 3) third++;
      }
    }

    // Exclude pools user created from participation count
    const participatedNotAdmin = finalizedParticipations.filter(
      (p: any) => p.pools?.created_by !== userId
    );

    setPoolStats({
      administered: adminPools?.length || 0,
      participated: participatedNotAdmin.length,
      first,
      second,
      third,
    });
  };

  const fetchQuizStats = async () => {
    // Count quizzes administered (finalized = has at least one finished round with winner)
    const { data: adminQuizzes } = await supabase
      .from('quizzes')
      .select(`
        id,
        quiz_rounds!inner(id, is_finished, has_winner)
      `)
      .eq('created_by', userId)
      .eq('is_active', false);

    // Count quiz participations in finalized quizzes
    const { data: participations } = await supabase
      .from('quiz_participants')
      .select(`
        id,
        quiz_id,
        total_points,
        status,
        quizzes!inner(id, is_active, created_by)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    const finalizedParticipations = participations?.filter(
      (p: any) => p.quizzes?.is_active === false
    ) || [];

    let first = 0, second = 0, third = 0;

    for (const participation of finalizedParticipations) {
      const quizId = participation.quiz_id;

      const { data: ranking } = await supabase
        .from('quiz_participants')
        .select('user_id, total_points')
        .eq('quiz_id', quizId)
        .eq('status', 'active')
        .order('total_points', { ascending: false });

      if (ranking) {
        const position = ranking.findIndex((r: any) => r.user_id === userId) + 1;
        if (position === 1) first++;
        else if (position === 2) second++;
        else if (position === 3) third++;
      }
    }

    const participatedNotAdmin = finalizedParticipations.filter(
      (p: any) => p.quizzes?.created_by !== userId
    );

    setQuizStats({
      administered: adminQuizzes?.length || 0,
      participated: participatedNotAdmin.length,
      first,
      second,
      third,
    });
  };

  const fetchTorcidaStats = async () => {
    // Count torcida mestre pools administered
    const { data: adminPools } = await supabase
      .from('torcida_mestre_pools')
      .select('id')
      .eq('created_by', userId)
      .eq('is_active', false);

    // For Torcida Mestre, wins are per-round (is_winner flag on predictions)
    const { data: winningPredictions } = await supabase
      .from('torcida_mestre_predictions')
      .select(`
        id,
        is_winner,
        round_id,
        torcida_mestre_rounds!inner(id, is_finished, pool_id)
      `)
      .eq('user_id', userId)
      .eq('is_winner', true);

    const finishedWins = winningPredictions?.filter(
      (p: any) => p.torcida_mestre_rounds?.is_finished === true
    ) || [];

    // Count unique rounds participated (finished rounds only)
    const { data: participations } = await supabase
      .from('torcida_mestre_participants')
      .select(`
        id,
        pool_id,
        round_id,
        status,
        torcida_mestre_rounds!inner(id, is_finished),
        torcida_mestre_pools!inner(id, created_by)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    const finishedParticipations = participations?.filter(
      (p: any) => p.torcida_mestre_rounds?.is_finished === true
    ) || [];

    // For Torcida Mestre, 1st place = winner of the round
    // We don't have 2nd/3rd for this product typically
    const participatedNotAdmin = finishedParticipations.filter(
      (p: any) => p.torcida_mestre_pools?.created_by !== userId
    );

    setTorcidaStats({
      administered: adminPools?.length || 0,
      participated: participatedNotAdmin.length,
      first: finishedWins.length,
      second: 0,
      third: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasAnyStats = 
    (poolStats.administered + poolStats.participated + poolStats.first + poolStats.second + poolStats.third) > 0 ||
    (quizStats.administered + quizStats.participated + quizStats.first + quizStats.second + quizStats.third) > 0 ||
    (torcidaStats.administered + torcidaStats.participated + torcidaStats.first + torcidaStats.second + torcidaStats.third) > 0;

  if (!hasAnyStats) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Histórico de Participação</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Estatísticas de eventos finalizados
      </p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProfileStatsCard
          title="Bolões"
          icon={<Target className="w-4 h-4" />}
          stats={poolStats}
          accentColor="bg-primary"
        />
        
        <ProfileStatsCard
          title="Quiz 10"
          icon={<HelpCircle className="w-4 h-4" />}
          stats={quizStats}
          accentColor="bg-accent"
        />
        
        <ProfileStatsCard
          title="Time Mestre"
          icon={<Heart className="w-4 h-4" />}
          stats={torcidaStats}
          accentColor="bg-emerald-600"
        />
      </div>
    </div>
  );
}
