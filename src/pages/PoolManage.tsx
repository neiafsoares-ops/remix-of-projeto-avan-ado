import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Round, useRounds } from '@/hooks/use-rounds';
import { ImageUpload } from '@/components/ImageUpload';
import { RoundsTab } from '@/components/rounds/RoundsTab';
import { ClubAutocomplete, Club } from '@/components/ClubAutocomplete';
import { CreateClubDialog } from '@/components/CreateClubDialog';
import { AddGamesScreen } from '@/components/matches/AddGamesScreen';
import { LaunchScoresScreen } from '@/components/matches/LaunchScoresScreen';
import { EditKnockoutMatchupsScreen } from '@/components/matches/EditKnockoutMatchupsScreen';
import { InviteUserInline } from '@/components/pools/InviteUserInline';
import { ShareInviteLink } from '@/components/pools/ShareInviteLink';
import { PendingInvitations } from '@/components/pools/PendingInvitations';
import { PoolStructureConfigTab } from '@/components/pools/PoolStructureConfigTab';
import { 
  ArrowLeft, 
  Plus, 
  Trophy, 
  Users, 
  Calendar,
  Loader2,
  Target,
  Shield,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Layers,
  X,
  AlertCircle,
  Swords,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateTimeBR, formatDateShortBR, formatTimeBR, isBeforeDeadline } from '@/lib/date-utils';
import { requiresApproval } from '@/lib/prize-utils';
import { getPointsDescription } from '@/lib/points-utils';
import type { Database } from '@/integrations/supabase/types';

type ParticipantStatus = Database['public']['Enums']['participant_status'];

interface Pool {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  created_by: string;
  is_public: boolean;
  entry_fee: number;
  cover_image: string | null;
  matches_per_round: number | null;
  total_rounds: number | null;
}

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image: string | null;
  away_team_image: string | null;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  prediction_deadline: string;
  is_finished: boolean;
  round_id: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  status: ParticipantStatus;
  total_points: number;
  public_id: string;
  full_name: string | null;
}

interface PredictionWithDetails {
  id: string;
  home_score: number;
  away_score: number;
  points_earned: number;
  user_id: string;
  match_id: string;
  participant_name: string;
  home_team: string;
  away_team: string;
  is_finished: boolean;
}

export default function PoolManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [pool, setPool] = useState<Pool | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [predictions, setPredictions] = useState<PredictionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingParticipant, setUpdatingParticipant] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  
  // Rounds
  const { rounds, requestLimitIncrease, fetchRounds } = useRounds(id);

  // Match form
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({
    home_team: '',
    away_team: '',
    home_team_image: '',
    away_team_image: '',
    home_club_id: '',
    away_club_id: '',
    match_date: '',
    prediction_deadline: '',
    round_id: '',
  });

  // Create club dialog
  const [createClubDialogOpen, setCreateClubDialogOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubTarget, setNewClubTarget] = useState<'home' | 'away'>('home');

  // Limit exception request
  const [limitExceptionDialogOpen, setLimitExceptionDialogOpen] = useState(false);
  const [limitExceptionRoundId, setLimitExceptionRoundId] = useState<string | null>(null);
  const [limitExceptionExtra, setLimitExceptionExtra] = useState('');
  const [limitExceptionJustification, setLimitExceptionJustification] = useState('');
  const [requestingException, setRequestingException] = useState(false);

  // Result form
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [resultForm, setResultForm] = useState({ home_score: '', away_score: '' });

  // Edit pool form
  const [editPoolDialogOpen, setEditPoolDialogOpen] = useState(false);
  const [savingPool, setSavingPool] = useState(false);
  const [editPoolForm, setEditPoolForm] = useState({ name: '', description: '', rules: '', cover_image: '' });

  // Delete prediction
  const [deletingPrediction, setDeletingPrediction] = useState<string | null>(null);

  // Edit match
  const [editMatchDialogOpen, setEditMatchDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [savingMatch, setSavingMatch] = useState(false);
  const [editMatchForm, setEditMatchForm] = useState({
    home_team: '',
    away_team: '',
    home_team_image: '',
    away_team_image: '',
    home_club_id: '',
    away_club_id: '',
    match_date: '',
    prediction_deadline: '',
    round_id: '',
  });
  const [editClubTarget, setEditClubTarget] = useState<'home' | 'away'>('home');

  // Delete match
  const [deletingMatch, setDeletingMatch] = useState<string | null>(null);
  
  // Delete pool
  const [deletePoolDialogOpen, setDeletePoolDialogOpen] = useState(false);
  const [deletePoolConfirmed, setDeletePoolConfirmed] = useState(false);
  const [deletingPool, setDeletingPool] = useState(false);
  
  // Add Games Screen
  const [showAddGamesScreen, setShowAddGamesScreen] = useState(false);
  const [selectedRoundForGames, setSelectedRoundForGames] = useState<Round | null>(null);
  
  // Launch Scores Screen
  const [showLaunchScoresScreen, setShowLaunchScoresScreen] = useState(false);
  const [selectedRoundForScores, setSelectedRoundForScores] = useState<Round | null>(null);
  
  // Edit Knockout Matchups Screen
  const [showEditKnockoutScreen, setShowEditKnockoutScreen] = useState(false);

  const handleEditRound = (round: Round) => {
    setSelectedRoundForGames(round);
    setShowAddGamesScreen(true);
  };

  const handleLaunchScores = (round: Round) => {
    setSelectedRoundForScores(round);
    setShowLaunchScoresScreen(true);
  };

  // Batch match creation
  interface BatchMatchItem {
    home_team: string;
    away_team: string;
    match_date: string;
  }
  const emptyBatchMatch = (): BatchMatchItem => ({ home_team: '', away_team: '', match_date: '' });
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [batchMatches, setBatchMatches] = useState<BatchMatchItem[]>([emptyBatchMatch()]);
  const [batchRoundId, setBatchRoundId] = useState('');
  const [batchDeadline, setBatchDeadline] = useState('');

  useEffect(() => {
    if (id && user) {
      fetchData();
      fetchUserRoles();
    }
  }, [id, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`pool-manage-${id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'matches', filter: `pool_id=eq.${id}` },
        (payload) => {
          console.log('Match change:', payload);
          fetchData();
          if (payload.eventType === 'INSERT') {
            toast({ title: 'Novo jogo adicionado!' });
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pool_participants', filter: `pool_id=eq.${id}` },
        (payload) => {
          console.log('Participant change:', payload);
          fetchData();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        (payload) => {
          console.log('Prediction change:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchUserRoles = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    setUserRoles(data?.map(r => r.role) || []);
  };

  const fetchData = async () => {
    try {
      const { data: poolData, error: poolError } = await supabase
        .from('pools')
        .select('id, name, description, rules, created_by, is_public, entry_fee, cover_image, matches_per_round, total_rounds')
        .eq('id', id)
        .single();

      if (poolError) throw poolError;
      setPool(poolData);

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('pool_id', id)
        .order('match_date', { ascending: true });

      setMatches(matchesData || []);

      // Buscar participantes
      const { data: participantsData } = await supabase
        .from('pool_participants')
        .select('id, user_id, status, total_points')
        .eq('pool_id', id)
        .order('total_points', { ascending: false });

      if (participantsData && participantsData.length > 0) {
        const userIds = participantsData.map(p => p.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, public_id, full_name')
          .in('id', userIds);

        const participantsWithProfiles = participantsData.map(p => {
          const profile = profilesData?.find(prof => prof.id === p.user_id);
          return {
            ...p,
            public_id: profile?.public_id || 'Anônimo',
            full_name: profile?.full_name || null,
          };
        });
        setParticipants(participantsWithProfiles);

        // Buscar palpites
        if (matchesData && matchesData.length > 0) {
          const matchIds = matchesData.map(m => m.id);
          const { data: predictionsData } = await supabase
            .from('predictions')
            .select('id, match_id, user_id, home_score, away_score, points_earned')
            .in('match_id', matchIds);

          if (predictionsData) {
            const predictionsWithDetails: PredictionWithDetails[] = predictionsData.map(pred => {
              const participant = participantsWithProfiles.find(p => p.user_id === pred.user_id);
              const match = matchesData.find(m => m.id === pred.match_id);
              return {
                ...pred,
                points_earned: pred.points_earned || 0,
                participant_name: participant?.public_id || 'Anônimo',
                home_team: match?.home_team || '',
                away_team: match?.away_team || '',
                is_finished: match?.is_finished || false,
              };
            });
            setPredictions(predictionsWithDetails);
          }
        }
      } else {
        setParticipants([]);
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const canManagePool = () => {
    if (!user || !pool) return false;
    // Admin da plataforma pode gerenciar qualquer bolão
    if (userRoles.includes('admin')) return true;
    // Moderador da plataforma pode gerenciar qualquer bolão
    if (userRoles.includes('moderator')) return true;
    // Criador do bolão pode gerenciá-lo (inclui mestres que criaram seus próprios bolões)
    if (pool.created_by === user.id) return true;
    // mestre_bolao NÃO tem permissão automática - só pode gerenciar bolões que criou
    return false;
  };

  const canLaunchScore = (match: Match) => {
    // Verificar se é admin/moderador/mestre do bolão
    if (!canManagePool()) return false;
    // Verificar se o prazo de palpites passou
    if (isBeforeDeadline(match.prediction_deadline)) return false;
    // Verificar se o jogo ainda não foi finalizado
    if (match.is_finished) return false;
    
    return true;
  };

  const openResultDialog = (match: Match) => {
    setSelectedMatch(match);
    setResultForm({ 
      home_score: match.home_score?.toString() || '', 
      away_score: match.away_score?.toString() || '' 
    });
    setResultDialogOpen(true);
  };

  const handleCreateMatch = async () => {
    if (!user || !id) return;

    if (!matchForm.home_team || !matchForm.away_team || !matchForm.match_date || !matchForm.prediction_deadline) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (!matchForm.round_id) {
      toast({
        title: 'Erro',
        description: 'Selecione uma rodada para o jogo.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar limite de jogos por rodada (15 jogos + extra_matches_allowed)
    const selectedRound = rounds.find(r => r.id === matchForm.round_id);
    if (selectedRound) {
      const maxMatches = selectedRound.match_limit + (selectedRound.extra_matches_allowed || 0);
      const currentMatchCount = matches.filter(m => m.round_id === selectedRound.id).length;
      
      if (currentMatchCount >= maxMatches) {
        toast({
          title: 'Limite de jogos atingido',
          description: `Esta rodada atingiu o limite de ${maxMatches} jogos. Distribua os jogos em outras rodadas.`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validar que o prazo de palpites é antes do jogo
    if (new Date(matchForm.prediction_deadline) >= new Date(matchForm.match_date)) {
      toast({
        title: 'Erro',
        description: 'O prazo para palpites deve ser anterior ao horário do jogo.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingMatch(true);
    try {
      const { error } = await supabase
        .from('matches')
        .insert({
          pool_id: id,
          home_team: matchForm.home_team,
          away_team: matchForm.away_team,
          home_team_image: matchForm.home_team_image || null,
          away_team_image: matchForm.away_team_image || null,
          match_date: new Date(matchForm.match_date).toISOString(),
          prediction_deadline: new Date(matchForm.prediction_deadline).toISOString(),
          created_by: user.id,
          round_id: matchForm.round_id,
        });

      if (error) throw error;

      toast({
        title: 'Jogo criado!',
        description: 'O jogo foi adicionado ao bolão e já está visível para os participantes.',
      });

      setMatchDialogOpen(false);
      setMatchForm({ 
        home_team: '', 
        away_team: '', 
        home_team_image: '',
        away_team_image: '',
        home_club_id: '',
        away_club_id: '',
        match_date: '', 
        prediction_deadline: '',
        round_id: '',
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o jogo.',
        variant: 'destructive',
      });
    } finally {
      setCreatingMatch(false);
    }
  };

  const handleCreateBatchMatches = async () => {
    if (!user || !id) return;

    // Filter only filled matches
    const filledMatches = batchMatches.filter(
      m => m.home_team.trim() && m.away_team.trim() && m.match_date
    );

    if (filledMatches.length === 0) {
      toast({
        title: 'Erro',
        description: 'Preencha pelo menos um jogo com todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (!batchDeadline) {
      toast({
        title: 'Erro',
        description: 'Defina o prazo único para encerramento dos palpites.',
        variant: 'destructive',
      });
      return;
    }

    if (!batchRoundId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma rodada para os jogos.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar limite de jogos por rodada (15 jogos + extra_matches_allowed)
    const selectedRound = rounds.find(r => r.id === batchRoundId);
    if (selectedRound) {
      const maxMatches = selectedRound.match_limit + (selectedRound.extra_matches_allowed || 0);
      const currentMatchCount = matches.filter(m => m.round_id === selectedRound.id).length;
      const totalAfterInsert = currentMatchCount + filledMatches.length;
      
      if (totalAfterInsert > maxMatches) {
        const available = maxMatches - currentMatchCount;
        toast({
          title: 'Limite de jogos excedido',
          description: `Esta rodada tem apenas ${available} vaga(s) disponível(is) de ${maxMatches} jogos. Você está tentando adicionar ${filledMatches.length} jogo(s).`,
          variant: 'destructive',
        });
        return;
      }
    }

    const deadlineDate = new Date(batchDeadline);

    // Validate all matches have dates after deadline
    for (const match of filledMatches) {
      if (new Date(match.match_date) <= deadlineDate) {
        toast({
          title: 'Erro',
          description: `O jogo "${match.home_team} x ${match.away_team}" deve ser após o prazo de palpites.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setCreatingBatch(true);
    try {
      const matchesToInsert = filledMatches.map(match => ({
        pool_id: id,
        home_team: match.home_team.trim(),
        away_team: match.away_team.trim(),
        match_date: new Date(match.match_date).toISOString(),
        prediction_deadline: deadlineDate.toISOString(),
        created_by: user.id,
        round_id: batchRoundId,
      }));

      const { error } = await supabase
        .from('matches')
        .insert(matchesToInsert);

      if (error) throw error;

      toast({
        title: 'Jogos criados!',
        description: `${filledMatches.length} jogo(s) adicionado(s) ao bolão.`,
      });

      setBatchDialogOpen(false);
      setBatchMatches([emptyBatchMatch()]);
      setBatchDeadline('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar os jogos.',
        variant: 'destructive',
      });
    } finally {
      setCreatingBatch(false);
    }
  };

  const addBatchMatch = () => {
    if (batchMatches.length < 10) {
      setBatchMatches(prev => [...prev, emptyBatchMatch()]);
    }
  };

  const removeBatchMatch = (index: number) => {
    if (batchMatches.length > 1) {
      setBatchMatches(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateBatchMatch = (index: number, field: keyof BatchMatchItem, value: string) => {
    setBatchMatches(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleSaveResult = async () => {
    if (!selectedMatch) return;

    // Verificar se o prazo de palpites já passou
    if (isBeforeDeadline(selectedMatch.prediction_deadline)) {
      toast({
        title: 'Erro',
        description: 'Só é possível inserir o resultado após o prazo de palpites.',
        variant: 'destructive',
      });
      return;
    }

    const home = parseInt(resultForm.home_score);
    const away = parseInt(resultForm.away_score);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast({
        title: 'Erro',
        description: 'Placar inválido.',
        variant: 'destructive',
      });
      return;
    }

    setSavingResult(true);
    try {
      // 1. Update the match score
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: home,
          away_score: away,
          is_finished: true,
        })
        .eq('id', selectedMatch.id);

      if (error) throw error;

      // 2. Fetch all predictions for this match (each ticket is a separate prediction)
      const { data: predictionsData, error: predError } = await supabase
        .from('predictions')
        .select('id, home_score, away_score, user_id, participant_id')
        .eq('match_id', selectedMatch.id);
      
      if (predError) throw predError;
      
      // 3. Calculate and update points for each prediction (per ticket)
      if (predictionsData && predictionsData.length > 0) {
        for (const prediction of predictionsData) {
          const result = getPointsDescription(
            prediction.home_score,
            prediction.away_score,
            home,
            away
          );
          
          // Update points_earned for this specific prediction
          await supabase
            .from('predictions')
            .update({ points_earned: result.points })
            .eq('id', prediction.id);
        }
        
        // 4. Update total_points for each participant (ticket) individually
        const participantIds = [...new Set(predictionsData.map(p => p.participant_id).filter(Boolean))];
        
        for (const participantId of participantIds) {
          // Sum all points_earned for this participant across all finished matches
          const { data: participantPredictions } = await supabase
            .from('predictions')
            .select('points_earned')
            .eq('participant_id', participantId);
          
          const totalPoints = participantPredictions?.reduce(
            (sum, p) => sum + (p.points_earned || 0), 
            0
          ) || 0;
          
          await supabase
            .from('pool_participants')
            .update({ total_points: totalPoints })
            .eq('id', participantId);
        }
      }

      toast({
        title: 'Resultado salvo!',
        description: 'Os pontos foram calculados e o ranking atualizado.',
      });

      setResultDialogOpen(false);
      setSelectedMatch(null);
      setResultForm({ home_score: '', away_score: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar o resultado.',
        variant: 'destructive',
      });
    } finally {
      setSavingResult(false);
    }
  };

  const getStatusLabel = (status: ParticipantStatus): string => {
    const labels: Record<ParticipantStatus, string> = {
      pending: 'Pendente',
      active: 'Ativo',
      blocked: 'Bloqueado',
      inactive: 'Inativo',
    };
    return labels[status];
  };

  const handleUpdateParticipantStatus = async (participantId: string, newStatus: ParticipantStatus) => {
    setUpdatingParticipant(participantId);
    try {
      const { error } = await supabase
        .from('pool_participants')
        .update({ status: newStatus })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: newStatus === 'active' 
          ? 'O participante foi aprovado e já pode fazer palpites.' 
          : `Status alterado para ${getStatusLabel(newStatus)}.`,
      });

      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: error.message || 'Não foi possível alterar o status do participante. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingParticipant(null);
    }
  };

  const handleEditPool = async () => {
    if (!pool) return;

    setSavingPool(true);
    try {
      const { error } = await supabase
        .from('pools')
        .update({
          name: editPoolForm.name,
          description: editPoolForm.description || null,
          rules: editPoolForm.rules || null,
          cover_image: editPoolForm.cover_image || null,
        })
        .eq('id', pool.id);

      if (error) throw error;

      toast({
        title: 'Bolão atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });

      setEditPoolDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o bolão.',
        variant: 'destructive',
      });
    } finally {
      setSavingPool(false);
    }
  };

  const handleDeletePrediction = async (predictionId: string) => {
    setDeletingPrediction(predictionId);
    try {
      const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('id', predictionId);

      if (error) throw error;

      toast({
        title: 'Palpite excluído!',
        description: 'O palpite foi removido e os pontos foram recalculados.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o palpite.',
        variant: 'destructive',
      });
    } finally {
      setDeletingPrediction(null);
    }
  };

  const openEditPoolDialog = () => {
    if (pool) {
      setEditPoolForm({
        name: pool.name,
        description: pool.description || '',
        rules: pool.rules || '',
        cover_image: pool.cover_image || '',
      });
      setEditPoolDialogOpen(true);
    }
  };

  const openEditMatchDialog = (match: Match) => {
    // Convert ISO date to datetime-local format
    const formatDateTimeLocal = (isoDate: string) => {
      const date = new Date(isoDate);
      return date.toISOString().slice(0, 16);
    };

    setEditingMatch(match);
    setEditMatchForm({
      home_team: match.home_team,
      away_team: match.away_team,
      home_team_image: match.home_team_image || '',
      away_team_image: match.away_team_image || '',
      home_club_id: '',
      away_club_id: '',
      match_date: formatDateTimeLocal(match.match_date),
      prediction_deadline: formatDateTimeLocal(match.prediction_deadline),
      round_id: match.round_id || '',
    });
    setEditMatchDialogOpen(true);
  };

  const handleEditMatch = async () => {
    if (!editingMatch) return;

    if (!editMatchForm.home_team || !editMatchForm.away_team || !editMatchForm.match_date || !editMatchForm.prediction_deadline) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    if (new Date(editMatchForm.prediction_deadline) >= new Date(editMatchForm.match_date)) {
      toast({
        title: 'Erro',
        description: 'O prazo para palpites deve ser anterior ao horário do jogo.',
        variant: 'destructive',
      });
      return;
    }

    setSavingMatch(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team: editMatchForm.home_team,
          away_team: editMatchForm.away_team,
          home_team_image: editMatchForm.home_team_image || null,
          away_team_image: editMatchForm.away_team_image || null,
          match_date: new Date(editMatchForm.match_date).toISOString(),
          prediction_deadline: new Date(editMatchForm.prediction_deadline).toISOString(),
        })
        .eq('id', editingMatch.id);

      if (error) throw error;

      toast({
        title: 'Jogo atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });

      setEditMatchDialogOpen(false);
      setEditingMatch(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o jogo.',
        variant: 'destructive',
      });
    } finally {
      setSavingMatch(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    setDeletingMatch(matchId);
    try {
      // First delete all predictions for this match
      const { error: predError } = await supabase
        .from('predictions')
        .delete()
        .eq('match_id', matchId);

      if (predError) throw predError;

      // Then delete the match
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;

      toast({
        title: 'Jogo excluído!',
        description: 'O jogo e todos os palpites relacionados foram removidos.',
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o jogo.',
        variant: 'destructive',
      });
    } finally {
      setDeletingMatch(null);
    }
  };

  const handleDeletePool = async () => {
    if (!pool || !deletePoolConfirmed) return;
    
    setDeletingPool(true);
    try {
      // 1. Buscar IDs necessários para exclusão em cascata
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('pool_id', pool.id);

      const roundIds = rounds?.map(r => r.id) || [];
      const matchIds = matches.map(m => m.id);

      // 2. Excluir predictions (via match_id)
      if (matchIds.length > 0) {
        const { error: predError } = await supabase
          .from('predictions')
          .delete()
          .in('match_id', matchIds);
        if (predError) throw predError;
      }

      // 3. Excluir round_limit_requests (via round_id)
      if (roundIds.length > 0) {
        const { error: limitError } = await supabase
          .from('round_limit_requests')
          .delete()
          .in('round_id', roundIds);
        if (limitError) throw limitError;
      }

      // 4. Excluir matches
      const { error: matchError } = await supabase
        .from('matches')
        .delete()
        .eq('pool_id', pool.id);
      if (matchError) throw matchError;

      // 5. Excluir rounds
      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('pool_id', pool.id);
      if (roundError) throw roundError;

      // 6. Excluir pool_invitations
      const { error: invError } = await supabase
        .from('pool_invitations')
        .delete()
        .eq('pool_id', pool.id);
      if (invError) throw invError;

      // 7. Excluir pool_participants
      const { error: partError } = await supabase
        .from('pool_participants')
        .delete()
        .eq('pool_id', pool.id);
      if (partError) throw partError;

      // 8. Excluir mestre_pool_instances
      const { error: mestreError } = await supabase
        .from('mestre_pool_instances')
        .delete()
        .eq('pool_id', pool.id);
      if (mestreError) throw mestreError;

      // 9. Finalmente excluir o pool
      const { error: poolError } = await supabase
        .from('pools')
        .delete()
        .eq('id', pool.id);
      if (poolError) throw poolError;

      toast({
        title: 'Bolão excluído',
        description: 'O bolão e todos os dados relacionados foram removidos permanentemente.',
      });

      navigate('/pools');
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir bolão',
        description: error.message || 'Não foi possível excluir o bolão.',
        variant: 'destructive',
      });
    } finally {
      setDeletingPool(false);
      setDeletePoolDialogOpen(false);
      setDeletePoolConfirmed(false);
    }
  };

  const renderTeamImage = (imageUrl?: string | null, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
    
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt="Escudo do time"
          className={`${sizeClass} object-contain rounded-lg bg-muted p-1`}
          loading="lazy"
        />
      );
    }
    return (
      <div className={`${sizeClass} flex items-center justify-center rounded-lg bg-muted`}>
        <Shield className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  };

  const getMatchStatus = (match: Match) => {
    if (match.is_finished) {
      return { label: 'Finalizado', variant: 'default' as const, icon: CheckCircle2 };
    }
    if (!isBeforeDeadline(match.prediction_deadline)) {
      return { label: 'Palpites Encerrados', variant: 'secondary' as const, icon: Clock };
    }
    return { label: 'Aberto', variant: 'outline' as const, icon: Clock };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!pool || !canManagePool()) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso negado</h1>
          <p className="text-muted-foreground mb-4">Você não tem permissão para gerenciar este bolão.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{pool.name}</h1>
                <p className="text-muted-foreground">Gerenciamento do Bolão</p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Add Games Button - Primary Action */}
              <Button 
                variant="hero" 
                onClick={() => setShowAddGamesScreen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Adicionar Jogos</span>
                <span className="sm:hidden">Jogos</span>
              </Button>
              
              {/* Launch Scores Button - Visible in header for mobile */}
              {matches.length > 0 && (
                <Button 
                  variant="outline" 
                  className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => setShowLaunchScoresScreen(true)}
                >
                  <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Lançar Placares</span>
                </Button>
              )}
              
              {/* Edit Knockout Matchups Button - Only for Cup format pools */}
              {rounds.some(r => {
                const name = r.name?.toLowerCase() || '';
                return name.includes('oitavas') || name.includes('quartas') || 
                       name.includes('semi') || name.includes('final');
              }) && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditKnockoutScreen(true)}
                >
                  <Swords className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Editar Confrontos</span>
                </Button>
              )}
              {/* Edit Pool Button - Secondary */}
              <Dialog open={editPoolDialogOpen} onOpenChange={setEditPoolDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" onClick={openEditPoolDialog}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Bolão</DialogTitle>
                    <DialogDescription>
                      Atualize as informações do bolão.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome do Bolão *</Label>
                      <Input
                        placeholder="Nome do bolão"
                        value={editPoolForm.name}
                        onChange={(e) => setEditPoolForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        placeholder="Descrição do bolão"
                        value={editPoolForm.description}
                        onChange={(e) => setEditPoolForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Regras</Label>
                      <Textarea
                        placeholder="Regras do bolão"
                        value={editPoolForm.rules}
                        onChange={(e) => setEditPoolForm(prev => ({ ...prev, rules: e.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Imagem de Capa</Label>
                      <p className="text-xs text-muted-foreground">
                        Personalize a imagem do seu bolão (opcional)
                      </p>
                      <ImageUpload
                        value={editPoolForm.cover_image}
                        onChange={(url) => setEditPoolForm(prev => ({ ...prev, cover_image: url }))}
                        placeholder="Arraste ou clique para enviar a imagem de capa"
                        bucket="team-images"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditPoolDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button variant="hero" onClick={handleEditPool} disabled={savingPool || !editPoolForm.name}>
                      {savingPool ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Salvar Alterações
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Delete Pool Button - Destructive */}
              <Dialog 
                open={deletePoolDialogOpen} 
                onOpenChange={(open) => {
                  setDeletePoolDialogOpen(open);
                  if (!open) {
                    setDeletePoolConfirmed(false);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      Excluir Bolão
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <p className="font-semibold">Esta ação é irreversível.</p>
                    <p className="text-muted-foreground">
                      Ao excluir este bolão, todas as informações serão permanentemente apagadas, incluindo:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      <li>Jogos</li>
                      <li>Palpites</li>
                      <li>Pontuações</li>
                      <li>Ranking</li>
                      <li>Histórico de rodadas</li>
                    </ul>
                    <p className="text-muted-foreground font-medium mt-4">
                      Após a exclusão, não será possível recuperar nenhum dado deste bolão.
                    </p>
                    
                    <div className="flex items-start gap-3 pt-4 border-t">
                      <Checkbox 
                        id="delete-confirm" 
                        checked={deletePoolConfirmed}
                        onCheckedChange={(checked) => setDeletePoolConfirmed(checked === true)}
                      />
                      <label 
                        htmlFor="delete-confirm" 
                        className="text-sm cursor-pointer leading-relaxed"
                      >
                        Estou ciente de que esta exclusão é irreversível
                      </label>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeletePoolDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeletePool} 
                      disabled={!deletePoolConfirmed || deletingPool}
                    >
                      {deletingPool ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Excluir Bolão
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Public/Private Toggle */}
          <div 
            className="flex items-center gap-3 p-3 rounded-lg border bg-card w-fit cursor-pointer"
            onClick={async () => {
              const newValue = !pool.is_public;
              try {
                const { error } = await supabase
                  .from('pools')
                  .update({ is_public: newValue })
                  .eq('id', pool.id);
                
                if (error) throw error;
                
                setPool(prev => prev ? { ...prev, is_public: newValue } : null);
                toast({
                  title: newValue ? 'Bolão público' : 'Bolão privado',
                  description: requiresApproval(pool.entry_fee || 0, newValue)
                    ? 'Novos participantes precisarão de aprovação (bolão possui taxa de inscrição ou é privado)'
                    : 'Qualquer pessoa pode entrar diretamente',
                });
              } catch (error: any) {
                toast({ 
                  title: 'Erro', 
                  description: error.message || 'Não foi possível alterar', 
                  variant: 'destructive' 
                });
              }
            }}
          >
            <div className="flex items-center gap-2">
              {pool.is_public ? (
                <Globe className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-amber-600" />
              )}
              <Label className="text-sm font-medium cursor-pointer">
                {pool.is_public ? 'Público' : 'Privado'}
              </Label>
            </div>
            <Switch
              checked={pool.is_public}
              onCheckedChange={() => {}} // handled by parent onClick
            />
          </div>
        </div>

        {/* Add Games Screen - Full page view */}
        {showAddGamesScreen ? (
          <AddGamesScreen
            poolId={id!}
            rounds={rounds.map(r => ({
              ...r,
              is_finalized: r.is_finalized ?? false,
              finalized_at: r.finalized_at ?? null,
            }))}
            matches={matches}
            matchesPerRound={pool.matches_per_round || 10}
            onBack={() => {
              setShowAddGamesScreen(false);
              setSelectedRoundForGames(null);
            }}
            onMatchesUpdate={() => {
              fetchData();
              fetchRounds();
            }}
            initialRoundId={selectedRoundForGames?.id}
            canManagePool={canManagePool()}
            onLaunchScore={openResultDialog}
          />
        ) : showLaunchScoresScreen ? (
          <LaunchScoresScreen
            poolId={id!}
            rounds={rounds.map(r => ({
              ...r,
              is_finalized: r.is_finalized ?? false,
              finalized_at: r.finalized_at ?? null,
            }))}
            matches={matches}
            onBack={() => {
              setShowLaunchScoresScreen(false);
              setSelectedRoundForScores(null);
            }}
            onMatchesUpdate={() => {
              fetchData();
              fetchRounds();
            }}
            initialRoundId={selectedRoundForScores?.id}
          />
        ) : showEditKnockoutScreen ? (
          <EditKnockoutMatchupsScreen
            poolId={id!}
            rounds={rounds.map(r => ({
              ...r,
              is_finalized: r.is_finalized ?? false,
            }))}
            matches={matches}
            onBack={() => setShowEditKnockoutScreen(false)}
            onMatchesUpdate={() => {
              fetchData();
              fetchRounds();
            }}
          />
        ) : (
          <Tabs defaultValue="rounds" className="space-y-6">
            <TabsList className="flex-wrap">
              <TabsTrigger value="rounds">Rodadas</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
              <TabsTrigger value="participants">Participantes</TabsTrigger>
              <TabsTrigger value="predictions">Palpites</TabsTrigger>
            </TabsList>

            <TabsContent value="rounds">
              <RoundsTab 
                poolId={id!} 
                onEditRound={handleEditRound} 
                canManagePool={canManagePool()}
                onLaunchScores={handleLaunchScores}
              />
            </TabsContent>

            <TabsContent value="config">
              <PoolStructureConfigTab
                poolId={id!}
                pool={pool}
                rounds={rounds}
                matches={matches}
                userId={user!.id}
                isPrivilegedUser={userRoles.includes('admin') || userRoles.includes('moderator')}
                onConfigUpdated={() => {
                  fetchData();
                  fetchRounds();
                }}
              />
            </TabsContent>

            <TabsContent value="participants" className="space-y-6">
              {/* Invite Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-xl font-semibold">Participantes ({participants.length})</h2>
                
                {canManagePool() && (
                  <div className="flex items-center gap-2">
                    <InviteUserInline poolId={id!} />
                    <ShareInviteLink poolId={id!} />
                  </div>
                )}
              </div>
              
              {/* Pending Invitations */}
              {canManagePool() && <PendingInvitations poolId={id!} />}

              {participants.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
                    <p className="text-muted-foreground">
                      Ainda não há participantes neste bolão. Convide alguém!
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
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{participant.total_points} pts</p>
                          </div>
                          
                          {participant.status === 'pending' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleUpdateParticipantStatus(participant.id, 'active')}
                              disabled={updatingParticipant === participant.id}
                            >
                              {updatingParticipant === participant.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                              )}
                              Aprovar
                            </Button>
                          )}
                          
                          <Select
                            value={participant.status}
                            onValueChange={(value: ParticipantStatus) => handleUpdateParticipantStatus(participant.id, value)}
                            disabled={updatingParticipant === participant.id}
                          >
                            <SelectTrigger className="w-32">
                              {updatingParticipant === participant.id ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Salvando...</span>
                                </div>
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="blocked">Bloqueado</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <h2 className="text-xl font-semibold">Palpites ({predictions.length})</h2>

            {predictions.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum palpite registrado</h3>
                  <p className="text-muted-foreground">
                    Os palpites dos participantes aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {predictions.map((prediction) => (
                  <Card key={prediction.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">@{prediction.participant_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {prediction.home_team} {prediction.home_score} x {prediction.away_score} {prediction.away_team}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold">{prediction.points_earned} pts</p>
                            <Badge variant={prediction.is_finished ? 'default' : 'outline'} className="text-xs">
                              {prediction.is_finished ? 'Calculado' : 'Pendente'}
                            </Badge>
                          </div>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deletingPrediction === prediction.id}
                              >
                                {deletingPrediction === prediction.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Palpite?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O palpite de @{prediction.participant_name} para o jogo {prediction.home_team} x {prediction.away_team} será removido e os pontos serão recalculados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePrediction(prediction.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        )}

        {/* Create Club Dialog */}
        <CreateClubDialog
          open={createClubDialogOpen}
          onOpenChange={setCreateClubDialogOpen}
          initialName={newClubName}
          onClubCreated={(club) => {
            // Check if we're editing a match or creating a new one
            if (editMatchDialogOpen) {
              if (editClubTarget === 'home') {
                setEditMatchForm(prev => ({
                  ...prev,
                  home_team: club.name,
                  home_team_image: club.logo_url || '',
                  home_club_id: club.id,
                }));
              } else {
                setEditMatchForm(prev => ({
                  ...prev,
                  away_team: club.name,
                  away_team_image: club.logo_url || '',
                  away_club_id: club.id,
                }));
              }
            } else {
              if (newClubTarget === 'home') {
                setMatchForm(prev => ({
                  ...prev,
                  home_team: club.name,
                  home_team_image: club.logo_url || '',
                  home_club_id: club.id,
                }));
              } else {
                setMatchForm(prev => ({
                  ...prev,
                  away_team: club.name,
                  away_team_image: club.logo_url || '',
                  away_club_id: club.id,
                }));
              }
            }
          }}
        />

        {/* Dialog para Lançar Placar Real */}
        <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Lançar Placar Real
              </DialogTitle>
              <DialogDescription>
                Informe o resultado final da partida. Os pontos serão calculados automaticamente para todos os participantes.
              </DialogDescription>
            </DialogHeader>
            
            {selectedMatch && (
              <div className="space-y-6 py-4">
                {/* Exibir times */}
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    {selectedMatch.home_team_image ? (
                      <img 
                        src={selectedMatch.home_team_image} 
                        alt={selectedMatch.home_team}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-semibold text-sm text-center max-w-24 truncate">
                      {selectedMatch.home_team}
                    </span>
                  </div>
                  
                  <span className="text-xl font-bold text-muted-foreground">vs</span>
                  
                  <div className="flex flex-col items-center gap-2">
                    {selectedMatch.away_team_image ? (
                      <img 
                        src={selectedMatch.away_team_image} 
                        alt={selectedMatch.away_team}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Shield className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <span className="font-semibold text-sm text-center max-w-24 truncate">
                      {selectedMatch.away_team}
                    </span>
                  </div>
                </div>
                
                {/* Inputs de placar */}
                <div className="flex items-center justify-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-center block text-muted-foreground">
                      Mandante
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={resultForm.home_score}
                      onChange={(e) => setResultForm(prev => ({ ...prev, home_score: e.target.value }))}
                      className="w-20 text-center text-2xl font-bold h-14"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground mt-5">×</span>
                  <div className="space-y-1">
                    <Label className="text-xs text-center block text-muted-foreground">
                      Visitante
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="99"
                      value={resultForm.away_score}
                      onChange={(e) => setResultForm(prev => ({ ...prev, away_score: e.target.value }))}
                      className="w-20 text-center text-2xl font-bold h-14"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Atenção:</strong> Após confirmar o resultado, os palpites deste jogo serão bloqueados e a pontuação dos participantes será atualizada automaticamente.
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleSaveResult} 
                disabled={savingResult || !resultForm.home_score || !resultForm.away_score}
              >
                {savingResult && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Resultado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
