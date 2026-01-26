import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Loader2
} from 'lucide-react';
import { ClubAutocomplete } from '@/components/ClubAutocomplete';

interface PendingChange {
  id: string;
  type: 'team_substitution' | 'round_rename' | 'team_image';
  targetTable: 'matches' | 'rounds';
  targetId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  description: string;
}

interface Round {
  id: string;
  name: string;
  round_number: number;
  is_finalized: boolean;
  matches_count: number;
  finished_count: number;
}

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_team_image: string | null;
  away_team_image: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  round_id: string;
}

interface AuditKnockoutEditorProps {
  poolId: string;
  rounds: Round[];
  pendingChanges: PendingChange[];
  onAddChange: (change: Omit<PendingChange, 'id'>) => void;
  onRemoveChange: (changeId: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function AuditKnockoutEditor({
  poolId,
  rounds,
  pendingChanges,
  onAddChange,
  onRemoveChange,
  onBack,
  onConfirm,
}: AuditKnockoutEditorProps) {
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [substituteDialogOpen, setSubstituteDialogOpen] = useState(false);
  const [substituteTarget, setSubstituteTarget] = useState<{
    matchId: string;
    field: 'home_team' | 'away_team';
    currentValue: string;
    roundName: string;
  } | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamImage, setNewTeamImage] = useState('');

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  useEffect(() => {
    if (selectedRoundId) {
      fetchMatches();
    }
  }, [selectedRoundId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('round_id', selectedRoundId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameRound = () => {
    if (!selectedRound || !newRoundName.trim()) return;

    onAddChange({
      type: 'round_rename',
      targetTable: 'rounds',
      targetId: selectedRound.id,
      field: 'name',
      oldValue: selectedRound.name,
      newValue: newRoundName.trim(),
      description: `Rodada "${selectedRound.name}" → "${newRoundName.trim()}"`,
    });

    setRenameDialogOpen(false);
    setNewRoundName('');
  };

  const openSubstituteDialog = (
    matchId: string, 
    field: 'home_team' | 'away_team', 
    currentValue: string
  ) => {
    setSubstituteTarget({
      matchId,
      field,
      currentValue,
      roundName: selectedRound?.name || '',
    });
    setNewTeamName(currentValue);
    setNewTeamImage('');
    setSubstituteDialogOpen(true);
  };

  const handleSubstituteTeam = () => {
    if (!substituteTarget || !newTeamName.trim()) return;

    const match = matches.find(m => m.id === substituteTarget.matchId);
    if (!match) return;

    const fieldLabel = substituteTarget.field === 'home_team' ? 'casa' : 'fora';

    // Add team name change
    onAddChange({
      type: 'team_substitution',
      targetTable: 'matches',
      targetId: substituteTarget.matchId,
      field: substituteTarget.field,
      oldValue: substituteTarget.currentValue,
      newValue: newTeamName.trim(),
      description: `[${substituteTarget.roundName}] Time ${fieldLabel}: "${substituteTarget.currentValue}" → "${newTeamName.trim()}"`,
    });

    // Add team image change if provided
    if (newTeamImage) {
      const imageField = substituteTarget.field === 'home_team' ? 'home_team_image' : 'away_team_image';
      onAddChange({
        type: 'team_image',
        targetTable: 'matches',
        targetId: substituteTarget.matchId,
        field: imageField,
        oldValue: match[imageField],
        newValue: newTeamImage,
        description: `[${substituteTarget.roundName}] Imagem do time ${fieldLabel} atualizada`,
      });
    }

    setSubstituteDialogOpen(false);
    setSubstituteTarget(null);
    setNewTeamName('');
    setNewTeamImage('');
  };

  // Get pending change for a specific field
  const getPendingChange = (matchId: string, field: string) => {
    return pendingChanges.find(
      c => c.targetId === matchId && c.field === field
    );
  };

  // Get short round name for tabs
  const getShortRoundName = (name: string) => {
    if (name.includes('Final') && !name.includes('Semifinal') && !name.includes('Quartas') && !name.includes('Oitavas') && !name.includes('16 avos') && !name.includes('3º')) {
      return '🏆 Final';
    }
    if (name.includes('3º Lugar')) return '3º';
    if (name.includes('Semifinal')) return 'Semi';
    if (name.includes('Quartas')) return 'Quartas';
    if (name.includes('Oitavas')) return 'Oitavas';
    if (name.includes('16 avos')) return '16 avos';
    return name;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        {pendingChanges.length > 0 && (
          <Button size="sm" onClick={onConfirm}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmar ({pendingChanges.length})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Mata-Mata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Round Navigation */}
          <div className="flex flex-wrap gap-2">
            {rounds.map((round) => (
              <Button
                key={round.id}
                variant={selectedRoundId === round.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRoundId(round.id)}
              >
                {getShortRoundName(round.name)}
              </Button>
            ))}
          </div>

          {/* Selected Round */}
          {selectedRound && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">🏆 {selectedRound.name}</h3>
                  {selectedRound.finished_count > 0 && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {selectedRound.finished_count} jogo(s) com resultado
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setNewRoundName(selectedRound.name);
                    setRenameDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </Button>
              </div>

              {/* Matches */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum jogo encontrado nesta rodada.
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match, index) => {
                    const homeChange = getPendingChange(match.id, 'home_team');
                    const awayChange = getPendingChange(match.id, 'away_team');

                    return (
                      <div 
                        key={match.id} 
                        className={`border rounded-lg p-4 ${match.is_finished ? 'bg-muted/30' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">Confronto {index + 1}</span>
                          {match.is_finished ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Finalizado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Home Team */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {match.home_team_image && (
                                <img 
                                  src={match.home_team_image} 
                                  alt="" 
                                  className="h-8 w-8 object-contain"
                                />
                              )}
                              <span className={homeChange ? 'line-through text-muted-foreground' : 'font-medium'}>
                                {match.home_team}
                              </span>
                              {homeChange && (
                                <span className="text-green-600 font-medium">
                                  → {homeChange.newValue}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => openSubstituteDialog(match.id, 'home_team', match.home_team)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Substituir
                            </Button>
                          </div>

                          {/* Score */}
                          <div className="text-center px-6">
                            {match.is_finished ? (
                              <div className="font-bold text-xl">
                                {match.home_score} x {match.away_score}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-lg">vs</span>
                            )}
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {awayChange && (
                                <span className="text-green-600 font-medium">
                                  {awayChange.newValue} ←
                                </span>
                              )}
                              <span className={awayChange ? 'line-through text-muted-foreground' : 'font-medium'}>
                                {match.away_team}
                              </span>
                              {match.away_team_image && (
                                <img 
                                  src={match.away_team_image} 
                                  alt="" 
                                  className="h-8 w-8 object-contain"
                                />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => openSubstituteDialog(match.id, 'away_team', match.away_team)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Substituir
                            </Button>
                          </div>
                        </div>

                        {match.is_finished && (
                          <div className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Placar já lançado - será preservado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename Round Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Rodada</DialogTitle>
            <DialogDescription>
              Altere o nome da rodada. Isso não afeta os jogos ou pontuações.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo nome</Label>
              <Input
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="Ex: Quartas de Final"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameRound} disabled={!newRoundName.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Substitute Team Dialog */}
      <Dialog open={substituteDialogOpen} onOpenChange={setSubstituteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir Time</DialogTitle>
            <DialogDescription>
              Selecione o novo time para substituir "{substituteTarget?.currentValue}".
              O placar existente (se houver) será preservado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Novo time</Label>
              <ClubAutocomplete
                value={newTeamName}
                onSelect={(club) => {
                  setNewTeamName(club.name);
                  if (club.logo_url) {
                    setNewTeamImage(club.logo_url);
                  }
                }}
                onCreate={(name) => {
                  setNewTeamName(name);
                  setNewTeamImage('');
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubstituteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubstituteTeam} disabled={!newTeamName.trim()}>
              Confirmar Substituição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
