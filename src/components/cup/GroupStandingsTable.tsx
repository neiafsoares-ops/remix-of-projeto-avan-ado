import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, ChevronRight } from 'lucide-react';

interface TeamStanding {
  position: number;
  teamName: string;
  teamImage?: string | null;
  ownerName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  percentage: number;
}

interface GroupStandingsTableProps {
  groupName: string;
  standings: TeamStanding[];
  classifiedCount?: number;
  onFilterTeams?: () => void;
}

export function GroupStandingsTable({ 
  groupName, 
  standings, 
  classifiedCount = 2,
  onFilterTeams 
}: GroupStandingsTableProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            {groupName}
          </CardTitle>
          {onFilterTeams && (
            <button 
              onClick={onFilterTeams}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <span>▼</span> equipes
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground w-8">#</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Equipe</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">P</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">J</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">V</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">E</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">D</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">GP</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">GC</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-8">SG</th>
                <th className="text-center py-2 px-1 font-medium text-muted-foreground w-10">%</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => {
                const isClassified = index < classifiedCount;
                
                return (
                  <tr 
                    key={`${team.teamName}-${index}`}
                    className={`border-b last:border-b-0 hover:bg-muted/20 transition-colors ${
                      isClassified ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`font-bold ${isClassified ? 'text-primary' : 'text-muted-foreground'}`}>
                        {team.position}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {team.teamImage ? (
                            <AvatarImage src={team.teamImage} alt={team.teamName} />
                          ) : null}
                          <AvatarFallback className="bg-muted text-[10px]">
                            <Shield className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground truncate max-w-[140px]">
                            {team.teamName}
                          </span>
                          {team.ownerName && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                              {team.ownerName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-2.5 px-1 font-bold text-primary">{team.points}</td>
                    <td className="text-center py-2.5 px-1 text-muted-foreground">{team.played}</td>
                    <td className="text-center py-2.5 px-1 text-green-600">{team.won}</td>
                    <td className="text-center py-2.5 px-1 text-muted-foreground">{team.drawn}</td>
                    <td className="text-center py-2.5 px-1 text-red-600">{team.lost}</td>
                    <td className="text-center py-2.5 px-1 text-muted-foreground">{team.goalsFor}</td>
                    <td className="text-center py-2.5 px-1 text-muted-foreground">{team.goalsAgainst}</td>
                    <td className={`text-center py-2.5 px-1 font-medium ${
                      team.goalDifference > 0 ? 'text-green-600' : 
                      team.goalDifference < 0 ? 'text-red-600' : 'text-muted-foreground'
                    }`}>
                      {team.goalDifference}
                    </td>
                    <td className="text-center py-2.5 px-1 text-muted-foreground">{team.percentage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
