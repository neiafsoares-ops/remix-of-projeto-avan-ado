import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Crown, Users, Settings, Loader2, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrize } from '@/lib/torcida-mestre-utils';
import { formatDateBR } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import type { TorcidaMestrePool } from '@/types/torcida-mestre';

interface PoolWithStats extends TorcidaMestrePool {
  rounds_count: number;
  active_participants: number;
  pending_participants: number;
}

export function TorcidaMestreAdminTab() {
  const [pools, setPools] = useState<PoolWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const fetchPools = async () => {
    setIsLoading(true);
    try {
      const { data: poolsData } = await supabase
        .from('torcida_mestre_pools')
        .select('*')
        .order('created_at', { ascending: false });

      if (!poolsData) {
        setPools([]);
        return;
      }

      // Fetch rounds count
      const { data: roundsCounts } = await supabase
        .from('torcida_mestre_rounds')
        .select('pool_id');

      const roundsMap = new Map<string, number>();
      (roundsCounts || []).forEach(r => {
        roundsMap.set(r.pool_id, (roundsMap.get(r.pool_id) || 0) + 1);
      });

      // Fetch participants count
      const { data: participantsData } = await supabase
        .from('torcida_mestre_participants')
        .select('pool_id, status');

      const activeMap = new Map<string, number>();
      const pendingMap = new Map<string, number>();
      (participantsData || []).forEach(p => {
        if (p.status === 'active') {
          activeMap.set(p.pool_id, (activeMap.get(p.pool_id) || 0) + 1);
        } else if (p.status === 'pending') {
          pendingMap.set(p.pool_id, (pendingMap.get(p.pool_id) || 0) + 1);
        }
      });

      const poolsWithStats: PoolWithStats[] = poolsData.map(pool => ({
        ...pool,
        rounds_count: roundsMap.get(pool.id) || 0,
        active_participants: activeMap.get(pool.id) || 0,
        pending_participants: pendingMap.get(pool.id) || 0,
      }));

      setPools(poolsWithStats);
    } catch (error) {
      console.error('Error fetching pools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePool = async (poolId: string) => {
    try {
      setDeletingId(poolId);
      
      // Get round IDs for this pool first
      const { data: roundsToDelete } = await supabase
        .from('torcida_mestre_rounds')
        .select('id')
        .eq('pool_id', poolId);
      
      const roundIds = roundsToDelete?.map(r => r.id) || [];
      
      // Delete predictions for these rounds
      if (roundIds.length > 0) {
        await supabase.from('torcida_mestre_predictions')
          .delete()
          .in('round_id', roundIds);
      }
        
      await supabase.from('torcida_mestre_participants')
        .delete()
        .eq('pool_id', poolId);
        
      await supabase.from('torcida_mestre_rounds')
        .delete()
        .eq('pool_id', poolId);
        
      const { error } = await supabase.from('torcida_mestre_pools')
        .delete()
        .eq('id', poolId);

      if (error) throw error;

      toast({
        title: 'Bolão excluído',
        description: 'O bolão Time Mestre foi excluído com sucesso.',
      });

      setPools(prev => prev.filter(p => p.id !== poolId));
    } catch (error: any) {
      console.error('Error deleting pool:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o bolão.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Gestão Time Mestre
        </CardTitle>
        <CardDescription>
          Gerencie os bolões do Time Mestre, aprove participantes e acompanhe as rodadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pools.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum bolão Time Mestre criado</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bolão</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Rodadas</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((pool) => (
                  <TableRow key={pool.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pool.club_image ? (
                          <img 
                            src={pool.club_image} 
                            alt={pool.club_name}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-amber-500/20 flex items-center justify-center">
                            <Crown className="h-4 w-4 text-amber-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{pool.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Criado em {formatDateBR(pool.created_at)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{pool.club_name}</TableCell>
                    <TableCell>{pool.rounds_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{pool.active_participants}</span>
                        {pool.pending_participants > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            +{pool.pending_participants} pendente(s)
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatPrize(pool.entry_fee)}</TableCell>
                    <TableCell>
                      <Badge variant={pool.is_active ? 'default' : 'secondary'}>
                        {pool.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/torcida-mestre/${pool.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/torcida-mestre/${pool.id}/manage`}>
                            <Settings className="h-4 w-4 mr-1" />
                            Gerenciar
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir bolão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente o bolão "{pool.name}", 
                                incluindo todas as rodadas, participantes e palpites.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePool(pool.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                disabled={deletingId === pool.id}
                              >
                                {deletingId === pool.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Excluir'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
