import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  Users, 
  Trophy,
  FileText,
  Loader2,
  Search,
  UserPlus,
  UserMinus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Crown,
  Bell,
  ClipboardCheck,
  Target
} from 'lucide-react';
import { LimitRequestsPanel } from '@/components/rounds/LimitRequestsPanel';
import { SuggestedPoolsTab } from '@/components/admin/SuggestedPoolsTab';
import { AssignMestrePlanDialog } from '@/components/admin/AssignMestrePlanDialog';
import { CreateNotificationForm } from '@/components/admin/CreateNotificationForm';
import { AuditPoolsTab } from '@/components/admin/AuditPoolsTab';
import { QuizAdminTab } from '@/components/admin/QuizAdminTab';
import { TorcidaMestreAdminTab } from '@/components/admin/TorcidaMestreAdminTab';
import { DeletePoolDialog } from '@/components/admin/DeletePoolDialog';
import { formatDateTimeBR, formatDateBR } from '@/lib/date-utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  id: string;
  public_id: string;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
}

interface PoolWithDetails {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
  creator_public_id?: string;
  participant_count: number;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  performed_by: string | null;
  performed_at: string;
  performer_public_id?: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [pools, setPools] = useState<PoolWithDetails[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      checkAdminAccess();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAccess = async () => {
    if (!user) return;

    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasAdminRole = roles?.some(r => r.role === 'admin');
      setIsAdmin(hasAdminRole || false);

      if (hasAdminRole) {
        await Promise.all([fetchUsers(), fetchPools(), fetchAuditLogs()]);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Buscar todos os perfis
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, public_id, full_name, created_at')
        .order('created_at', { ascending: false });

      if (!profiles) return;

      // Buscar todas as roles
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Mapear usuários com suas roles
      const usersWithRoles: UserWithRoles[] = profiles.map(profile => ({
        ...profile,
        roles: allRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPools = async () => {
    try {
      const { data: poolsData } = await supabase
        .from('pools')
        .select('*, pool_participants(count)')
        .order('created_at', { ascending: false });

      if (!poolsData) return;

      // Buscar nomes dos criadores
      const creatorIds = [...new Set(poolsData.map(p => p.created_by).filter(Boolean))];
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, public_id')
        .in('id', creatorIds);

      const poolsWithDetails: PoolWithDetails[] = poolsData.map(pool => ({
        ...pool,
        creator_public_id: creators?.find(c => c.id === pool.created_by)?.public_id || 'Desconhecido',
        participant_count: pool.pool_participants?.[0]?.count || 0,
      }));

      setPools(poolsWithDetails);
    } catch (error) {
      console.error('Error fetching pools:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);

      if (!logs) return;

      // Buscar nomes dos performers
      const performerIds = [...new Set(logs.map(l => l.performed_by).filter(Boolean))] as string[];
      const { data: performers } = await supabase
        .from('profiles')
        .select('id, public_id')
        .in('id', performerIds);

      const logsWithDetails: AuditLog[] = logs.map(log => ({
        ...log,
        performer_public_id: performers?.find(p => p.id === log.performed_by)?.public_id || 'Sistema',
      }));

      setAuditLogs(logsWithDetails);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const handleAssignRole = async (userId: string, role: AppRole) => {
    setActionLoading(`assign-${userId}-${role}`);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast({
        title: 'Role atribuída!',
        description: `A role ${role} foi atribuída com sucesso.`,
      });

      await Promise.all([fetchUsers(), fetchAuditLogs()]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atribuir a role.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    setActionLoading(`remove-${userId}-${role}`);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({
        title: 'Role removida!',
        description: `A role ${role} foi removida com sucesso.`,
      });

      await Promise.all([fetchUsers(), fetchAuditLogs()]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover a role.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // handleDeletePool agora é tratado pelo DeletePoolDialog

  const handleTogglePoolStatus = async (poolId: string, currentStatus: boolean) => {
    setActionLoading(`toggle-${poolId}`);
    try {
      const { error } = await supabase
        .from('pools')
        .update({ is_active: !currentStatus })
        .eq('id', poolId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `O bolão foi ${!currentStatus ? 'ativado' : 'desativado'}.`,
      });

      await fetchPools();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.public_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'ROLE_ASSIGNED': 'Role Atribuída',
      'ROLE_REMOVED': 'Role Removida',
      'POOL_CREATED': 'Bolão Criado',
      'POOL_DELETED': 'Bolão Excluído',
      'USER_BLOCKED': 'Usuário Bloqueado',
      'MESTRE_BOLAO_ASSIGNED': 'Mestre do Bolão Atribuído',
      'MESTRE_BOLAO_REMOVED': 'Mestre do Bolão Removido',
    };
    return labels[action] || action;
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar esta página.
          </p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
            <Shield className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, bolões e visualize logs</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9 lg:w-auto lg:inline-flex">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="pools" className="gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Bolões</span>
            </TabsTrigger>
            <TabsTrigger value="torcida" className="gap-2">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Torcida</span>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Quiz 10</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Sugestões</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Auditoria</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovações</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestão de Usuários
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie as roles dos usuários da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Membro desde</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">@{u.public_id}</p>
                              {u.full_name && (
                                <p className="text-sm text-muted-foreground">{u.full_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((role) => (
                                <Badge 
                                  key={role}
                                  variant={role === 'admin' ? 'default' : 'secondary'}
                                  className={
                                    role === 'admin' ? 'bg-accent' : 
                                    role === 'mestre_bolao' ? 'bg-amber-500 text-white' : ''
                                  }
                                >
                                  {role === 'admin' ? 'Admin' : 
                                   role === 'moderator' ? 'Mod' : 
                                   role === 'mestre_bolao' ? 'Mestre' : 'Part'}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatDateBR(u.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Assign Mestre Plan */}
                              <AssignMestrePlanDialog
                                userId={u.id}
                                userName={u.public_id}
                                onSuccess={() => Promise.all([fetchUsers(), fetchAuditLogs()])}
                              >
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Crown className="h-4 w-4" />
                                  <span className="hidden md:inline">Mestre</span>
                                </Button>
                              </AssignMestrePlanDialog>

                              {/* Assign Role */}
                              <Select
                                onValueChange={(value: AppRole) => handleAssignRole(u.id, value)}
                                disabled={actionLoading?.startsWith(`assign-${u.id}`)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Atribuir..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {!u.roles.includes('admin') && (
                                    <SelectItem value="admin">Admin</SelectItem>
                                  )}
                                  {!u.roles.includes('moderator') && (
                                    <SelectItem value="moderator">Moderador</SelectItem>
                                  )}
                                  {!u.roles.includes('mestre_bolao') && (
                                    <SelectItem value="mestre_bolao">Mestre do Bolão</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>

                              {/* Remove Role */}
                              {u.roles.length > 1 && (
                                <Select
                                  onValueChange={(value: AppRole) => handleRemoveRole(u.id, value)}
                                  disabled={actionLoading?.startsWith(`remove-${u.id}`)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Remover..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {u.roles.map((role) => (
                                      <SelectItem key={role} value={role}>
                                        {role === 'admin' ? 'Admin' : 
                                         role === 'moderator' ? 'Moderador' : 
                                         role === 'mestre_bolao' ? 'Mestre do Bolão' : role}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pools Tab */}
          <TabsContent value="pools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Gestão de Bolões
                </CardTitle>
                <CardDescription>
                  Visualize, ative/desative ou exclua bolões
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bolão</TableHead>
                        <TableHead>Criador</TableHead>
                        <TableHead>Participantes</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pools.map((pool) => (
                        <TableRow key={pool.id}>
                          <TableCell>
                            <p className="font-medium">{pool.name}</p>
                            {pool.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{pool.description}</p>
                            )}
                          </TableCell>
                          <TableCell>@{pool.creator_public_id}</TableCell>
                          <TableCell>{pool.participant_count}</TableCell>
                          <TableCell>
                            <Badge variant={pool.is_active ? 'default' : 'secondary'}>
                              {pool.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateBR(pool.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePoolStatus(pool.id, pool.is_active)}
                                disabled={actionLoading === `toggle-${pool.id}`}
                              >
                                {actionLoading === `toggle-${pool.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  pool.is_active ? 'Desativar' : 'Ativar'
                                )}
                              </Button>

                              <DeletePoolDialog
                                pool={{
                                  id: pool.id,
                                  name: pool.name,
                                  created_by: pool.created_by,
                                  creator_public_id: pool.creator_public_id,
                                }}
                                currentUserId={user?.id || ''}
                                currentUserEmail={user?.email || ''}
                                onSuccess={fetchPools}
                              >
                                <Button
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DeletePoolDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Torcida Mestre Tab */}
          <TabsContent value="torcida" className="space-y-6">
            <TorcidaMestreAdminTab />
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <QuizAdminTab />
          </TabsContent>

          {/* Suggested Pools Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            <SuggestedPoolsTab />
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <AuditPoolsTab />
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals" className="space-y-6">
            <LimitRequestsPanel />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Criar Notificação
                </CardTitle>
                <CardDescription>
                  Envie notificações personalizadas para grupos de usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateNotificationForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Logs de Auditoria
                </CardTitle>
                <CardDescription>
                  Histórico de alterações realizadas na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum log de auditoria registrado ainda.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ação</TableHead>
                          <TableHead>Entidade</TableHead>
                          <TableHead>Realizado por</TableHead>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                            </TableCell>
                            <TableCell>{log.entity_type}</TableCell>
                            <TableCell>@{log.performer_public_id}</TableCell>
                            <TableCell>{formatDateTimeBR(log.performed_at)}</TableCell>
                            <TableCell>
                              {log.new_values && (
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {JSON.stringify(log.new_values)}
                                </code>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
