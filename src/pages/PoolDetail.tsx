import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { MatchCard } from '@/components/MatchCard';
import { UserScoreDetails } from '@/components/UserScoreDetails';
import { RankingParticipantDetails } from '@/components/RankingParticipantDetails';
import { RoundSummary } from '@/components/RoundSummary';
import { CupFormatView } from '@/components/cup/CupFormatView';
import { TicketSelector } from '@/components/TicketSelector';
import { TicketCarousel, TicketCarouselItem } from '@/components/TicketCarousel';
import { JoinWithTicketsDialog } from '@/components/JoinWithTicketsDialog';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Loader2, 
  ArrowLeft,
  Medal,
  Target,
  Settings,
  Globe,
  Lock,
  Clock,
  ChevronRight,
  ChevronLeft,
  AlertTriangle
} from 'lucide-react';
import { formatDateShortBR } from '@/lib/date-utils';
import { calculateEstimatedPrize, formatBRL, requiresApproval } from '@/lib/prize-utils';
import { PrizeDisplayCard } from '@/components/PrizeDisplayCard';

interface Pool {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  entry_fee: number;
  admin_fee_percent: number | null;
  max_participants: number | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  created_by: string | null;
  cover_image: string | null;
  allow_multiple_tickets?: boolean;
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
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  total_points: number;
  public_id: string;
  full_name: string | null;
  numeric_id: number;
  ticket_number: number;
}

interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
  points_earned: number | null;
}

interface Round {
  id: string;
  name: string | null;
  round_number: number;
}

export default function PoolDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { acceptInvitationByToken } = usePoolInvitations(id);
  
  const [pool, setPool] = useState<Pool | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [userParticipation, setUserParticipation] = useState<{ status: string } | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  
  // Rounds navigation
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  
  // Score transparency dialogs
  const [myScoreDialogOpen, setMyScoreDialogOpen] = useState(false);
  const [participantDetailsOpen, setParticipantDetailsOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  
  // Join disclaimer modal
  const [showJoinDisclaimer, setShowJoinDisclaimer] = useState(false);
  
  // Invite token processing
  const [processingInvite, setProcessingInvite] = useState(false);
  
  // Track notified rounds/groups to prevent duplicate notifications
  const [notifiedRounds, setNotifiedRounds] = useState<Set<string>>(new Set());
  
  // Ticket management
  const [activeTicketId, setActiveTicketId] = useState<string | undefined>();
  // Track prediction counts for ALL user tickets (not just active)
  const [allTicketPredictionCounts, setAllTicketPredictionCounts] = useState<Record<string, number>>({});

  // Get user tickets from participants
  const userTickets = useMemo(() => {
    if (!user) return [];
    return participants
      .filter(p => p.user_id === user.id)
      .sort((a, b) => a.ticket_number - b.ticket_number);
  }, [participants, user]);

  // Fetch prediction counts for ALL user tickets in current round
  useEffect(() => {
    const fetchAllTicketCounts = async () => {
      if (!userTickets.length || !rounds.length || selectedRoundIndex === null) {
        setAllTicketPredictionCounts({});
        return;
      }
      
      const selectedRound = rounds[selectedRoundIndex];
      if (!selectedRound) return;
      
      const roundMatches = matches.filter(m => (m as any).round_id === selectedRound.id);
      if (!roundMatches.length) return;
      
      const ticketIds = userTickets.map(t => t.id);
      
      const { data } = await supabase
        .from('predictions')
        .select('participant_id, match_id')
        .in('participant_id', ticketIds)
        .in('match_id', roundMatches.map(m => m.id));
      
      const counts: Record<string, number> = {};
      ticketIds.forEach(id => { counts[id] = 0; });
      data?.forEach(p => {
        if (p.participant_id) {
          counts[p.participant_id] = (counts[p.participant_id] || 0) + 1;
        }
      });
      setAllTicketPredictionCounts(counts);
    };
    
    fetchAllTicketCounts();
  }, [userTickets, rounds, selectedRoundIndex, matches]);

  // Calculate ticket progress for status panel using real counts
  const ticketStatusList = useMemo<TicketCarouselItem[]>(() => {
    if (!userTickets.length || !rounds.length || selectedRoundIndex === null) return [];
    
    const selectedRound = rounds[selectedRoundIndex];
    if (!selectedRound) return [];
    
    const roundMatches = matches.filter(m => (m as any).round_id === selectedRound.id);
    const totalMatches = roundMatches.length;
    
    return userTickets.map(ticket => {
      // For active ticket, use local predictions state (most up-to-date)
      // For other tickets, use fetched counts
      const filledCount = ticket.id === activeTicketId
        ? Object.keys(predictions).filter(matchId => roundMatches.some(m => m.id === matchId)).length
        : (allTicketPredictionCounts[ticket.id] || 0);
      
      return {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: (filledCount === totalMatches && totalMatches > 0) ? 'filled' : 'empty',
        progress: { filled: filledCount, total: totalMatches },
      } as TicketCarouselItem;
    });
  }, [userTickets, rounds, selectedRoundIndex, matches, predictions, activeTicketId, allTicketPredictionCounts]);

  // Set active ticket when userTickets changes - prioritize first empty ticket
  useEffect(() => {
    if (userTickets.length > 0) {
      const activeTicketExists = userTickets.some(t => t.id === activeTicketId);
      if (!activeTicketId || !activeTicketExists) {
        // Try to find first empty ticket
        const firstEmpty = ticketStatusList.find(t => t.status === 'empty');
        setActiveTicketId(firstEmpty?.id || userTickets[0].id);
      }
    }
  }, [userTickets, ticketStatusList]);

  // Fetch predictions for the active ticket
  useEffect(() => {
    const fetchTicketPredictions = async () => {
      if (!activeTicketId || !user || !matches.length) {
        setPredictions({});
        return;
      }

      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('*')
        .eq('participant_id', activeTicketId)
        .in('match_id', matches.map(m => m.id));

      const predictionsMap: Record<string, Prediction> = {};
      predictionsData?.forEach(p => {
        predictionsMap[p.match_id] = p;
      });
      setPredictions(predictionsMap);
    };

    fetchTicketPredictions();
  }, [activeTicketId, matches, user]);

  // Handle invite token from URL
  useEffect(() => {
    const inviteToken = searchParams.get('invite');
    if (inviteToken && user && id) {
      processInviteToken(inviteToken);
    }
  }, [searchParams, user, id]);

  const processInviteToken = async (token: string) => {
    setProcessingInvite(true);
    const result = await acceptInvitationByToken(token);
    setProcessingInvite(false);
    
    // Remove the invite param from URL
    searchParams.delete('invite');
    setSearchParams(searchParams, { replace: true });
    
    if (result.success) {
      // Refresh data to show participation
      fetchPoolData();
    } else if (result.error) {
      toast({
        title: 'Erro no convite',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (id) {
      fetchPoolData();
    }
    if (user) {
      fetchUserRoles();
    }
  }, [id, user]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`pool-detail-${id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'matches', filter: `pool_id=eq.${id}` },
        (payload) => {
          console.log('Match change:', payload);
          fetchPoolData();
          if (payload.eventType === 'INSERT') {
            toast({ title: '🎮 Novo jogo adicionado!', description: 'Um novo jogo foi criado no bolão.' });
          } else if (payload.eventType === 'UPDATE') {
            toast({ title: '📊 Jogo atualizado!', description: 'Os dados do jogo foram atualizados.' });
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pool_participants', filter: `pool_id=eq.${id}` },
        (payload) => {
          console.log('Participant change:', payload);
          fetchPoolData();
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

  const fetchPoolData = async () => {
    try {
      // Fetch pool details
      const { data: poolData, error: poolError } = await supabase
        .from('pools')
        .select('*')
        .eq('id', id)
        .single();

      if (poolError) throw poolError;
      setPool(poolData);

      // Fetch rounds
      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select('id, name, round_number')
        .eq('pool_id', id)
        .order('round_number', { ascending: true });

      if (roundsError) throw roundsError;
      setRounds(roundsData || []);

      // Fetch matches first to determine current round
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('pool_id', id)
        .order('match_date', { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);
      
      // Set initial round to current round with open predictions
      if (roundsData && roundsData.length > 0 && selectedRoundIndex === null) {
        const now = new Date();
        
        // Find the first round that has at least one match with open prediction deadline
        let currentRoundIndex = -1;
        
        for (let i = 0; i < roundsData.length; i++) {
          const roundId = roundsData[i].id;
          const roundMatches = matchesData?.filter(m => m.round_id === roundId) || [];
          
          // Check if any match in this round has open prediction deadline
          const hasOpenPredictions = roundMatches.some(match => {
            const deadline = new Date(match.prediction_deadline);
            return deadline > now;
          });
          
          if (hasOpenPredictions) {
            currentRoundIndex = i;
            break;
          }
        }
        
        // Fallback: if no round has open predictions, open the last round
        if (currentRoundIndex === -1) {
          currentRoundIndex = roundsData.length - 1;
        }
        
        setSelectedRoundIndex(currentRoundIndex);
      }

      // Matches already fetched and set above

      // Fetch participants (query separada)
      const { data: participantsData, error: participantsError } = await supabase
        .from('pool_participants')
        .select('id, user_id, status, total_points, ticket_number')
        .eq('pool_id', id)
        .eq('status', 'active');

      if (participantsError) throw participantsError;

      // Buscar perfis e pontuações reais dos palpites
      if (participantsData && participantsData.length > 0) {
        const userIds = participantsData.map(p => p.user_id);
        const participantIds = participantsData.map(p => p.id);
        
        // Fetch profiles and real predictions points in parallel
        const [profilesResult, predictionsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, public_id, full_name, numeric_id')
            .in('id', userIds),
          supabase
            .from('predictions')
            .select('participant_id, points_earned')
            .in('participant_id', participantIds)
        ]);

        const profilesData = profilesResult.data;
        
        // Calculate real total points per participant from predictions
        const realPoints: Record<string, number> = {};
        predictionsResult.data?.forEach(pred => {
          if (pred.participant_id) {
            realPoints[pred.participant_id] = (realPoints[pred.participant_id] || 0) + (pred.points_earned || 0);
          }
        });

        // Mapear participantes com perfis e pontos reais
        const participantsWithProfiles = participantsData.map(p => {
          const profile = profilesData?.find(prof => prof.id === p.user_id);
          return {
            ...p,
            total_points: realPoints[p.id] ?? p.total_points ?? 0,
            public_id: profile?.public_id || 'Anônimo',
            full_name: profile?.full_name || null,
            numeric_id: profile?.numeric_id || 0,
            ticket_number: p.ticket_number || 1,
          };
        });
        
        // Sort by real points descending
        participantsWithProfiles.sort((a, b) => b.total_points - a.total_points);
        setParticipants(participantsWithProfiles);
      } else {
        setParticipants([]);
      }

      // Check user participation - get all user's tickets
      if (user) {
        const { data: participationData } = await supabase
          .from('pool_participants')
          .select('status')
          .eq('pool_id', id)
          .eq('user_id', user.id)
          .order('ticket_number', { ascending: true });

        // User is participating if they have any ticket (active or pending)
        const hasActiveTicket = participationData?.some(p => p.status === 'active');
        const hasPendingTicket = participationData?.some(p => p.status === 'pending');
        
        if (hasActiveTicket) {
          setUserParticipation({ status: 'active' });
        } else if (hasPendingTicket) {
          setUserParticipation({ status: 'pending' });
        } else if (participationData && participationData.length > 0) {
          setUserParticipation({ status: participationData[0].status });
        } else {
          setUserParticipation(null);
        }

        // Fetch user predictions if active
        if (hasActiveTicket) {
          // Predictions will be fetched per active ticket via useEffect below
          // Initial fetch not needed here
        }
      }
    } catch (error) {
      console.error('Error fetching pool data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do bolão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowJoinDisclaimer(true);
  };

  const handleJoinPool = async (ticketCount: number = 1) => {
    setShowJoinDisclaimer(false);
    setJoining(true);
    try {
      // Determine initial status:
      // - If entry_fee > 0: always 'pending' (requires approval)
      // - If private pool: 'pending' (requires approval)
      // - If public pool with no fee: 'active' (immediate access)
      const needsApproval = requiresApproval(pool?.entry_fee || 0, pool?.is_public ?? true);
      const initialStatus = needsApproval ? 'pending' : 'active';
      
      // Insert tickets based on count
      for (let i = 0; i < ticketCount; i++) {
        const { error } = await supabase
          .from('pool_participants')
          .insert({
            pool_id: id,
            user_id: user!.id,
            status: initialStatus,
            ticket_number: i + 1,
          });

        if (error) throw error;
      }

      if (initialStatus === 'active') {
        toast({
          title: 'Sucesso!',
          description: ticketCount > 1 
            ? `Você entrou no bolão com ${ticketCount} palpites!`
            : 'Você entrou no bolão!',
        });
      } else {
        toast({
          title: 'Solicitação enviada!',
          description: ticketCount > 1 
            ? `Você solicitou ${ticketCount} palpites. Aguarde a aprovação do administrador.`
            : pool?.entry_fee && pool.entry_fee > 0 
              ? 'Este bolão possui taxa de inscrição. Aguarde a aprovação do administrador.'
              : 'Aguarde a aprovação do administrador.',
        });
      }

      fetchPoolData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível entrar no bolão.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!user || !id || !pool?.allow_multiple_tickets) return;

    try {
      const nextNumber = userTickets.length > 0 
        ? Math.max(...userTickets.map(t => t.ticket_number)) + 1 
        : 1;

      const { error } = await supabase
        .from('pool_participants')
        .insert({
          pool_id: id,
          user_id: user.id,
          ticket_number: nextNumber,
          status: 'active' as const,
        });

      if (error) throw error;

      toast({
        title: 'Novo palpite criado!',
        description: `Palpite #${nextNumber} criado com sucesso.`,
      });

      // Refresh data to get the new ticket
      fetchPoolData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar novo palpite.',
        variant: 'destructive',
      });
    }
  };

  const handlePredictionChange = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!user || userParticipation?.status !== 'active') return;

    // Use active ticket if multiple tickets are allowed
    const participantIdToUse = pool?.allow_multiple_tickets ? activeTicketId : userTickets[0]?.id;

    try {
      // Use upsert to avoid INSERT/UPDATE race conditions
      const { error } = await supabase
        .from('predictions')
        .upsert(
          {
            match_id: matchId,
            user_id: user.id,
            participant_id: participantIdToUse,
            home_score: homeScore,
            away_score: awayScore,
          },
          { onConflict: 'match_id,user_id,participant_id' }
        );

      if (error) throw error;

      // Update local state with new prediction
      const updatedPredictions = {
        ...predictions,
        [matchId]: { match_id: matchId, home_score: homeScore, away_score: awayScore, points_earned: null },
      };
      setPredictions(updatedPredictions);

      // Check round completion for current ticket and auto-advance
      const match = matches.find(m => m.id === matchId);
      if (match && pool?.allow_multiple_tickets && userTickets.length > 1) {
        const roundId = (match as any).round_id;
        const roundMatches = matches.filter(m => (m as any).round_id === roundId);
        
        // Check if all round matches have predictions for current ticket
        const allFilledForCurrentTicket = roundMatches.length > 0 && roundMatches.every(m => 
          updatedPredictions[m.id] !== undefined
        );
        
        if (allFilledForCurrentTicket) {
          // Update allTicketPredictionCounts for current ticket
          const updatedCounts = {
            ...allTicketPredictionCounts,
            [activeTicketId!]: roundMatches.length,
          };
          setAllTicketPredictionCounts(updatedCounts);
          
          // Find next empty ticket using updated counts (not stale ticketStatusList)
          const totalMatches = roundMatches.length;
          const currentTicketIndex = userTickets.findIndex(t => t.id === activeTicketId);
          const orderedTickets = [
            ...userTickets.slice(currentTicketIndex + 1),
            ...userTickets.slice(0, currentTicketIndex),
          ];
          
          const nextEmptyTicket = orderedTickets.find(ticket => {
            const count = updatedCounts[ticket.id] || 0;
            return count < totalMatches;
          });
          
          const currentTicketNumber = userTickets[currentTicketIndex]?.ticket_number;
          
          if (nextEmptyTicket) {
            // Auto-advance to next empty ticket
            setActiveTicketId(nextEmptyTicket.id);
            toast({
              title: `✅ Ticket #${currentTicketNumber} completo!`,
              description: `Avançando para Ticket #${nextEmptyTicket.ticket_number}...`,
            });
          } else {
            // All tickets are filled
            toast({
              title: '🎉 Todos os tickets preenchidos!',
              description: `Você completou todos os ${userTickets.length} palpites para esta rodada.`,
            });
          }
        }
      }

      // Check round completion for notification (legacy behavior for single ticket)
      if (match && !pool?.allow_multiple_tickets) {
        const roundId = (match as any).round_id;
        if (roundId && !notifiedRounds.has(roundId)) {
          const roundMatches = matches.filter(m => (m as any).round_id === roundId);
          const now = new Date();
          
          // Filter open matches (deadline not passed, not finished)
          const openMatches = roundMatches.filter(m => {
            const deadline = new Date(m.prediction_deadline);
            return deadline > now && !m.is_finished;
          });
          
          // Check if all open matches have predictions
          const allFilled = openMatches.length > 0 && openMatches.every(m => 
            updatedPredictions[m.id] !== undefined
          );
          
          if (allFilled) {
            const round = rounds.find(r => r.id === roundId);
            const roundName = round?.name || 'Rodada';
            
            setNotifiedRounds(prev => new Set([...prev, roundId]));
            toast({
              title: '✅ Palpites Completos!',
              description: `Todos os ${openMatches.length} palpites de "${roundName}" foram salvos.`,
            });
          }
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  // Callback for CupFormatView when a group is complete
  const handleGroupComplete = (groupName: string, matchCount: number) => {
    toast({
      title: '✅ Palpites Completos!',
      description: `Todos os ${matchCount} palpites do ${groupName} foram salvos.`,
    });
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

  if (!pool) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Bolão não encontrado</h1>
          <Button variant="outline" onClick={() => navigate('/pools')}>
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
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/pools')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar aos bolões
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pool Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {pool.cover_image ? (
                      <img 
                        src={pool.cover_image} 
                        alt={pool.name}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                        <Trophy className="h-7 w-7 text-primary-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-2xl">{pool.name}</CardTitle>
                      <CardDescription>{pool.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                    {canManagePool() && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/pools/${id}/manage`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gerenciar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{participants.length} participantes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Criado em {formatDateShortBR(pool.created_at)}</span>
                  </div>
                </div>

                {/* Prize Information Card - Only for pools with entry fee */}
                {pool.entry_fee > 0 && (
                  <div className="space-y-4">
                    <PrizeDisplayCard
                      entryFee={pool.entry_fee}
                      estimatedPrize={calculateEstimatedPrize(
                        pool.entry_fee,
                        participants.filter(p => p.status === 'active').length,
                        pool.admin_fee_percent || 0
                      )}
                    />
                    <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                      <span>{participants.filter(p => p.status === 'active').length} participantes ativos</span>
                      <span>Taxa admin: {pool.admin_fee_percent || 0}%</span>
                    </div>
                  </div>
                )}

                {!userParticipation && (
                  pool.allow_multiple_tickets ? (
                    <JoinWithTicketsDialog
                      entryFee={pool.entry_fee || 0}
                      onConfirm={handleJoinPool}
                      title="Participar do Bolão"
                      description="Informe quantos palpites você deseja fazer neste bolão."
                      requiresApproval={requiresApproval(pool.entry_fee || 0, pool.is_public ?? true)}
                      trigger={
                        <Button variant="hero" className="w-full md:w-auto" disabled={joining}>
                          {joining && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          <Users className="h-4 w-4 mr-2" />
                          Participar deste Bolão
                        </Button>
                      }
                    />
                  ) : (
                    <Button 
                      variant="hero" 
                      className="w-full md:w-auto"
                      onClick={handleJoinClick}
                      disabled={joining}
                    >
                      {joining ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      Participar deste Bolão
                    </Button>
                  )
                )}

                {userParticipation?.status === 'pending' && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        Aguardando aprovação
                      </span>
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      Sua solicitação está pendente de aprovação pelo administrador.
                      {pool?.description && (
                        <>
                          <br />
                          <span className="font-medium">Orientações:</span> {pool.description}
                        </>
                      )}
                    </p>
                  </div>
                )}

                {userParticipation?.status === 'active' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="default" className="text-base px-4 py-2 bg-green-600">
                        Você está participando
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setMyScoreDialogOpen(true)}
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        Minha Pontuação
                      </Button>
                    </div>
                    
                    {/* Ticket Carousel for multiple guesses */}
                    {pool.allow_multiple_tickets && ticketStatusList.length > 1 && (
                      <>
                        <TicketCarousel
                          tickets={ticketStatusList}
                          activeTicketId={activeTicketId || ''}
                          onTicketSelect={setActiveTicketId}
                          variant="pool"
                        />
                        
                        {/* Ticket completion messages */}
                        {(() => {
                          const emptyCount = ticketStatusList.filter(t => t.status === 'empty').length;
                          const allFilled = emptyCount === 0 && ticketStatusList.length > 0;
                          
                          if (allFilled) {
                            return (
                              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                  🎉 Todos os seus tickets desta rodada já foram preenchidos.
                                </p>
                              </div>
                            );
                          }
                          
                          if (emptyCount > 0) {
                            return (
                              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                                  ⚠️ Você ainda possui {emptyCount} ticket{emptyCount > 1 ? 's' : ''} sem palpitar nesta rodada.
                                </p>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                      </>
                    )}
                    
                    {/* Legacy Ticket Selector for single ticket operations */}
                    {pool.allow_multiple_tickets && ticketStatusList.length <= 1 && (
                      <TicketSelector
                        tickets={userTickets}
                        activeTicketId={activeTicketId}
                        onTicketChange={setActiveTicketId}
                        onCreateTicket={handleCreateTicket}
                        allowMultipleTickets={pool.allow_multiple_tickets}
                        maxTickets={10}
                      />
                    )}
                  </div>
                )}

                {pool.rules && (
                  <div className="mt-6 p-4 rounded-lg bg-muted">
                    <h4 className="font-semibold mb-2">Regras do Bolão</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pool.rules}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Matches & Predictions */}
            {(() => {
              // Detect if this is a Cup format pool by checking round names
              const isCupFormat = rounds.some(r => 
                r.name?.startsWith('Grupo') || 
                r.name?.includes('Oitavas') || 
                r.name?.includes('Quartas') ||
                r.name?.includes('Semifinal') ||
                r.name?.includes('FINAL')
              );

              if (isCupFormat && selectedRoundIndex !== null) {
                // Use Cup format view
                return (
                  <CupFormatView
                    rounds={rounds}
                    matches={matches as any}
                    predictions={predictions}
                    selectedRoundIndex={selectedRoundIndex}
                    onRoundChange={setSelectedRoundIndex}
                    isParticipant={userParticipation?.status === 'active'}
                    onPredictionChange={handlePredictionChange}
                    onGroupComplete={handleGroupComplete}
                  />
                );
              }

              // Standard format view
              return (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Jogos e Palpites
                      </CardTitle>
                      
                      {/* Round Navigation */}
                      {rounds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRoundIndex(prev => 
                              prev !== null && prev > 0 ? prev - 1 : prev
                            )}
                            disabled={selectedRoundIndex === null || selectedRoundIndex === 0}
                            className="h-8 w-8"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          
                          <span className="text-sm font-medium min-w-[120px] text-center">
                            {selectedRoundIndex !== null && rounds[selectedRoundIndex] ? (
                              rounds[selectedRoundIndex].name || `${selectedRoundIndex + 1}ª Rodada`
                            ) : (
                              'Todas as Rodadas'
                            )}
                          </span>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedRoundIndex(prev => 
                              prev !== null && prev < rounds.length - 1 ? prev + 1 : prev
                            )}
                            disabled={selectedRoundIndex === null || selectedRoundIndex >= rounds.length - 1}
                            className="h-8 w-8"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Filter matches by selected round
                      const selectedRound = selectedRoundIndex !== null ? rounds[selectedRoundIndex] : null;
                      const filteredMatches = selectedRound 
                        ? matches.filter(m => (m as any).round_id === selectedRound.id)
                        : matches;
                      
                      // Check if all matches in this round are finished (for round summary)
                      const allMatchesFinished = filteredMatches.length > 0 && 
                        filteredMatches.every(m => m.is_finished);
                      
                      if (filteredMatches.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                              {selectedRound 
                                ? 'Nenhum jogo nesta rodada.'
                                : 'Nenhum jogo cadastrado ainda.'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-2">
                              {selectedRound 
                                ? 'Selecione outra rodada ou aguarde novos jogos.'
                                : 'Os jogos aparecerão aqui assim que forem adicionados pelo administrador.'}
                            </p>
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {/* Round Summary - only shown when round is finished */}
                          {selectedRound && allMatchesFinished && (
                            <RoundSummary
                              poolId={id!}
                              roundId={selectedRound.id}
                              roundName={selectedRound.name || `${selectedRoundIndex! + 1}ª Rodada`}
                            />
                          )}
                          
                          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                            {filteredMatches.map((match) => (
                              <MatchCard
                                key={`${match.id}-${activeTicketId || 'default'}`}
                                match={match}
                                prediction={predictions[match.id]}
                                onPredictionChange={(homeScore, awayScore) => 
                                  handlePredictionChange(match.id, homeScore, awayScore)
                                }
                                isParticipant={userParticipation?.status === 'active'}
                                showPredictionInputs={true}
                              />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Ranking Sidebar */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-accent" />
                  Ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum participante ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                          index === 0 ? 'bg-accent/10 border border-accent/20' :
                          index === 1 ? 'bg-muted/80' :
                          index === 2 ? 'bg-muted/50' : 'bg-muted/30'
                        }`}
                        onClick={() => {
                          setSelectedParticipant(participant);
                          setParticipantDetailsOpen(true);
                        }}
                        title="Clique para ver detalhes"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-accent text-accent-foreground' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-400 text-white' : 'bg-muted-foreground/20'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            @{participant.public_id}
                            {pool?.allow_multiple_tickets && (
                              <span className="text-xs text-muted-foreground ml-1">#{participant.ticket_number}</span>
                            )}
                          </p>
                          {participant.full_name && (
                            <p className="text-xs text-muted-foreground truncate">{participant.full_name}</p>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-bold">{participant.total_points}</p>
                            <p className="text-xs text-muted-foreground">pts</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* User Score Details Dialog */}
      {user && (
        <UserScoreDetails
          open={myScoreDialogOpen}
          onOpenChange={setMyScoreDialogOpen}
          poolId={id!}
          userId={user.id}
        />
      )}

      {/* Participant Details Dialog */}
      {selectedParticipant && (
        <RankingParticipantDetails
          open={participantDetailsOpen}
          onOpenChange={setParticipantDetailsOpen}
          poolId={id!}
          participantUserId={selectedParticipant.user_id}
          participantName={selectedParticipant.full_name || selectedParticipant.public_id}
          participantPublicId={selectedParticipant.public_id}
          participantNumericId={selectedParticipant.numeric_id}
          totalPoints={selectedParticipant.total_points}
          ticketNumber={selectedParticipant.ticket_number}
          allowMultipleTickets={pool?.allow_multiple_tickets}
        />
      )}

      {/* Join Disclaimer Modal */}
      <AlertDialog open={showJoinDisclaimer} onOpenChange={setShowJoinDisclaimer}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                Aviso Importante
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3">
                <p>
                  Ao participar deste bolão, você declara estar ciente de que:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>A plataforma <strong>não gerencia valores financeiros</strong>, prêmios ou pagamentos.</li>
                  <li>Qualquer transação financeira é de <strong>responsabilidade exclusiva</strong> dos participantes e organizadores.</li>
                  <li>A plataforma serve apenas como ferramenta para <strong>organização de palpites</strong> e acompanhamento de resultados.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Ao continuar, você concorda com estes termos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleJoinPool(1)}>
              Entendi, quero participar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
