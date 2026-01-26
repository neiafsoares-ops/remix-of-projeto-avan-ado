import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Trophy,
  AlertTriangle,
  Pencil,
  Lock,
  CheckCircle2,
  RotateCcw,
  Loader2,
  ClipboardCheck
} from 'lucide-react';
import { formatDateBR } from '@/lib/date-utils';
import { AuditGroupEditor } from './AuditGroupEditor';
import { AuditKnockoutEditor } from './AuditKnockoutEditor';

interface AuditPoolDetailProps {
  poolId: string;
  onBack: () => void;
}

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

interface Pool {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  creator_public_id?: string;
}

export function AuditPoolDetail({ poolId, onBack }: AuditPoolDetailProps) {
  const { toast } = useToast();
  const [pool, setPool] = useState<Pool | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'groups' | 'knockout'>('overview');
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    fetchPoolDetails();
  }, [poolId]);

  const fetchPoolDetails = async () => {
    setLoading(true);
    try {
      // Fetch pool
      const { data: poolData, error: poolError } = await supabase
        .from('pools')
        .select('*')
        .eq('id', poolId)
        .single();

      if (poolError) throw poolError;

      // Fetch creator profile
      const { data: creator } = await supabase
        .from('profiles')
        .select('public_id')
        .eq('id', poolData.created_by)
        .maybeSingle();

      setPool({
        ...poolData,
        creator_public_id: creator?.public_id || 'Desconhecido'
      });

      // Fetch participant count
      const { count: pCount } = await supabase
        .from('pool_participants')
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', poolId);
      
      setParticipantCount(pCount || 0);

      // Fetch rounds with match counts
      const { data: roundsData } = await supabase
        .from('rounds')
        .select('*')
        .eq('pool_id', poolId)
        .order('round_number', { ascending: true });

      if (roundsData) {
        // Get match counts per round
        const { data: matches } = await supabase
          .from('matches')
          .select('id, round_id, is_finished')
          .eq('pool_id', poolId);

        const roundsWithCounts: Round[] = roundsData.map(r => {
          const roundMatches = matches?.filter(m => m.round_id === r.id) || [];
          return {
            id: r.id,
            name: r.name,
            round_number: r.round_number,
            is_finalized: r.is_finalized ?? false,
            matches_count: roundMatches.length,
            finished_count: roundMatches.filter(m => m.is_finished).length,
          };
        });

        setRounds(roundsWithCounts);
        setTotalMatches(matches?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching pool details:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do bolão.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addPendingChange = (change: Omit<PendingChange, 'id'>) => {
    const newChange: PendingChange = {
      ...change,
      id: crypto.randomUUID(),
    };
    setPendingChanges(prev => [...prev, newChange]);
  };

  const removePendingChange = (changeId: string) => {
    setPendingChanges(prev => prev.filter(c => c.id !== changeId));
  };

  const clearPendingChanges = () => {
    setPendingChanges([]);
  };

  const applyChanges = async () => {
    if (pendingChanges.length === 0) return;

    setSaving(true);
    try {
      for (const change of pendingChanges) {
        // Apply the change
        const { error } = await supabase
          .from(change.targetTable)
          .update({ [change.field]: change.newValue })
          .eq('id', change.targetId);

        if (error) throw error;

        // Log the change
        await supabase.rpc('insert_audit_log', {
          p_action: 'AUDIT_POOL_STRUCTURE',
          p_table_name: change.targetTable,
          p_record_id: change.targetId,
          p_old_data: { [change.field]: change.oldValue },
          p_new_data: { [change.field]: change.newValue },
        });
      }

      toast({
        title: 'Alterações aplicadas!',
        description: `${pendingChanges.length} alteração(ões) aplicada(s) com sucesso.`,
      });

      clearPendingChanges();
      setConfirmDialogOpen(false);
      fetchPoolDetails();
    } catch (error: any) {
      console.error('Error applying changes:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível aplicar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Detect if pool has group rounds
  const hasGroups = rounds.some(r => r.name.toLowerCase().startsWith('grupo'));
  const hasKnockout = rounds.some(r => 
    r.name.toLowerCase().includes('final') || 
    r.name.toLowerCase().includes('oitavas') ||
    r.name.toLowerCase().includes('quartas') ||
    r.name.toLowerCase().includes('semi')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Bolão não encontrado.</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  if (activeView === 'groups') {
    return (
      <AuditGroupEditor
        poolId={poolId}
        rounds={rounds.filter(r => r.name.toLowerCase().startsWith('grupo'))}
        pendingChanges={pendingChanges}
        onAddChange={addPendingChange}
        onRemoveChange={removePendingChange}
        onBack={() => setActiveView('overview')}
        onConfirm={() => setConfirmDialogOpen(true)}
      />
    );
  }

  if (activeView === 'knockout') {
    return (
      <AuditKnockoutEditor
        poolId={poolId}
        rounds={rounds.filter(r => !r.name.toLowerCase().startsWith('grupo'))}
        pendingChanges={pendingChanges}
        onAddChange={addPendingChange}
        onRemoveChange={removePendingChange}
        onBack={() => setActiveView('overview')}
        onConfirm={() => setConfirmDialogOpen(true)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Pool Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Auditoria: {pool.name}
          </CardTitle>
          <CardDescription>
            Criado por @{pool.creator_public_id} em {formatDateBR(pool.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{participantCount}</p>
              <p className="text-xs text-muted-foreground">Participantes</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{rounds.length}</p>
              <p className="text-xs text-muted-foreground">Rodadas</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Trophy className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalMatches}</p>
              <p className="text-xs text-muted-foreground">Jogos</p>
            </div>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Alterações estruturais não afetam pontuações já calculadas. 
              Resultados lançados não podem ser modificados.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {hasGroups && (
              <Button variant="outline" onClick={() => setActiveView('groups')}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Grupos
              </Button>
            )}
            {hasKnockout && (
              <Button variant="outline" onClick={() => setActiveView('knockout')}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Mata-Mata
              </Button>
            )}
            {!hasGroups && !hasKnockout && (
              <Button variant="outline" onClick={() => setActiveView('knockout')}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar Rodadas
              </Button>
            )}
          </div>

          {/* Rounds List */}
          <div className="space-y-2">
            <h3 className="font-semibold">Rodadas do Bolão</h3>
            <div className="border rounded-lg divide-y">
              {rounds.map((round) => (
                <div key={round.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{round.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {round.matches_count} jogos
                    </span>
                    {round.finished_count > 0 && (
                      <span className="text-sm text-green-600">
                        {round.finished_count} finalizados
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {round.is_finalized ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Bloqueada
                      </Badge>
                    ) : round.finished_count > 0 ? (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Tem resultados
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                        <Pencil className="h-3 w-3" />
                        Editável
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Changes */}
          {pendingChanges.length > 0 && (
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    📝 Alterações Pendentes ({pendingChanges.length})
                  </span>
                  <Button size="sm" onClick={() => setConfirmDialogOpen(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Todas
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingChanges.map((change) => (
                  <div key={change.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <span>{change.description}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removePendingChange(change.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar Alterações de Auditoria
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Você está prestes a aplicar {pendingChanges.length} alteração(ões) estrutural(is):</p>
                
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {pendingChanges.map((change, index) => (
                    <div key={change.id} className="text-sm p-2 bg-muted rounded">
                      {index + 1}. {change.description}
                    </div>
                  ))}
                </div>

                <div className="text-sm space-y-1 text-amber-600">
                  <p>⚠️ Importante:</p>
                  <ul className="list-disc list-inside">
                    <li>Placares já lançados serão preservados</li>
                    <li>Pontuações dos participantes não serão afetadas</li>
                    <li>Rankings existentes permanecerão inalterados</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={applyChanges} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar Alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
