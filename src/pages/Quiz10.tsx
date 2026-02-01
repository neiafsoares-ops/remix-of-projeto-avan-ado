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
import { calculateEstimatedPrize } from '@/lib/prize-utils';
import { PrizeDisplayCard } from '@/components/PrizeDisplayCard';
import { 
  HelpCircle, 
  Users, 
  Calendar, 
  Loader2, 
  ChevronRight, 
  Trophy,
  Target,
  Zap,
  Search
} from 'lucide-react';

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  entry_fee: number;
  admin_fee_percent: number | null;
  accumulated_prize: number;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  created_by: string | null;
  participant_count?: number;
  current_round?: number;
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

export default function Quiz10() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'my-quizzes'>('available');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchQuizzes();
  }, [activeTab, debouncedSearch, user]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);

      if (activeTab === 'my-quizzes' && user) {
        // Buscar quizzes que o usuário participa
        const { data: participations } = await supabase
          .from('quiz_participants')
          .select('quiz_id')
          .eq('user_id', user.id);
        
        const quizIds = participations?.map(p => p.quiz_id) || [];
        
        if (quizIds.length === 0) {
          setQuizzes([]);
          setLoading(false);
          return;
        }

        let query = supabase
          .from('quizzes')
          .select('*')
          .in('id', quizIds)
          .order('created_at', { ascending: false });

        if (debouncedSearch) {
          query = query.ilike('name', `%${debouncedSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        await enrichQuizzesWithDetails(data || [], quizIds);
      } else {
        // Buscar todos os quizzes ativos
        let query = supabase
          .from('quizzes')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (debouncedSearch) {
          query = query.ilike('name', `%${debouncedSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Buscar participações do usuário
        let userParticipations: string[] = [];
        if (user) {
          const { data: participations } = await supabase
            .from('quiz_participants')
            .select('quiz_id')
            .eq('user_id', user.id);
          
          userParticipations = participations?.map(p => p.quiz_id) || [];
        }

        await enrichQuizzesWithDetails(data || [], userParticipations);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichQuizzesWithDetails = async (data: any[], userParticipations: string[]) => {
    // Buscar contagem de participantes e rodadas para cada quiz
    const enrichedQuizzes = await Promise.all(data.map(async (quiz) => {
      // Contar participantes
      const { count: participantCount } = await supabase
        .from('quiz_participants')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quiz.id);

      // Buscar rodada atual (última rodada não finalizada ou última criada)
      const { data: rounds } = await supabase
        .from('quiz_rounds')
        .select('round_number')
        .eq('quiz_id', quiz.id)
        .order('round_number', { ascending: false })
        .limit(1);

      // Buscar perfil do criador
      let creatorProfile = null;
      if (quiz.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('public_id, avatar_url')
          .eq('id', quiz.created_by)
          .maybeSingle();
        creatorProfile = profile;
      }

      return {
        ...quiz,
        participant_count: participantCount || 0,
        current_round: rounds?.[0]?.round_number || 0,
        creator_public_id: creatorProfile?.public_id || null,
        creator_avatar_url: creatorProfile?.avatar_url || null,
        is_participating: userParticipations.includes(quiz.id),
      };
    }));

    setQuizzes(enrichedQuizzes);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'available' | 'my-quizzes');
    setSearchQuery('');
  };

  const emptyStateMessage = useMemo(() => {
    if (debouncedSearch) {
      return {
        title: 'Nenhum quiz encontrado',
        description: `Nenhum resultado para "${debouncedSearch}"`,
      };
    }
    if (activeTab === 'my-quizzes') {
      return {
        title: 'Você ainda não participa de nenhum quiz',
        description: 'Explore os quizzes disponíveis e entre em um!',
      };
    }
    return {
      title: 'Nenhum quiz disponível',
      description: 'Aguarde novos quizzes serem criados pelo administrador.',
    };
  }, [activeTab, debouncedSearch]);

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                <Target className="h-6 w-6 text-accent-foreground" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Quiz 10</h1>
            </div>
            <p className="text-muted-foreground">
              Responda 10 perguntas, acumule pontos e seja o primeiro a atingir 10!
            </p>
          </div>
        </div>

        {/* Regras do jogo */}
        <Card className="mb-8 bg-gradient-to-r from-accent/10 to-primary/5 border-accent/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-accent" />
                <span><strong>10 perguntas</strong> por rodada</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                <span><strong>1 ponto</strong> por acerto</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" />
                <span>Primeiro a <strong>10 pontos</strong> vence</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-accent" />
                <span>Sem vencedor? <strong>Prêmio acumula!</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs e Busca */}
        <div className="space-y-4 mb-8">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="available">Quizzes Disponíveis</TabsTrigger>
              <TabsTrigger value="my-quizzes" disabled={!user}>
                Meus Quizzes
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar quiz..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {quizzes.length > 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} encontrado{quizzes.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">{emptyStateMessage.title}</h3>
              <p className="text-muted-foreground mb-6">
                {emptyStateMessage.description}
              </p>
              {!debouncedSearch && activeTab === 'my-quizzes' && (
                <Button variant="hero" onClick={() => setActiveTab('available')}>
                  Explorar Quizzes
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <Card 
                key={quiz.id} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    {quiz.cover_image ? (
                      <img 
                        src={quiz.cover_image} 
                        alt={quiz.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                        <Target className="h-6 w-6 text-accent-foreground" />
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap justify-end">
                      {quiz.is_participating && (
                        <Badge variant="default" className="bg-accent text-accent-foreground">
                          Participando
                        </Badge>
                      )}
                      <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                        {quiz.is_active ? 'Ativo' : 'Fechado'}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl mt-4">{quiz.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || 'Quiz de perguntas e respostas'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Criador */}
                  {quiz.creator_public_id && (
                    <div className="flex items-center gap-2 pb-3 border-b">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={quiz.creator_avatar_url || undefined} alt={quiz.creator_public_id} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {quiz.creator_public_id.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Criado por</span>
                        <span className="text-sm font-medium text-primary">@{quiz.creator_public_id}</span>
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{quiz.participant_count || 0} participantes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Rodada {quiz.current_round || 1}</span>
                    </div>
                  </div>
                  
                  {/* Prize Info */}
                  {(quiz.entry_fee > 0 || quiz.accumulated_prize > 0) && (
                    <PrizeDisplayCard
                      entryFee={quiz.entry_fee}
                      estimatedPrize={calculateEstimatedPrize(
                        quiz.entry_fee,
                        quiz.participant_count || 0,
                        quiz.admin_fee_percent || 0
                      )}
                      accumulatedPrize={quiz.accumulated_prize}
                      compact
                    />
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    asChild
                  >
                    <Link to={`/quiz/${quiz.id}`}>
                      {quiz.is_participating ? 'Continuar Quiz' : 'Ver Detalhes'}
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
