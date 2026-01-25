import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CupMatchCard } from './CupMatchCard';

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image?: string | null;
  away_team_image?: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

interface CupRoundMatchesProps {
  roundName: string;
  matches: Match[];
  roundNumber: number;
  totalRounds: number;
  onPrevRound?: () => void;
  onNextRound?: () => void;
}

export function CupRoundMatches({
  roundName,
  matches,
  roundNumber,
  totalRounds,
  onPrevRound,
  onNextRound,
}: CupRoundMatchesProps) {
  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            {roundName}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={onNextRound}
              disabled={roundNumber >= totalRounds}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardTitle>
          {/* Navegação */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onPrevRound}
              disabled={roundNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[40px] text-center">
              {roundNumber}/{totalRounds}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onNextRound}
              disabled={roundNumber >= totalRounds}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {matches.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Nenhum jogo nesta rodada
          </p>
        ) : (
          matches.map((match) => (
            <CupMatchCard
              key={match.id}
              homeTeam={match.home_team}
              awayTeam={match.away_team}
              homeTeamImage={match.home_team_image}
              awayTeamImage={match.away_team_image}
              homeScore={match.home_score}
              awayScore={match.away_score}
              isFinished={match.is_finished}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
