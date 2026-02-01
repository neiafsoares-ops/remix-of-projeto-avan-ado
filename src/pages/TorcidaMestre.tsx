import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TorcidaMestreCard } from '@/components/torcida-mestre/TorcidaMestreCard';
import { CreateTorcidaMestreDialog } from '@/components/torcida-mestre/CreateTorcidaMestreDialog';
import { Crown, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { TorcidaMestrePoolWithRounds } from '@/types/torcida-mestre';

export default function TorcidaMestre() {
  const [pools, setPools] = useState<TorcidaMestrePoolWithRounds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  
  const fetchPools = async () => {
    setIsLoading(true);
    try {
      const { data: poolsData, error: poolsError } = await supabase
        .from('torcida_mestre_pools')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (poolsError) throw poolsError;
      
      // Fetch rounds for each pool
      const poolsWithRounds = await Promise.all(
        (poolsData || []).map(async (pool) => {
          const { data: rounds } = await supabase
            .from('torcida_mestre_rounds')
            .select('*')
            .eq('pool_id', pool.id)
            .order('round_number', { ascending: false });
          
          const currentRound = rounds?.find(r => !r.is_finished);
          const totalAccumulated = rounds?.reduce((acc, r) => {
            if (!r.is_finished) return acc + (r.accumulated_prize || 0) + (r.previous_accumulated || 0);
            return acc;
          }, 0) || 0;
          
          return {
            ...pool,
            rounds: rounds || [],
            current_round: currentRound,
            total_accumulated: totalAccumulated,
          } as TorcidaMestrePoolWithRounds;
        })
      );
      
      setPools(poolsWithRounds);
    } catch (error) {
      console.error('Error fetching pools:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    setIsAdmin(data === true);
  };
  
  useEffect(() => {
    fetchPools();
  }, []);
  
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);
  
  const filteredPools = pools.filter(pool =>
    pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pool.club_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Torcida Mestre</h1>
              <p className="text-muted-foreground">
                Bolões por time - Acerte o placar exato!
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <CreateTorcidaMestreDialog onCreated={fetchPools} />
          )}
        </div>
        
        {/* Search */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou clube..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-16">
            <Crown className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'Nenhum bolão encontrado' : 'Nenhum bolão disponível'}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery 
                ? 'Tente buscar por outro termo'
                : 'Aguarde a criação de novos bolões Torcida Mestre'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPools.map(pool => (
              <TorcidaMestreCard key={pool.id} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
