import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, Frown, Crown, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface RoundSummaryProps {
  poolId: string;
  roundId: string;
  roundName: string;
}

interface ParticipantRoundScore {
  participantId: string;
  userId: string;
  publicId: string;
  fullName: string | null;
  ticketNumber: number;
  totalPoints: number;
  exactScores: number;
}

// Carousel component for multiple users in same position
function UserCarousel({ users, renderUser }: { users: ParticipantRoundScore[]; renderUser: (user: ParticipantRoundScore) => React.ReactNode }) {
  const [index, setIndex] = useState(0);
  
  if (users.length === 0) return null;
  if (users.length === 1) return <>{renderUser(users[0])}</>;
  
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setIndex(i => (i - 1 + users.length) % users.length)}
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      <div className="flex-1 min-w-0 text-center">
        {renderUser(users[index])}
        <p className="text-[10px] text-muted-foreground">{index + 1}/{users.length}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setIndex(i => (i + 1) % users.length)}
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function RoundSummary({ poolId, roundId, roundName }: RoundSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ParticipantRoundScore[]>([]);
  const [isRoundFinished, setIsRoundFinished] = useState(false);
  const [allowMultipleTickets, setAllowMultipleTickets] = useState(false);

  useEffect(() => {
    fetchRoundSummary();
  }, [poolId, roundId]);

  const fetchRoundSummary = async () => {
    try {
      setLoading(true);

      // Fetch pool info and matches in parallel
      const [poolResult, matchesResult] = await Promise.all([
        supabase.from('pools').select('allow_multiple_tickets').eq('id', poolId).maybeSingle(),
        supabase.from('matches').select('id, home_score, away_score, is_finished').eq('pool_id', poolId).eq('round_id', roundId),
      ]);

      setAllowMultipleTickets(poolResult.data?.allow_multiple_tickets || false);

      const matchesData = matchesResult.data;
      if (matchesResult.error) throw matchesResult.error;

      const allMatchesFinished = matchesData?.every(m => m.is_finished) || false;
      const hasMatches = matchesData && matchesData.length > 0;
      setIsRoundFinished(allMatchesFinished && hasMatches);

      if (!allMatchesFinished || !hasMatches) {
        setLoading(false);
        return;
      }

      const matchIds = matchesData.map(m => m.id);

      // Fetch predictions and participants in parallel
      const [predictionsResult, participantsResult] = await Promise.all([
        supabase.from('predictions').select('user_id, participant_id, match_id, home_score, away_score, points_earned').in('match_id', matchIds),
        supabase.from('pool_participants').select('id, user_id, ticket_number').eq('pool_id', poolId).eq('status', 'active'),
      ]);

      if (predictionsResult.error) throw predictionsResult.error;
      if (participantsResult.error) throw participantsResult.error;

      const participantsData = participantsResult.data || [];
      const participantUserIds = [...new Set(participantsData.map(p => p.user_id))];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, public_id, full_name')
        .in('id', participantUserIds);

      // Calculate scores per participant (ticket-level)
      const scoresMap: Record<string, ParticipantRoundScore> = {};

      participantsData.forEach(p => {
        const profile = profilesData?.find(pr => pr.id === p.user_id);
        scoresMap[p.id] = {
          participantId: p.id,
          userId: p.user_id,
          publicId: profile?.public_id || 'Anônimo',
          fullName: profile?.full_name || null,
          ticketNumber: p.ticket_number || 1,
          totalPoints: 0,
          exactScores: 0,
        };
      });

      predictionsResult.data?.forEach(pred => {
        const key = pred.participant_id || pred.user_id;
        if (!scoresMap[key]) return;

        const match = matchesData.find(m => m.id === pred.match_id);
        if (!match || match.home_score === null || match.away_score === null) return;

        scoresMap[key].totalPoints += pred.points_earned || 0;

        if (pred.home_score === match.home_score && pred.away_score === match.away_score) {
          scoresMap[key].exactScores += 1;
        }
      });

      // For ranking: group by user (best ticket per user)
      const bestByUser: Record<string, ParticipantRoundScore> = {};
      Object.values(scoresMap).forEach(s => {
        if (!bestByUser[s.userId] || s.totalPoints > bestByUser[s.userId].totalPoints) {
          bestByUser[s.userId] = s;
        }
      });

      const sortedScores = Object.values(bestByUser).sort((a, b) => b.totalPoints - a.totalPoints);
      setScores(sortedScores);
    } catch (error) {
      console.error('Error fetching round summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 border-accent/30">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isRoundFinished) return null;

  // Get podium positions (handling ties)
  const getPodium = () => {
    if (scores.length === 0) return { first: [], second: [], third: [] };

    const first: ParticipantRoundScore[] = [];
    const second: ParticipantRoundScore[] = [];
    const third: ParticipantRoundScore[] = [];

    const sortedByPoints = [...scores].sort((a, b) => b.totalPoints - a.totalPoints);
    if (sortedByPoints.length === 0) return { first, second, third };

    const firstPlace = sortedByPoints[0].totalPoints;
    let secondPlace: number | null = null;
    let thirdPlace: number | null = null;

    sortedByPoints.forEach(s => {
      if (s.totalPoints === firstPlace) {
        first.push(s);
      } else if (secondPlace === null || s.totalPoints === secondPlace) {
        if (secondPlace === null) secondPlace = s.totalPoints;
        if (s.totalPoints === secondPlace) second.push(s);
      } else if (thirdPlace === null || s.totalPoints === thirdPlace) {
        if (thirdPlace === null) thirdPlace = s.totalPoints;
        if (s.totalPoints === thirdPlace) third.push(s);
      }
    });

    return { first, second, third };
  };

  const getExactScoreChampions = () => {
    const maxExact = Math.max(...scores.map(s => s.exactScores), 0);
    if (maxExact === 0) return [];
    return scores.filter(s => s.exactScores === maxExact);
  };

  const getLowestScorers = () => {
    if (scores.length === 0) return [];
    const minPoints = Math.min(...scores.map(s => s.totalPoints));
    const maxPoints = Math.max(...scores.map(s => s.totalPoints));
    if (minPoints === maxPoints) return [];
    return scores.filter(s => s.totalPoints === minPoints);
  };

  const podium = getPodium();
  const exactChampions = getExactScoreChampions();
  const lowestScorers = getLowestScorers();
  const allSameScore = scores.length > 0 && new Set(scores.map(s => s.totalPoints)).size === 1;

  const renderUserName = (p: ParticipantRoundScore) => (
    <p className="text-sm font-semibold truncate">@{p.publicId}</p>
  );

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
        {/* Pódio */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Crown className="h-4 w-4" />
            PÓDIO DA RODADA
          </h4>
          
          <div className="flex items-end justify-center gap-3 mb-4">
            {/* 2º Lugar */}
            <div className="flex flex-col items-center w-28">
              <div className="bg-muted-foreground/30 text-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2">
                🥈
              </div>
              <div className="bg-muted/80 rounded-t-lg w-full h-20 flex flex-col items-center justify-end pb-2 px-1">
                {podium.second.length > 0 ? (
                  <>
                    <UserCarousel users={podium.second} renderUser={renderUserName} />
                    <p className="text-sm font-bold text-muted-foreground">
                      {podium.second[0]?.totalPoints} pts
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">-</p>
                )}
              </div>
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center w-32">
              <div className="bg-accent text-accent-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-2 shadow-accent-glow">
                🥇
              </div>
              <div className="bg-accent/20 rounded-t-lg w-full h-28 flex flex-col items-center justify-end pb-3 px-1 border-2 border-accent/30">
                {podium.first.length > 0 ? (
                  <>
                    <UserCarousel users={podium.first} renderUser={renderUserName} />
                    <p className="text-lg font-bold text-accent">
                      {podium.first[0]?.totalPoints} pts
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">-</p>
                )}
              </div>
            </div>

            {/* 3º Lugar */}
            <div className="flex flex-col items-center w-28">
              <div className="bg-accent/60 text-accent-foreground w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2">
                🥉
              </div>
              <div className="bg-accent/10 rounded-t-lg w-full h-16 flex flex-col items-center justify-end pb-2 px-1">
                {podium.third.length > 0 ? (
                  <>
                    <UserCarousel users={podium.third} renderUser={renderUserName} />
                    <p className="text-sm font-bold text-accent/70">
                      {podium.third[0]?.totalPoints} pts
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">-</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Craque dos Placares */}
          <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
            <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              CRAQUE DOS PLACARES
            </h4>
            {exactChampions.length > 0 ? (
              <UserCarousel
                users={exactChampions}
                renderUser={(p) => (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      @{p.publicId}
                    </span>
                    <Badge className="bg-emerald-600 text-white">
                      {p.exactScores} {p.exactScores === 1 ? 'placar exato' : 'placares exatos'}
                    </Badge>
                  </div>
                )}
              />
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 italic">
                Nenhum placar exato foi acertado nesta rodada
              </p>
            )}
          </div>

          {/* Bola Murcha */}
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
              <Frown className="h-4 w-4" />
              BOLA MURCHA DA RODADA
            </h4>
            {allSameScore ? (
              <p className="text-sm text-red-600 dark:text-red-400 italic">
                Todos os participantes pontuaram igual nesta rodada
              </p>
            ) : lowestScorers.length > 0 ? (
              <UserCarousel
                users={lowestScorers}
                renderUser={(p) => (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-700 dark:text-red-300">
                      @{p.publicId}
                    </span>
                    <Badge variant="outline" className="border-red-400 text-red-600 dark:text-red-400">
                      {p.totalPoints} pts
                    </Badge>
                  </div>
                )}
              />
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400 italic">
                Sem dados disponíveis
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
