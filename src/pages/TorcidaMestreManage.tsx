import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ClubAutocomplete } from '@/components/ClubAutocomplete';
import { InviteParticipantInline } from '@/components/torcida-mestre/InviteParticipantInline';
import { CreateGameDialog } from '@/components/torcida-mestre/CreateGameDialog';
import { GameList } from '@/components/torcida-mestre/GameList';
import { FinishGameDialog } from '@/components/torcida-mestre/FinishGameDialog';
import { Crown, ArrowLeft, Plus, Save, Users, CheckCircle, XCircle, Trophy, Loader2, Calendar, UserPlus, Ticket, RotateCcw } from 'lucide-react';
import { RoundFinancialSummary } from '@/components/torcida-mestre/RoundFinancialSummary';
import { supabase } from '@/integrations/supabase/client';
import { notifyNewTorcidaMestreRoundCreated } from '@/lib/notification-utils';
import { useAuth } from '@/lib/auth-context';
import { formatDateTimeBR, formatToDateTimeLocal, isAfterDeadline } from '@/lib/date-utils';
import { formatPrize, calculateTorcidaMestreWinners, calculatePrizePerWinner } from '@/lib/torcida-mestre-utils';
import type { 
  TorcidaMestrePool, 
  TorcidaMestreRound, 
  TorcidaMestreParticipant,
  TorcidaMestrePrediction,
  TorcidaMestreGame,
  TorcidaMestreGameWithRounds,
} from '@/types/torcida-mestre';
import { toast } from 'sonner';

export default function TorcidaMestreManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pool, setPool] = useState<TorcidaMestrePool | null>(null);
  const [games, setGames] = useState<TorcidaMestreGameWithRounds[]>([]);
  const [selectedGame, setSelectedGame] = useState<TorcidaMestreGameWithRounds | null>(null);
  const [rounds, setRounds] = useState<TorcidaMestreRound[]>([]);
  const [participants, setParticipants] = useState<TorcidaMestreParticipant[]>([]);
  const [predictions, setPredictions] = useState<TorcidaMestrePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRound, setSelectedRound] = useState<TorcidaMestreRound | null>(null);
  
  // Create round dialog
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [newRound, setNewRound] = useState({
    name: '',
    opponent_name: '',
    opponent_club_id: '',
    opponent_image: '',
    match_date: '',
    prediction_deadline: '',
    is_home: true,
  });
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  
  // Score input
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  
  const fetchData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const { data: poolData } = await supabase
        .from('torcida_mestre_pools')
        .select('*')
        .eq('id', id)
        .single();
      
      setPool(poolData);
      
      // Fetch games (new table) - using type assertion
      const { data: gamesData } = await (supabase as any)
        .from('torcida_mestre_games')
        .select('*')
        .eq('pool_id', id)
        .order('game_number', { ascending: false });
      
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
      
      // Auto-select first active game
      const activeGame = gamesWithRounds.find(g => g.is_active && !g.is_finished);
      if (activeGame && !selectedGame) {
        setSelectedGame(activeGame);
        // Also select first round of this game
        const gameRounds = mappedRounds.filter(r => r.game_id === activeGame.id);
        if (gameRounds.length > 0 && !selectedRound) {
          setSelectedRound(gameRounds[0]);
        }
      } else if (gamesWithRounds.length > 0 && !selectedGame) {
        setSelectedGame(gamesWithRounds[0]);
        const gameRounds = mappedRounds.filter(r => r.game_id === gamesWithRounds[0].id);
        if (gameRounds.length > 0 && !selectedRound) {
          setSelectedRound(gameRounds[0]);
        }
      } else if (mappedRounds.length > 0 && !selectedRound) {
        // Fallback for legacy rounds without game_id
        setSelectedRound(mappedRounds[0]);
      }
      
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
      
      const { data: predictionsData } = await supabase
        .from('torcida_mestre_predictions')
        .select('*')
        .in('round_id', (roundsData || []).map(r => r.id));
      
      const predUserIds = [...new Set((predictionsData || []).map(p => p.user_id))];
      const { data: predProfilesData } = await supabase
        .from('profiles')
        .select('id, public_id, full_name, avatar_url')
        .in('id', predUserIds);
      
      const predProfilesMap = new Map((predProfilesData || []).map(p => [p.id, p]));
      
      const predictionsWithProfiles = (predictionsData || []).map(p => ({
        ...p,
        profiles: predProfilesMap.get(p.user_id) || { public_id: '', full_name: null, avatar_url: null },
      }));
      
      setPredictions(predictionsWithProfiles);
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkAdmin = async () => {
    if (!user) {
      navigate('/torcida-mestre');
      return;
    }
    
    // Check if user is admin or moderator
    const { data: adminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    
    const { data: moderatorRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'moderator'
    });
    
    if (!adminRole && !moderatorRole) {
      navigate('/torcida-mestre');
      return;
    }
    
    setIsAdmin(true);
  };
  
  useEffect(() => {
    checkAdmin();
    fetchData();
  }, [id, user]);
  
  const handleCreateRound = async () => {
    if (!pool || !user) return;
    
    // Validate game is selected
    if (!selectedGame) {
      toast.error('Selecione um jogo ativo primeiro');
      return;
    }
    
    if (selectedGame.is_finished) {
      toast.error('Este jogo já foi finalizado. Crie um novo jogo.');
      return;
    }
    
    // Validate required fields
    if (!newRound.opponent_name.trim()) {
      toast.error('Informe o adversário');
      return;
    }
    
    if (!newRound.match_date) {
      toast.error('Informe a data e hora do jogo');
      return;
    }
    
    if (!newRound.prediction_deadline) {
      toast.error('Informe o prazo para palpites');
      return;
    }
    
    // Validate that match date is in the future
    if (isAfterDeadline(newRound.match_date)) {
      toast.error('A data do jogo não pode estar no passado');
      return;
    }
    
    // Validate that prediction deadline is in the future
    if (isAfterDeadline(newRound.prediction_deadline)) {
      toast.error('O prazo para palpites não pode estar no passado');
      return;
    }
    
    // Validate that deadline is before match date
    const matchTime = new Date(newRound.match_date).getTime();
    const deadlineTime = new Date(newRound.prediction_deadline).getTime();
    
    if (deadlineTime >= matchTime) {
      toast.error('O prazo deve ser anterior à data do jogo');
      return;
    }
    
    setIsCreatingRound(true);
    try {
      // Get rounds for this specific game
      const gameRounds = rounds.filter(r => r.game_id === selectedGame.id);
      const roundNumber = gameRounds.length + 1;
      
      // Get accumulated prize from last FINISHED round that had shouldAccumulate = true
      // Only carry over if the previous round had no winners
      let previousAccumulated = 0;
      const lastFinishedRound = gameRounds.find(r => r.is_finished);
      
      if (lastFinishedRound) {
        const lastRoundPredictions = predictions.filter(p => p.round_id === lastFinishedRound.id);
        const lastResult = calculateTorcidaMestreWinners(lastFinishedRound, lastRoundPredictions, pool.allow_draws);
        
        // Only accumulate if there were no winners
        if (lastResult.shouldAccumulate) {
          previousAccumulated = (lastFinishedRound.accumulated_prize || 0) + (lastFinishedRound.previous_accumulated || 0);
        }
      }
      
      // Convert local datetime-local value to proper ISO string
      // datetime-local returns value without timezone, so we treat it as Brasília time
      const matchDateISO = new Date(newRound.match_date).toISOString();
      const deadlineISO = new Date(newRound.prediction_deadline).toISOString();
      
      const roundName = newRound.name || `Rodada ${roundNumber}`;
      
      const { error } = await supabase
        .from('torcida_mestre_rounds')
        .insert({
          pool_id: pool.id,
          game_id: selectedGame.id, // Link to game
          round_number: roundNumber,
          name: roundName,
          opponent_name: newRound.opponent_name,
          opponent_club_id: newRound.opponent_club_id || null,
          opponent_image: newRound.opponent_image || null,
          match_date: matchDateISO,
          prediction_deadline: deadlineISO,
          is_home: newRound.is_home,
          previous_accumulated: previousAccumulated,
        } as any); // Type assertion for new game_id column
      
      if (error) throw error;
      
      // Notificar participantes sobre nova rodada
      await notifyNewTorcidaMestreRoundCreated(
        pool.id,
        pool.name,
        roundName,
        newRound.opponent_name,
        user.id
      );
      
      toast.success('Rodada criada com sucesso!');
      setShowCreateRound(false);
      setNewRound({
        name: '',
        opponent_name: '',
        opponent_club_id: '',
        opponent_image: '',
        match_date: '',
        prediction_deadline: '',
        is_home: true,
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar rodada');
    } finally {
      setIsCreatingRound(false);
    }
  };
  
  const handleApproveParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('torcida_mestre_participants')
        .update({ status: 'active' })
        .eq('id', participantId);
      
      if (error) throw error;
      
      toast.success('Participante aprovado!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao aprovar participante');
    }
  };
  
  const handleRejectParticipant = async (participantId: string) => {
    try {
      const { error } = await supabase
        .from('torcida_mestre_participants')
        .update({ status: 'blocked' })
        .eq('id', participantId);
      
      if (error) throw error;
      
      toast.success('Participante rejeitado');
      fetchData();
    } catch (error) {
      toast.error('Erro ao rejeitar participante');
    }
  };
  
  const handleSaveScore = async () => {
    if (!selectedRound) return;
    
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    
    if (isNaN(home) || isNaN(away)) {
      toast.error('Insira placares válidos');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('torcida_mestre_rounds')
        .update({
          home_score: home,
          away_score: away,
        })
        .eq('id', selectedRound.id);
      
      if (error) throw error;
      
      toast.success('Placar salvo!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao salvar placar');
    }
  };
  
  const handleFinishRound = async () => {
    if (!selectedRound || !pool) return;
    
    if (selectedRound.home_score === null || selectedRound.away_score === null) {
      toast.error('Insira o placar antes de encerrar');
      return;
    }
    
    try {
      // Get active participants for this round
      const activeRoundParticipants = participants.filter(
        p => p.round_id === selectedRound.id && p.status === 'active'
      );
      
      const roundPredictions = predictions.filter(p => p.round_id === selectedRound.id);
      const result = calculateTorcidaMestreWinners(selectedRound, roundPredictions, pool.allow_draws);
      
      // Calculate total prize dynamically: entry_fee × active participants + previous accumulated
      const entryFee = selectedRound.entry_fee_override ?? pool.entry_fee;
      const totalPrize = (entryFee * activeRoundParticipants.length) + (selectedRound.previous_accumulated || 0);
      
      const prizePerWinner = result.winners.length > 0 
        ? calculatePrizePerWinner(totalPrize, result.winners.length, pool.admin_fee_percent)
        : 0;
      
      // Update winners
      for (const winner of result.winners) {
        await supabase
          .from('torcida_mestre_predictions')
          .update({
            is_winner: true,
            prize_won: prizePerWinner,
          })
          .eq('id', winner.id);
      }
      
      // Mark round as finished and store the calculated accumulated_prize for record keeping
      const { error } = await supabase
        .from('torcida_mestre_rounds')
        .update({ 
          is_finished: true,
          accumulated_prize: entryFee * activeRoundParticipants.length,
        })
        .eq('id', selectedRound.id);
      
      if (error) throw error;
      
      // Update game's total_accumulated if prize should accumulate (no winners)
      if (selectedGame && result.shouldAccumulate) {
        const newGameAccumulated = (selectedGame.total_accumulated || 0) + totalPrize;
        await (supabase as any)
          .from('torcida_mestre_games')
          .update({ total_accumulated: newGameAccumulated })
          .eq('id', selectedGame.id);
      } else if (selectedGame && !result.shouldAccumulate) {
        // Reset game accumulated when there are winners
        await (supabase as any)
          .from('torcida_mestre_games')
          .update({ total_accumulated: 0 })
          .eq('id', selectedGame.id);
      }
      
      if (result.shouldAccumulate) {
        toast.info(`Rodada encerrada. Prêmio de ${formatPrize(totalPrize)} acumulado para próxima rodada!`);
      } else {
        toast.success(`Rodada encerrada! ${result.winners.length} vencedor(es) recebem ${formatPrize(prizePerWinner)} cada!`);
      }
      
      fetchData();
    } catch (error) {
      toast.error('Erro ao encerrar rodada');
    }
  };
  
  if (isLoading || !isAdmin) {
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
          <h1 className="text-2xl font-bold">Bolão não encontrado</h1>
          <Button asChild className="mt-4">
            <Link to="/torcida-mestre">Voltar</Link>
          </Button>
        </div>
      </Layout>
    );
  }
  
  const pendingParticipants = selectedRound 
    ? participants.filter(p => p.round_id === selectedRound.id && p.status === 'pending')
    : [];
  
  const activeParticipants = selectedRound
    ? participants.filter(p => p.round_id === selectedRound.id && p.status === 'active')
    : [];
  
  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/torcida-mestre/${pool.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">Gerenciar: {pool.name}</h1>
            <p className="text-muted-foreground">{pool.club_name}</p>
          </div>
        </div>
        
        <Tabs defaultValue="games" className="space-y-6">
          <TabsList>
            <TabsTrigger value="games">Jogos</TabsTrigger>
            <TabsTrigger value="rounds">Rodadas</TabsTrigger>
            <TabsTrigger value="participants">
              Participantes
              {pendingParticipants.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingParticipants.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Games Tab */}
          <TabsContent value="games" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Jogos ({games.length})</h2>
              <CreateGameDialog
                poolId={pool.id}
                poolName={pool.name}
                currentGameNumber={games.length}
                previousAccumulated={
                  // Get accumulated from the last finished game (if any)
                  games.find(g => g.is_finished && g.total_accumulated > 0)?.total_accumulated || 0
                }
                onCreated={fetchData}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Game List */}
              <GameList
                games={games}
                selectedGameId={selectedGame?.id}
                onGameSelect={(game) => {
                  setSelectedGame(game);
                  // Select first round of this game
                  const gameRounds = rounds.filter(r => r.game_id === game.id);
                  if (gameRounds.length > 0) {
                    setSelectedRound(gameRounds[0]);
                  }
                }}
              />
              
              {/* Selected Game Details */}
              {selectedGame && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Jogo {selectedGame.game_number}
                      </CardTitle>
                      {!selectedGame.is_finished && (
                        <FinishGameDialog
                          game={selectedGame}
                          pool={pool}
                          onFinished={fetchData}
                        />
                      )}
                    </div>
                    <CardDescription>
                      {selectedGame.is_finished 
                        ? 'Jogo finalizado' 
                        : `${selectedGame.rounds?.length || 0} rodada(s)`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Game Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Rodadas</p>
                        <p className="text-xl font-bold">{selectedGame.rounds?.length || 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10">
                        <p className="text-sm text-muted-foreground">Acumulado</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                          {formatPrize(selectedGame.total_accumulated || 0)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    {!selectedGame.is_finished && (
                      <Button 
                        onClick={() => setShowCreateRound(true)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Rodada ao Jogo {selectedGame.game_number}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          {/* Rounds Tab */}
          <TabsContent value="rounds" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Rodadas {selectedGame ? `do Jogo ${selectedGame.game_number}` : ''} 
                ({selectedGame ? rounds.filter(r => r.game_id === selectedGame.id).length : rounds.length})
              </h2>
              
              <Dialog open={showCreateRound} onOpenChange={setShowCreateRound}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-amber-500 hover:bg-amber-600 text-amber-950"
                    disabled={games.length === 0 || (selectedGame?.is_finished)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Rodada
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Rodada</DialogTitle>
                    <DialogDescription>
                      Configure o próximo jogo do {pool.club_name}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Nome da Rodada (opcional)</Label>
                      <Input
                        value={newRound.name}
                        onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
                        placeholder={`Rodada ${rounds.length + 1}`}
                      />
                    </div>
                    
                    <div>
                      <Label>Adversário *</Label>
                      <ClubAutocomplete
                        value={newRound.opponent_name}
                        onSelect={(club) => setNewRound({
                          ...newRound,
                          opponent_name: club.name,
                          opponent_club_id: club.id,
                          opponent_image: club.logo_url || '',
                        })}
                        onCreate={(name) => setNewRound({
                          ...newRound,
                          opponent_name: name,
                          opponent_club_id: '',
                          opponent_image: '',
                        })}
                        placeholder="Buscar adversário..."
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Joga em casa?</Label>
                      <Switch
                        checked={newRound.is_home}
                        onCheckedChange={(v) => setNewRound({ ...newRound, is_home: v })}
                      />
                    </div>
                    
                    <div>
                      <Label>Data e Hora do Jogo *</Label>
                      <Input
                        type="datetime-local"
                        value={newRound.match_date}
                        onChange={(e) => {
                          const matchDate = e.target.value;
                          setNewRound(prev => {
                            const updated = { ...prev, match_date: matchDate };
                            // Auto-fill deadline to 1 minute before match
                            if (matchDate) {
                              const matchTime = new Date(matchDate);
                              matchTime.setMinutes(matchTime.getMinutes() - 1);
                              updated.prediction_deadline = formatToDateTimeLocal(matchTime);
                            }
                            return updated;
                          });
                        }}
                      />
                      {newRound.match_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Jogo: {formatDateTimeBR(new Date(newRound.match_date))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Prazo para Palpites *</Label>
                      <Input
                        type="datetime-local"
                        value={newRound.prediction_deadline}
                        onChange={(e) => setNewRound({ ...newRound, prediction_deadline: e.target.value })}
                      />
                      {newRound.prediction_deadline && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Prazo: {formatDateTimeBR(new Date(newRound.prediction_deadline))}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateRound(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateRound}
                      disabled={isCreatingRound || !newRound.opponent_name || !newRound.match_date || !newRound.prediction_deadline}
                      className="bg-amber-500 hover:bg-amber-600 text-amber-950"
                    >
                      {isCreatingRound && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Criar Rodada
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {rounds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma rodada criada ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Round List */}
                <div className="space-y-3">
                  {rounds.map(round => (
                    <Card 
                      key={round.id}
                      className={`cursor-pointer transition-all ${selectedRound?.id === round.id ? 'ring-2 ring-amber-500' : ''}`}
                      onClick={() => {
                        setSelectedRound(round);
                        setHomeScore(round.home_score?.toString() || '');
                        setAwayScore(round.away_score?.toString() || '');
                      }}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{round.name || `Rodada ${round.round_number}`}</p>
                            <p className="text-sm text-muted-foreground">
                              vs {round.opponent_name} {round.is_home ? '(Casa)' : '(Fora)'}
                            </p>
                          </div>
                          {round.is_finished ? (
                            <Badge variant="secondary">Encerrada</Badge>
                          ) : (
                            <Badge className="bg-emerald-500">Ativa</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Round Details */}
                {selectedRound && (() => {
                  const roundParticipants = participants.filter(p => p.round_id === selectedRound.id && p.status === 'active');
                  const roundPredictions = predictions.filter(p => p.round_id === selectedRound.id);
                  const winnerResult = selectedRound.is_finished 
                    ? calculateTorcidaMestreWinners(selectedRound, roundPredictions, pool.allow_draws)
                    : null;
                  
                  // Calculate dynamic prize: entry_fee × active participants + previous accumulated
                  const entryFee = selectedRound.entry_fee_override ?? pool.entry_fee;
                  const roundPrize = (entryFee * roundParticipants.length) + (selectedRound.previous_accumulated || 0);
                  
                  return (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{selectedRound.name || `Rodada ${selectedRound.round_number}`}</CardTitle>
                          <CardDescription>
                            {pool.club_name} vs {selectedRound.opponent_name}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Score Input */}
                          <div>
                            <Label>Placar Final</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <Input
                                type="number"
                                min="0"
                                value={homeScore}
                                onChange={(e) => setHomeScore(e.target.value)}
                                className="w-16 text-center"
                                placeholder="-"
                                disabled={selectedRound.is_finished}
                              />
                              <span className="font-bold">x</span>
                              <Input
                                type="number"
                                min="0"
                                value={awayScore}
                                onChange={(e) => setAwayScore(e.target.value)}
                                className="w-16 text-center"
                                placeholder="-"
                                disabled={selectedRound.is_finished}
                              />
                              {!selectedRound.is_finished && (
                                <Button onClick={handleSaveScore} size="sm">
                                  <Save className="h-4 w-4 mr-1" />
                                  Salvar
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-sm text-muted-foreground">Participantes</p>
                              <p className="text-xl font-bold">{activeParticipants.length}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-500/10">
                              <p className="text-sm text-muted-foreground">Prêmio</p>
                              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                {formatPrize(roundPrize)}
                              </p>
                            </div>
                          </div>
                          
                          {/* Finish Button */}
                          {!selectedRound.is_finished && (
                            <Button 
                              onClick={handleFinishRound}
                              className="w-full bg-red-500 hover:bg-red-600"
                              disabled={selectedRound.home_score === null}
                            >
                              <Trophy className="h-4 w-4 mr-2" />
                              Encerrar Rodada e Calcular Vencedores
                            </Button>
                          )}
                          
                          {/* Create New Round Button (only when finished) */}
                          {selectedRound.is_finished && (
                            <Button 
                              onClick={() => setShowCreateRound(true)}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Criar Nova Rodada
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Financial Summary (only when finished) */}
                      {selectedRound.is_finished && winnerResult && (
                        <RoundFinancialSummary
                          round={selectedRound}
                          pool={pool}
                          winners={winnerResult.winners}
                          participantsCount={roundParticipants.length}
                          shouldAccumulate={winnerResult.shouldAccumulate}
                          accumulationReason={winnerResult.reason}
                          totalPrize={roundPrize}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </TabsContent>
          
          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-6">
            {/* Pending */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Pendentes de Aprovação ({pendingParticipants.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {pendingParticipants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma solicitação pendente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingParticipants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">@{p.profiles?.public_id || 'Usuário'}</p>
                          <p className="text-sm text-muted-foreground">
                            <Ticket className="h-3 w-3 inline mr-1" />
                            Ticket #{p.ticket_number} • {rounds.find(r => r.id === p.round_id)?.name || 'Rodada'}
                            {p.paid_amount > 0 && (
                              <span className="ml-2 text-amber-600">
                                ({formatPrize(p.paid_amount)})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleRejectParticipant(p.id)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                          <Button size="sm" onClick={() => handleApproveParticipant(p.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invite Participant */}
            {(() => {
              // Find the first active (non-finished) round for inviting participants
              const activeRound = selectedRound && !selectedRound.is_finished 
                ? selectedRound 
                : rounds.find(r => !r.is_finished);
              
              if (!activeRound) return null;
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Convidar Participante
                    </CardTitle>
                    <CardDescription>
                      Adicione participantes diretamente por @username ou ID numérico para a rodada "{activeRound.name || `Rodada ${activeRound.round_number}`}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InviteParticipantInline
                      poolId={pool.id}
                      roundId={activeRound.id}
                      entryFee={pool.entry_fee}
                      existingParticipants={participants.filter(p => p.round_id === activeRound.id)}
                      onSuccess={fetchData}
                    />
                  </CardContent>
                </Card>
              );
            })()}
            
            {/* Active */}
            <Card>
              <CardHeader>
                <CardTitle>Participantes Ativos ({activeParticipants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {activeParticipants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum participante aprovado ainda
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {activeParticipants.map(p => (
                      <div key={p.id} className="p-3 rounded-lg bg-emerald-500/10 text-center">
                        <p className="font-medium truncate">@{p.profiles?.public_id || 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground">
                          Ticket #{p.ticket_number}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
