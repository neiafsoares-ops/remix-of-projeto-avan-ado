import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { notifyNewQuizRoundCreated } from '@/lib/notification-utils';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { 
  ChevronLeft, 
  Loader2, 
  Plus, 
  Target,
  Settings,
  HelpCircle,
  Trash2,
  CheckCircle2,
  Save,
  Users,
  CalendarIcon,
  Clock,
  EyeOff,
  UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InviteQuizParticipantInline } from '@/components/quiz/InviteQuizParticipantInline';

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  accumulated_prize: number;
  is_active: boolean;
  allow_multiple_tickets?: boolean;
  entry_fee?: number;
  admin_fee_percent?: number;
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
  is_hidden: boolean;
}

interface QuizParticipant {
  id: string;
  user_id: string;
  ticket_number: number;
  total_points: number;
  status: string;
  public_id?: string;
  full_name?: string | null;
}

export default function QuizManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rounds, setRounds] = useState<QuizRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<QuizRound | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);

  // New round dialog
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined);
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [creatingRound, setCreatingRound] = useState(false);

  // New question dialog
  const [newQuestionOpen, setNewQuestionOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    option_e: '',
    is_hidden: false,
  });
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Finalize round
  const [finalizingRound, setFinalizingRound] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string>>({});

  // Entry fee update
  const [editingEntryFee, setEditingEntryFee] = useState(false);
  const [newEntryFee, setNewEntryFee] = useState<number>(0);
  const [updatingEntryFee, setUpdatingEntryFee] = useState(false);
  const [canUpdateEntryFee, setCanUpdateEntryFee] = useState(false);

  useEffect(() => {
    if (id && user) {
      checkAdminAndFetchData();
    }
  }, [id, user]);

  const checkAdminAndFetchData = async () => {
    try {
      setLoading(true);

      // Verificar se é admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast({
          title: 'Acesso negado',
          description: 'Apenas administradores podem gerenciar quizzes.',
          variant: 'destructive',
        });
        navigate(`/quiz/${id}`);
        return;
      }

      setIsAdmin(true);

      // Buscar quiz
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!quizData) {
        navigate('/quiz');
        return;
      }

      setQuiz(quizData);
      setNewEntryFee(quizData.entry_fee || 0);

      // Buscar rodadas
      await fetchRounds();
      
      // Buscar participantes
      await fetchParticipants();

      // Verificar se pode atualizar o valor de entrada
      await checkCanUpdateEntryFee();

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRounds = async () => {
    const { data: roundsData } = await supabase
      .from('quiz_rounds')
      .select('*')
      .eq('quiz_id', id)
      .order('round_number', { ascending: true });

    setRounds(roundsData || []);

    if (roundsData && roundsData.length > 0 && !selectedRound) {
      setSelectedRound(roundsData[0]);
      await fetchQuestions(roundsData[0].id);
    }
  };

  const fetchParticipants = async () => {
    const { data: participantsData } = await supabase
      .from('quiz_participants')
      .select('id, user_id, ticket_number, total_points, status')
      .eq('quiz_id', id)
      .order('total_points', { ascending: false });

    if (participantsData && participantsData.length > 0) {
      const userIds = [...new Set(participantsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, public_id, full_name')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      const participantsWithProfiles = participantsData.map(p => {
        const profile = profilesMap.get(p.user_id);
        return {
          ...p,
          public_id: profile?.public_id || 'Anônimo',
          full_name: profile?.full_name || null,
        };
      });

      setParticipants(participantsWithProfiles);
    } else {
      setParticipants([]);
    }
  };

  const fetchQuestions = async (roundId: string) => {
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('round_id', roundId)
      .order('question_number', { ascending: true });

    setQuestions(questionsData || []);

    // Preencher respostas corretas se já existirem
    const answers: Record<string, string> = {};
    questionsData?.forEach(q => {
      if (q.correct_answer) {
        answers[q.id] = q.correct_answer;
      }
    });
    setCorrectAnswers(answers);
  };

  const checkCanUpdateEntryFee = async () => {
    // Verifica se a última rodada (não finalizada) não tem participantes ativos
    const { data: latestRound } = await supabase
      .from('quiz_rounds')
      .select('id, is_finished')
      .eq('quiz_id', id)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Se não há rodadas, pode atualizar
    if (!latestRound) {
      setCanUpdateEntryFee(true);
      return;
    }

    // Se a última rodada já foi finalizada, pode atualizar (próxima será nova)
    if (latestRound.is_finished) {
      setCanUpdateEntryFee(true);
      return;
    }

    // Verifica se há participantes ativos na última rodada (com respostas)
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('id')
      .eq('round_id', latestRound.id)
      .limit(1);

    // Pode atualizar apenas se não há respostas na rodada atual
    setCanUpdateEntryFee(!answers || answers.length === 0);
  };

  const handleUpdateEntryFee = async () => {
    if (!quiz || newEntryFee < 0) return;

    try {
      setUpdatingEntryFee(true);

      const { error } = await supabase
        .from('quizzes')
        .update({ entry_fee: newEntryFee })
        .eq('id', id);

      if (error) throw error;

      setQuiz({ ...quiz, entry_fee: newEntryFee });
      setEditingEntryFee(false);

      toast({
        title: 'Valor de inscrição atualizado',
        description: `O novo valor é R$ ${newEntryFee.toFixed(2)}. O impacto no prêmio será aplicado às próximas participações.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o valor.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingEntryFee(false);
    }
  };

  const handleCreateRound = async () => {
    if (!newRoundName || !deadlineDate || !deadlineTime) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingRound(true);

      // Combinar data e hora
      const [hours, minutes] = deadlineTime.split(':').map(Number);
      const deadline = new Date(deadlineDate);
      deadline.setHours(hours, minutes, 0, 0);

      const roundNumber = rounds.length + 1;

      const { data, error } = await supabase
        .from('quiz_rounds')
        .insert({
          quiz_id: id,
          round_number: roundNumber,
          name: newRoundName,
          deadline: deadline.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Notificar participantes sobre nova rodada
      if (quiz && user) {
        await notifyNewQuizRoundCreated(
          quiz.id,
          quiz.name,
          newRoundName,
          user.id
        );
      }

      setRounds([...rounds, data]);
      setSelectedRound(data);
      setQuestions([]);
      setNewRoundOpen(false);
      setNewRoundName('');
      setDeadlineDate(undefined);
      setDeadlineTime('18:00');

      toast({
        title: 'Rodada criada!',
        description: `${newRoundName} foi criada com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error creating round:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a rodada.',
        variant: 'destructive',
      });
    } finally {
      setCreatingRound(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedRound) return;

    if (!newQuestion.question_text || !newQuestion.option_a || !newQuestion.option_b) {
      toast({
        title: 'Erro',
        description: 'Preencha a pergunta e pelo menos as opções A e B.',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length >= 10) {
      toast({
        title: 'Limite atingido',
        description: 'Cada rodada pode ter no máximo 10 perguntas.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingQuestion(true);

      const questionNumber = questions.length + 1;

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: id,
          round_id: selectedRound.id,
          question_number: questionNumber,
          question_text: newQuestion.question_text,
          option_a: newQuestion.option_a,
          option_b: newQuestion.option_b,
          option_c: newQuestion.option_c || null,
          option_d: newQuestion.option_d || null,
          option_e: newQuestion.option_e || null,
          is_hidden: newQuestion.is_hidden,
        })
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);
      setNewQuestionOpen(false);
      setNewQuestion({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        option_e: '',
        is_hidden: false,
      });

      toast({
        title: 'Pergunta adicionada!',
        description: `Pergunta ${questionNumber} criada com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a pergunta.',
        variant: 'destructive',
      });
    } finally {
      setCreatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      setQuestions(questions.filter(q => q.id !== questionId));

      toast({
        title: 'Pergunta removida',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover a pergunta.',
        variant: 'destructive',
      });
    }
  };

  const handleFinalizeRound = async () => {
    if (!selectedRound) return;

    // Verificar se todas as perguntas têm resposta correta definida
    const allAnswered = questions.every(q => correctAnswers[q.id]);
    if (!allAnswered) {
      toast({
        title: 'Erro',
        description: 'Defina a resposta correta para todas as perguntas.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setFinalizingRound(true);

      // Atualizar respostas corretas das perguntas
      for (const question of questions) {
        await supabase
          .from('quiz_questions')
          .update({ correct_answer: correctAnswers[question.id] })
          .eq('id', question.id);
      }

      // Calcular pontos dos participantes por ticket (participant_id)
      const { data: answersData } = await supabase
        .from('quiz_answers')
        .select('user_id, question_id, selected_answer, participant_id')
        .eq('round_id', selectedRound.id);

      // Agrupar por participant_id (ticket) em vez de user_id
      const pointsByParticipant: Record<string, number> = {};
      
      // Primeiro, atualizar cada resposta individualmente com is_correct e points_earned
      for (const answer of answersData || []) {
        const question = questions.find(q => q.id === answer.question_id);
        const isCorrect = question && correctAnswers[question.id] === answer.selected_answer;
        const participantId = answer.participant_id || answer.user_id; // fallback for legacy answers
        
        if (isCorrect) {
          pointsByParticipant[participantId] = (pointsByParticipant[participantId] || 0) + 1;
        }
        
        // Atualizar a resposta usando participant_id para garantir isolamento
        await supabase
          .from('quiz_answers')
          .update({ 
            is_correct: isCorrect, 
            points_earned: isCorrect ? 1 : 0 
          })
          .eq('question_id', answer.question_id)
          .eq('participant_id', answer.participant_id);
      }

      // Atualizar pontos totais de cada ticket individualmente
      let hasWinner = false;
      for (const [participantId, points] of Object.entries(pointsByParticipant)) {
        // Buscar o participant específico pelo ID
        const { data: participant } = await supabase
          .from('quiz_participants')
          .select('id, total_points')
          .eq('id', participantId)
          .maybeSingle();

        if (participant) {
          const newTotal = (participant.total_points || 0) + points;

          await supabase
            .from('quiz_participants')
            .update({ total_points: newTotal })
            .eq('id', participantId);

          if (newTotal >= 10) {
            hasWinner = true;
          }
        }
      }

      // Finalizar rodada
      await supabase
        .from('quiz_rounds')
        .update({ is_finished: true, has_winner: hasWinner })
        .eq('id', selectedRound.id);

      // Recarregar dados
      await fetchRounds();
      if (selectedRound) {
        await fetchQuestions(selectedRound.id);
      }

      toast({
        title: 'Rodada finalizada!',
        description: hasWinner 
          ? 'Temos um vencedor! Alguém atingiu 10 pontos!' 
          : 'Os pontos foram calculados. Prêmio acumula para próxima rodada.',
      });
    } catch (error: any) {
      console.error('Error finalizing round:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível finalizar a rodada.',
        variant: 'destructive',
      });
    } finally {
      setFinalizingRound(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!quiz || !isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(`/quiz/${id}`)} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para o Quiz
          </Button>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <Settings className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Gerenciar: {quiz.name}</h1>
              <p className="text-muted-foreground">Crie rodadas e perguntas para o quiz</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="rounds" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rounds">Rodadas e Perguntas</TabsTrigger>
            <TabsTrigger value="participants">Participantes</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          {/* Rounds Tab */}
          <TabsContent value="rounds" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Lista de Rodadas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Rodadas</h3>
                  <Dialog open={newRoundOpen} onOpenChange={setNewRoundOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Rodada
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Criar Nova Rodada</DialogTitle>
                        <DialogDescription>
                          Defina o nome e prazo para a nova rodada do quiz.
                        </DialogDescription>
                      </DialogHeader>
                        <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="roundName">Nome da Rodada</Label>
                          <Input
                            id="roundName"
                            placeholder={`Rodada ${rounds.length + 1}`}
                            value={newRoundName}
                            onChange={(e) => setNewRoundName(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Data */}
                          <div className="space-y-2">
                            <Label>Data do Prazo</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deadlineDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {deadlineDate ? format(deadlineDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={deadlineDate}
                                  onSelect={setDeadlineDate}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Hora */}
                          <div className="space-y-2">
                            <Label>Hora do Prazo</Label>
                            <Input
                              type="time"
                              value={deadlineTime}
                              onChange={(e) => setDeadlineTime(e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Preview */}
                        {deadlineDate && (
                          <div className="p-3 bg-muted/50 rounded-lg text-sm flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Prazo: {format(deadlineDate, "dd/MM/yyyy", { locale: ptBR })} às {deadlineTime}</span>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleCreateRound} disabled={creatingRound}>
                          {creatingRound && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Criar Rodada
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {rounds.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma rodada criada
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {rounds.map((round) => (
                      <Card
                        key={round.id}
                        className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                          selectedRound?.id === round.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => {
                          setSelectedRound(round);
                          fetchQuestions(round.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{round.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(round.deadline), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {round.is_finished ? (
                            <Badge variant="secondary">Finalizada</Badge>
                          ) : (
                            <Badge variant="default">Ativa</Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Perguntas da Rodada Selecionada */}
              <div className="md:col-span-2 space-y-4">
                {selectedRound ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{selectedRound.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {questions.length}/10 perguntas
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!selectedRound.is_finished && questions.length < 10 && (
                          <Dialog open={newQuestionOpen} onOpenChange={setNewQuestionOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Adicionar Pergunta
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Nova Pergunta</DialogTitle>
                                <DialogDescription>
                                  Adicione uma pergunta com 2 a 5 opções de resposta.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="question">Pergunta</Label>
                                  <Textarea
                                    id="question"
                                    placeholder="Digite a pergunta..."
                                    value={newQuestion.question_text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="optionA">Opção A *</Label>
                                    <Input
                                      id="optionA"
                                      placeholder="Opção A"
                                      value={newQuestion.option_a}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, option_a: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="optionB">Opção B *</Label>
                                    <Input
                                      id="optionB"
                                      placeholder="Opção B"
                                      value={newQuestion.option_b}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, option_b: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="optionC">Opção C (opcional)</Label>
                                    <Input
                                      id="optionC"
                                      placeholder="Opção C"
                                      value={newQuestion.option_c}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, option_c: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="optionD">Opção D (opcional)</Label>
                                    <Input
                                      id="optionD"
                                      placeholder="Opção D"
                                      value={newQuestion.option_d}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, option_d: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2 col-span-2">
                                    <Label htmlFor="optionE">Opção E (opcional)</Label>
                                    <Input
                                      id="optionE"
                                      placeholder="Opção E"
                                      value={newQuestion.option_e}
                                      onChange={(e) => setNewQuestion({ ...newQuestion, option_e: e.target.value })}
                                    />
                                  </div>
                                </div>
                                
                                {/* Switch para ocultar pergunta */}
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                  <div className="flex items-center gap-3">
                                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">Ocultar Pergunta</p>
                                      <p className="text-sm text-muted-foreground">
                                        O texto ficará borrado na visualização prévia
                                      </p>
                                    </div>
                                  </div>
                                  <Switch
                                    checked={newQuestion.is_hidden}
                                    onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_hidden: checked })}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancelar</Button>
                                </DialogClose>
                                <Button onClick={handleCreateQuestion} disabled={creatingQuestion}>
                                  {creatingQuestion && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                  Adicionar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        {!selectedRound.is_finished && questions.length === 10 && (
                          <Button variant="hero" onClick={handleFinalizeRound} disabled={finalizingRound}>
                            {finalizingRound && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Finalizar Rodada
                          </Button>
                        )}
                      </div>
                    </div>

                    {questions.length === 0 ? (
                      <Card className="p-8 text-center">
                        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          Nenhuma pergunta adicionada ainda.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Adicione 10 perguntas para esta rodada.
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {questions.map((question, index) => (
                          <Card key={question.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-base">
                                    {index + 1}. {question.question_text}
                                  </CardTitle>
                                  {question.is_hidden && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <EyeOff className="h-3 w-3" />
                                      Oculta
                                    </Badge>
                                  )}
                                </div>
                                {!selectedRound.is_finished && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteQuestion(question.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {['a', 'b', 'c', 'd', 'e'].map((option) => {
                                  const optionText = question[`option_${option}` as keyof QuizQuestion] as string | null;
                                  if (!optionText) return null;

                                  const isCorrect = question.correct_answer === option || correctAnswers[question.id] === option;

                                  return (
                                    <div
                                      key={option}
                                      className={`p-2 rounded border ${
                                        isCorrect ? 'bg-green-500/10 border-green-500/50' : ''
                                      }`}
                                    >
                                      <span className="font-medium">{option.toUpperCase()})</span> {optionText}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Seletor de resposta correta */}
                              {!selectedRound.is_finished && (
                                <div className="pt-2 border-t">
                                  <Label className="text-xs text-muted-foreground mb-2 block">
                                    Resposta Correta:
                                  </Label>
                                  <Select
                                    value={correctAnswers[question.id] || ''}
                                    onValueChange={(value) => setCorrectAnswers({ ...correctAnswers, [question.id]: value })}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['a', 'b', 'c', 'd', 'e'].map((option) => {
                                        const optionText = question[`option_${option}` as keyof QuizQuestion] as string | null;
                                        if (!optionText) return null;
                                        return (
                                          <SelectItem key={option} value={option}>
                                            Opção {option.toUpperCase()}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="p-8 text-center">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Selecione uma rodada para ver as perguntas
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-6">
            {/* Invite Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold">Participantes ({participants.length})</h2>
              
              <div className="flex items-center gap-2">
                <InviteQuizParticipantInline 
                  quizId={id!}
                  existingParticipants={participants}
                  onSuccess={fetchParticipants}
                />
              </div>
            </div>

            {participants.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
                  <p className="text-muted-foreground">
                    Ainda não há participantes neste quiz. Convide alguém!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <Card key={participant.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">@{participant.public_id}</p>
                            {participant.full_name && (
                              <p className="text-sm text-muted-foreground">{participant.full_name}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Ticket #{participant.ticket_number}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{participant.total_points} pts</p>
                          </div>
                          <Badge variant={participant.status === 'active' ? 'default' : 'secondary'}>
                            {participant.status === 'active' ? 'Ativo' : participant.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Quiz</CardTitle>
                <CardDescription>
                  Ajuste as configurações gerais do quiz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Prêmio Acumulado</Label>
                  <p className="text-2xl font-bold text-accent">
                    R$ {quiz.accumulated_prize.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O prêmio acumula quando nenhum participante atinge 10 pontos na rodada.
                  </p>
                </div>

                {/* Entry Fee Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Valor de Inscrição</Label>
                    {!editingEntryFee && canUpdateEntryFee && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingEntryFee(true)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                  
                  {editingEntryFee ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          R$
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newEntryFee}
                          onChange={(e) => setNewEntryFee(parseFloat(e.target.value) || 0)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleUpdateEntryFee}
                          disabled={updatingEntryFee}
                        >
                          {updatingEntryFee && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingEntryFee(false);
                            setNewEntryFee(quiz.entry_fee || 0);
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Taxa administrativa: {quiz.admin_fee_percent || 0}% • 
                        Prêmio líquido/participante: R$ {(newEntryFee * (1 - (quiz.admin_fee_percent || 0) / 100)).toFixed(2)}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        R$ {(quiz.entry_fee || 0).toFixed(2)}
                      </p>
                      {!canUpdateEntryFee && (
                        <p className="text-sm text-destructive">
                          ⚠️ Não é possível alterar o valor porque já existem respostas na rodada atual.
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Taxa administrativa: {quiz.admin_fee_percent || 0}%
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                    {quiz.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {/* Allow Multiple Tickets Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-multiple-tickets" className="text-base font-medium">
                      Permitir múltiplos palpites
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Cada participante pode ter mais de um ticket/palpite no quiz.
                    </p>
                  </div>
                  <Switch
                    id="allow-multiple-tickets"
                    checked={quiz.allow_multiple_tickets || false}
                    onCheckedChange={async (checked) => {
                      try {
                        const { error } = await supabase
                          .from('quizzes')
                          .update({ allow_multiple_tickets: checked })
                          .eq('id', id);
                        
                        if (error) throw error;
                        
                        setQuiz({ ...quiz, allow_multiple_tickets: checked });
                        toast({
                          title: 'Configuração atualizada',
                          description: checked 
                            ? 'Múltiplos palpites agora são permitidos.' 
                            : 'Apenas um palpite por participante.',
                        });
                      } catch (error: any) {
                        toast({
                          title: 'Erro',
                          description: error.message || 'Não foi possível atualizar.',
                          variant: 'destructive',
                        });
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
