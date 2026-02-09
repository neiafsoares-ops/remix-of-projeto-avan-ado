import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { 
  Plus, 
  Trophy, 
  Users, 
  Calendar,
  Loader2,
  Settings,
  ChevronRight,
  Star,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import mestreBolaoIcon from '@/assets/mestre-bolao-icon.jpeg';
import { CreatePoolWizard } from '@/components/pools/CreatePoolWizard';
import { SuggestedPoolsSection } from '@/components/mestre/SuggestedPoolsSection';
import { ReceivedInvitations } from '@/components/pools/ReceivedInvitations';

interface UserRole {
  role: 'admin' | 'moderator' | 'participant' | 'mestre_bolao';
}

interface Pool {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  pool_participants: { count: number }[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [myPools, setMyPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create pool wizard
  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchUserData();
    }
  }, [user, authLoading, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      setRoles((rolesData as UserRole[]) || []);

      // Fetch pools created by user
      const { data: poolsData } = await supabase
        .from('pools')
        .select(`
          *,
          pool_participants(count)
        `)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      setMyPools(poolsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePoolCreated = () => {
    fetchUserData();
  };

  const isAdmin = roles.some(r => r.role === 'admin');
  const isModerator = roles.some(r => r.role === 'moderator');
  const isMestreBolao = roles.some(r => r.role === 'mestre_bolao');
  const isPrivilegedUser = isAdmin || isModerator || isMestreBolao;
  // All users can create pools (with limits for common members)
  const canCreatePools = true;

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Painel</h1>
            <p className="text-muted-foreground">
              Gerencie seus bolões e acompanhe suas atividades
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {roles.map((role) => (
              <Badge 
                key={role.role} 
                variant={role.role === 'admin' ? 'default' : role.role === 'mestre_bolao' ? 'default' : 'secondary'}
                className={`${role.role === 'admin' ? 'bg-accent text-accent-foreground' : role.role === 'mestre_bolao' ? 'bg-primary text-primary-foreground' : ''} flex items-center gap-1.5`}
              >
                {role.role === 'mestre_bolao' && (
                  <img src={mestreBolaoIcon} alt="Mestre do Bolão" className="h-5 w-5 rounded-full object-cover" />
                )}
                {role.role === 'admin' ? 'Administrador' : 
                 role.role === 'moderator' ? 'Moderador' : 
                 role.role === 'mestre_bolao' ? 'Mestre do Bolão' : 'Participante'}
              </Badge>
            ))}
          </div>
        </div>

        <Tabs defaultValue="pools" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pools">Meus Bolões</TabsTrigger>
            {(isAdmin || isModerator) && (
              <TabsTrigger value="manage">Gerenciar</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pools" className="space-y-6">
            {/* Received Invitations - Always visible for all users */}
            <ReceivedInvitations />
            
            {/* Grid: Sugestões Zapions + Criar Bolão lado a lado */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Suggested Pools Section - Visible for all users */}
              <SuggestedPoolsSection />
              
              {/* Criar Bolão Card */}
              <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Criar Novo Bolão
                  </CardTitle>
                  <CardDescription>
                    Crie seu próprio bolão do zero e configure tudo manualmente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Personalize rodadas, jogos, participantes e premiações do seu jeito.
                  </p>
                  {!isPrivilegedUser && (
                    <p className="text-xs text-muted-foreground/80">
                      Membros podem criar bolões com até 8 equipes, 2 grupos e 15 partidas.
                    </p>
                  )}
                  {canCreatePools && (
                    <Button variant="hero" className="w-full" onClick={() => setCreateWizardOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Bolão
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {user && (
              <CreatePoolWizard
                open={createWizardOpen}
                onOpenChange={setCreateWizardOpen}
                onSuccess={handlePoolCreated}
                userId={user.id}
              />
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Bolões Criados por Mim</h2>
            </div>

            {myPools.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum bolão criado</h3>
                  <p className="text-muted-foreground mb-6">
                    Crie seu primeiro bolão e convide seus amigos!
                    {!isPrivilegedUser && (
                      <span className="block text-sm mt-2 text-muted-foreground/80">
                        Membros podem criar bolões com até 8 equipes, 2 grupos e 15 partidas. Se torne um Mestre dos Bolões e tenha liberdade para criar bolões ilimitados!
                      </span>
                    )}
                  </p>
                  <Button variant="hero" onClick={() => setCreateWizardOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Bolão
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myPools.map((pool) => (
                  <Card 
                    key={pool.id}
                    className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate(`/pools/${pool.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <Badge variant={pool.is_active ? 'default' : 'secondary'}>
                          {pool.is_active ? 'Ativo' : 'Fechado'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mt-4">{pool.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {pool.description || 'Sem descrição'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{pool.pool_participants?.[0]?.count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(pool.created_at), 'dd/MM/yy')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/pools/${pool.id}/manage`);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Gerenciar
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="flex-1"
                        >
                          Ver
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {(isAdmin || isModerator) && (
            <TabsContent value="manage">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Painel de Gerenciamento
                  </CardTitle>
                  <CardDescription>
                    Ferramentas administrativas para gerenciar bolões e participantes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card 
                      className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/pools')}
                    >
                      <CardContent className="py-6 text-center">
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold">Gerenciar Jogos</h4>
                        <p className="text-sm text-muted-foreground">
                          Adicione e edite resultados
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => navigate('/pools')}
                    >
                      <CardContent className="py-6 text-center">
                        <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <h4 className="font-semibold">Participantes</h4>
                        <p className="text-sm text-muted-foreground">
                          Gerencie status e permissões
                        </p>
                      </CardContent>
                    </Card>
                    
                    {isAdmin && (
                      <Card 
                        className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => navigate('/admin')}
                      >
                        <CardContent className="py-6 text-center">
                          <Trophy className="h-8 w-8 mx-auto mb-2 text-accent" />
                          <h4 className="font-semibold">Administração</h4>
                          <p className="text-sm text-muted-foreground">
                            Configurações globais
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
