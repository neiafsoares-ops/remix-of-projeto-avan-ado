import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shuffle, 
  Shield, 
  AlertTriangle, 
  Check,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface TeamFromGroup {
  teamName: string;
  teamImage: string | null;
  groupLetter: string;
  position: number; // 1 = 1st place, 2 = 2nd place, etc.
}

interface DrawMatchup {
  home: TeamFromGroup;
  away: TeamFromGroup;
}

interface DrawRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface AutomaticDrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qualifiedTeams: TeamFromGroup[];
  knockoutRoundName: string;
  onApplyDraw: (matchups: DrawMatchup[]) => void;
  isApplying?: boolean;
}

// Regras padrão de sorteio
const DEFAULT_RULES: DrawRule[] = [
  {
    id: 'cross_groups',
    label: '1º vs 2º de outro grupo',
    description: 'O 1º colocado de cada grupo enfrenta o 2º de outro grupo',
    enabled: true,
  },
  {
    id: 'avoid_same_group',
    label: 'Evitar mesmo grupo',
    description: 'Times do mesmo grupo não se enfrentam nas primeiras fases',
    enabled: true,
  },
  {
    id: 'balance_matchups',
    label: 'Equilibrar confrontos',
    description: 'Distribuir os cabeças de chave uniformemente no chaveamento',
    enabled: true,
  },
];

// Shuffle array usando Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Gerar confrontos com base nas regras
function generateMatchups(
  teams: TeamFromGroup[],
  rules: DrawRule[]
): DrawMatchup[] {
  const crossGroups = rules.find(r => r.id === 'cross_groups')?.enabled ?? true;
  const avoidSameGroup = rules.find(r => r.id === 'avoid_same_group')?.enabled ?? true;
  const balanceMatchups = rules.find(r => r.id === 'balance_matchups')?.enabled ?? true;

  // Agrupar por grupo e posição
  const firstPlaceTeams = teams.filter(t => t.position === 1);
  const secondPlaceTeams = teams.filter(t => t.position === 2);
  const otherTeams = teams.filter(t => t.position > 2);

  // Se não tiver estrutura de grupos clara, fazer sorteio aleatório
  if (firstPlaceTeams.length === 0 && secondPlaceTeams.length === 0) {
    const shuffledTeams = shuffleArray(teams);
    const matchups: DrawMatchup[] = [];
    for (let i = 0; i < shuffledTeams.length; i += 2) {
      if (shuffledTeams[i + 1]) {
        matchups.push({
          home: shuffledTeams[i],
          away: shuffledTeams[i + 1],
        });
      }
    }
    return matchups;
  }

  const matchups: DrawMatchup[] = [];
  const usedTeams = new Set<string>();

  // Gerar chave única para time
  const teamKey = (t: TeamFromGroup) => `${t.groupLetter}-${t.position}-${t.teamName}`;

  // Algoritmo de cruzamento: 1ºA vs 2ºB, 1ºB vs 2ºA, etc.
  if (crossGroups && firstPlaceTeams.length > 0 && secondPlaceTeams.length > 0) {
    // Ordenar grupos
    const groups = [...new Set(teams.map(t => t.groupLetter))].sort();
    
    // Criar pares de grupos (A-B, C-D, etc.) ou cruzar todos
    const shuffledFirst = balanceMatchups ? shuffleArray([...firstPlaceTeams]) : [...firstPlaceTeams];
    const shuffledSecond = balanceMatchups ? shuffleArray([...secondPlaceTeams]) : [...secondPlaceTeams];

    for (const firstTeam of shuffledFirst) {
      // Encontrar um 2º colocado de outro grupo
      let opponent: TeamFromGroup | undefined;

      if (avoidSameGroup) {
        // Preferir 2º de outro grupo
        opponent = shuffledSecond.find(
          s => s.groupLetter !== firstTeam.groupLetter && !usedTeams.has(teamKey(s))
        );
      }

      // Se não encontrou ou regra desativada, pegar qualquer um
      if (!opponent) {
        opponent = shuffledSecond.find(s => !usedTeams.has(teamKey(s)));
      }

      if (opponent) {
        matchups.push({
          home: firstTeam,
          away: opponent,
        });
        usedTeams.add(teamKey(firstTeam));
        usedTeams.add(teamKey(opponent));
      }
    }
  }

  // Adicionar times restantes (3º colocados, etc.)
  const remainingTeams = [...firstPlaceTeams, ...secondPlaceTeams, ...otherTeams]
    .filter(t => !usedTeams.has(teamKey(t)));

  const shuffledRemaining = shuffleArray(remainingTeams);
  for (let i = 0; i < shuffledRemaining.length; i += 2) {
    if (shuffledRemaining[i + 1]) {
      let home = shuffledRemaining[i];
      let away = shuffledRemaining[i + 1];

      // Se evitar mesmo grupo, tentar trocar
      if (avoidSameGroup && home.groupLetter === away.groupLetter) {
        // Tentar encontrar outro oponente
        for (let j = i + 2; j < shuffledRemaining.length; j++) {
          if (shuffledRemaining[j].groupLetter !== home.groupLetter) {
            [shuffledRemaining[i + 1], shuffledRemaining[j]] = [shuffledRemaining[j], shuffledRemaining[i + 1]];
            away = shuffledRemaining[i + 1];
            break;
          }
        }
      }

      matchups.push({ home, away });
    }
  }

  return matchups;
}

export function AutomaticDrawDialog({
  open,
  onOpenChange,
  qualifiedTeams,
  knockoutRoundName,
  onApplyDraw,
  isApplying = false,
}: AutomaticDrawDialogProps) {
  const [rules, setRules] = useState<DrawRule[]>(DEFAULT_RULES);
  const [generatedMatchups, setGeneratedMatchups] = useState<DrawMatchup[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  const toggleRule = (ruleId: string) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
    setHasGenerated(false);
    setGeneratedMatchups([]);
  };

  const handleGenerate = () => {
    const matchups = generateMatchups(qualifiedTeams, rules);
    setGeneratedMatchups(matchups);
    setHasGenerated(true);
  };

  const handleRegenerate = () => {
    const matchups = generateMatchups(qualifiedTeams, rules);
    setGeneratedMatchups(matchups);
  };

  const handleApply = () => {
    onApplyDraw(generatedMatchups);
  };

  const renderTeamBadge = (team: TeamFromGroup) => (
    <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded">
      {team.teamImage ? (
        <img src={team.teamImage} alt="" className="w-5 h-5 object-contain" />
      ) : (
        <Shield className="w-4 h-4 text-muted-foreground" />
      )}
      <span className="font-medium text-sm truncate max-w-[100px]">{team.teamName}</span>
      <Badge variant="outline" className="text-[10px] px-1 py-0">
        {team.position}º{team.groupLetter}
      </Badge>
    </div>
  );

  // Detectar se tem estrutura de grupos
  const hasGroupStructure = useMemo(() => {
    return qualifiedTeams.some(t => t.groupLetter && t.position > 0);
  }, [qualifiedTeams]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Sorteio Automático - {knockoutRoundName}
          </DialogTitle>
          <DialogDescription>
            Configure as regras do sorteio e gere os confrontos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Info sobre times classificados */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Times Classificados</p>
                    <p className="text-sm text-muted-foreground">
                      {qualifiedTeams.length} times para {Math.floor(qualifiedTeams.length / 2)} confrontos
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {qualifiedTeams.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Regras configuráveis */}
            {hasGroupStructure && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Regras do Sorteio
                </h4>
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <Label htmlFor={rule.id} className="font-medium cursor-pointer">
                        {rule.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                    <Switch
                      id={rule.id}
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                  </div>
                ))}
              </div>
            )}

            {!hasGroupStructure && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-600">Estrutura de grupos não detectada</p>
                  <p className="text-sm text-muted-foreground">
                    O sorteio será feito de forma aleatória entre os times classificados.
                  </p>
                </div>
              </div>
            )}

            {/* Botão de gerar */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={hasGenerated ? handleRegenerate : handleGenerate}
                className="gap-2"
              >
                {hasGenerated ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sortear Novamente
                  </>
                ) : (
                  <>
                    <Shuffle className="h-4 w-4" />
                    Realizar Sorteio
                  </>
                )}
              </Button>
            </div>

            {/* Resultado do sorteio */}
            {hasGenerated && generatedMatchups.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Confrontos Sorteados
                </h4>
                <div className="space-y-2">
                  {generatedMatchups.map((matchup, index) => (
                    <Card key={index}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 flex justify-end">
                            {renderTeamBadge(matchup.home)}
                          </div>
                          <span className="text-lg font-bold text-muted-foreground px-2">VS</span>
                          <div className="flex-1">
                            {renderTeamBadge(matchup.away)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {hasGenerated && generatedMatchups.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Não foi possível gerar confrontos com os times disponíveis.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasGenerated || generatedMatchups.length === 0 || isApplying}
            className="gap-2"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Aplicar Confrontos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { TeamFromGroup, DrawMatchup };
