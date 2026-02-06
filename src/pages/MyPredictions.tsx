import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Target, Users, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react';

interface PoolPrediction {
  poolId: string;
  poolName: string;
  totalPredictions: number;
  totalPoints: number;
  ticketNumber: number;
}

interface QuizPrediction {
  quizId: string;
  quizName: string;
  totalAnswers: number;
  correctAnswers: number;
  totalPoints: number;
  ticketNumber: number;
}

interface TorcidaPrediction {
  poolId: string;
  poolName: string;
  clubName: string;
  clubImage: string | null;
  totalPredictions: number;
  totalWins: number;
  totalPrize: number;
  ticketNumbers: number[];
}

export default function MyPredictions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [poolPredictions, setPoolPredictions] = useState<PoolPrediction[]>([]);
  const [quizPredictions, setQuizPredictions] = useState<QuizPrediction[]>([]);
  const [torcidaPredictions, setTorcidaPredictions] = useState<TorcidaPrediction[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllPredictions();
    }
  }, [user]);

  const fetchAllPredictions = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Fetch pool predictions
      const { data: poolParticipants } = await supabase
        .from('pool_participants')
        .select(`
          id,
          ticket_number,
          total_points,
          pools (id, name)
        `)
        .eq('user_id', user.id);

      const { data: predictions } = await supabase
        .from('predictions')
        .select(`
          id,
          points_earned,
          participant_id
        `)
        .eq('user_id', user.id);

      // Group by pool
      const poolMap = new Map<string, PoolPrediction>();
      poolParticipants?.forEach((p: any) => {
        if (p.pools) {
          const key = `${p.pools.id}-${p.ticket_number}`;
          const predCount = predictions?.filter((pred: any) => pred.participant_id === p.id).length || 0;
          poolMap.set(key, {
            poolId: p.pools.id,
            poolName: p.pools.name,
            totalPredictions: predCount,
            totalPoints: p.total_points || 0,
            ticketNumber: p.ticket_number
          });
        }
      });
      setPoolPredictions(Array.from(poolMap.values()));

      // Fetch quiz predictions
      const { data: quizParticipants } = await supabase
        .from('quiz_participants')
        .select(`
          id,
          ticket_number,
          total_points,
          quizzes (id, name)
        `)
        .eq('user_id', user.id);

      const { data: quizAnswers } = await supabase
        .from('quiz_answers')
        .select(`
          id,
          is_correct,
          participant_id
        `)
        .eq('user_id', user.id);

      // Group by quiz
      const quizMap = new Map<string, QuizPrediction>();
      quizParticipants?.forEach((p: any) => {
        if (p.quizzes) {
          const key = `${p.quizzes.id}-${p.ticket_number}`;
          const userAnswers = quizAnswers?.filter((a: any) => a.participant_id === p.id) || [];
          const correctCount = userAnswers.filter((a: any) => a.is_correct).length;
          quizMap.set(key, {
            quizId: p.quizzes.id,
            quizName: p.quizzes.name,
            totalAnswers: userAnswers.length,
            correctAnswers: correctCount,
            totalPoints: p.total_points || 0,
            ticketNumber: p.ticket_number
          });
        }
      });
      setQuizPredictions(Array.from(quizMap.values()));

      // Fetch torcida mestre predictions
      const { data: torcidaParticipants } = await supabase
        .from('torcida_mestre_participants')
        .select(`
          id,
          ticket_number,
          status,
          torcida_mestre_pools (id, name, club_name, club_image)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      const { data: torcidaPreds } = await supabase
        .from('torcida_mestre_predictions')
        .select(`
          id,
          is_winner,
          prize_won,
          participant_id
        `)
        .eq('user_id', user.id);

      // Group by pool
      const torcidaMap = new Map<string, TorcidaPrediction>();
      torcidaParticipants?.forEach((p: any) => {
        if (p.torcida_mestre_pools) {
          const poolId = p.torcida_mestre_pools.id;
          const existing = torcidaMap.get(poolId);
          const userPreds = torcidaPreds?.filter((pred: any) => pred.participant_id === p.id) || [];
          const wins = userPreds.filter((pred: any) => pred.is_winner).length;
          const prize = userPreds.reduce((sum: number, pred: any) => sum + (pred.prize_won || 0), 0);
          
          if (existing) {
            existing.totalPredictions += userPreds.length;
            existing.totalWins += wins;
            existing.totalPrize += prize;
            existing.ticketNumbers.push(p.ticket_number);
          } else {
            torcidaMap.set(poolId, {
              poolId,
              poolName: p.torcida_mestre_pools.name,
              clubName: p.torcida_mestre_pools.club_name,
              clubImage: p.torcida_mestre_pools.club_image,
              totalPredictions: userPreds.length,
              totalWins: wins,
              totalPrize: prize,
              ticketNumbers: [p.ticket_number]
            });
          }
        }
      });
      setTorcidaPredictions(Array.from(torcidaMap.values()));

    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  const EmptyState = ({ message, icon: Icon }: { message: string; icon: any }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Meus Palpites</h1>

        <Tabs defaultValue="pools" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pools" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Bolões</span>
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Quiz 10</span>
            </TabsTrigger>
            <TabsTrigger value="torcida" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Time Mestre</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pools">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : poolPredictions.length === 0 ? (
              <EmptyState 
                message="Você ainda não participou de nenhum bolão. Explore os bolões disponíveis!" 
                icon={Trophy}
              />
            ) : (
              <div className="space-y-4">
                {poolPredictions.map((pool) => (
                  <Card key={`${pool.poolId}-${pool.ticketNumber}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pool.poolName}</CardTitle>
                        <Badge variant="outline">Ticket #{pool.ticketNumber}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {pool.totalPredictions} palpites
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            {pool.totalPoints} pontos
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/pools/${pool.poolId}`}>
                            Ver Bolão <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quiz">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : quizPredictions.length === 0 ? (
              <EmptyState 
                message="Você ainda não participou de nenhum quiz. Confira os quizzes disponíveis!" 
                icon={Target}
              />
            ) : (
              <div className="space-y-4">
                {quizPredictions.map((quiz) => (
                  <Card key={`${quiz.quizId}-${quiz.ticketNumber}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{quiz.quizName}</CardTitle>
                        <Badge variant="outline">Ticket #{quiz.ticketNumber}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            {quiz.correctAnswers}/{quiz.totalAnswers} corretas
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {quiz.totalPoints} pontos
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/quiz/${quiz.quizId}`}>
                            Ver Quiz <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="torcida">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : torcidaPredictions.length === 0 ? (
              <EmptyState 
                message="Você ainda não participou de nenhum Time Mestre. Junte-se a um time!" 
                icon={Users}
              />
            ) : (
              <div className="space-y-4">
                {torcidaPredictions.map((torcida) => (
                  <Card key={torcida.poolId}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {torcida.clubImage && (
                            <img 
                              src={torcida.clubImage} 
                              alt={torcida.clubName}
                              className="h-10 w-10 object-contain"
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg">{torcida.poolName}</CardTitle>
                            <CardDescription>{torcida.clubName}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {torcida.ticketNumbers.length} ticket{torcida.ticketNumbers.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {torcida.totalPredictions} palpites
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {torcida.totalWins} vitória{torcida.totalWins !== 1 ? 's' : ''}
                          </span>
                          {torcida.totalPrize > 0 && (
                            <span className="text-primary font-medium">
                              R$ {torcida.totalPrize.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/torcida-mestre/${torcida.poolId}`}>
                            Ver Bolão <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
