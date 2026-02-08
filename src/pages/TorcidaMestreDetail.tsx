import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TorcidaMestreRoundCardCompact } from '@/components/torcida-mestre/TorcidaMestreRoundCardCompact';
import { RoundResultCard } from '@/components/torcida-mestre/RoundResultCard';
import { RequestParticipationDialog } from '@/components/torcida-mestre/RequestParticipationDialog';
import { TicketStatusPanel, TicketStatus } from '@/components/TicketStatusPanel';
import { DuplicatePredictionAlert } from '@/components/DuplicatePredictionAlert';
import { RoundPredictionsTable } from '@/components/torcida-mestre/RoundPredictionsTable';
import { GameCard } from '@/components/torcida-mestre/GameCard';
import { Crown, ArrowLeft, Settings, Trophy, Calendar, Users, Loader2, Ticket, AlertTriangle, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { formatPrize, calculateTorcidaMestreWinners } from '@/lib/torcida-mestre-utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { 
  TorcidaMestrePool, 
  TorcidaMestreRound, 
  TorcidaMestreParticipant,
  TorcidaMestrePrediction,
  TorcidaMestreGame,
  TorcidaMestreGameWithRounds,
} from '@/types/torcida-mestre';
import { toast } from 'sonner';
import { isAfterDeadline } from '@/lib/date-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TorcidaMestreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [pool, setPool] = useState<TorcidaMestrePool | null>(null);
  const [games, setGames] = useState<TorcidaMestreGameWithRounds[]>([]);
  const [selectedGame, setSelectedGame] = useState<TorcidaMestreGameWithRounds | null>(null);
  const [rounds, setRounds] = useState<TorcidaMestreRound[]>([]);
  const [participants, setParticipants] = useState<TorcidaMestreParticipant[]>([]);
  const [predictions, setPredictions] = useState<TorcidaMestrePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRound, setSelectedRound] = useState<TorcidaMestreRound | null>(null);
  
  // Ticket management
  const [activeTicketId, setActiveTicketId] = useState<string | undefined>();
  
  // Duplicate prediction alert
  const [duplicateAlertOpen, setDuplicateAlertOpen] = useState(false);
  const [pendingPrediction, setPendingPrediction] = useState<{
    roundId: string;
    participantId: string;
    homeScore: number;
    awayScore: number;
    duplicateTicketNumber: number;
  } | null>(null);
  
  // Unused tickets warning
  const [unusedTicketsWarningOpen, setUnusedTicketsWarningOpen] = useState(false);
  
  // Get user tickets for current round
  const userTickets = useMemo(() => {
    if (!user || !selectedRound) return [];
    return participants
      .filter(p => p.round_id === selectedRound.id && p.user_id === user.id && p.status === 'active')
      .sort((a, b) => (a.ticket_number || 1) - (b.ticket_number || 1));
  }, [participants, user, selectedRound]);
  
  // Convert to TicketStatus format for the panel
  const ticketStatusList = useMemo<TicketStatus[]>(() => {
    return userTickets.map(ticket => {
      const prediction = predictions.find(p => p.participant_id === ticket.id);
      return {
        id: ticket.id,
        ticket_number: ticket.ticket_number || 1,
        prediction: prediction ? { home_score: prediction.home_score, away_score: prediction.away_score } : null,
        status: prediction ? 'filled' : 'empty',
      };
    });
  }, [userTickets, predictions]);
  
  // Auto-select first empty ticket or first ticket when tickets change
  useEffect(() => {
    if (ticketStatusList.length > 0) {
      // If no active ticket, or active ticket is not in the list, select first empty or first
      const activeTicketExists = ticketStatusList.some(t => t.id === activeTicketId);
      if (!activeTicketId || !activeTicketExists) {
        const firstEmpty = ticketStatusList.find(t => t.status === 'empty');
        setActiveTicketId(firstEmpty?.id || ticketStatusList[0].id);
      }
    }
  }, [ticketStatusList]);
  
  // Reset active ticket when round changes
  useEffect(() => {
    setActiveTicketId(undefined);
  }, [selectedRound?.id]);
  
  // Count unused tickets for warning
  const unusedTicketsCount = ticketStatusList.filter(t => t.status === 'empty').length;
  
  const fetchData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      // Fetch pool
      const { data: poolData, error: poolError } = await supabase
        .from('torcida_mestre_pools')
        .select('*')
        .eq('id', id)
        .single();
      
      if (poolError) throw poolError;
      setPool(poolData);
      
      // Fetch games (new table) - using type assertion
      const { data: gamesData } = await (supabase as any)
        .from('torcida_mestre_games')
        .select('*')
        .eq('pool_id', id)
        .order('game_number', { ascending: false });
      
      // Fetch rounds
      const { data: roundsData } = await supabase
        .from('torcida_mestre_rounds')
        .select('*')
        .eq('pool_id', id)
        .order('round_number', { ascending: false });
      
      // Map rounds with game_id (null for backwards compatibility)
      const mappedRounds = (roundsData || []).map(r => ({
        ...r,
        game_id: (r as any).game_id || null,
      })) as TorcidaMestreRound[];
      
      setRounds(mappedRounds);
      
      // Build games with rounds
      const gamesWithRounds: TorcidaMestreGameWithRounds[] = (gamesData || []).map((game: TorcidaMestreGame) => {
        const gameRounds = mappedRounds.filter(r => r.game_id === game.id);
        const currentRound = gameRounds.find(r => !r.is_finished);
        return {
          ...game,
          rounds: gameRounds,
          current_round: currentRound,
        };
      });
      
      setGames(gamesWithRounds);
      
      // Auto-select active game and round
      const activeGame = gamesWithRounds.find(g => g.is_active && !g.is_finished);
      if (activeGame) {
        setSelectedGame(activeGame);
        const gameRound = activeGame.rounds?.[0];
        if (gameRound) {
          setSelectedRound(gameRound);
        }
      } else if (gamesWithRounds.length > 0) {
        setSelectedGame(gamesWithRounds[0]);
        const gameRound = gamesWithRounds[0].rounds?.[0];
        if (gameRound) {
          setSelectedRound(gameRound);
        }
      } else if (mappedRounds.length > 0) {
        // Fallback for legacy rounds without game_id
        setSelectedRound(mappedRounds[0]);
      }
      
      // Fetch participants
      const { data: participantsData } = await supabase
        .from('torcida_mestre_participants')
        .select('*')
        .eq('pool_id', id);
      
      // Fetch profiles for participants
      const userIds = [...new Set((participantsData || []).map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, public_id, full_name, avatar_url')
        .in('id', userIds);
      
      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
      
      const participantsWithProfiles = (participantsData || []).map(p => ({
        ...p,
        status: p.status as 'pending' | 'active' | 'blocked',
        profiles: profilesMap.get(p.user_id) || { public_id: '', full_name: null, avatar_url: null },
      }));
      
      setParticipants(participantsWithProfiles);
      
      // Fetch predictions
      const { data: predictionsData } = await supabase
        .from('torcida_mestre_predictions')
        .select('*')
        .in('round_id', (roundsData || []).map(r => r.id));
      
      const predictionUserIds = [...new Set((predictionsData || []).map(p => p.user_id))];
      const { data: predProfilesData } = await supabase
        .from('profiles')
        .select('id, public_id, full_name, avatar_url')
        .in('id', predictionUserIds);
      
      const predProfilesMap = new Map((predProfilesData || []).map(p => [p.id, p]));
      
      const predictionsWithProfiles = (predictionsData || []).map(p => ({
        ...p,
        profiles: predProfilesMap.get(p.user_id) || { public_id: '', full_name: null, avatar_url: null },
      }));
      
      setPredictions(predictionsWithProfiles);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados do bolão');
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
    fetchData();
  }, [id]);
  
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);
  
  const handleRequestParticipation = async (roundId: string, ticketCount: number = 1) => {
    if (!user || !pool) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    try {
      // Check if already requested
      const existing = participants.find(
        p => p.round_id === roundId && p.user_id === user.id
      );
      
      if (existing) {
        toast.info('Você já solicitou participação nesta rodada');
        return;
      }
      
      // Create multiple tickets
      const ticketsToCreate = [];
      for (let i = 1; i <= ticketCount; i++) {
        ticketsToCreate.push({
          pool_id: pool.id,
          round_id: roundId,
          user_id: user.id,
          ticket_number: i,
          status: 'pending',
          paid_amount: pool.entry_fee * ticketCount, // Total amount for first ticket only
        });
      }

      const { error } = await supabase
        .from('torcida_mestre_participants')
        .insert(ticketsToCreate);
      
      if (error) throw error;
      
      toast.success(`Solicitação de ${ticketCount} ticket(s) enviada! Aguarde aprovação do administrador.`);
      fetchData();
    } catch (error: any) {
      console.error('Error requesting participation:', error);
      toast.error(error.message || 'Erro ao solicitar participação');
    }
  };
  
  const handleRequestAdditionalTickets = async (roundId: string, ticketCount: number = 1) => {
    if (!user || !pool) {
      toast.error('Você precisa estar logado');
      return;
    }
    
    try {
      // Get current max ticket number for this user in this round
      const userTicketsInRound = participants.filter(
        p => p.round_id === roundId && p.user_id === user.id
      );
      
      const maxTicketNumber = Math.max(...userTicketsInRound.map(t => t.ticket_number || 1), 0);
      
      // Create additional tickets starting from next number
      const ticketsToCreate = [];
      for (let i = 1; i <= ticketCount; i++) {
        ticketsToCreate.push({
          pool_id: pool.id,
          round_id: roundId,
          user_id: user.id,
          ticket_number: maxTicketNumber + i,
          status: 'pending',
          paid_amount: pool.entry_fee * ticketCount,
        });
      }

      const { error } = await supabase
        .from('torcida_mestre_participants')
        .insert(ticketsToCreate);
      
      if (error) throw error;
      
      toast.success(`Solicitação de ${ticketCount} ticket(s) adicional(is) enviada! Aguarde aprovação.`);
      fetchData();
    } catch (error: any) {
      console.error('Error requesting additional tickets:', error);
      toast.error(error.message || 'Erro ao solicitar tickets adicionais');
    }
  };
  
  const checkDuplicatePrediction = (roundId: string, participantId: string, homeScore: number, awayScore: number) => {
    // Find other predictions in the same round by the same user with the same score
    const userPredictionsInRound = predictions.filter(p => {
      if (p.round_id !== roundId) return false;
      if (p.participant_id === participantId) return false; // Exclude current ticket
      
      const participant = participants.find(part => part.id === p.participant_id);
      if (!participant || participant.user_id !== user?.id) return false;
      
      return p.home_score === homeScore && p.away_score === awayScore;
    });
    
    if (userPredictionsInRound.length > 0) {
      const duplicateParticipant = participants.find(p => p.id === userPredictionsInRound[0].participant_id);
      return duplicateParticipant?.ticket_number || 1;
    }
    
    return null;
  };
  
  const handleSavePrediction = async (roundId: string, participantId: string, homeScore: number, awayScore: number) => {
    if (!user) return;
    
    // Check for duplicate score
    const duplicateTicketNumber = checkDuplicatePrediction(roundId, participantId, homeScore, awayScore);
    
    if (duplicateTicketNumber !== null) {
      setPendingPrediction({ roundId, participantId, homeScore, awayScore, duplicateTicketNumber });
      setDuplicateAlertOpen(true);
      return;
    }
    
    await executeSavePrediction(roundId, participantId, homeScore, awayScore);
  };
  
  const executeSavePrediction = async (roundId: string, participantId: string, homeScore: number, awayScore: number) => {
    if (!user) return;
    
    try {
      // Check if prediction exists
      const existing = predictions.find(
        p => p.participant_id === participantId
      );
      
      if (existing) {
        // Update
        const { error } = await supabase
          .from('torcida_mestre_predictions')
          .update({ home_score: homeScore, away_score: awayScore })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('torcida_mestre_predictions')
          .insert({
            round_id: roundId,
            participant_id: participantId,
            user_id: user.id,
            home_score: homeScore,
            away_score: awayScore,
          });
        
        if (error) throw error;
      }
      
      await fetchData();
      
      // After saving, auto-advance to next empty ticket
      const currentTicketIndex = ticketStatusList.findIndex(t => t.id === participantId);
      const nextEmptyTicket = ticketStatusList.slice(currentTicketIndex + 1).find(t => t.status === 'empty');
      
      if (nextEmptyTicket) {
        setActiveTicketId(nextEmptyTicket.id);
        toast.success(`Palpite salvo! Avançando para Ticket #${nextEmptyTicket.ticket_number}...`);
      } else {
        // Check if all tickets are filled
        const allFilled = ticketStatusList.every(t => t.id === participantId || t.status === 'filled');
        if (allFilled && ticketStatusList.length > 1) {
          toast.success('Palpite salvo! Todos os tickets foram preenchidos.');
        }
      }
    } catch (error) {
      throw error;
    }
  };
  
  const handleConfirmDuplicate = async () => {
    if (!pendingPrediction) return;
    
    setDuplicateAlertOpen(false);
    await executeSavePrediction(
      pendingPrediction.roundId,
      pendingPrediction.participantId,
      pendingPrediction.homeScore,
      pendingPrediction.awayScore
    );
    setPendingPrediction(null);
  };
  
  const handleCancelDuplicate = () => {
    setDuplicateAlertOpen(false);
    setPendingPrediction(null);
  };
  
  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </Layout>
    );
  }
  
  if (!pool) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <Crown className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Bolão não encontrado</h1>
          <Button asChild>
            <Link to="/torcida-mestre">Voltar</Link>
          </Button>
        </div>
      </Layout>
    );
  }
  
  const activeParticipant = userTickets.find(t => t.id === activeTicketId);
  
  const activePrediction = activeParticipant
    ? predictions.find(p => p.participant_id === activeParticipant.id)
    : null;
  
  const roundPredictions = selectedRound
    ? predictions.filter(p => p.round_id === selectedRound.id)
    : [];
  
  const roundParticipants = selectedRound
    ? participants.filter(p => p.round_id === selectedRound.id)
    : [];
  
  const activeRoundParticipants = roundParticipants.filter(p => p.status === 'active');
  
  // Calculate total prize dynamically: entry_fee × active participants + previous accumulated
  const entryFee = selectedRound?.entry_fee_override ?? pool?.entry_fee ?? 0;
  const totalPrize = selectedRound 
    ? (entryFee * activeRoundParticipants.length) + (selectedRound.previous_accumulated || 0)
    : 0;
  
  const winnerResult = selectedRound?.is_finished
    ? calculateTorcidaMestreWinners(selectedRound, roundPredictions, pool.allow_draws)
    : null;
  
  const isDeadlinePassed = selectedRound ? isAfterDeadline(selectedRound.prediction_deadline) : false;
  const actualScore = selectedRound?.is_finished && selectedRound.home_score !== null && selectedRound.away_score !== null
    ? { home: selectedRound.home_score, away: selectedRound.away_score }
    : null;
  
  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/torcida-mestre">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="flex items-center gap-3 flex-1">
            {pool.club_image ? (
              <img 
                src={pool.club_image} 
                alt={pool.club_name}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{pool.name}</h1>
              <p className="text-muted-foreground">{pool.club_name}</p>
            </div>
          </div>
          
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link to={`/torcida-mestre/${pool.id}/manage`}>
                <Settings className="h-4 w-4 mr-2" />
                Gerenciar
              </Link>
            </Button>
          )}
        </div>
        
        {/* Pool Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-xs text-muted-foreground">Entrada</p>
              <p className="font-bold">{formatPrize(pool.entry_fee)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Rodadas</p>
              <p className="font-bold">{rounds.length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
              <p className="text-xs text-muted-foreground">Participantes</p>
              <p className="font-bold">{participants.filter(p => p.status === 'active').length}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 text-center">
              <Crown className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-xs text-muted-foreground">Empates</p>
              <p className="font-bold">{pool.allow_draws ? 'Valem' : 'Acumulam'}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Tabs - Jogo Atual + Histórico */}
        <Tabs defaultValue="current" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              {selectedGame ? `Jogo ${selectedGame.game_number}` : 'Jogo Atual'}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
          
          {/* Current Game Tab */}
          <TabsContent value="current">
            {/* Rounds Tabs */}
            {rounds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma rodada criada</h3>
                  <p className="text-muted-foreground">
                    Aguarde o administrador criar a primeira rodada
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Tabs value={selectedRound?.id} onValueChange={(v) => setSelectedRound(rounds.find(r => r.id === v) || null)}>
                <TabsList className="w-full justify-start overflow-x-auto mb-6">
                  {(selectedGame ? rounds.filter(r => r.game_id === selectedGame.id) : rounds).map(round => (
                    <TabsTrigger key={round.id} value={round.id} className="min-w-fit">
                      {round.name || `Rodada ${round.round_number}`}
                      {round.is_finished && <Badge variant="secondary" className="ml-2">Encerrada</Badge>}
                    </TabsTrigger>
                  ))}
                </TabsList>
            
            {rounds.map(round => (
              <TabsContent key={round.id} value={round.id}>
                {/* Main Content: Tickets (left) + Round Card (right) - Always side by side */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Left Column: Tickets Panel + Results */}
                  <div className="space-y-3">
                    {/* Ticket Status Panel - Always show for approved users */}
                    {ticketStatusList.length > 0 && (
                      <TicketStatusPanel
                        tickets={ticketStatusList}
                        activeTicketId={activeTicketId || ''}
                        onTicketSelect={setActiveTicketId}
                        variant="torcida-mestre"
                        disabled={isDeadlinePassed || round.is_finished}
                      />
                    )}
                    
                    {/* Unused tickets warning */}
                    {unusedTicketsCount > 0 && !isDeadlinePassed && !round.is_finished && ticketStatusList.length > 0 && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {unusedTicketsCount} ticket(s) pendente(s)
                        </p>
                      </div>
                    )}
                    
                    {/* Winners Panel - Show when finished */}
                    {round.is_finished && winnerResult && (
                      <RoundResultCard
                        round={round}
                        pool={pool}
                        winners={winnerResult.winners}
                        shouldAccumulate={winnerResult.shouldAccumulate}
                        accumulationReason={winnerResult.reason}
                        totalPrize={totalPrize}
                        participantsCount={activeRoundParticipants.length}
                      />
                    )}
                    
                    {/* Placeholder info when no tickets */}
                    {ticketStatusList.length === 0 && !round.is_finished && (
                      <Card className="bg-muted/30">
                        <CardContent className="py-6 text-center">
                          <Ticket className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            Seus tickets aparecerão aqui após aprovação
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Right Column: Round Card Compact */}
                  <div className="space-y-3">
                    <TorcidaMestreRoundCardCompact
                      round={round}
                      pool={pool}
                      userPrediction={activePrediction}
                      isApproved={!!activeParticipant}
                      hasPendingRequest={!!participants.find(p => p.round_id === round.id && p.user_id === user?.id && p.status === 'pending')}
                      onSavePrediction={activeParticipant 
                        ? (h, a) => handleSavePrediction(round.id, activeParticipant.id, h, a)
                        : undefined
                      }
                      activeTicketNumber={activeParticipant?.ticket_number || 1}
                    />
                    
                    {/* Action Buttons */}
                    {/* Request First Participation Button */}
                    {user && userTickets.length === 0 && !participants.find(p => p.round_id === round.id && p.user_id === user.id) && !round.is_finished && !isDeadlinePassed && (
                      <RequestParticipationDialog
                        entryFee={pool.entry_fee}
                        onConfirm={async (ticketCount) => {
                          await handleRequestParticipation(round.id, ticketCount);
                        }}
                        trigger={
                          <Button className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950" size="sm">
                            <Ticket className="h-4 w-4 mr-2" />
                            Participar
                          </Button>
                        }
                      />
                    )}
                    
                    {/* Request Additional Tickets Button */}
                    {user && userTickets.length > 0 && !round.is_finished && !isDeadlinePassed && (
                      <RequestParticipationDialog
                        entryFee={pool.entry_fee}
                        onConfirm={async (ticketCount) => {
                          await handleRequestAdditionalTickets(round.id, ticketCount);
                        }}
                        trigger={
                          <Button className="w-full" variant="outline" size="sm">
                            <Ticket className="h-4 w-4 mr-2" />
                            + Tickets
                          </Button>
                        }
                      />
                    )}
                    
                    {!user && (
                      <Button asChild className="w-full" variant="outline" size="sm">
                        <Link to="/auth">Fazer login para participar</Link>
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Transparency Table - After Deadline */}
                <RoundPredictionsTable
                  predictions={roundPredictions}
                  participants={roundParticipants}
                  isDeadlinePassed={isDeadlinePassed}
                  actualScore={actualScore}
                />
                
                {/* Participants List */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Participantes da Rodada ({roundParticipants.filter(p => p.status === 'active').length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {roundParticipants.filter(p => p.status === 'active').length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum participante aprovado ainda
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {roundParticipants
                          .filter(p => p.status === 'active')
                          .map(participant => (
                            <div 
                              key={participant.id}
                              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {participant.profiles?.public_id?.substring(0, 2).toUpperCase() || '??'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  @{participant.profiles?.public_id || 'Usuário'}
                                </p>
                                {(participant.ticket_number || 1) > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    Ticket {participant.ticket_number}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
          </TabsContent>
          
          {/* History Tab */}
          <TabsContent value="history">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Jogos Anteriores
              </h3>
              
              {games.filter(g => g.is_finished).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum jogo finalizado</h3>
                    <p className="text-muted-foreground">
                      Os jogos finalizados aparecerão aqui
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {games.filter(g => g.is_finished).map(game => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onClick={() => {
                        setSelectedGame(game);
                        if (game.rounds && game.rounds.length > 0) {
                          setSelectedRound(game.rounds[0]);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Duplicate Prediction Alert */}
      {pendingPrediction && (
        <DuplicatePredictionAlert
          open={duplicateAlertOpen}
          onOpenChange={setDuplicateAlertOpen}
          onConfirm={handleConfirmDuplicate}
          onCancel={handleCancelDuplicate}
          duplicateScore={{ home: pendingPrediction.homeScore, away: pendingPrediction.awayScore }}
          existingTicketNumber={pendingPrediction.duplicateTicketNumber}
        />
      )}
    </Layout>
  );
}
