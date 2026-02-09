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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { QuizCarouselView } from '@/components/quiz/QuizCarouselView';
import { QuizRoundSummary } from '@/components/quiz/QuizRoundSummary';
import { SmartTicketJoinDialog } from '@/components/quiz/SmartTicketJoinDialog';
import { JoinWithTicketsDialog } from '@/components/JoinWithTicketsDialog';
import { TicketStatusPanel, TicketStatus } from '@/components/TicketStatusPanel';
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
  Crown,
  List,
  LayoutGrid,
  Eye,
  AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateEstimatedPrize, formatBRL } from '@/lib/prize-utils';
import { PrizeDisplayCard } from '@/components/PrizeDisplayCard';
import { isAfterDeadline, formatDateTimeBR, formatRelativeTimeBR } from '@/lib/date-utils';

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
  allow_multiple_tickets?: boolean;
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
  is_hidden?: boolean;
}

interface QuizAnswer {
  question_id: string;
  selected_answer: string;
  is_correct: boolean | null;
  participant_id?: string;
}

interface Participant {
  id: string;
  user_id: string;
  total_points: number;
  public_id: string;
  avatar_url: string | null;
  ticket_number: number;
  round_id: string | null;
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
  // Answers are now indexed by participant_id (ticket)
  const [answersByTicket, setAnswersByTicket] = useState<Record<string, Record<string, string>>>({});
  const [savedAnswersByTicket, setSavedAnswersByTicket] = useState<Record<string, QuizAnswer[]>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState<{ public_id: string; avatar_url: string | null } | null>(null);
  
  // New states for carousel and confirmation
  const [viewMode, setViewMode] = useState<'list' | 'carousel'>('list');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // Ticket management
  const [activeTicketId, setActiveTicketId] = useState<string | undefined>();
  
  // Per-round participation state
  const [isParticipatingInCurrentRound, setIsParticipatingInCurrentRound] = useState(false);
  const [previousRoundTickets, setPreviousRoundTickets] = useState<{ id: string; ticket_number: number; total_points: number }[]>([]);
  
  // Get user tickets for current round
  // NOTE: while quiz_participants doesn't have round_id in the DB yet, legacy entries will have round_id = null.
  const userTickets = useMemo(() => {
    if (!user || !currentRound) return [];
    return participants
      .filter(p => p.user_id === user.id && (p.round_id === currentRound.id || p.round_id == null))
      .sort((a, b) => a.ticket_number - b.ticket_number);
  }, [participants, user, currentRound]);

  // Get answers for the current active ticket
  const answers = useMemo(() => {
    if (!activeTicketId) return {};
    return answersByTicket[activeTicketId] || {};
  }, [answersByTicket, activeTicketId]);

  const savedAnswers = useMemo(() => {
    if (!activeTicketId) return [];
    return savedAnswersByTicket[activeTicketId] || [];
  }, [savedAnswersByTicket, activeTicketId]);

  // Calculate ticket status for panel
  const ticketStatusList = useMemo<TicketStatus[]>(() => {
    if (!userTickets.length || !questions.length) return [];
    
    const totalQuestions = questions.length;
    
    return userTickets.map(ticket => {
      // Count answers for this specific ticket
      const ticketAnswers = answersByTicket[ticket.id] || {};
      const answeredCount = Object.keys(ticketAnswers).length;
      
      return {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: answeredCount === totalQuestions ? 'filled' : 'empty',
        progress: { filled: answeredCount, total: totalQuestions },
      } as TicketStatus;
    });
  }, [userTickets, questions, answersByTicket]);

  // Set active ticket when userTickets changes
  useEffect(() => {
    if (userTickets.length > 0) {
      // If no active ticket, or active ticket is not in the list, select first
      const activeTicketExists = userTickets.some(t => t.id === activeTicketId);
      if (!activeTicketId || !activeTicketExists) {
        setActiveTicketId(userTickets[0].id);
      }
    }
  }, [userTickets]);

  // Fetch answers when activeTicketId changes or currentRound changes
  useEffect(() => {
    if (currentRound && userTickets.length > 0) {
      fetchRoundQuestions(currentRound.id);
    }
  }, [activeTicketId, userTickets.length, currentRound?.id]);

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

      // Buscar participantes com ranking (pass active round for per-round participation check)
      await fetchParticipants(activeRound?.id);

      // Verificar se usuário participa do quiz globalmente (legacy support)
      if (user) {
        const { data: participation } = await supabase
          .from('quiz_participants')
          .select('id')
          .eq('quiz_id', id)
          .eq('user_id', user.id)
          .limit(1);
        setIsParticipating(!!participation && participation.length > 0);
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

    // Fetch answers for all user tickets
    if (user && userTickets.length > 0) {
      const ticketIds = userTickets.map(t => t.id);
      
      const { data: answersData } = await supabase
        .from('quiz_answers')
        .select('question_id, selected_answer, is_correct, participant_id')
        .eq('round_id', roundId)
        .eq('user_id', user.id)
        .in('participant_id', ticketIds);

      if (answersData) {
        // Group answers by participant_id (ticket)
        const savedByTicket: Record<string, QuizAnswer[]> = {};
        const answerMapByTicket: Record<string, Record<string, string>> = {};
        
        answersData.forEach(a => {
          const participantId = a.participant_id || '';
          if (!savedByTicket[participantId]) {
            savedByTicket[participantId] = [];
            answerMapByTicket[participantId] = {};
          }
          savedByTicket[participantId].push(a);
          answerMapByTicket[participantId][a.question_id] = a.selected_answer;
        });
        
        setSavedAnswersByTicket(savedByTicket);
        setAnswersByTicket(answerMapByTicket);
      }
    }
  };

  const fetchParticipants = async (activeRoundId?: string) => {
    // Fetch participants without round_id (column will be added in future migration)
    const { data: participantsData, error } = await supabase
      .from('quiz_participants')
      .select('id, user_id, total_points, ticket_number')
      .eq('quiz_id', id)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    if (participantsData) {
      // Buscar perfis
      const userIds = [...new Set(participantsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, public_id, avatar_url')
        .in('id', userIds);

      const enrichedParticipants = participantsData.map(p => ({
        ...p,
        public_id: profiles?.find(pr => pr.id === p.user_id)?.public_id || 'Anônimo',
        avatar_url: profiles?.find(pr => pr.id === p.user_id)?.avatar_url || null,
        ticket_number: p.ticket_number || 1,
        round_id: null as string | null, // Will be populated after migration
      }));

      setParticipants(enrichedParticipants);

      // For now, all participants are considered part of the current round (legacy behavior)
      // Once round_id column is added, we can filter by round
      if (user) {
        const userParticipation = enrichedParticipants.filter(p => p.user_id === user.id);
        setIsParticipatingInCurrentRound(userParticipation.length > 0);
        setPreviousRoundTickets([]);
      }
    }
  };

  // Handler for joining the quiz
  // NOTE: round_id is not yet present in the DB (migration pending), so we don't send it.
  const handleJoinQuiz = async (ticketCount: number = 1) => {
    if (!user || !currentRound) {
      navigate('/auth');
      return;
    }

    try {
      setJoining(true);

      for (let i = 0; i < ticketCount; i++) {
        const { error } = await supabase
          .from('quiz_participants')
          .insert({
            quiz_id: id,
            user_id: user.id,
            ticket_number: i + 1,
          });

        if (error) throw error;
      }

      setIsParticipating(true);
      setIsParticipatingInCurrentRound(true);
      await fetchParticipants(currentRound.id);

      toast({
        title: 'Sucesso!',
        description:
          ticketCount > 1
            ? `Você entrou na ${currentRound.name} com ${ticketCount} palpites. Boa sorte!`
            : `Você entrou na ${currentRound.name}. Boa sorte!`,
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

  // Handler for joining with selected tickets from previous round
  // NOTE: round_id is not yet present in the DB (migration pending), so we don't send it.
  const handleJoinWithPreviousTickets = async (selectedTicketNumbers: number[]) => {
    if (!user || !currentRound) return;

    try {
      setJoining(true);

      for (const ticketNumber of selectedTicketNumbers) {
        const { error } = await supabase
          .from('quiz_participants')
          .insert({
            quiz_id: id,
            user_id: user.id,
            ticket_number: ticketNumber,
          });

        if (error) throw error;
      }

      setIsParticipating(true);
      setIsParticipatingInCurrentRound(true);
      await fetchParticipants(currentRound.id);

      toast({
        title: 'Sucesso!',
        description:
          selectedTicketNumbers.length > 1
            ? `Você manteve ${selectedTicketNumbers.length} palpites para a ${currentRound.name}. Boa sorte!`
            : `Você manteve seu palpite para a ${currentRound.name}. Boa sorte!`,
      });
    } catch (error: any) {
      console.error('Error joining with previous tickets:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível manter os palpites.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (!activeTicketId) return;
    setAnswersByTicket(prev => ({
      ...prev,
      [activeTicketId]: {
        ...(prev[activeTicketId] || {}),
        [questionId]: answer
      }
    }));
  };

  const handleSaveAnswers = async () => {
    if (!user || !currentRound || !activeTicketId) return;

    try {
      setSaving(true);

      const currentAnswers = answersByTicket[activeTicketId] || {};
      const currentSavedAnswers = savedAnswersByTicket[activeTicketId] || [];

      // Save each answer for the active ticket
      for (const [questionId, selectedAnswer] of Object.entries(currentAnswers)) {
        const existingAnswer = currentSavedAnswers.find(a => a.question_id === questionId);
        
        if (existingAnswer) {
          // Update existing answer
          await supabase
            .from('quiz_answers')
            .update({ selected_answer: selectedAnswer })
            .eq('question_id', questionId)
            .eq('participant_id', activeTicketId)
            .eq('user_id', user.id);
        } else {
          // Insert new answer with participant_id
          await supabase
            .from('quiz_answers')
            .insert({
              quiz_id: id,
              round_id: currentRound.id,
              question_id: questionId,
              user_id: user.id,
              participant_id: activeTicketId,
              selected_answer: selectedAnswer,
            });
        }
      }

      // Recarregar respostas salvas
      await fetchRoundQuestions(currentRound.id);

      // Get ticket number for feedback
      const activeTicket = userTickets.find(t => t.id === activeTicketId);
      const ticketLabel = activeTicket && userTickets.length > 1 
        ? ` (Ticket #${activeTicket.ticket_number})` 
        : '';

      toast({
        title: 'Respostas salvas!',
        description: `Suas respostas${ticketLabel} foram registradas com sucesso.`,
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

  // Handler for save button click - opens confirmation dialog
  const handleSaveClick = () => {
    setConfirmDialogOpen(true);
  };

  // Handler for confirmed submit
  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false);
    await handleSaveAnswers();
  };

  // Counts for confirmation dialog
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const activeTicket = userTickets.find(t => t.id === activeTicketId);
  const activeTicketLabel = activeTicket && userTickets.length > 1 
    ? ` (Ticket #${activeTicket.ticket_number})`
    : '';

  const isDeadlinePassed = currentRound ? isAfterDeadline(currentRound.deadline) : false;
  const canAnswer = isParticipatingInCurrentRound && currentRound && !isDeadlinePassed && !currentRound.is_finished;

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
              {!isParticipatingInCurrentRound && quiz.is_active && currentRound && !isDeadlinePassed && (
                previousRoundTickets.length > 0 ? (
                  // Show smart selection dialog for returning participants
                  <SmartTicketJoinDialog
                    entryFee={quiz.entry_fee || 0}
                    previousTickets={previousRoundTickets}
                    onConfirm={handleJoinWithPreviousTickets}
                    title={`Participar da ${currentRound.name}`}
                    description="Selecione os palpites da rodada anterior que deseja manter."
                    requiresApproval={(quiz.entry_fee || 0) > 0}
                    disabled={joining}
                    trigger={
                      <Button variant="hero" disabled={joining}>
                        {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Participar da Rodada
                      </Button>
                    }
                  />
                ) : quiz.allow_multiple_tickets ? (
                  <JoinWithTicketsDialog
                    entryFee={quiz.entry_fee || 0}
                    onConfirm={handleJoinQuiz}
                    title={`Participar da ${currentRound.name}`}
                    description="Informe quantos palpites você deseja fazer nesta rodada."
                    requiresApproval={(quiz.entry_fee || 0) > 0}
                    trigger={
                      <Button variant="hero" disabled={joining}>
                        {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Participar da Rodada
                      </Button>
                    }
                  />
                ) : (
                  <Button variant="hero" onClick={() => handleJoinQuiz(1)} disabled={joining}>
                    {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Participar da Rodada
                  </Button>
                )
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
          <div className="mb-8">
            <PrizeDisplayCard
              entryFee={quiz.entry_fee}
              estimatedPrize={estimatedPrize}
              accumulatedPrize={quiz.accumulated_prize}
            />
            <p className="text-sm text-muted-foreground mt-2 px-1">
              {participants.length} participantes × {formatBRL(quiz.entry_fee)} - {quiz.admin_fee_percent || 0}% taxa admin
            </p>
          </div>
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
                            <>Prazo: {formatDateTimeBR(currentRound.deadline)}</>
                          )}
                        </p>
                      </div>
                      {!isDeadlinePassed && (
                        <Badge variant="outline" className="w-fit">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatRelativeTimeBR(currentRound.deadline)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Round Summary - shows when round is finished */}
                {currentRound.is_finished && (
                  <QuizRoundSummary
                    quizId={quiz.id}
                    roundId={currentRound.id}
                    roundName={currentRound.name}
                    roundNumber={currentRound.round_number}
                  />
                )}

                {!isParticipatingInCurrentRound ? (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <span>
                          {isDeadlinePassed 
                            ? 'O prazo para participar desta rodada já encerrou.'
                            : 'Você precisa se inscrever nesta rodada para responder às perguntas.'}
                        </span>
                        <div className="flex gap-2">
                          {questions.length > 0 && (
                            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Perguntas
                            </Button>
                          )}
                          {quiz.is_active && !isDeadlinePassed && (
                            previousRoundTickets.length > 0 ? (
                              <SmartTicketJoinDialog
                                entryFee={quiz.entry_fee || 0}
                                previousTickets={previousRoundTickets}
                                onConfirm={handleJoinWithPreviousTickets}
                                title={`Participar da ${currentRound.name}`}
                                description="Selecione os palpites da rodada anterior que deseja manter."
                                requiresApproval={(quiz.entry_fee || 0) > 0}
                                disabled={joining}
                                trigger={
                                  <Button variant="hero" disabled={joining}>
                                    {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Participar da Rodada
                                  </Button>
                                }
                              />
                            ) : quiz.allow_multiple_tickets ? (
                              <JoinWithTicketsDialog
                                entryFee={quiz.entry_fee || 0}
                                onConfirm={handleJoinQuiz}
                                title={`Participar da ${currentRound.name}`}
                                description="Informe quantos palpites você deseja fazer nesta rodada."
                                requiresApproval={(quiz.entry_fee || 0) > 0}
                                trigger={
                                  <Button variant="hero" disabled={joining}>
                                    {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Participar da Rodada
                                  </Button>
                                }
                              />
                            ) : (
                              <Button variant="hero" onClick={() => handleJoinQuiz(1)} disabled={joining}>
                                {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Participar da Rodada
                              </Button>
                            )
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <>
                    {/* Ticket Status Panel */}
                    {quiz?.allow_multiple_tickets && ticketStatusList.length > 1 && (
                      <TicketStatusPanel
                        tickets={ticketStatusList}
                        activeTicketId={activeTicketId || ''}
                        onTicketSelect={setActiveTicketId}
                        variant="quiz"
                      />
                    )}
                    
                    {/* View Mode Toggle */}
                    {questions.length > 0 && canAnswer && (
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm text-muted-foreground">Modo de visualização:</span>
                        <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'list' | 'carousel')}>
                          <ToggleGroupItem value="list" aria-label="Modo lista">
                            <List className="h-4 w-4 mr-1" />
                            Lista
                          </ToggleGroupItem>
                          <ToggleGroupItem value="carousel" aria-label="Modo carrossel">
                            <LayoutGrid className="h-4 w-4 mr-1" />
                            Carrossel
                          </ToggleGroupItem>
                        </ToggleGroup>
                      </div>
                    )}

                    {/* Carousel View */}
                    {viewMode === 'carousel' && questions.length > 0 ? (
                      <QuizCarouselView
                        questions={questions}
                        currentIndex={currentQuestionIndex}
                        onIndexChange={setCurrentQuestionIndex}
                        answers={answers}
                        savedAnswers={savedAnswers}
                        onAnswerChange={handleAnswerChange}
                        disabled={!canAnswer}
                        showResults={isDeadlinePassed}
                        onComplete={canAnswer ? handleSaveClick : undefined}
                        completeCTA="Finalizar Respostas"
                      />
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
                              onClick={handleSaveClick}
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
                        ) : isAfterDeadline(round.deadline) ? (
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

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirmar Envio de Respostas
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    Você está prestes a enviar suas respostas{activeTicketLabel} para a rodada "{currentRound?.name}".
                  </p>
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      Após o envio, suas respostas <strong>NÃO</strong> poderão ser editadas.
                      Certifique-se de que todas as respostas estão corretas.
                    </AlertDescription>
                  </Alert>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p>• Perguntas respondidas: <strong>{answeredCount} de {questions.length}</strong></p>
                    {unansweredCount > 0 && (
                      <p className="text-destructive">• Perguntas não respondidas: <strong>{unansweredCount}</strong></p>
                    )}
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmSubmit}>
                Confirmar Envio
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview das Perguntas
              </DialogTitle>
            </DialogHeader>
            {questions.length > 0 && (
              <QuizCarouselView
                questions={questions}
                currentIndex={previewIndex}
                onIndexChange={setPreviewIndex}
                previewMode={true}
                disabled={true}
                onComplete={() => {
                  setPreviewOpen(false);
                  setPreviewIndex(0);
                  handleJoinQuiz();
                }}
                completeCTA="🎯 Participar do Quiz!"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
