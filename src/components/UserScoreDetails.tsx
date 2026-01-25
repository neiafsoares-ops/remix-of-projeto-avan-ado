import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, ChevronRight, Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPointsDescription, SCORING_RULES } from '@/lib/points-utils';
import { cn } from '@/lib/utils';

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image: string | null;
  away_team_image: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  round_id: string | null;
}

interface Round {
  id: string;
  name: string;
}

interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
  points_earned: number | null;
}

interface UserScoreDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolId: string;
  userId: string;
}

export function UserScoreDetails({ open, onOpenChange, poolId, userId }: UserScoreDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [selectedRound, setSelectedRound] = useState<string>('all');

  useEffect(() => {
    if (open && poolId && userId) {
      fetchData();
    }
  }, [open, poolId, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch rounds
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('id, name')
        .eq('pool_id', poolId)
        .order('created_at', { ascending: true });
      setRounds(roundsData || []);

      // Fetch finished matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, home_team, away_team, home_team_image, away_team_image, home_score, away_score, is_finished, round_id')
        .eq('pool_id', poolId)
        .eq('is_finished', true)
        .order('match_date', { ascending: true });
      setMatches(matchesData || []);

      // Only fetch predictions if we have matches
      if (matchesData && matchesData.length > 0) {
        const matchIds = matchesData.map(m => m.id);
        
        const { data: predictionsData } = await supabase
          .from('predictions')
          .select('match_id, home_score, away_score, points_earned')
          .eq('user_id', userId)
          .in('match_id', matchIds);

        const predictionsMap: Record<string, Prediction> = {};
        predictionsData?.forEach(p => {
          predictionsMap[p.match_id] = p;
        });
        setPredictions(predictionsMap);
      } else {
        setPredictions({});
      }
    } catch (error) {
      console.error('Error fetching score details:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = selectedRound === 'all' 
    ? matches 
    : matches.filter(m => m.round_id === selectedRound);

  const totalPoints = Object.values(predictions).reduce((sum, p) => sum + (p.points_earned || 0), 0);

  const renderMatch = (match: Match) => {
    const prediction = predictions[match.id];
    const result = prediction && match.home_score !== null && match.away_score !== null
      ? getPointsDescription(prediction.home_score, prediction.away_score, match.home_score, match.away_score)
      : null;

    return (
      <div 
        key={match.id} 
        className={cn(
          "p-4 rounded-lg border",
          result && result.points > 0 ? "border-green-500/30 bg-green-50/50 dark:bg-green-900/10" : "border-border"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Teams */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {match.home_team_image ? (
                <img src={match.home_team_image} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <Shield className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium text-sm truncate">{match.home_team}</span>
            </div>
            <div className="flex items-center gap-2">
              {match.away_team_image ? (
                <img src={match.away_team_image} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <Shield className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium text-sm truncate">{match.away_team}</span>
            </div>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Real</p>
              <p className="font-bold text-lg">{match.home_score} - {match.away_score}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Palpite</p>
              {prediction ? (
                <p className="font-bold text-lg">{prediction.home_score} - {prediction.away_score}</p>
              ) : (
                <p className="text-muted-foreground text-sm">Não enviou</p>
              )}
            </div>
          </div>

          {/* Points */}
          <div className="text-right">
            {result ? (
              <div className="flex flex-col items-end gap-1">
                <Badge className={cn(result.bgColor)}>
                  <Trophy className="w-3 h-3 mr-1" />
                  +{result.points} pts
                </Badge>
                <span className={cn("text-xs", result.color)}>{result.rule}</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            Minha Pontuação
          </DialogTitle>
          <DialogDescription>
            Veja como você pontuou em cada jogo do bolão
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Total Points */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
              <span className="font-medium">Total de Pontos</span>
              <span className="text-2xl font-bold text-accent">{totalPoints} pts</span>
            </div>

            {/* Scoring Rules */}
            <div className="flex flex-wrap gap-2 mb-2">
              {SCORING_RULES.map(rule => (
                <div key={rule.points} className="flex items-center gap-1 text-xs">
                  <div className={cn("w-3 h-3 rounded", rule.color)} />
                  <span>{rule.points}pts = {rule.description}</span>
                </div>
              ))}
            </div>

            {/* Round Filter */}
            {rounds.length > 0 && (
              <Tabs value={selectedRound} onValueChange={setSelectedRound}>
                <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                  <TabsTrigger value="all" className="flex-shrink-0">Todos</TabsTrigger>
                  {rounds.map(round => (
                    <TabsTrigger key={round.id} value={round.id} className="flex-shrink-0">
                      {round.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Matches List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredMatches.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum jogo finalizado ainda</p>
                  </div>
                ) : (
                  filteredMatches.map(renderMatch)
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
