import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PoolStructureStep } from './PoolStructureStep';
import { CupFormatStep, CupFormatConfig } from './CupFormatStep';
import { KnockoutOnlyStep, KnockoutOnlyConfig } from './KnockoutOnlyStep';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Lock, 
  Save, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Trophy,
  Layers,
  Swords
} from 'lucide-react';
import { Round } from '@/hooks/use-rounds';

// Limites para membros comuns
const MEMBER_LIMITS = {
  maxTeams: 8,
  maxGroups: 2,
  maxMatches: 15,
};

interface Pool {
  id: string;
  name: string;
  matches_per_round: number | null;
  total_rounds: number | null;
}

interface Match {
  id: string;
  is_finished: boolean;
  round_id: string | null;
}

interface PoolStructureConfigTabProps {
  poolId: string;
  pool: Pool;
  rounds: Round[];
  matches: Match[];
  userId: string;
  isPrivilegedUser: boolean;
  onConfigUpdated: () => void;
}

type PoolFormat = 'standard' | 'cup' | 'knockout';

// Detectar formato baseado nos nomes das rodadas
const detectPoolFormat = (rounds: Round[]): PoolFormat => {
  const hasGroupRounds = rounds.some(r => r.name?.startsWith('Grupo'));
  const hasKnockoutRounds = rounds.some(r => 
    r.name?.includes('Oitavas') || 
    r.name?.includes('Quartas') || 
    r.name?.includes('Semifinal') || 
    r.name?.includes('Final') ||
    r.name?.includes('16 avos') ||
    r.name?.includes('32 avos')
  );
  
  if (hasGroupRounds && hasKnockoutRounds) return 'cup';
  if (hasKnockoutRounds && !hasGroupRounds) return 'knockout';
  return 'standard';
};

// Verificar se o bolão pode ser editado
const checkCanEditStructure = (rounds: Round[], matches: Match[]) => {
  const finalizedRounds = rounds.filter(r => r.is_finalized);
  const finishedMatches = matches.filter(m => m.is_finished);
  
  return {
    canEdit: finalizedRounds.length === 0 && finishedMatches.length === 0,
    finalizedRoundsCount: finalizedRounds.length,
    finishedMatchesCount: finishedMatches.length,
  };
};

export function PoolStructureConfigTab({
  poolId,
  pool,
  rounds,
  matches,
  userId,
  isPrivilegedUser,
  onConfigUpdated,
}: PoolStructureConfigTabProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Detectar formato e verificar editabilidade
  const poolFormat = useMemo(() => detectPoolFormat(rounds), [rounds]);
  const editability = useMemo(() => checkCanEditStructure(rounds, matches), [rounds, matches]);
  
  // Estados para formato Standard
  const [totalRounds, setTotalRounds] = useState(pool.total_rounds || 10);
  const [matchesPerRound, setMatchesPerRound] = useState(pool.matches_per_round || 10);
  
  // Estados para formato Cup
  const [cupConfig, setCupConfig] = useState<CupFormatConfig>({
    totalTeams: 32,
    totalGroups: 8,
    classifiedPerGroup: 2,
    groupPhaseFormat: 'single',
    knockoutFormat: 'home_away',
    finalFormat: 'single',
    hasThirdPlace: false,
    awayGoalsRule: false,
    enableBestThirdPlace: false,
    bestThirdPlaceCount: 4,
    knockoutDrawMethod: 'automatic',
  });
  
  // Estados para formato Knockout
  const [knockoutConfig, setKnockoutConfig] = useState<KnockoutOnlyConfig>({
    totalTeams: 8,
    knockoutFormat: 'single',
    finalFormat: 'single',
    hasThirdPlace: false,
    awayGoalsRule: false,
  });

  // Extrair configuração atual das rodadas existentes
  useEffect(() => {
    if (poolFormat === 'cup') {
      // Extrair configuração de cup das rodadas existentes
      const groupRounds = rounds.filter(r => r.name?.startsWith('Grupo'));
      const totalGroups = groupRounds.length;
      
      // Estimar número de times por grupo baseado no match_limit
      const firstGroup = groupRounds[0];
      const matchesInGroup = firstGroup?.match_limit || 6;
      // Para n times, temos n*(n-1)/2 jogos (ida) ou n*(n-1) jogos (ida+volta)
      // Assumindo somente ida: times = (1 + sqrt(1 + 8*matches)) / 2
      const estimatedTeamsPerGroup = Math.round((1 + Math.sqrt(1 + 8 * matchesInGroup)) / 2);
      
      const hasHomeAway = rounds.some(r => r.name?.includes(' - Ida') || r.name?.includes(' - Volta'));
      const hasThirdPlace = rounds.some(r => r.name?.includes('3º Lugar'));
      const hasFinalHomeAway = rounds.some(r => 
        r.name?.includes('Final - Jogo de Ida') || r.name?.includes('Final - Jogo de Volta')
      );
      
      setCupConfig(prev => ({
        ...prev,
        totalTeams: totalGroups * estimatedTeamsPerGroup,
        totalGroups,
        classifiedPerGroup: 2,
        groupPhaseFormat: 'single',
        knockoutFormat: hasHomeAway ? 'home_away' : 'single',
        finalFormat: hasFinalHomeAway ? 'home_away' : 'single',
        hasThirdPlace,
      }));
    } else if (poolFormat === 'knockout') {
      // Extrair configuração de knockout das rodadas existentes
      const hasOitavas = rounds.some(r => r.name?.includes('Oitavas'));
      const hasQuartas = rounds.some(r => r.name?.includes('Quartas'));
      const hasSemi = rounds.some(r => r.name?.includes('Semifinal'));
      const has16avos = rounds.some(r => r.name?.includes('16 avos'));
      const has32avos = rounds.some(r => r.name?.includes('32 avos'));
      
      let totalTeams = 4;
      if (has32avos) totalTeams = 64;
      else if (has16avos) totalTeams = 32;
      else if (hasOitavas) totalTeams = 16;
      else if (hasQuartas) totalTeams = 8;
      else if (hasSemi) totalTeams = 4;
      
      const hasHomeAway = rounds.some(r => r.name?.includes(' - Ida') || r.name?.includes(' - Volta'));
      const hasThirdPlace = rounds.some(r => r.name?.includes('3º Lugar'));
      const hasFinalHomeAway = rounds.some(r => 
        r.name?.includes('Final - Jogo de Ida') || r.name?.includes('Final - Jogo de Volta')
      );
      
      setKnockoutConfig({
        totalTeams,
        knockoutFormat: hasHomeAway ? 'home_away' : 'single',
        finalFormat: hasFinalHomeAway ? 'home_away' : 'single',
        hasThirdPlace,
        awayGoalsRule: false,
      });
    }
  }, [poolFormat, rounds]);

  // Gerar rodadas para formato Cup
  const generateCupRounds = (poolId: string) => {
    const newRounds: Array<{
      pool_id: string;
      round_number: number;
      name: string;
      match_limit: number;
      created_by: string;
    }> = [];
    
    let roundNumber = 1;
    const teamsPerGroup = cupConfig.totalTeams / cupConfig.totalGroups;
    const matchesPerGroupPhase = cupConfig.groupPhaseFormat === 'home_away' 
      ? (teamsPerGroup - 1) * teamsPerGroup 
      : (teamsPerGroup - 1) * teamsPerGroup / 2;
    
    // Group phase rounds
    for (let g = 0; g < cupConfig.totalGroups; g++) {
      const groupLetter = String.fromCharCode(65 + g);
      newRounds.push({
        pool_id: poolId,
        round_number: roundNumber++,
        name: `Grupo ${groupLetter}`,
        match_limit: Math.ceil(matchesPerGroupPhase),
        created_by: userId,
      });
    }

    const teamsFromGroups = cupConfig.totalGroups * cupConfig.classifiedPerGroup;
    const teamsFromBestThird = cupConfig.enableBestThirdPlace ? cupConfig.bestThirdPlaceCount : 0;
    const teamsInKnockout = teamsFromGroups + teamsFromBestThird;

    // Round of 16
    if (teamsInKnockout >= 16) {
      if (cupConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Ida', match_limit: 8, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Volta', match_limit: 8, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas de Final', match_limit: 8, created_by: userId });
      }
    }

    // Quarter Finals
    if (teamsInKnockout >= 8) {
      if (cupConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Ida', match_limit: 4, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Volta', match_limit: 4, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas de Final', match_limit: 4, created_by: userId });
      }
    }

    // Semi Finals
    if (teamsInKnockout >= 4) {
      if (cupConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Ida', match_limit: 2, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Volta', match_limit: 2, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal', match_limit: 2, created_by: userId });
      }
    }

    // Third place
    if (cupConfig.hasThirdPlace) {
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Disputa 3º Lugar', match_limit: 1, created_by: userId });
    }

    // Final
    if (cupConfig.finalFormat === 'home_away') {
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Ida', match_limit: 1, created_by: userId });
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Volta', match_limit: 1, created_by: userId });
    } else {
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '🏆 FINAL', match_limit: 1, created_by: userId });
    }

    return newRounds;
  };

  // Gerar rodadas para formato Knockout
  const generateKnockoutRounds = (poolId: string) => {
    const newRounds: Array<{
      pool_id: string;
      round_number: number;
      name: string;
      match_limit: number;
      created_by: string;
    }> = [];
    
    let roundNumber = 1;

    // Round of 64
    if (knockoutConfig.totalTeams >= 64) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '32 avos - Ida', match_limit: 32, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '32 avos - Volta', match_limit: 32, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '32 avos de Final', match_limit: 32, created_by: userId });
      }
    }

    // Round of 32
    if (knockoutConfig.totalTeams >= 32) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '16 avos - Ida', match_limit: 16, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '16 avos - Volta', match_limit: 16, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '16 avos de Final', match_limit: 16, created_by: userId });
      }
    }

    // Round of 16
    if (knockoutConfig.totalTeams >= 16) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Ida', match_limit: 8, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas - Volta', match_limit: 8, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Oitavas de Final', match_limit: 8, created_by: userId });
      }
    }

    // Quarter Finals
    if (knockoutConfig.totalTeams >= 8) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Ida', match_limit: 4, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas - Volta', match_limit: 4, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Quartas de Final', match_limit: 4, created_by: userId });
      }
    }

    // Semi Finals
    if (knockoutConfig.totalTeams >= 4) {
      if (knockoutConfig.knockoutFormat === 'home_away') {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Ida', match_limit: 2, created_by: userId });
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal - Volta', match_limit: 2, created_by: userId });
      } else {
        newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Semifinal', match_limit: 2, created_by: userId });
      }
    }

    // Third place
    if (knockoutConfig.hasThirdPlace) {
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Disputa 3º Lugar', match_limit: 1, created_by: userId });
    }

    // Final
    if (knockoutConfig.finalFormat === 'home_away') {
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Ida', match_limit: 1, created_by: userId });
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: 'Final - Jogo de Volta', match_limit: 1, created_by: userId });
    } else {
      newRounds.push({ pool_id: poolId, round_number: roundNumber++, name: '🏆 FINAL', match_limit: 1, created_by: userId });
    }

    return newRounds;
  };

  // Gerar rodadas para formato Standard
  const generateStandardRounds = (poolId: string) => {
    const newRounds: Array<{
      pool_id: string;
      round_number: number;
      name: string;
      match_limit: number;
      created_by: string;
    }> = [];
    
    for (let i = 1; i <= totalRounds; i++) {
      newRounds.push({
        pool_id: poolId,
        round_number: i,
        name: `Rodada ${i}`,
        match_limit: matchesPerRound,
        created_by: userId,
      });
    }
    
    return newRounds;
  };

  // Salvar alterações
  const handleSaveStructure = async () => {
    if (!editability.canEdit) {
      toast({
        title: 'Não é possível editar',
        description: 'Este bolão já foi iniciado e não pode ter sua estrutura alterada.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // 1. Deletar todas as rodadas existentes e seus jogos
      // Primeiro, deletar os jogos das rodadas
      const roundIds = rounds.map(r => r.id);
      if (roundIds.length > 0) {
        await supabase.from('matches').delete().in('round_id', roundIds);
      }
      
      // Depois, deletar as rodadas
      const { error: deleteRoundsError } = await supabase
        .from('rounds')
        .delete()
        .eq('pool_id', poolId);
      
      if (deleteRoundsError) throw deleteRoundsError;

      // 2. Calcular novos valores e atualizar pool
      let calculatedTotalRounds = totalRounds;
      let calculatedMatchesPerRound = matchesPerRound;
      
      if (poolFormat === 'cup') {
        const newRounds = generateCupRounds(poolId);
        calculatedTotalRounds = newRounds.length;
        calculatedMatchesPerRound = Math.max(...newRounds.map(r => r.match_limit));
      } else if (poolFormat === 'knockout') {
        const newRounds = generateKnockoutRounds(poolId);
        calculatedTotalRounds = newRounds.length;
        calculatedMatchesPerRound = Math.max(...newRounds.map(r => r.match_limit));
      }

      const { error: updatePoolError } = await supabase
        .from('pools')
        .update({
          total_rounds: calculatedTotalRounds,
          matches_per_round: calculatedMatchesPerRound,
        })
        .eq('id', poolId);

      if (updatePoolError) throw updatePoolError;

      // 3. Gerar e inserir novas rodadas
      let newRounds;
      if (poolFormat === 'cup') {
        newRounds = generateCupRounds(poolId);
      } else if (poolFormat === 'knockout') {
        newRounds = generateKnockoutRounds(poolId);
      } else {
        newRounds = generateStandardRounds(poolId);
      }

      const { error: insertRoundsError } = await supabase
        .from('rounds')
        .insert(newRounds);

      if (insertRoundsError) throw insertRoundsError;

      toast({
        title: 'Estrutura atualizada!',
        description: 'A nova estrutura do bolão foi salva com sucesso.',
      });

      onConfigUpdated();
    } catch (error: any) {
      console.error('Error saving structure:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível atualizar a estrutura do bolão.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Obter ícone e label do formato
  const getFormatInfo = () => {
    switch (poolFormat) {
      case 'cup':
        return { icon: Trophy, label: 'Copa (Grupos + Mata-Mata)', color: 'text-yellow-500' };
      case 'knockout':
        return { icon: Swords, label: 'Somente Mata-Mata', color: 'text-red-500' };
      default:
        return { icon: Layers, label: 'Padrão (Rodadas)', color: 'text-blue-500' };
    }
  };

  const formatInfo = getFormatInfo();
  const FormatIcon = formatInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações da Estrutura
          </CardTitle>
          <CardDescription>
            Edite a estrutura de rodadas e jogos do bolão
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editability.canEdit ? (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Este bolão ainda não foi iniciado e pode ser reconfigurado.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Este bolão já foi iniciado e não pode ser reconfigurado.</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {editability.finalizedRoundsCount > 0 && (
                    <li>{editability.finalizedRoundsCount} rodadas já foram finalizadas</li>
                  )}
                  {editability.finishedMatchesCount > 0 && (
                    <li>{editability.finishedMatchesCount} jogos já possuem resultados lançados</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Formato Detectado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FormatIcon className={`h-5 w-5 ${formatInfo.color}`} />
            Formato Detectado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {formatInfo.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              ({rounds.length} rodadas configuradas)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Interface de Edição */}
      {editability.canEdit && (
        <>
          {poolFormat === 'standard' && (
            <PoolStructureStep
              totalRounds={totalRounds}
              matchesPerRound={matchesPerRound}
              onTotalRoundsChange={setTotalRounds}
              onMatchesPerRoundChange={setMatchesPerRound}
              maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
            />
          )}

          {poolFormat === 'cup' && (
            <CupFormatStep
              config={cupConfig}
              onChange={setCupConfig}
              maxTeams={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxTeams}
              maxGroups={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxGroups}
              maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
            />
          )}

          {poolFormat === 'knockout' && (
            <KnockoutOnlyStep
              config={knockoutConfig}
              onChange={setKnockoutConfig}
              maxTeams={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxTeams}
              maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
            />
          )}

          {/* Aviso e Botão de Salvar */}
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="pt-4">
              <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  <p className="font-medium">Atenção!</p>
                  <p className="text-sm mt-1">
                    Salvar irá remover as rodadas atuais e criar novas baseadas na configuração acima. 
                    Jogos existentes sem resultados serão removidos.
                  </p>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleSaveStructure} 
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Configuração Atual (Somente Leitura) */}
      {!editability.canEdit && (
        <Card className="opacity-75">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Configuração Atual (Somente Leitura)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-foreground">{rounds.length}</div>
                <div className="text-xs text-muted-foreground">Rodadas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-foreground">{matches.length}</div>
                <div className="text-xs text-muted-foreground">Jogos</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-foreground">{editability.finalizedRoundsCount}</div>
                <div className="text-xs text-muted-foreground">Rodadas Finalizadas</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-foreground">{editability.finishedMatchesCount}</div>
                <div className="text-xs text-muted-foreground">Jogos Finalizados</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
