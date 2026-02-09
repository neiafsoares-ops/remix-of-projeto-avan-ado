import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Users, Calendar, Plus, Loader2, ChevronRight, Globe, Lock, Search, Clock, ArrowLeft, Target, Zap } from 'lucide-react';
import { calculateEstimatedPrize } from '@/lib/prize-utils';
import { PrizeDisplayCard } from '@/components/PrizeDisplayCard';

interface Pool {
  id: string;
  name: string;
  description: string | null;
  entry_fee: number;
  admin_fee_percent: number | null;
  max_participants: number | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  participant_count?: number;
  active_participant_count?: number;
  cover_image: string | null;
  created_by: string | null;
  creator_public_id?: string;
  creator_avatar_url?: string | null;
  is_participating?: boolean;
}

// Hook para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Pools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'my-pools'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchPools();
  }, [activeTab, debouncedSearch, user]);

  const fetchPools = async () => {
    try {
      setLoading(true);

      // Se busca por criador (começa com @)
      let creatorIdFilter: string | null = null;
      let nameSearchTerm = debouncedSearch;

      if (debouncedSearch.startsWith('@') && debouncedSearch.length > 1) {
        const username = debouncedSearch.slice(1).toLowerCase();
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .ilike('public_id', `%${username}%`);
        
        if (profileData && profileData.length > 0) {
          creatorIdFilter = profileData.map(p => p.id).join(',');
        } else {
          // Nenhum criador encontrado com esse username
          setPools([]);
          setLoading(false);
          return;
        }
        nameSearchTerm = '';
      }

      // Query base para "Meus Bolões"
      if (activeTab === 'my-pools' && user) {
        const { data: participations } = await supabase
          .from('pool_participants')
          .select('pool_id')
          .eq('user_id', user.id);
        
        const poolIds = participations?.map(p => p.pool_id) || [];
        
        if (poolIds.length === 0) {
          setPools([]);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('pools')
          .select(`*, pool_participants(count)`)
          .in('id', poolIds)
          .order('created_at', { ascending: false });

        // Aplicar filtros de busca
        if (nameSearchTerm) {
          query = query.ilike('name', `%${nameSearchTerm}%`);
        }

        if (creatorIdFilter) {
          const creatorIds = creatorIdFilter.split(',');
          query = query.in('created_by', creatorIds);
        }

        const { data, error } = await query;

        if (error) throw error;

        await enrichPoolsWithCreators(data || []);
      } else {
        // Query para "Todos Disponíveis"
        let query = supabase
          .from('pools')
          .select(`*, pool_participants(count)`)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        // Aplicar filtros de busca
        if (nameSearchTerm) {
          query = query.ilike('name', `%${nameSearchTerm}%`);
        }

        if (creatorIdFilter) {
          const creatorIds = creatorIdFilter.split(',');
          query = query.in('created_by', creatorIds);
        }

        const { data, error } = await query;

        if (error) throw error;

        await enrichPoolsWithCreators(data || []);
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichPoolsWithCreators = async (data: any[]) => {
    // Buscar perfis dos criadores
    const creatorIds = data?.map(p => p.created_by).filter(Boolean) as string[];
    const poolIds = data?.map(p => p.id) || [];
    
    let creators: { id: string; public_id: string; avatar_url: string | null }[] = [];
    if (creatorIds.length > 0) {
      const { data: creatorsData } = await supabase
        .from('profiles')
        .select('id, public_id, avatar_url')
        .in('id', creatorIds);
      
      creators = creatorsData || [];
    }

    // Buscar participações do usuário atual e contagem de participantes ativos
    let userParticipations: string[] = [];
    const activeCountMap = new Map<string, number>();

    const promises: Promise<void>[] = [];

    if (user) {
      const p = (async () => {
        const { data: participations } = await supabase
          .from('pool_participants')
          .select('pool_id')
          .eq('user_id', user.id);
        userParticipations = participations?.map(p => p.pool_id) || [];
      })();
      promises.push(p);
    }

    if (poolIds.length > 0) {
      const p = (async () => {
        const { data: activeParticipants } = await supabase
          .from('pool_participants')
          .select('pool_id, status')
          .in('pool_id', poolIds)
          .eq('status', 'active');
        (activeParticipants || []).forEach(p => {
          activeCountMap.set(p.pool_id, (activeCountMap.get(p.pool_id) || 0) + 1);
        });
      })();
      promises.push(p);
    }

    await Promise.all(promises);

    const poolsWithCount = data?.map(pool => {
      const creator = creators.find(c => c.id === pool.created_by);
      return {
        ...pool,
        participant_count: activeCountMap.get(pool.id) || 0,
        creator_public_id: creator?.public_id || null,
        creator_avatar_url: creator?.avatar_url || null,
        is_participating: userParticipations.includes(pool.id),
      };
    }) || [];

    setPools(poolsWithCount);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'available' | 'my-pools');
    setSearchQuery('');
  };

  const emptyStateMessage = useMemo(() => {
    if (debouncedSearch) {
      return {
        title: 'Nenhum bolão encontrado',
        description: `Nenhum resultado para "${debouncedSearch}"`,
      };
    }
    if (activeTab === 'my-pools') {
      return {
        title: 'Você ainda não participa de nenhum bolão',
        description: 'Explore os bolões disponíveis e entre em um!',
      };
    }
    return {
      title: 'Nenhum bolão disponível',
      description: 'Seja o primeiro a criar um bolão!',
    };
  }, [activeTab, debouncedSearch]);

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Bolões</h1>
              <p className="text-muted-foreground">
                Encontre um bolão para participar ou crie o seu próprio
              </p>
            </div>
          </div>
          
          {user && (
            <Button variant="hero" onClick={() => navigate('/dashboard')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Bolão
            </Button>
          )}
        </div>

        {/* Sistema de Pontuação */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <span className="font-medium text-primary">Esquema de pontuação:</span>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <span><strong>5 pontos</strong> placar exato</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span><strong>3 pontos</strong> vencedor + diferença de gols</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span><strong>1 ponto</strong> apenas vencedor</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs e Busca */}
        <div className="space-y-4 mb-8">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="available">Todos Disponíveis</TabsTrigger>
              <TabsTrigger value="my-pools" disabled={!user}>
                Meus Bolões
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome do bolão ou @criador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {pools.length > 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              {pools.length} bolão{pools.length !== 1 ? 'es' : ''} encontrado{pools.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pools.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">{emptyStateMessage.title}</h3>
              <p className="text-muted-foreground mb-6">
                {emptyStateMessage.description}
              </p>
              {!debouncedSearch && (
                user ? (
                  activeTab === 'my-pools' ? (
                    <Button variant="hero" onClick={() => setActiveTab('available')}>
                      Explorar Bolões
                    </Button>
                  ) : (
                    <Button variant="hero" onClick={() => navigate('/dashboard')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Bolão
                    </Button>
                  )
                ) : (
                  <Button variant="hero" onClick={() => navigate('/auth')}>
                    Entrar para Criar
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => (
              <Card 
                key={pool.id} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {pool.cover_image ? (
                      <img 
                        src={pool.cover_image} 
                        alt={pool.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap justify-end">
                      {pool.is_participating && (
                        <Badge variant="default" className="bg-accent text-accent-foreground">
                          Participando
                        </Badge>
                      )}
                      <Badge variant={pool.is_active ? 'default' : 'secondary'}>
                        {pool.is_active ? 'Ativo' : 'Fechado'}
                      </Badge>
                      <Badge variant={pool.is_public ? 'outline' : 'secondary'}>
                        {pool.is_public ? (
                          <>
                            <Globe className="h-3 w-3 mr-1" />
                            Público
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Privado
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-4">{pool.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {pool.description || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Criador do bolão */}
                  {pool.creator_public_id && (
                    <div className="flex items-center gap-2 pb-3 border-b">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={pool.creator_avatar_url || undefined} alt={pool.creator_public_id} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {pool.creator_public_id.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Criado por</span>
                        <span className="text-sm font-medium text-primary">@{pool.creator_public_id}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{pool.participant_count || 0} participantes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(pool.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  
                  {pool.entry_fee > 0 && (
                    <PrizeDisplayCard
                      entryFee={pool.entry_fee}
                      estimatedPrize={calculateEstimatedPrize(
                        pool.entry_fee,
                        pool.participant_count || 0,
                        pool.admin_fee_percent || 0
                      )}
                      compact
                    />
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    asChild
                  >
                    <Link to={`/pools/${pool.id}`}>
                      Ver Detalhes
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
