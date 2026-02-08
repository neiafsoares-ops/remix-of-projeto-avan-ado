import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Mail, AtSign, Calendar, Loader2, Save, Hash, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AvatarUpload } from '@/components/AvatarUpload';
import { ProfileStatsSummary } from '@/components/profile/ProfileStatsSummary';
interface Profile {
  id: string;
  public_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  numeric_id: number;
}

interface UserRole {
  role: 'admin' | 'moderator' | 'participant';
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchProfile();
    }
  }, [user, authLoading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setFullName(profileData.full_name || '');

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      setRoles((rolesData as UserRole[]) || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (url: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar a foto.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas.',
      });

      setProfile(prev => prev ? { ...prev, full_name: fullName } : null);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
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

  if (!profile) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 md:py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>

        {/* Stats Summary - Only shows finalized events */}
        {user && <ProfileStatsSummary userId={user.id} />}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <AvatarUpload
                  value={profile.avatar_url}
                  onChange={handleAvatarChange}
                  userId={user?.id || ''}
                  fallback={profile.public_id.charAt(0).toUpperCase()}
                />
                <div>
                  <CardTitle className="text-2xl">@{profile.public_id}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    Membro desde {format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique ou arraste uma imagem para alterar
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge 
                    key={role.role}
                    variant={role.role === 'admin' ? 'default' : 'secondary'}
                    className={role.role === 'admin' ? 'bg-accent text-accent-foreground' : ''}
                  >
                    {role.role === 'admin' ? 'Administrador' : 
                     role.role === 'moderator' ? 'Moderador' : 'Participante'}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeric_id" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    ID Numérico
                  </Label>
                  <Input
                    id="numeric_id"
                    value={profile.numeric_id.toString().padStart(5, '0')}
                    disabled
                    className="bg-muted font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="public_id" className="flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    ID Público
                  </Label>
                  <Input
                    id="public_id"
                    value={profile.public_id}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Os IDs não podem ser alterados.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <Button 
                variant="hero" 
                onClick={handleSave} 
                disabled={saving || fullName === profile.full_name}
                className="w-full md:w-auto"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
