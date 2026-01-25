import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Trophy, Users, Swords, AlertTriangle } from 'lucide-react';

export interface KnockoutOnlyConfig {
  totalTeams: number;
  knockoutFormat: 'single' | 'home_away';
  finalFormat: 'single' | 'home_away';
  hasThirdPlace: boolean;
  awayGoalsRule: boolean;
}

interface KnockoutOnlyStepProps {
  config: KnockoutOnlyConfig;
  onChange: (config: KnockoutOnlyConfig) => void;
  maxTeams?: number;
  maxMatches?: number;
}

export function KnockoutOnlyStep({ config, onChange, maxTeams, maxMatches }: KnockoutOnlyStepProps) {
  const updateConfig = (partial: Partial<KnockoutOnlyConfig>) => {
    onChange({ ...config, ...partial });
  };

  // Valid team counts for knockout (powers of 2)
  const validTeamCounts = [4, 8, 16, 32, 64];
  
  // Calculate total matches
  const calculateTotalMatches = () => {
    const knockoutMultiplier = config.knockoutFormat === 'home_away' ? 2 : 1;
    const finalMultiplier = config.finalFormat === 'home_away' ? 2 : 1;
    
    let matches = 0;
    
    // All knockout rounds except final
    if (config.totalTeams >= 64) matches += 32 * knockoutMultiplier; // Round of 64
    if (config.totalTeams >= 32) matches += 16 * knockoutMultiplier; // Round of 32
    if (config.totalTeams >= 16) matches += 8 * knockoutMultiplier;  // Round of 16
    if (config.totalTeams >= 8) matches += 4 * knockoutMultiplier;   // Quarter finals
    if (config.totalTeams >= 4) matches += 2 * knockoutMultiplier;   // Semi finals
    
    // Final
    matches += finalMultiplier;
    
    // Third place match
    if (config.hasThirdPlace) matches += 1;
    
    return matches;
  };

  const totalCalculatedMatches = calculateTotalMatches();
  const exceedsTeamLimit = maxTeams !== undefined && config.totalTeams > maxTeams;
  const exceedsMatchLimit = maxMatches !== undefined && totalCalculatedMatches > maxMatches;

  // Get round names for summary
  const getRoundNames = () => {
    const rounds: string[] = [];
    if (config.totalTeams >= 64) rounds.push('32 avos');
    if (config.totalTeams >= 32) rounds.push('16 avos');
    if (config.totalTeams >= 16) rounds.push('Oitavas');
    if (config.totalTeams >= 8) rounds.push('Quartas');
    if (config.totalTeams >= 4) rounds.push('Semi');
    if (config.hasThirdPlace) rounds.push('3º Lugar');
    rounds.push('Final');
    return rounds;
  };

  return (
    <div className="space-y-4">
      {/* Teams Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Equipes Participantes
          </CardTitle>
          <CardDescription>Defina o número de equipes no mata-mata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Número de Equipes</Label>
            <div className="grid grid-cols-5 gap-2">
              {validTeamCounts.map((count) => {
                const isDisabled = maxTeams !== undefined && count > maxTeams;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => !isDisabled && updateConfig({ totalTeams: count })}
                    disabled={isDisabled}
                    className={`
                      py-2 px-3 rounded-lg border text-sm font-medium transition-all
                      ${config.totalTeams === count 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : isDisabled
                          ? 'border-muted bg-muted/50 text-muted-foreground cursor-not-allowed'
                          : 'border-border hover:border-primary/50 hover:bg-accent'
                      }
                    `}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
            {exceedsTeamLimit && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Máximo de {maxTeams} equipes permitido
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Knockout Format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Swords className="h-4 w-4 text-primary" />
            Formato do Mata-Mata
          </CardTitle>
          <CardDescription>Configure como serão disputadas as fases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Formato das Fases</Label>
            <RadioGroup 
              value={config.knockoutFormat} 
              onValueChange={(v) => updateConfig({ knockoutFormat: v as 'single' | 'home_away' })}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem value="single" id="knockout-single" className="peer sr-only" />
                <Label
                  htmlFor="knockout-single"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  <span className="font-medium text-sm">Jogo Único</span>
                  <span className="text-xs text-muted-foreground">Eliminatória direta</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="home_away" id="knockout-home-away" className="peer sr-only" />
                <Label
                  htmlFor="knockout-home-away"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                >
                  <span className="font-medium text-sm">Ida e Volta</span>
                  <span className="text-xs text-muted-foreground">Dois jogos por fase</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {config.knockoutFormat === 'home_away' && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium text-sm">Gol Fora de Casa</Label>
                <p className="text-xs text-muted-foreground">Gols fora valem mais em empate</p>
              </div>
              <Switch
                checked={config.awayGoalsRule}
                onCheckedChange={(checked) => updateConfig({ awayGoalsRule: checked })}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="font-medium text-sm">Disputa de 3º Lugar</Label>
              <p className="text-xs text-muted-foreground">Jogo entre perdedores das semifinais</p>
            </div>
            <Switch
              checked={config.hasThirdPlace}
              onCheckedChange={(checked) => updateConfig({ hasThirdPlace: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Final Format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Formato da Final
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={config.finalFormat} 
            onValueChange={(v) => updateConfig({ finalFormat: v as 'single' | 'home_away' })}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem value="single" id="final-single" className="peer sr-only" />
              <Label
                htmlFor="final-single"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <span className="font-medium text-sm">Final Única</span>
                <span className="text-xs text-muted-foreground">Um jogo decisivo</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="home_away" id="final-home-away" className="peer sr-only" />
              <Label
                htmlFor="final-home-away"
                className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
              >
                <span className="font-medium text-sm">Ida e Volta</span>
                <span className="text-xs text-muted-foreground">Dois jogos na final</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className={exceedsMatchLimit ? 'border-destructive/50' : 'border-primary/20'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resumo do Mata-Mata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Equipes</p>
              <p className={`font-bold text-lg ${exceedsTeamLimit ? 'text-destructive' : 'text-foreground'}`}>
                {config.totalTeams}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Total de Partidas</p>
              <p className={`font-bold text-lg ${exceedsMatchLimit ? 'text-destructive' : 'text-foreground'}`}>
                {totalCalculatedMatches}
                {exceedsMatchLimit && (
                  <span className="text-xs text-destructive ml-1">(máx: {maxMatches})</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Fases do Mata-Mata:</p>
            <div className="flex flex-wrap gap-1">
              {getRoundNames().map((round, i) => (
                <span 
                  key={i} 
                  className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium"
                >
                  {round}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
