import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Crown, ChevronLeft, ChevronRight, Medal, Target, Loader2, User } from 'lucide-react';

interface QuizRoundSummaryProps {
  quizId: string;
  roundId: string;
  roundName: string;
  roundNumber: number;
}

interface TicketScore {
  participantId: string;
  ticketNumber: number;
  roundPoints: number;
  correctAnswers: number;
  totalQuestions: number;
}

interface ParticipantRanking {
  userId: string;
  publicId: string;
  avatarUrl: string | null;
  totalPoints: number; // Sum across rounds (best ticket per round, not sum of tickets)
  roundPoints: number; // Points in this specific round (best ticket)
}

export function QuizRoundSummary({ quizId, roundId, roundName, roundNumber }: QuizRoundSummaryProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userTickets, setUserTickets] = useState<TicketScore[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const [roundRanking, setRoundRanking] = useState<ParticipantRanking[]>([]);
  const [generalRanking, setGeneralRanking] = useState<ParticipantRanking[]>([]);

  useEffect(() => {
    fetchRoundSummary();
  }, [quizId, roundId, user?.id]);

  const fetchRoundSummary = async () => {
    try {
      setLoading(true);

      // Fetch all questions for this round
      const { data: questionsData } = await supabase
        .from('quiz_questions')
        .select('id')
        .eq('round_id', roundId);

      const totalQuestions = questionsData?.length || 0;

      // Fetch all answers for this round with participant info
      const { data: answersData } = await supabase
        .from('quiz_answers')
        .select('user_id, participant_id, is_correct, points_earned')
        .eq('round_id', roundId);

      // Fetch all participants with their profiles
      const { data: participantsData } = await supabase
        .from('quiz_participants')
        .select('id, user_id, ticket_number, total_points')
        .eq('quiz_id', quizId);

      const userIds = [...new Set(participantsData?.map(p => p.user_id) || [])];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, public_id, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Calculate scores per participant (ticket)
      const ticketScores: Record<string, TicketScore> = {};
      
      participantsData?.forEach(p => {
        ticketScores[p.id] = {
          participantId: p.id,
          ticketNumber: p.ticket_number,
          roundPoints: 0,
          correctAnswers: 0,
          totalQuestions,
        };
      });

      answersData?.forEach(a => {
        if (a.participant_id && ticketScores[a.participant_id]) {
          ticketScores[a.participant_id].roundPoints += a.points_earned || 0;
          if (a.is_correct) {
            ticketScores[a.participant_id].correctAnswers += 1;
          }
        }
      });

      // Get user's tickets (sorted by points descending to show best first)
      if (user) {
        const userParticipants = participantsData?.filter(p => p.user_id === user.id) || [];
        const userTicketScores = userParticipants
          .map(p => ticketScores[p.id])
          .filter(Boolean)
          .sort((a, b) => b.roundPoints - a.roundPoints);
        
        setUserTickets(userTicketScores);
      }

      // Calculate round ranking (best ticket per user)
      const roundRankingMap: Record<string, ParticipantRanking> = {};
      
      participantsData?.forEach(p => {
        const score = ticketScores[p.id];
        const profile = profilesMap.get(p.user_id);
        
        if (!roundRankingMap[p.user_id]) {
          roundRankingMap[p.user_id] = {
            userId: p.user_id,
            publicId: profile?.public_id || 'Anônimo',
            avatarUrl: profile?.avatar_url || null,
            totalPoints: p.total_points || 0,
            roundPoints: score?.roundPoints || 0,
          };
        } else {
          // Keep best ticket score for this round
          if ((score?.roundPoints || 0) > roundRankingMap[p.user_id].roundPoints) {
            roundRankingMap[p.user_id].roundPoints = score?.roundPoints || 0;
          }
        }
      });

      const sortedRoundRanking = Object.values(roundRankingMap)
        .sort((a, b) => b.roundPoints - a.roundPoints);
      
      setRoundRanking(sortedRoundRanking);

      // Calculate general ranking (sum of rounds per participant, NOT sum of tickets)
      // For general ranking, we use the total_points from quiz_participants which is already per-ticket
      // But we need to aggregate by user (best ticket's total points)
      const generalRankingMap: Record<string, ParticipantRanking> = {};
      
      participantsData?.forEach(p => {
        const profile = profilesMap.get(p.user_id);
        
        if (!generalRankingMap[p.user_id]) {
          generalRankingMap[p.user_id] = {
            userId: p.user_id,
            publicId: profile?.public_id || 'Anônimo',
            avatarUrl: profile?.avatar_url || null,
            totalPoints: p.total_points || 0,
            roundPoints: ticketScores[p.id]?.roundPoints || 0,
          };
        } else {
          // Keep the best ticket's total points for general ranking
          if ((p.total_points || 0) > generalRankingMap[p.user_id].totalPoints) {
            generalRankingMap[p.user_id].totalPoints = p.total_points || 0;
          }
        }
      });

      const sortedGeneralRanking = Object.values(generalRankingMap)
        .sort((a, b) => b.totalPoints - a.totalPoints);
      
      setGeneralRanking(sortedGeneralRanking);

    } catch (error) {
      console.error('Error fetching round summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTicket = userTickets[currentTicketIndex];
  const userRoundPosition = useMemo(() => {
    if (!user || !currentTicket) return null;
    // Find position based on current ticket's round points
    const position = roundRanking.findIndex(r => r.userId === user.id);
    return position >= 0 ? position + 1 : null;
  }, [user, currentTicket, roundRanking]);

  const topScorer = roundRanking[0];
  const generalLeader = generalRanking[0];

  if (loading) {
    return (
      <Card className="mb-6 border-accent/30">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-accent/30 bg-gradient-to-br from-card via-card to-accent/5 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-accent" />
          Resumo da Rodada
          <Badge variant="secondary" className="ml-2">{roundName}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User's Score with Ticket Navigation */}
        {user && userTickets.length > 0 && (
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                SUA PONTUAÇÃO
              </h4>
              {userTickets.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentTicketIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentTicketIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Ticket {currentTicket?.ticketNumber} de {userTickets.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentTicketIndex(prev => Math.min(userTickets.length - 1, prev + 1))}
                    disabled={currentTicketIndex === userTickets.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {currentTicket && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {currentTicket.roundPoints} <span className="text-lg font-normal">pts</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentTicket.correctAnswers}/{currentTicket.totalQuestions} respostas corretas
                  </p>
                </div>
                {userRoundPosition && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Posição na rodada</p>
                    <p className="text-2xl font-bold">
                      {userRoundPosition}º
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ticket indicators */}
            {userTickets.length > 1 && (
              <div className="flex justify-center gap-1 mt-4">
                {userTickets.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTicketIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentTicketIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top Scorer and General Leader */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Maior Pontuador da Rodada */}
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
            <h4 className="text-sm font-semibold text-accent mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              MAIOR PONTUADOR DA RODADA
            </h4>
            {topScorer ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    🥇
                  </div>
                  <div>
                    <p className="font-semibold">@{topScorer.publicId}</p>
                    <p className="text-sm text-muted-foreground">
                      {topScorer.roundPoints} pts nesta rodada
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhum participante pontuou ainda
              </p>
            )}
          </div>

          {/* Líder do Ranking Geral */}
          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <Medal className="h-4 w-4" />
              LÍDER DO RANKING GERAL
            </h4>
            {generalLeader ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    👑
                  </div>
                  <div>
                    <p className="font-semibold">@{generalLeader.publicId}</p>
                    <p className="text-sm text-muted-foreground">
                      {generalLeader.totalPoints} pts no total
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhum líder ainda
              </p>
            )}
          </div>
        </div>

        {/* Mini Round Ranking */}
        {roundRanking.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              TOP 5 DA RODADA
            </h4>
            <div className="space-y-2">
              {roundRanking.slice(0, 5).map((participant, idx) => (
                <div 
                  key={participant.userId}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    user?.id === participant.userId ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                    </span>
                    <span className={`font-medium ${user?.id === participant.userId ? 'text-primary' : ''}`}>
                      @{participant.publicId}
                    </span>
                  </div>
                  <Badge variant={idx < 3 ? 'default' : 'secondary'}>
                    {participant.roundPoints} pts
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
