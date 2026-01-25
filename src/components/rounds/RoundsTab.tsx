import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Loader2, 
  Layers, 
  Target,
  Pencil,
  Trash2,
  AlertCircle,
  ClipboardEdit,
} from 'lucide-react';
import { Round, useRounds } from '@/hooks/use-rounds';

interface RoundsTabProps {
  poolId: string;
  onEditRound?: (round: Round) => void;
  canManagePool?: boolean;
  onLaunchScores?: (round: Round) => void;
}

export function RoundsTab({ poolId, onEditRound, canManagePool, onLaunchScores }: RoundsTabProps) {
  const { 
    rounds, 
    loading, 
    createRound, 
    deleteRound, 
    updateRound,
    globalRoundCount,
    maxRoundsReached 
  } = useRounds(poolId);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nextRoundNumber = rounds.length > 0 
    ? Math.max(...rounds.map(r => r.round_number)) + 1 
    : 1;

  const handleCreate = async () => {
    setCreating(true);
    const success = await createRound(
      nextRoundNumber,
      newRoundName || `Rodada ${nextRoundNumber}`
    );
    if (success) {
      setCreateDialogOpen(false);
      setNewRoundName('');
    }
    setCreating(false);
  };

  const handleEdit = async () => {
    if (!editingRound) return;
    setSaving(true);
    const success = await updateRound(editingRound.id, { name: editName });
    if (success) {
      setEditDialogOpen(false);
      setEditingRound(null);
    }
    setSaving(false);
  };

  const handleDelete = async (roundId: string) => {
    setDeletingId(roundId);
    await deleteRound(roundId);
    setDeletingId(null);
  };

  const openEditDialog = (round: Round) => {
    setEditingRound(round);
    setEditName(round.name || `Rodada ${round.round_number}`);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {maxRoundsReached && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-700 dark:text-amber-500">
              Limite de rodadas atingido
            </span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Você atingiu o limite de 20 rodadas do plano Mestre do Bolão. 
            Distribua seus jogos nas rodadas existentes ou entre em contato 
            para saber mais sobre expansões de limite.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Rodadas do Bolão</h2>
          <p className="text-sm text-muted-foreground">
            {globalRoundCount}/20 rodadas totais • {rounds.length} neste bolão
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" disabled={maxRoundsReached}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Rodada
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Rodada</DialogTitle>
              <DialogDescription>
                Crie uma nova rodada para organizar os jogos do bolão.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <span className="font-medium">Rodada {nextRoundNumber}</span>
              </div>

              <div className="space-y-2">
                <Label>Nome da Rodada (opcional)</Label>
                <Input
                  placeholder={`Rodada ${nextRoundNumber}`}
                  value={newRoundName}
                  onChange={(e) => setNewRoundName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ex: "Fase de Grupos", "Oitavas de Final", etc.
                </p>
              </div>

              {maxRoundsReached && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Limite máximo de 20 rodadas atingido</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="hero" 
                onClick={handleCreate} 
                disabled={creating || maxRoundsReached}
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Rodada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rounds.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma rodada criada</h3>
            <p className="text-muted-foreground mb-4">
              Crie rodadas para organizar os jogos do seu bolão.
            </p>
            <Button variant="hero" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Rodada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rounds.map((round) => {
            const maxMatches = round.match_limit + (round.extra_matches_allowed || 0);
            const matchCount = round.match_count || 0;
            const isAtLimit = matchCount >= maxMatches;

            return (
              <Card key={round.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">
                        {round.name || `Rodada ${round.round_number}`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Rodada {round.round_number}
                      </p>
                    </div>
                    {round.is_limit_approved && (
                      <Badge variant="secondary" className="text-xs">
                        Limite expandido
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${isAtLimit ? 'text-amber-600' : ''}`}>
                      {matchCount}/{maxMatches} jogos
                    </span>
                    {isAtLimit && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        Limite
                      </Badge>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-muted mb-4">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isAtLimit ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min((matchCount / maxMatches) * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onEditRound?.(round)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Adicionar Jogos
                    </Button>

                    {canManagePool && matchCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 border-green-300"
                        onClick={() => onLaunchScores?.(round)}
                      >
                        <ClipboardEdit className="h-4 w-4 mr-1" />
                        <span className="hidden xs:inline">Placares</span>
                      </Button>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingId === round.id}
                        >
                          {deletingId === round.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Rodada?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A rodada "{round.name || `Rodada ${round.round_number}`}" será excluída. 
                            Os jogos não serão removidos, apenas desvinculados da rodada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(round.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rodada</DialogTitle>
            <DialogDescription>
              Atualize o nome da rodada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Rodada</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="hero" onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
