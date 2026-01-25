import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Target, Frown, Crown, Medal, Loader2 } from 'lucide-react';

interface RoundSummaryProps {
  poolId: string;
  roundId: string;
  roundName: string;
}

interface ParticipantRoundScore {
  userId: string;
  publicId: string;
  fullName: string | null;
  totalPoints: number;
  exactScores: number;
}

export function RoundSummary({ poolId, roundId, roundName }: RoundSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ParticipantRoundScore[]>([]);
  const [isRoundFinished, setIsRoundFinished] = useState(false);

  useEffect(() => {
    fetchRoundSummary();
  }, [poolId, roundId]);

  const fetchRoundSummary = async () => {
    try {
      setLoading(true);

      // Fetch matches for this round
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('id, home_score, away_score, is_finished')
        .eq('pool_id', poolId)
        .eq('round_id', roundId);

      if (matchesError) throw matchesError;

      // Check if round is finished (all matches have results)
      const allMatchesFinished = matchesData?.every(m => m.is_finished) || false;
      const hasMatches = matchesData && matchesData.length > 0;
      setIsRoundFinished(allMatchesFinished && hasMatches);

      if (!allMatchesFinished || !hasMatches) {
        setLoading(false);
        return;
      }

      const matchIds = matchesData.map(m => m.id);

      // Fetch all predictions for these matches
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, points_earned')
        .in('match_id', matchIds);

      if (predictionsError) throw predictionsError;

      // Get active participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('pool_participants')
        .select('user_id')
        .eq('pool_id', poolId)
        .eq('status', 'active');

      if (participantsError) throw participantsError;

      const participantUserIds = participantsData?.map(p => p.user_id) || [];

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, public_id, full_name')
        .in('id', participantUserIds);

      // Calculate scores per participant
      const scoresMap: Record<string, ParticipantRoundScore> = {};

      participantUserIds.forEach(userId => {
        const profile = profilesData?.find(p => p.id === userId);
        scoresMap[userId] = {
          userId,
          publicId: profile?.public_id || 'Anônimo',
          fullName: profile?.full_name || null,
          totalPoints: 0,
          exactScores: 0,
        };
      });

      // Calculate points for each prediction
      predictionsData?.forEach(pred => {
        if (!scoresMap[pred.user_id]) return;

        const match = matchesData.find(m => m.id === pred.match_id);
        if (!match || match.home_score === null || match.away_score === null) return;

        const points = pred.points_earned || 0;
        scoresMap[pred.user_id].totalPoints += points;

        // Check if exact score
        if (pred.home_score === match.home_score && pred.away_score === match.away_score) {
          scoresMap[pred.user_id].exactScores += 1;
        }
      });

      const sortedScores = Object.values(scoresMap).sort((a, b) => b.totalPoints - a.totalPoints);
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

  if (!isRoundFinished) {
    return null;
  }

  // Get top 3 for podium (handling ties)
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

  // Get exact score champion(s)
  const getExactScoreChampions = () => {
    const maxExact = Math.max(...scores.map(s => s.exactScores), 0);
    if (maxExact === 0) return [];
    return scores.filter(s => s.exactScores === maxExact);
  };

  // Get lowest scorer(s) - "Bola Mucha"
  const getLowestScorers = () => {
    if (scores.length === 0) return [];
    const minPoints = Math.min(...scores.map(s => s.totalPoints));
    const maxPoints = Math.max(...scores.map(s => s.totalPoints));
    
    // If everyone has the same score, return empty (show special message)
    if (minPoints === maxPoints) return [];
    
    return scores.filter(s => s.totalPoints === minPoints);
  };

  const podium = getPodium();
  const exactChampions = getExactScoreChampions();
  const lowestScorers = getLowestScorers();
  const allSameScore = scores.length > 0 && new Set(scores.map(s => s.totalPoints)).size === 1;

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
            <div className="flex flex-col items-center">
              <div className="bg-gray-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2">
                🥈
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-t-lg w-24 h-20 flex flex-col items-center justify-end pb-2 px-2">
                {podium.second.length > 0 ? (
                  <>
                    <div className="text-center">
                      {podium.second.map((p, i) => (
                        <p key={p.userId} className="text-xs font-medium truncate max-w-full">
                          {i > 0 && <span className="text-muted-foreground">, </span>}
                          @{p.publicId}
                        </p>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                      {podium.second[0]?.totalPoints} pts
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">-</p>
                )}
              </div>
            </div>

            {/* 1º Lugar */}
            <div className="flex flex-col items-center">
              <div className="bg-accent text-accent-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mb-2 shadow-accent-glow">
                🥇
              </div>
              <div className="bg-accent/20 dark:bg-accent/30 rounded-t-lg w-28 h-28 flex flex-col items-center justify-end pb-3 px-2 border-2 border-accent/30">
                {podium.first.length > 0 ? (
                  <>
                    <div className="text-center">
                      {podium.first.map((p, i) => (
                        <p key={p.userId} className="text-sm font-semibold truncate max-w-full">
                          {i > 0 && <span className="text-muted-foreground">, </span>}
                          @{p.publicId}
                        </p>
                      ))}
                    </div>
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
            <div className="flex flex-col items-center">
              <div className="bg-orange-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2">
                🥉
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-t-lg w-24 h-16 flex flex-col items-center justify-end pb-2 px-2">
                {podium.third.length > 0 ? (
                  <>
                    <div className="text-center">
                      {podium.third.map((p, i) => (
                        <p key={p.userId} className="text-xs font-medium truncate max-w-full">
                          {i > 0 && <span className="text-muted-foreground">, </span>}
                          @{p.publicId}
                        </p>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
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
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              CRAQUE DOS PLACARES
            </h4>
            {exactChampions.length > 0 ? (
              <div className="space-y-2">
                {exactChampions.map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <span className="font-medium text-emerald-800 dark:text-emerald-300">
                      @{p.publicId}
                    </span>
                    <Badge className="bg-emerald-600 text-white">
                      {p.exactScores} {p.exactScores === 1 ? 'placar exato' : 'placares exatos'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 italic">
                Nenhum placar exato foi acertado nesta rodada
              </p>
            )}
          </div>

          {/* Bola Mucha */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <Frown className="h-4 w-4" />
              BOLA MURCHA DA RODADA
            </h4>
            {allSameScore ? (
              <p className="text-sm text-red-600 dark:text-red-400 italic">
                Todos os participantes pontuaram igual nesta rodada
              </p>
            ) : lowestScorers.length > 0 ? (
              <div className="space-y-2">
                {lowestScorers.map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <span className="font-medium text-red-800 dark:text-red-300">
                      @{p.publicId}
                    </span>
                    <Badge variant="outline" className="border-red-400 text-red-600 dark:text-red-400">
                      {p.totalPoints} pts
                    </Badge>
                  </div>
                ))}
              </div>
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
