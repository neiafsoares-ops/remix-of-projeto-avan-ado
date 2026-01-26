import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Target, 
  Users, 
  Trophy,
  Clock,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Settings,
  Crown
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateEstimatedPrize, formatBRL } from '@/lib/prize-utils';

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  entry_fee: number;
  admin_fee_percent: number | null;
  accumulated_prize: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

interface QuizRound {
  id: string;
  round_number: number;
  name: string;
  deadline: string;
  is_finished: boolean;
  has_winner: boolean;
}

interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  correct_answer: string | null;
}

interface QuizAnswer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean | null;
}

interface Participant {
  id: string;
  user_id: string;
  total_points: number;
  public_id: string;
  avatar_url: string | null;
}

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rounds, setRounds] = useState<QuizRound[]>([]);
  const [currentRound, setCurrentRound] = useState<QuizRound | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<QuizAnswer[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{ public_id: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuizData();
    }
  }, [id, user]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      // Buscar quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) {
        navigate('/quiz');
        return;
      }

      setQuiz(quizData);

      // Buscar perfil do criador
      if (quizData.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('public_id, avatar_url')
          .eq('id', quizData.created_by)
          .maybeSingle();
        setCreatorProfile(profile);
      }

      // Verificar se usuário é admin
      if (user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        setIsAdmin(!!roleData);
      }

      // Buscar rodadas
      const { data: roundsData } = await supabase
        .from('quiz_rounds')
        .select('*')
        .eq('quiz_id', id)
        .order('round_number', { ascending: true });

      setRounds(roundsData || []);

      // Determinar rodada atual (primeira não finalizada ou última)
      const activeRound = roundsData?.find(r => !r.is_finished) || roundsData?.[roundsData.length - 1];
      if (activeRound) {
        setCurrentRound(activeRound);
        await fetchRoundQuestions(activeRound.id);
      }

      // Buscar participantes com ranking
      await fetchParticipants();

      // Verificar se usuário participa
      if (user) {
        const { data: participation } = await supabase
          .from('quiz_participants')
          .select('id')
          .eq('quiz_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsParticipating(!!participation);
      }

    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o quiz.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundQuestions = async (roundId: string) => {
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('round_id', roundId)
      .order('question_number', { ascending: true });

    setQuestions(questionsData || []);

    // Buscar respostas do usuário
    if (user) {
      const { data: answersData } = await supabase
        .from('quiz_answers')
        .select('question_id, selected_answer, is_correct')
        .eq('round_id', roundId)
        .eq('user_id', user.id);

      if (answersData) {
        setSavedAnswers(answersData);
        const answersMap: Record<string, string> = {};
        answersData.forEach(a => {
          answersMap[a.question_id] = a.selected_answer;
        });
        setAnswers(answersMap);
      }
    }
  };

  const fetchParticipants = async () => {
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('id, user_id, total_points')
      .eq('quiz_id', id)
      .order('total_points', { ascending: false });

    if (participantsData) {
      // Buscar perfis
      const userIds = participantsData.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, public_id, avatar_url')
        .in('id', userIds);

      const enrichedParticipants = participantsData.map(p => ({
        ...p,
        public_id: profiles?.find(pr => pr.id === p.user_id)?.public_id || 'Anônimo',
        avatar_url: profiles?.find(pr => pr.id === p.user_id)?.avatar_url || null,
      }));

      setParticipants(enrichedParticipants);
    }
  };

  const handleJoinQuiz = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      setJoining(true);
      
      const { error } = await supabase
        .from('quiz_participants')
        .insert({
          quiz_id: id,
          user_id: user.id,
        });

      if (error) throw error;

      setIsParticipating(true);
      await fetchParticipants();
      
      toast({
        title: 'Sucesso!',
        description: 'Você entrou no quiz. Boa sorte!',
      });
    } catch (error: any) {
      console.error('Error joining quiz:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível entrar no quiz.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSaveAnswers = async () => {
    if (!user || !currentRound) return;

    try {
      setSaving(true);

      // Salvar cada resposta
      for (const [questionId, selectedAnswer] of Object.entries(answers)) {
        const existingAnswer = savedAnswers.find(a => a.question_id === questionId);
        
        if (existingAnswer) {
          // Atualizar resposta existente
          await supabase
            .from('quiz_answers')
            .update({ selected_answer: selectedAnswer })
            .eq('question_id', questionId)
            .eq('user_id', user.id);
        } else {
          // Inserir nova resposta
          await supabase
            .from('quiz_answers')
            .insert({
              quiz_id: id,
              round_id: currentRound.id,
              question_id: questionId,
              user_id: user.id,
              selected_answer: selectedAnswer,
            });
        }
      }

      // Recarregar respostas salvas
      await fetchRoundQuestions(currentRound.id);

      toast({
        title: 'Respostas salvas!',
        description: 'Suas respostas foram registradas com sucesso.',
      });
    } catch (error: any) {
      console.error('Error saving answers:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as respostas.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const isDeadlinePassed = currentRound ? isPast(new Date(currentRound.deadline)) : false;
  const canAnswer = isParticipating && currentRound && !isDeadlinePassed && !currentRound.is_finished;

  // Calculate estimated prize
  const estimatedPrize = useMemo(() => {
    if (!quiz || (quiz.entry_fee || 0) <= 0) return 0;
    return calculateEstimatedPrize(
      quiz.entry_fee || 0,
      participants.length,
      quiz.admin_fee_percent || 0
    );
  }, [quiz, participants]);

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/quiz')} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para Quizzes
          </Button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {quiz.cover_image ? (
                <img 
                  src={quiz.cover_image} 
                  alt={quiz.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                  <Target className="h-8 w-8 text-accent-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{quiz.name}</h1>
                <p className="text-muted-foreground">{quiz.description}</p>
                {creatorProfile && (
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={creatorProfile.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {creatorProfile.public_id.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      por <span className="text-primary">@{creatorProfile.public_id}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate(`/quiz/${id}/manage`)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
              )}
              {!isParticipating && quiz.is_active && (
                <Button variant="hero" onClick={handleJoinQuiz} disabled={joining}>
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Participar do Quiz
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{participants.length}</p>
                  <p className="text-sm text-muted-foreground">Participantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{rounds.length}</p>
                  <p className="text-sm text-muted-foreground">Rodadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {estimatedPrize > 0 ? formatBRL(estimatedPrize) : (quiz.accumulated_prize > 0 ? formatBRL(quiz.accumulated_prize) : '-')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {estimatedPrize > 0 ? 'Prêmio Estimado' : 'Prêmio Acumulado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{currentRound?.round_number || '-'}</p>
                  <p className="text-sm text-muted-foreground">Rodada Atual</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Entry Fee Info */}
        {quiz.entry_fee > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-accent/10 to-primary/5 border-accent/20">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">💰 Prêmio Estimado</p>
                    <p className="text-2xl font-bold text-accent">{formatBRL(estimatedPrize)}</p>
                  </div>
                  <div className="text-sm text-muted-foreground border-l pl-4">
                    <p>ℹ️ Taxa de entrada: {formatBRL(quiz.entry_fee)}</p>
                    <p>{participants.length} participantes × {formatBRL(quiz.entry_fee)} - {quiz.admin_fee_percent || 0}% taxa admin</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">Perguntas</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="rounds">Rodadas</TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            {!currentRound ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma rodada ativa</h3>
                  <p className="text-muted-foreground">
                    Aguarde o administrador criar uma nova rodada.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Round Info */}
                <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{currentRound.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {isDeadlinePassed ? (
                            <span className="text-destructive">Prazo encerrado</span>
                          ) : (
                            <>Prazo: {format(new Date(currentRound.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                          )}
                        </p>
                      </div>
                      {!isDeadlinePassed && (
                        <Badge variant="outline" className="w-fit">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(currentRound.deadline), { addSuffix: true, locale: ptBR })}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {!isParticipating ? (
                  <Alert>
                    <AlertDescription>
                      Você precisa participar do quiz para responder às perguntas.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Questions List */}
                    <div className="space-y-4">
                      {questions.map((question, index) => {
                        const savedAnswer = savedAnswers.find(a => a.question_id === question.id);
                        const showResult = isDeadlinePassed && question.correct_answer;
                        const isCorrect = savedAnswer?.is_correct;

                        return (
                          <Card key={question.id} className={showResult ? (isCorrect ? 'border-green-500/50' : 'border-destructive/50') : ''}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-base font-medium">
                                  {index + 1}. {question.question_text}
                                </CardTitle>
                                {showResult && (
                                  isCorrect ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-destructive shrink-0" />
                                  )
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <RadioGroup
                                value={answers[question.id] || ''}
                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                disabled={!canAnswer}
                                className="space-y-2"
                              >
                                {['a', 'b', 'c', 'd', 'e'].map((option) => {
                                  const optionText = question[`option_${option}` as keyof QuizQuestion] as string | null;
                                  if (!optionText) return null;

                                  const isCorrectOption = showResult && question.correct_answer === option;
                                  const isSelectedWrong = showResult && savedAnswer?.selected_answer === option && !isCorrect;

                                  return (
                                    <div
                                      key={option}
                                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                                        isCorrectOption
                                          ? 'bg-green-500/10 border-green-500/50'
                                          : isSelectedWrong
                                          ? 'bg-destructive/10 border-destructive/50'
                                          : 'hover:bg-muted/50'
                                      }`}
                                    >
                                      <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                      <Label
                                        htmlFor={`${question.id}-${option}`}
                                        className="flex-1 cursor-pointer"
                                      >
                                        <span className="font-medium mr-2">{option.toUpperCase()})</span>
                                        {optionText}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </RadioGroup>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Save Button */}
                    {canAnswer && (
                      <div className="sticky bottom-4 flex justify-end">
                        <Button
                          variant="hero"
                          size="lg"
                          onClick={handleSaveAnswers}
                          disabled={saving || Object.keys(answers).length === 0}
                          className="shadow-lg"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Salvar Respostas
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  Ranking Geral
                </CardTitle>
                <CardDescription>
                  Primeiro a atingir 10 pontos vence! Pontos são acumulativos entre rodadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum participante ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {participants.map((participant, index) => {
                      const isWinner = participant.total_points >= 10;
                      const isCurrentUser = user?.id === participant.user_id;

                      return (
                        <div
                          key={participant.id}
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            isWinner
                              ? 'bg-accent/20 border-2 border-accent'
                              : isCurrentUser
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-muted/30'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.avatar_url || undefined} />
                            <AvatarFallback>
                              {participant.public_id.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium flex items-center gap-2">
                              @{participant.public_id}
                              {isWinner && <Crown className="h-4 w-4 text-accent" />}
                              {isCurrentUser && <Badge variant="outline" className="text-xs">Você</Badge>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{participant.total_points}</p>
                            <p className="text-xs text-muted-foreground">pontos</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rounds Tab */}
          <TabsContent value="rounds" className="space-y-4">
            {rounds.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma rodada criada</h3>
                  <p className="text-muted-foreground">
                    O administrador ainda não criou rodadas para este quiz.
                  </p>
                </CardContent>
              </Card>
            ) : (
              rounds.map((round) => (
                <Card
                  key={round.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    currentRound?.id === round.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setCurrentRound(round);
                    fetchRoundQuestions(round.id);
                  }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{round.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Prazo: {format(new Date(round.deadline), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {round.has_winner && (
                          <Badge className="bg-accent text-accent-foreground">
                            <Trophy className="h-3 w-3 mr-1" />
                            Vencedor
                          </Badge>
                        )}
                        {round.is_finished ? (
                          <Badge variant="secondary">Finalizada</Badge>
                        ) : isPast(new Date(round.deadline)) ? (
                          <Badge variant="outline" className="text-destructive border-destructive">Prazo encerrado</Badge>
                        ) : (
                          <Badge variant="default">Em andamento</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
