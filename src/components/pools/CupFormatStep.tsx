import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Trophy, Users, Flag, Swords, Award, Info, Shuffle, Hand, AlertTriangle } from 'lucide-react';

export interface CupFormatConfig {
  totalTeams: number;
  totalGroups: number;
  classifiedPerGroup: number;
  groupPhaseFormat: 'single' | 'home_away';
  knockoutFormat: 'single' | 'home_away';
  finalFormat: 'single' | 'home_away';
  hasThirdPlace: boolean;
  awayGoalsRule: boolean;
  enableBestThirdPlace: boolean;
  bestThirdPlaceCount: number;
  knockoutDrawMethod: 'automatic' | 'manual';
}

interface CupFormatStepProps {
  config: CupFormatConfig;
  onChange: (config: CupFormatConfig) => void;
  maxTeams?: number; // Optional limit for common members
  maxGroups?: number; // Optional limit for common members
  maxMatches?: number; // Optional limit for common members
}

export function CupFormatStep({ config, onChange, maxTeams, maxGroups, maxMatches }: CupFormatStepProps) {
  const updateConfig = (partial: Partial<CupFormatConfig>) => {
    onChange({ ...config, ...partial });
  };

  // Validation for limits
  const exceedsTeamLimit = maxTeams !== undefined && config.totalTeams > maxTeams;
  const exceedsGroupLimit = maxGroups !== undefined && config.totalGroups > maxGroups;

  // Calculate knockout structure
  const teamsFromGroups = config.totalGroups * config.classifiedPerGroup;
  const teamsFromBestThird = config.enableBestThirdPlace ? config.bestThirdPlaceCount : 0;
  const teamsInKnockout = teamsFromGroups + teamsFromBestThird;
  const hasRound32 = teamsInKnockout >= 32;
  const hasRound16 = teamsInKnockout >= 16;
  const hasQuarterFinals = teamsInKnockout >= 8;
  const hasSemiFinals = teamsInKnockout >= 4;
  
  // Calculate total matches
  const groupMatchesPerTeam = config.groupPhaseFormat === 'home_away' 
    ? (config.totalTeams / config.totalGroups - 1) * 2 
    : config.totalTeams / config.totalGroups - 1;
  const totalGroupMatches = config.totalTeams * groupMatchesPerTeam / 2;
  
  const knockoutGamesMultiplier = config.knockoutFormat === 'home_away' ? 2 : 1;
  const finalGamesMultiplier = config.finalFormat === 'home_away' ? 2 : 1;
  
  let knockoutMatches = 0;
  if (hasRound32) knockoutMatches += 16 * knockoutGamesMultiplier;
  if (hasRound16) knockoutMatches += 8 * knockoutGamesMultiplier;
  if (hasQuarterFinals) knockoutMatches += 4 * knockoutGamesMultiplier;
  if (hasSemiFinals) knockoutMatches += 2 * knockoutGamesMultiplier;
  knockoutMatches += finalGamesMultiplier; // Final
  if (config.hasThirdPlace) knockoutMatches += 1; // 3rd place

  const totalCalculatedMatches = Math.round(totalGroupMatches + knockoutMatches);
  const exceedsMatchLimit = maxMatches !== undefined && totalCalculatedMatches > maxMatches;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Configuração do Formato Copa</h3>
        <p className="text-sm text-muted-foreground">
          Configure a fase de grupos e eliminatórias do campeonato
        </p>
        {(maxTeams !== undefined || maxGroups !== undefined || maxMatches !== undefined) && (
          <p className="text-xs text-amber-600 mt-2">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Limites para membros comuns: {maxTeams} equipes, {maxGroups} grupos, {maxMatches} partidas
          </p>
        )}
      </div>

      {/* Configurações Gerais */}
      <Card className={exceedsTeamLimit || exceedsGroupLimit ? 'border-destructive' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="totalTeams" className={exceedsTeamLimit ? 'text-destructive' : ''}>
                Total de Equipes
                {exceedsTeamLimit && <span className="ml-1 text-xs">(máx: {maxTeams})</span>}
              </Label>
              <Input
                id="totalTeams"
                type="number"
                min={4}
                max={maxTeams || 64}
                value={config.totalTeams}
                onChange={(e) => updateConfig({ totalTeams: Math.max(4, parseInt(e.target.value) || 4) })}
                className={exceedsTeamLimit ? 'border-destructive' : ''}
              />
              <p className={`text-xs ${exceedsTeamLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                {exceedsTeamLimit ? `Máximo permitido: ${maxTeams} equipes` : 'Número total de equipes no campeonato'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalGroups" className={exceedsGroupLimit ? 'text-destructive' : ''}>
                Total de Grupos
                {exceedsGroupLimit && <span className="ml-1 text-xs">(máx: {maxGroups})</span>}
              </Label>
              <Input
                id="totalGroups"
                type="number"
                min={1}
                max={maxGroups || 16}
                value={config.totalGroups}
                onChange={(e) => updateConfig({ totalGroups: Math.max(1, parseInt(e.target.value) || 1) })}
                className={exceedsGroupLimit ? 'border-destructive' : ''}
              />
              {exceedsGroupLimit && (
                <p className="text-xs text-destructive">Máximo permitido: {maxGroups} grupos</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="classifiedPerGroup">Classificados por Grupo</Label>
              <Input
                id="classifiedPerGroup"
                type="number"
                min={1}
                max={4}
                value={config.classifiedPerGroup}
                onChange={(e) => updateConfig({ classifiedPerGroup: Math.max(1, parseInt(e.target.value) || 1) })}
              />
              <p className="text-xs text-muted-foreground">Equipes que avançam para as finais</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fase de Grupos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" />
            Fase de Grupos
          </CardTitle>
          <CardDescription>
            Cada equipe enfrenta todos os demais em seu grupo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.groupPhaseFormat}
            onValueChange={(value: 'single' | 'home_away') => updateConfig({ groupPhaseFormat: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="group-single" />
              <Label htmlFor="group-single" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                Somente ida
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="home_away" id="group-home-away" />
              <Label htmlFor="group-home-away" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                Ida e volta
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Mata-mata */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" />
            Mata-mata
          </CardTitle>
          <CardDescription>
            Configuração para Oitavas, Quartas e Semifinal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Método de definição de confrontos */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              Definição dos Confrontos
            </Label>
            <RadioGroup
              value={config.knockoutDrawMethod}
              onValueChange={(value: 'automatic' | 'manual') => updateConfig({ knockoutDrawMethod: value })}
              className="grid gap-3 md:grid-cols-2"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                <RadioGroupItem value="automatic" id="draw-automatic" className="mt-0.5" />
                <Label htmlFor="draw-automatic" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Shuffle className="h-4 w-4 text-primary" />
                    Sorteio Automático
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Os confrontos serão definidos automaticamente por sorteio antes do início do mata-mata
                  </p>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted cursor-pointer">
                <RadioGroupItem value="manual" id="draw-manual" className="mt-0.5" />
                <Label htmlFor="draw-manual" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Hand className="h-4 w-4 text-amber-600" />
                    Escolha Manual
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    O administrador escolherá manualmente os confrontos (ex: 1ºA vs 2ºB)
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <RadioGroup
            value={config.knockoutFormat}
            onValueChange={(value: 'single' | 'home_away') => updateConfig({ knockoutFormat: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="knockout-single" />
              <Label htmlFor="knockout-single" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                Somente ida
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="home_away" id="knockout-home-away" />
              <Label htmlFor="knockout-home-away" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                Ida e volta
              </Label>
            </div>
          </RadioGroup>

          <Separator />

          {/* Disputa terceiro lugar */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Disputa do terceiro lugar</Label>
            <RadioGroup
              value={config.hasThirdPlace ? 'yes' : 'no'}
              onValueChange={(value) => updateConfig({ hasThirdPlace: value === 'yes' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="third-no" />
                <Label htmlFor="third-no" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                  Não
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="third-yes" />
                <Label htmlFor="third-yes" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                  Sim
                </Label>
              </div>
          </RadioGroup>
          </div>

          <Separator />

          {/* Melhores terceiros colocados */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              🏅 Melhores Terceiros Colocados
            </Label>
            <RadioGroup
              value={config.enableBestThirdPlace ? 'yes' : 'no'}
              onValueChange={(value) => updateConfig({ 
                enableBestThirdPlace: value === 'yes',
                bestThirdPlaceCount: value === 'yes' ? (config.bestThirdPlaceCount || 4) : 0
              })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="best-third-no" />
                <Label htmlFor="best-third-no" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                  Não habilitar
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="best-third-yes" />
                <Label htmlFor="best-third-yes" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                  Habilitar melhores 3ºs
                </Label>
              </div>
            </RadioGroup>
            
            {config.enableBestThirdPlace && (
              <div className="flex items-center gap-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="bestThirdCount" className="text-sm">Quantidade de terceiros classificados</Label>
                  <p className="text-xs text-muted-foreground">
                    Os melhores 3ºs colocados no geral avançam para o mata-mata
                  </p>
                </div>
                <Input
                  id="bestThirdCount"
                  type="number"
                  min={1}
                  max={Math.min(8, config.totalGroups)}
                  value={config.bestThirdPlaceCount}
                  onChange={(e) => updateConfig({ 
                    bestThirdPlaceCount: Math.min(
                      Math.max(1, parseInt(e.target.value) || 1),
                      Math.min(8, config.totalGroups)
                    )
                  })}
                  className="w-20"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Gols fora de casa */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Desempate por gols fora de casa</Label>
            <RadioGroup
              value={config.awayGoalsRule ? 'yes' : 'no'}
              onValueChange={(value) => updateConfig({ awayGoalsRule: value === 'yes' })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="away-no" />
                <Label htmlFor="away-no" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                  Não
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="away-yes" />
                <Label htmlFor="away-yes" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                  Sim
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Aplica-se somente ao mata-mata. Caso seja ida+volta e não haja desempate pelo somatório de gols das duas partidas, classifica-se a equipe que fez mais gols fora de casa.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Final */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Jogo Final
          </CardTitle>
          <CardDescription>
            Configuração obrigatória e independente das fases anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={config.finalFormat}
            onValueChange={(value: 'single' | 'home_away') => updateConfig({ finalFormat: value })}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="final-single" />
              <Label htmlFor="final-single" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                Jogo único
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="home_away" id="final-home-away" />
              <Label htmlFor="final-home-away" className="cursor-pointer px-3 py-1.5 rounded-md border hover:bg-muted">
                Ida e volta
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Resumo da Estrutura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-xl font-bold text-primary">{config.totalGroups}</div>
              <div className="text-xs text-muted-foreground">Grupos</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-xl font-bold text-primary">{config.totalTeams / config.totalGroups}</div>
              <div className="text-xs text-muted-foreground">Equipes/Grupo</div>
            </div>
            <div className="p-3 bg-background rounded-lg border">
              <div className="text-xl font-bold text-primary">{teamsInKnockout}</div>
              <div className="text-xs text-muted-foreground">
                Classificados
                {config.enableBestThirdPlace && (
                  <span className="block text-amber-600">+{teamsFromBestThird} melhores 3ºs</span>
                )}
              </div>
            </div>
            <div className={`p-3 bg-background rounded-lg border ${exceedsMatchLimit ? 'border-destructive bg-destructive/10' : ''}`}>
              <div className={`text-xl font-bold ${exceedsMatchLimit ? 'text-destructive' : 'text-accent'}`}>{totalCalculatedMatches}</div>
              <div className="text-xs text-muted-foreground">Total Jogos</div>
              {exceedsMatchLimit && maxMatches && (
                <div className="text-xs text-destructive mt-1">Máximo: {maxMatches}</div>
              )}
            </div>
          </div>

          {/* Fases do campeonato */}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Fases do campeonato:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: config.totalGroups }, (_, i) => (
                <span key={i} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-md border border-primary/20">
                  Grupo {String.fromCharCode(65 + i)}
                </span>
              ))}
              {hasRound32 && (
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 rounded-md border border-orange-500/20">
                  16 avos
                </span>
              )}
              {hasRound16 && (
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 rounded-md border border-orange-500/20">
                  Oitavas
                </span>
              )}
              {hasQuarterFinals && (
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 rounded-md border border-orange-500/20">
                  Quartas
                </span>
              )}
              {hasSemiFinals && (
                <span className="px-2 py-1 text-xs bg-orange-500/10 text-orange-600 rounded-md border border-orange-500/20">
                  Semifinal
                </span>
              )}
              {config.enableBestThirdPlace && (
                <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/20 font-medium">
                  +{config.bestThirdPlaceCount} Melhores 3ºs
                </span>
              )}
              {config.hasThirdPlace && (
                <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/20">
                  3º Lugar
                </span>
              )}
              <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-700 rounded-md border border-yellow-500/30 font-semibold">
                🏆 FINAL {config.finalFormat === 'home_away' ? '(Ida e Volta)' : '(Jogo Único)'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
