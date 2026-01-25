import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Settings, AlertTriangle, Lock, Plus, Minus, Save } from 'lucide-react';

interface Round {
  id: string;
  round_number: number;
  name?: string;
  match_limit: number;
  is_finalized?: boolean;
  matchCount?: number;
}

interface PoolConfigTabProps {
  poolId: string;
  currentTotalRounds: number;
  currentMatchesPerRound: number;
  rounds: Round[];
  onConfigUpdated: () => void;
}

export function PoolConfigTab({
  poolId,
  currentTotalRounds,
  currentMatchesPerRound,
  rounds,
  onConfigUpdated,
}: PoolConfigTabProps) {
  const [totalRounds, setTotalRounds] = useState(currentTotalRounds);
  const [matchesPerRound, setMatchesPerRound] = useState(currentMatchesPerRound);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTotalRounds(currentTotalRounds);
    setMatchesPerRound(currentMatchesPerRound);
  }, [currentTotalRounds, currentMatchesPerRound]);

  const finalizedRounds = rounds.filter(r => r.is_finalized);
  const nonEmptyRounds = rounds.filter(r => (r.matchCount || 0) > 0);
  const minAllowedRounds = Math.max(finalizedRounds.length, nonEmptyRounds.length, 1);

  const canReduceRounds = totalRounds > minAllowedRounds;
  const canIncreaseRounds = totalRounds < 20;

  const hasChanges = totalRounds !== currentTotalRounds || matchesPerRound !== currentMatchesPerRound;

  const getBlockedRoundsMessage = () => {
    if (finalizedRounds.length > 0) {
      return `${finalizedRounds.length} rodada(s) finalizada(s) - não podem ser removidas`;
    }
    if (nonEmptyRounds.length > 0) {
      return `${nonEmptyRounds.length} rodada(s) com jogos - remova os jogos primeiro para excluir`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      // Update pool configuration
      const { error: poolError } = await supabase
        .from('pools')
        .update({
          total_rounds: totalRounds,
          matches_per_round: matchesPerRound,
        })
        .eq('id', poolId);

      if (poolError) throw poolError;

      // Update match_limit for all non-finalized rounds
      const { error: roundsError } = await supabase
        .from('rounds')
        .update({ match_limit: matchesPerRound })
        .eq('pool_id', poolId)
        .eq('is_finalized', false);

      if (roundsError) throw roundsError;

      // Handle round count changes
      const currentRoundCount = rounds.length;

      if (totalRounds > currentRoundCount) {
        // Add new rounds
        const newRounds = Array.from(
          { length: totalRounds - currentRoundCount },
          (_, i) => ({
            pool_id: poolId,
            round_number: currentRoundCount + i + 1,
            name: `Rodada ${currentRoundCount + i + 1}`,
            match_limit: matchesPerRound,
          })
        );

        const { error: insertError } = await supabase
          .from('rounds')
          .insert(newRounds);

        if (insertError) throw insertError;
      } else if (totalRounds < currentRoundCount) {
        // Remove empty rounds from the end
        const roundsToDelete = rounds
          .filter(r => r.round_number > totalRounds && !r.is_finalized && (r.matchCount || 0) === 0)
          .map(r => r.id);

        if (roundsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('rounds')
            .delete()
            .in('id', roundsToDelete);

          if (deleteError) throw deleteError;
        }
      }

      toast.success('Configurações atualizadas com sucesso!');
      onConfigUpdated();
    } catch (error: any) {
      console.error('Error updating config:', error);
      toast.error(error.message || 'Erro ao atualizar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações do Bolão
          </CardTitle>
          <CardDescription>
            Ajuste a estrutura de rodadas e jogos do seu bolão
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warnings */}
          {getBlockedRoundsMessage() && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                {getBlockedRoundsMessage()}
              </AlertDescription>
            </Alert>
          )}

          {/* Total Rounds */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Número Total de Rodadas</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTotalRounds(Math.max(minAllowedRounds, totalRounds - 1))}
                disabled={!canReduceRounds}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={minAllowedRounds}
                max={20}
                value={totalRounds}
                onChange={(e) => setTotalRounds(
                  Math.min(20, Math.max(minAllowedRounds, parseInt(e.target.value) || minAllowedRounds))
                )}
                className="w-24 text-center text-lg font-semibold"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTotalRounds(Math.min(20, totalRounds + 1))}
                disabled={!canIncreaseRounds}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                (atual: {currentTotalRounds}, mín: {minAllowedRounds}, máx: 20)
              </span>
            </div>
          </div>

          {/* Matches Per Round */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Jogos por Rodada</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMatchesPerRound(Math.max(1, matchesPerRound - 1))}
                disabled={matchesPerRound <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={15}
                value={matchesPerRound}
                onChange={(e) => setMatchesPerRound(
                  Math.min(15, Math.max(1, parseInt(e.target.value) || 1))
                )}
                className="w-24 text-center text-lg font-semibold"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMatchesPerRound(Math.min(15, matchesPerRound + 1))}
                disabled={matchesPerRound >= 15}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                (atual: {currentMatchesPerRound}, máx: 15)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alterações no limite de jogos se aplicam apenas a rodadas não finalizadas
            </p>
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{totalRounds}</div>
                <div className="text-xs text-muted-foreground">Rodadas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{matchesPerRound}</div>
                <div className="text-xs text-muted-foreground">Jogos/Rodada</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{totalRounds * matchesPerRound}</div>
                <div className="text-xs text-muted-foreground">Total de Jogos</div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Finalized Rounds List */}
      {finalizedRounds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-green-600" />
              Rodadas Finalizadas
            </CardTitle>
            <CardDescription>
              Estas rodadas estão bloqueadas para alterações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {finalizedRounds.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                >
                  <span className="font-medium">
                    {round.name || `Rodada ${round.round_number}`}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <Lock className="h-3 w-3" />
                    Finalizada
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
