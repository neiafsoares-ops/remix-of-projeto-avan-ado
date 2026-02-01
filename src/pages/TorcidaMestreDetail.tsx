import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TorcidaMestreRoundCard } from '@/components/torcida-mestre/TorcidaMestreRoundCard';
import { TorcidaMestreRanking } from '@/components/torcida-mestre/TorcidaMestreRanking';
import { RequestParticipationDialog } from '@/components/torcida-mestre/RequestParticipationDialog';
import { Crown, ArrowLeft, Settings, Trophy, Calendar, Users, Loader2, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { formatPrize, calculateTorcidaMestreWinners, getResultMessage } from '@/lib/torcida-mestre-utils';
import type { 
  TorcidaMestrePool, 
  TorcidaMestreRound, 
  TorcidaMestreParticipant,
  TorcidaMestrePrediction 
} from '@/types/torcida-mestre';
import { toast } from 'sonner';

export default function TorcidaMestreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [pool, setPool] = useState<TorcidaMestrePool | null>(null);
  const [rounds, setRounds] = useState<TorcidaMestreRound[]>([]);
  const [participants, setParticipants] = useState<TorcidaMestreParticipant[]>([]);
  const [predictions, setPredictions] = useState<TorcidaMestrePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedRound, setSelectedRound] = useState<TorcidaMestreRound | null>(null);
  
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
      
      // Fetch rounds
      const { data: roundsData } = await supabase
        .from('torcida_mestre_rounds')
        .select('*')
        .eq('pool_id', id)
        .order('round_number', { ascending: false });
      
      setRounds(roundsData || []);
      if (roundsData && roundsData.length > 0) {
        setSelectedRound(roundsData[0]);
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
  
  const handleSavePrediction = async (roundId: string, participantId: string, homeScore: number, awayScore: number) => {
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
      
      fetchData();
    } catch (error) {
      throw error;
    }
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
  
  const userParticipant = selectedRound 
    ? participants.find(p => p.round_id === selectedRound.id && p.user_id === user?.id && p.status === 'active')
    : null;
  
  const userPrediction = userParticipant
    ? predictions.find(p => p.participant_id === userParticipant.id)
    : null;
  
  const roundPredictions = selectedRound
    ? predictions.filter(p => p.round_id === selectedRound.id)
    : [];
  
  const roundParticipants = selectedRound
    ? participants.filter(p => p.round_id === selectedRound.id)
    : [];
  
  const totalPrize = selectedRound 
    ? (selectedRound.accumulated_prize || 0) + (selectedRound.previous_accumulated || 0)
    : 0;
  
  const winnerResult = selectedRound?.is_finished
    ? calculateTorcidaMestreWinners(selectedRound, roundPredictions, pool.allow_draws)
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
              {rounds.map(round => (
                <TabsTrigger key={round.id} value={round.id} className="min-w-fit">
                  {round.name || `Rodada ${round.round_number}`}
                  {round.is_finished && <Badge variant="secondary" className="ml-2">Encerrada</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {rounds.map(round => (
              <TabsContent key={round.id} value={round.id}>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Round Card */}
                  <div className="space-y-4">
                    <TorcidaMestreRoundCard
                      round={round}
                      pool={pool}
                      userPrediction={userPrediction}
                      isApproved={!!userParticipant}
                      onSavePrediction={userParticipant 
                        ? (h, a) => handleSavePrediction(round.id, userParticipant.id, h, a)
                        : undefined
                      }
                    />
                    
                    {/* Request Participation Button */}
                    {user && !userParticipant && !round.is_finished && (
                      <RequestParticipationDialog
                        entryFee={pool.entry_fee}
                        onConfirm={async (ticketCount) => {
                          await handleRequestParticipation(round.id, ticketCount);
                        }}
                        trigger={
                          <Button className="w-full" variant="outline">
                            <Ticket className="h-4 w-4 mr-2" />
                            Solicitar Participação
                          </Button>
                        }
                      />
                    )}
                    
                    {/* Show pending status */}
                    {user && participants.find(p => p.round_id === round.id && p.user_id === user.id && p.status === 'pending') && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Sua solicitação está pendente de aprovação
                        </p>
                      </div>
                    )}
                    
                    {!user && (
                      <Button asChild className="w-full" variant="outline">
                        <Link to="/auth">Fazer login para participar</Link>
                      </Button>
                    )}
                  </div>
                  
                  {/* Winners/Ranking */}
                  <TorcidaMestreRanking
                    winners={winnerResult?.winners || []}
                    totalPrize={totalPrize}
                    adminFeePercent={pool.admin_fee_percent}
                    isFinished={round.is_finished}
                    resultMessage={winnerResult ? getResultMessage(winnerResult, pool.club_name) : undefined}
                  />
                </div>
                
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
                                {participant.ticket_number > 1 && (
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
      </div>
    </Layout>
  );
}
