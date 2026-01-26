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
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
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
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Quiz {
  id: string;
  name: string;
  description: string | null;
  accumulated_prize: number;
  is_active: boolean;
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
  correct_answer: string | null;
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

  // New round dialog
  const [newRoundOpen, setNewRoundOpen] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [newRoundDeadline, setNewRoundDeadline] = useState('');
  const [creatingRound, setCreatingRound] = useState(false);

  // New question dialog
  const [newQuestionOpen, setNewQuestionOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
  });
  const [creatingQuestion, setCreatingQuestion] = useState(false);

  // Finalize round
  const [finalizingRound, setFinalizingRound] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string>>({});

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

      // Buscar rodadas
      await fetchRounds();

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

  const handleCreateRound = async () => {
    if (!newRoundName || !newRoundDeadline) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingRound(true);

      const roundNumber = rounds.length + 1;

      const { data, error } = await supabase
        .from('quiz_rounds')
        .insert({
          quiz_id: id,
          round_number: roundNumber,
          name: newRoundName,
          deadline: new Date(newRoundDeadline).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setRounds([...rounds, data]);
      setSelectedRound(data);
      setQuestions([]);
      setNewRoundOpen(false);
      setNewRoundName('');
      setNewRoundDeadline('');

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

      // Calcular pontos dos participantes
      const { data: answers } = await supabase
        .from('quiz_answers')
        .select('user_id, question_id, selected_answer')
        .eq('round_id', selectedRound.id);

      // Agrupar por usuário
      const pointsByUser: Record<string, number> = {};
      answers?.forEach(answer => {
        const question = questions.find(q => q.id === answer.question_id);
        if (question && correctAnswers[question.id] === answer.selected_answer) {
          pointsByUser[answer.user_id] = (pointsByUser[answer.user_id] || 0) + 1;

          // Atualizar a resposta como correta
          supabase
            .from('quiz_answers')
            .update({ is_correct: true, points_earned: 1 })
            .eq('question_id', answer.question_id)
            .eq('user_id', answer.user_id);
        } else {
          // Atualizar a resposta como incorreta
          supabase
            .from('quiz_answers')
            .update({ is_correct: false, points_earned: 0 })
            .eq('question_id', answer.question_id)
            .eq('user_id', answer.user_id);
        }
      });

      // Atualizar pontos totais dos participantes
      let hasWinner = false;
      for (const [userId, points] of Object.entries(pointsByUser)) {
        const { data: participant } = await supabase
          .from('quiz_participants')
          .select('total_points')
          .eq('quiz_id', id)
          .eq('user_id', userId)
          .maybeSingle();

        const newTotal = (participant?.total_points || 0) + points;

        await supabase
          .from('quiz_participants')
          .update({ total_points: newTotal })
          .eq('quiz_id', id)
          .eq('user_id', userId);

        if (newTotal >= 10) {
          hasWinner = true;
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
                        <div className="space-y-2">
                          <Label htmlFor="deadline">Prazo para Respostas</Label>
                          <Input
                            id="deadline"
                            type="datetime-local"
                            value={newRoundDeadline}
                            onChange={(e) => setNewRoundDeadline(e.target.value)}
                          />
                        </div>
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
                                  Adicione uma pergunta com 2 a 4 opções de resposta.
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
                                <CardTitle className="text-base">
                                  {index + 1}. {question.question_text}
                                </CardTitle>
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
                                {['a', 'b', 'c', 'd'].map((option) => {
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
                                      {['a', 'b', 'c', 'd'].map((option) => {
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

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Quiz</CardTitle>
                <CardDescription>
                  Ajuste as configurações gerais do quiz.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Prêmio Acumulado</Label>
                  <p className="text-2xl font-bold text-accent">
                    R$ {quiz.accumulated_prize.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O prêmio acumula quando nenhum participante atinge 10 pontos na rodada.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
                    {quiz.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
