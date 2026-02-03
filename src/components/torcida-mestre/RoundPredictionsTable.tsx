import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Trophy, Users } from 'lucide-react';
import type { TorcidaMestrePrediction, TorcidaMestreParticipant } from '@/types/torcida-mestre';

interface RoundPredictionsTableProps {
  predictions: TorcidaMestrePrediction[];
  participants: TorcidaMestreParticipant[];
  isDeadlinePassed: boolean;
  actualScore?: { home: number; away: number } | null;
}

export function RoundPredictionsTable({
  predictions,
  participants,
  isDeadlinePassed,
  actualScore,
}: RoundPredictionsTableProps) {
  // Create map of participant_id to participant data
  const participantMap = useMemo(() => {
    const map = new Map<string, TorcidaMestreParticipant>();
    participants.forEach(p => map.set(p.id, p));
    return map;
  }, [participants]);

  // Group predictions by user for summary
  const userSummary = useMemo(() => {
    const summary = new Map<string, { 
      userId: string;
      publicId: string;
      avatarUrl?: string | null;
      fullName?: string | null;
      ticketCount: number;
    }>();

    predictions.forEach(pred => {
      const participant = participantMap.get(pred.participant_id);
      if (!participant) return;

      const userId = participant.user_id;
      const existing = summary.get(userId);
      
      if (existing) {
        existing.ticketCount++;
      } else {
        summary.set(userId, {
          userId,
          publicId: participant.profiles?.public_id || 'Anônimo',
          avatarUrl: participant.profiles?.avatar_url,
          fullName: participant.profiles?.full_name,
          ticketCount: 1,
        });
      }
    });

    return Array.from(summary.values()).sort((a, b) => b.ticketCount - a.ticketCount);
  }, [predictions, participantMap]);

  // Sort predictions for table
  const sortedPredictions = useMemo(() => {
    return [...predictions].sort((a, b) => {
      const participantA = participantMap.get(a.participant_id);
      const participantB = participantMap.get(b.participant_id);
      
      const nameA = participantA?.profiles?.public_id || '';
      const nameB = participantB?.profiles?.public_id || '';
      
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      
      const ticketA = participantA?.ticket_number || 1;
      const ticketB = participantB?.ticket_number || 1;
      return ticketA - ticketB;
    });
  }, [predictions, participantMap]);

  const isWinningScore = (homeScore: number, awayScore: number) => {
    if (!actualScore) return false;
    return homeScore === actualScore.home && awayScore === actualScore.away;
  };

  if (!isDeadlinePassed) {
    return null;
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Palpites da Rodada
          <Badge variant="secondary" className="ml-2">
            {predictions.length} palpites
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Summary */}
        <div className="flex flex-wrap gap-2">
          {userSummary.map(user => (
            <div 
              key={user.userId}
              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {user.publicId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">@{user.publicId}</span>
              <Badge variant="outline" className="text-xs">
                {user.ticketCount} {user.ticketCount === 1 ? 'ticket' : 'tickets'}
              </Badge>
            </div>
          ))}
        </div>

        {/* Predictions Table */}
        {predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum palpite registrado</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-center">Ticket</TableHead>
                  <TableHead className="text-center">Placar</TableHead>
                  {actualScore && <TableHead className="text-center">Resultado</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPredictions.map(prediction => {
                  const participant = participantMap.get(prediction.participant_id);
                  const isWinner = isWinningScore(prediction.home_score, prediction.away_score);

                  return (
                    <TableRow 
                      key={prediction.id}
                      className={isWinner ? 'bg-emerald-500/10' : undefined}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={participant?.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {(participant?.profiles?.public_id || 'A').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            @{participant?.profiles?.public_id || 'Anônimo'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">#{participant?.ticket_number || 1}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {prediction.home_score} x {prediction.away_score}
                      </TableCell>
                      {actualScore && (
                        <TableCell className="text-center">
                          {isWinner ? (
                            <Badge className="bg-emerald-500">
                              <Trophy className="h-3 w-3 mr-1" />
                              Vencedor
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
