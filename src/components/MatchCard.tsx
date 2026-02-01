import React, { useState, useEffect, useRef } from 'react';
import { Shield, Clock, CheckCircle2, Lock, Trophy, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDateTimeBR, formatDateShortBR, formatTimeBR, isBeforeDeadline } from '@/lib/date-utils';
import { getPointsDescription } from '@/lib/points-utils';

interface MatchCardProps {
  match: {
    id: string;
    home_team: string;
    away_team: string;
    home_team_image?: string | null;
    away_team_image?: string | null;
    match_date: string;
    prediction_deadline: string;
    is_finished: boolean;
    home_score?: number | null;
    away_score?: number | null;
  };
  prediction?: {
    home_score: number;
    away_score: number;
    points_earned?: number | null;
  };
  onPredictionChange?: (homeScore: number, awayScore: number) => Promise<void>;
  isParticipant?: boolean;
  showPredictionInputs?: boolean;
  participantId?: string;
}

export function MatchCard({
  match,
  prediction,
  onPredictionChange,
  isParticipant = false,
  showPredictionInputs = true,
  participantId,
}: MatchCardProps) {
  const [homeScore, setHomeScore] = useState<string>(prediction?.home_score?.toString() ?? '');
  const [awayScore, setAwayScore] = useState<string>(prediction?.away_score?.toString() ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedScores = useRef<{ home: string; away: string } | null>(
    prediction ? { home: prediction.home_score.toString(), away: prediction.away_score.toString() } : null
  );

  const canPredict = isBeforeDeadline(match.prediction_deadline) && isParticipant && !match.is_finished;
  const isPredictionsClosed = !isBeforeDeadline(match.prediction_deadline) && !match.is_finished;

  // Auto-save with debounce
  useEffect(() => {
    if (!onPredictionChange || !canPredict) return;
    if (homeScore === '' || awayScore === '') return;

    const homeNum = parseInt(homeScore);
    const awayNum = parseInt(awayScore);
    if (isNaN(homeNum) || isNaN(awayNum) || homeNum < 0 || awayNum < 0 || homeNum > 99 || awayNum > 99) return;

    const hasChanged = !lastSavedScores.current || 
      lastSavedScores.current.home !== homeScore || 
      lastSavedScores.current.away !== awayScore;

    if (!hasChanged) return;

    setSaveStatus('saving');

    const timeoutId = setTimeout(async () => {
      try {
        await onPredictionChange(homeNum, awayNum);
        lastSavedScores.current = { home: homeScore, away: awayScore };
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [homeScore, awayScore, canPredict, onPredictionChange]);

  const renderSaveStatus = () => {
    if (!canPredict || (homeScore === '' || awayScore === '')) return null;
    
    if (saveStatus === 'saving') {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-xs">Salvando...</span>
        </div>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-xs">Palpite salvo</span>
        </div>
      );
    }
    if (saveStatus === 'error') {
      return (
        <div className="flex items-center gap-1 text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span className="text-xs">Erro ao salvar</span>
        </div>
      );
    }
    return null;
  };

  const getStatusBadge = () => {
    if (match.is_finished) {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Finalizado
        </Badge>
      );
    }
    if (isPredictionsClosed) {
      return (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
          <Lock className="w-3 h-3 mr-1" />
          Palpites Encerrados
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
        <Clock className="w-3 h-3 mr-1" />
        Aberto
      </Badge>
    );
  };

  const renderTeamImage = (imageUrl?: string | null, teamName?: string) => {
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={teamName}
          className="w-16 h-16 object-contain rounded-lg bg-muted p-1"
          loading="lazy"
        />
      );
    }
    return (
      <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-muted">
        <Shield className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  };

  const renderPointsBadge = () => {
    if (!match.is_finished || !prediction || match.home_score === null || match.away_score === null) return null;
    
    const result = getPointsDescription(
      prediction.home_score,
      prediction.away_score,
      match.home_score,
      match.away_score
    );
    
    return (
      <div className="flex flex-col items-center gap-1">
        <Badge className={cn(result.bgColor)}>
          <Trophy className="w-3 h-3 mr-1" />
          +{result.points} pts
        </Badge>
        <span className={cn("text-xs", result.color)}>
          {result.rule}
        </span>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg">
      <CardContent className="p-4">
        {/* Header with status and date */}
        <div className="flex items-center justify-between mb-4">
          {getStatusBadge()}
          <div className="text-sm text-muted-foreground">
            {formatDateShortBR(match.match_date)} às {formatTimeBR(match.match_date)}
          </div>
        </div>

        {/* Teams and Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {renderTeamImage(match.home_team_image, match.home_team)}
            <span className="text-sm font-medium text-center line-clamp-2">{match.home_team}</span>
          </div>

          {/* Score Section */}
          <div className="flex flex-col items-center gap-2">
            {match.is_finished && match.home_score !== null && match.away_score !== null ? (
              <>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <span>{match.home_score}</span>
                  <span className="text-muted-foreground">x</span>
                  <span>{match.away_score}</span>
                </div>
                {prediction && (
                  <div className="text-xs text-muted-foreground">
                    Seu palpite: {prediction.home_score} x {prediction.away_score}
                  </div>
                )}
                {renderPointsBadge()}
              </>
            ) : showPredictionInputs ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    className="w-14 h-12 text-center text-lg font-bold"
                    disabled={!canPredict}
                    placeholder="-"
                  />
                  <span className="text-xl font-bold text-muted-foreground">x</span>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    className="w-14 h-12 text-center text-lg font-bold"
                    disabled={!canPredict}
                    placeholder="-"
                  />
                </div>
                {renderSaveStatus()}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xl text-muted-foreground">
                <span>-</span>
                <span>x</span>
                <span>-</span>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {renderTeamImage(match.away_team_image, match.away_team)}
            <span className="text-sm font-medium text-center line-clamp-2">{match.away_team}</span>
          </div>
        </div>

        {/* Prediction Deadline */}
        {showPredictionInputs && canPredict && (
          <div className="mt-4">
            <p className="text-xs text-center text-muted-foreground">
              Limite: {formatDateTimeBR(match.prediction_deadline)}
            </p>
          </div>
        )}

        {/* Closed predictions message */}
        {showPredictionInputs && isPredictionsClosed && prediction && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Seu palpite: <span className="font-semibold">{prediction.home_score} x {prediction.away_score}</span>
            </p>
          </div>
        )}

        {/* No prediction warning */}
        {showPredictionInputs && isPredictionsClosed && !prediction && isParticipant && (
          <div className="mt-4 text-center">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Você não enviou palpite para este jogo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
