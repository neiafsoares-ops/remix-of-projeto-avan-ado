import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Loader2, 
  Trash2,
  Users,
  Calendar,
  Target
} from 'lucide-react';

interface PoolStats {
  matchCount: number;
  predictionCount: number;
  participantCount: number;
  roundCount: number;
}

interface DeletePoolDialogProps {
  pool: {
    id: string;
    name: string;
    created_by: string | null;
    creator_public_id?: string;
  };
  currentUserId: string;
  currentUserEmail: string;
  onSuccess: () => void;
  children: React.ReactNode;
}

export function DeletePoolDialog({
  pool,
  currentUserId,
  currentUserEmail,
  onSuccess,
  children,
}: DeletePoolDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<PoolStats | null>(null);

  const isOwnPool = pool.created_by === currentUserId;
  const requiresPassword = !isOwnPool;

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmed(false);
      fetchPoolStats();
    }
  }, [open]);

  const fetchPoolStats = async () => {
    setLoadingStats(true);
    try {
      // Buscar rounds
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('pool_id', pool.id);

      // Buscar matches
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('pool_id', pool.id);

      // Buscar participants
      const { data: participants } = await supabase
        .from('pool_participants')
        .select('id')
        .eq('pool_id', pool.id);

      // Buscar predictions
      const matchIds = matches?.map(m => m.id) || [];
      let predictionCount = 0;
      if (matchIds.length > 0) {
        const { count } = await supabase
          .from('predictions')
          .select('*', { count: 'exact', head: true })
          .in('match_id', matchIds);
        predictionCount = count || 0;
      }

      setStats({
        matchCount: matches?.length || 0,
        predictionCount,
        participantCount: participants?.length || 0,
        roundCount: rounds?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching pool stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmed) {
      toast({
        title: 'Confirmação necessária',
        description: 'Marque a caixa de confirmação para continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresPassword && !password) {
      toast({
        title: 'Senha necessária',
        description: 'Digite sua senha para confirmar a exclusão.',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      // Se é bolão de outro usuário, verificar senha
      if (requiresPassword) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: currentUserEmail,
          password: password,
        });

        if (authError) {
          throw new Error('Senha incorreta. Tente novamente.');
        }
      }

      // 1. Buscar IDs necessários para exclusão em cascata
      const { data: rounds } = await supabase
        .from('rounds')
        .select('id')
        .eq('pool_id', pool.id);

      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .eq('pool_id', pool.id);

      const roundIds = rounds?.map(r => r.id) || [];
      const matchIds = matches?.map(m => m.id) || [];

      // 2. Excluir predictions (via match_id)
      if (matchIds.length > 0) {
        const { error } = await supabase
          .from('predictions')
          .delete()
          .in('match_id', matchIds);
        if (error) throw error;
      }

      // 3. Excluir round_limit_requests (via round_id)
      if (roundIds.length > 0) {
        const { error } = await supabase
          .from('round_limit_requests')
          .delete()
          .in('round_id', roundIds);
        if (error) throw error;
      }

      // 4. Excluir matches
      const { error: matchError } = await supabase
        .from('matches')
        .delete()
        .eq('pool_id', pool.id);
      if (matchError) throw matchError;

      // 5. Excluir rounds
      const { error: roundError } = await supabase
        .from('rounds')
        .delete()
        .eq('pool_id', pool.id);
      if (roundError) throw roundError;

      // 6. Excluir pool_invitations
      const { error: invError } = await supabase
        .from('pool_invitations')
        .delete()
        .eq('pool_id', pool.id);
      if (invError) throw invError;

      // 7. Excluir pool_participants
      const { error: partError } = await supabase
        .from('pool_participants')
        .delete()
        .eq('pool_id', pool.id);
      if (partError) throw partError;

      // 8. Excluir mestre_pool_instances
      const { error: mestreError } = await supabase
        .from('mestre_pool_instances')
        .delete()
        .eq('pool_id', pool.id);
      if (mestreError) throw mestreError;

      // 9. Finalmente excluir o pool
      const { error: poolError } = await supabase
        .from('pools')
        .delete()
        .eq('id', pool.id);
      if (poolError) throw poolError;

      toast({
        title: 'Bolão excluído!',
        description: 'O bolão e todos os dados relacionados foram removidos.',
      });

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o bolão.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {requiresPassword ? 'Excluir Bolão de Outro Usuário' : 'Excluir Bolão'}
          </DialogTitle>
          <DialogDescription>
            Você está prestes a excluir o bolão <strong>"{pool.name}"</strong>
            {requiresPassword && pool.creator_public_id && (
              <> criado por <strong>@{pool.creator_public_id}</strong></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alert de aviso */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação é <strong>IRREVERSÍVEL</strong> e removerá permanentemente todos os dados do bolão.
            </AlertDescription>
          </Alert>

          {/* Estatísticas do que será excluído */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground mb-3">Dados que serão excluídos:</p>
            {loadingStats ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{stats.roundCount} rodadas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{stats.matchCount} jogos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span>{stats.predictionCount} palpites</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{stats.participantCount} participantes</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Campo de senha (apenas para bolões de outros) */}
          {requiresPassword && (
            <div className="space-y-2">
              <Label htmlFor="admin-password">
                Para confirmar, digite sua senha de administrador:
              </Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={deleting}
              />
            </div>
          )}

          {/* Checkbox de confirmação */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              disabled={deleting}
            />
            <Label 
              htmlFor="confirm-delete" 
              className="text-sm leading-tight cursor-pointer"
            >
              Confirmo que desejo excluir este bolão e entendo que esta ação não pode ser desfeita.
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || !confirmed || (requiresPassword && !password)}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Bolão
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
