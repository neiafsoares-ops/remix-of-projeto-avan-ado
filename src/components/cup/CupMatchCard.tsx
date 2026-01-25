import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';

interface CupMatchCardProps {
  homeTeam: string;
  awayTeam: string;
  homeTeamImage?: string | null;
  awayTeamImage?: string | null;
  homeTeamOwner?: string;
  awayTeamOwner?: string;
  homeScore: number | null;
  awayScore: number | null;
  isFinished?: boolean;
}

export function CupMatchCard({
  homeTeam,
  awayTeam,
  homeTeamImage,
  awayTeamImage,
  homeTeamOwner,
  awayTeamOwner,
  homeScore,
  awayScore,
  isFinished = false,
}: CupMatchCardProps) {
  const hasScore = homeScore !== null && awayScore !== null;
  
  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border hover:border-primary/30 transition-colors">
      {/* Home Team */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        <div className="text-right">
          <p className="font-medium text-sm text-foreground truncate max-w-[120px]">
            {homeTeam}
          </p>
          {homeTeamOwner && (
            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {homeTeamOwner}
            </p>
          )}
        </div>
        <Avatar className="h-8 w-8">
          {homeTeamImage ? (
            <AvatarImage src={homeTeamImage} alt={homeTeam} />
          ) : null}
          <AvatarFallback className="bg-muted text-xs">
            <Shield className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 px-4 min-w-[80px] justify-center">
        {hasScore ? (
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${
              isFinished && homeScore! > awayScore! ? 'text-green-600' : 'text-foreground'
            }`}>
              {homeScore}
            </span>
            <span className="text-muted-foreground text-xs">x</span>
            <span className={`text-lg font-bold ${
              isFinished && awayScore! > homeScore! ? 'text-green-600' : 'text-foreground'
            }`}>
              {awayScore}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">vs</span>
        )}
      </div>

      {/* Away Team */}
      <div className="flex items-center gap-2 flex-1">
        <Avatar className="h-8 w-8">
          {awayTeamImage ? (
            <AvatarImage src={awayTeamImage} alt={awayTeam} />
          ) : null}
          <AvatarFallback className="bg-muted text-xs">
            <Shield className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="text-left">
          <p className="font-medium text-sm text-foreground truncate max-w-[120px]">
            {awayTeam}
          </p>
          {awayTeamOwner && (
            <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {awayTeamOwner}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
