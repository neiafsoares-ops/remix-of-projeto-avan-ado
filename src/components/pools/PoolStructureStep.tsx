import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Trophy, CalendarDays, AlertTriangle } from 'lucide-react';

interface PoolStructureStepProps {
  totalRounds: number;
  matchesPerRound: number;
  onTotalRoundsChange: (value: number) => void;
  onMatchesPerRoundChange: (value: number) => void;
  maxMatches?: number; // Optional limit for common members
}

export function PoolStructureStep({
  totalRounds,
  matchesPerRound,
  onTotalRoundsChange,
  onMatchesPerRoundChange,
  maxMatches,
}: PoolStructureStepProps) {
  const totalMatches = totalRounds * matchesPerRound;
  const exceedsLimit = maxMatches !== undefined && totalMatches > maxMatches;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground">Estrutura do Bolão</h3>
        <p className="text-sm text-muted-foreground">
          Defina quantas rodadas e jogos por rodada seu bolão terá
        </p>
        {maxMatches !== undefined && (
          <p className="text-xs text-amber-600 mt-1">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Limite para usuário padrão: máximo de {maxMatches} partidas no total
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="totalRounds" className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Número de Rodadas
          </Label>
          <Input
            id="totalRounds"
            type="number"
            min={1}
            max={20}
            value={totalRounds}
            onChange={(e) => onTotalRoundsChange(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
            className="text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">Máximo: 20 rodadas</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="matchesPerRound" className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Jogos por Rodada
          </Label>
          <Input
            id="matchesPerRound"
            type="number"
            min={1}
            max={15}
            value={matchesPerRound}
            onChange={(e) => onMatchesPerRoundChange(Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))}
            className="text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">Máximo: 15 jogos por rodada</p>
        </div>
      </div>

      {/* Preview Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Resumo da Estrutura
          </CardTitle>
          <CardDescription>
            Prévia de como seu bolão será organizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{totalRounds}</div>
              <div className="text-xs text-muted-foreground">Rodadas</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-primary">{matchesPerRound}</div>
              <div className="text-xs text-muted-foreground">Jogos/Rodada</div>
            </div>
            <div className={`p-3 bg-background rounded-lg border ${exceedsLimit ? 'border-destructive bg-destructive/10' : ''}`}>
              <div className={`text-2xl font-bold ${exceedsLimit ? 'text-destructive' : 'text-accent'}`}>{totalMatches}</div>
              <div className="text-xs text-muted-foreground">Total de Jogos</div>
              {exceedsLimit && maxMatches && (
                <div className="text-xs text-destructive mt-1">Máximo: {maxMatches}</div>
              )}
            </div>
          </div>

          {/* Visual Preview of Rounds */}
          <div className="mt-4 max-h-40 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">As seguintes rodadas serão criadas:</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-10 gap-1">
              {Array.from({ length: totalRounds }, (_, i) => (
                <div
                  key={i}
                  className="p-1.5 text-center text-xs bg-muted rounded border"
                  title={`Rodada ${i + 1}: ${matchesPerRound} jogos`}
                >
                  R{i + 1}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
