import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Loader2, Eye, EyeOff, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { CircularLogo } from '@/components/CircularLogo';
import { z } from 'zod';
import heroBackground from '@/assets/hero-background.png';

const loginSchema = z.object({
  emailOrUsername: z.string().min(3, 'Informe seu e-mail ou nome de usuário'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  publicId: z
    .string()
    .min(3, 'O ID público deve ter no mínimo 3 caracteres')
    .max(20, 'O ID público deve ter no máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underscore'),
  fullName: z.string().min(2, 'Nome completo é obrigatório'),
});

const resetEmailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [password, setPassword] = useState('');
  const [publicId, setPublicId] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Reset password states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  
  const { signIn, signUp, resetPasswordForEmail, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/pools');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = loginSchema.safeParse({ emailOrUsername, password });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signIn(emailOrUsername, password);
    setLoading(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Credenciais inválidas. Verifique seu usuário/e-mail e senha.');
      } else if (error.message.includes('Email not confirmed')) {
        setError('Email não confirmado. Verifique sua caixa de entrada e spam para confirmar seu cadastro.');
      } else if (error.message.includes('Usuário não encontrado')) {
        setError('Usuário não encontrado.');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = signupSchema.safeParse({ email: signupEmail, password, publicId, fullName });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error } = await signUp(signupEmail, password, publicId, fullName);
    setLoading(false);
    
    if (error) {
      if (error.message === 'USERNAME_ALREADY_EXISTS') {
        setError('Este nome de usuário já está em uso. Por favor, escolha outro.');
      } else if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('Este email já está cadastrado. Tente fazer login ou recuperar sua senha.');
      } else if (error.message.includes('duplicate key') && error.message.includes('public_id')) {
        setError('Este nome de usuário já está em uso. Por favor, escolha outro.');
      } else if (error.message.includes('rate') || error.message.includes('429')) {
        setError('Muitas tentativas. Aguarde alguns segundos e tente novamente.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    
    const validation = resetEmailSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      setResetError(validation.error.errors[0].message);
      return;
    }

    setResetLoading(true);
    const { error } = await resetPasswordForEmail(resetEmail);
    setResetLoading(false);
    
    if (error) {
      // Mensagem genérica por segurança
      setResetError('Não foi possível processar a solicitação. Tente novamente.');
    } else {
      setResetSuccess(true);
    }
  };

  const openResetDialog = () => {
    // If emailOrUsername looks like an email, use it for reset
    const isEmail = emailOrUsername.includes('@');
    setResetEmail(isEmail ? emailOrUsername : '');
    setResetError('');
    setResetSuccess(false);
    setShowResetDialog(true);
  };

  const closeResetDialog = () => {
    setShowResetDialog(false);
    setResetEmail('');
    setResetError('');
    setResetSuccess(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 bg-black/70" />
      
      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 z-20 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-medium">Voltar</span>
      </Link>
      
      <Card className="w-full max-w-md shadow-xl animate-scale-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-fit">
            <CircularLogo size={56} />
          </div>
          <div>
            <CardTitle className="text-2xl">ZAPIONS LIGA</CardTitle>
            <CardDescription className="text-base font-medium">
              BOLÃO ESPORTIVO
            </CardDescription>
            <CardDescription className="mt-1">
              Onde os resultados acontecem.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail ou nome de usuário</Label>
                  <Input
                    id="login-email"
                    type="text"
                    placeholder="seu@email.com ou joaosilva"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <button
                      type="button"
                      onClick={openResetDialog}
                      className="text-sm text-primary hover:underline focus:outline-none"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome Completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-public-id">ID Público (nome de usuário)</Label>
                  <Input
                    id="signup-public-id"
                    type="text"
                    placeholder="joaosilva"
                    value={publicId}
                    onChange={(e) => setPublicId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Este será seu identificador único nos rankings. Não poderá ser alterado.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Recuperação de Senha */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recuperar Senha
            </DialogTitle>
            <DialogDescription>
              Informe seu email cadastrado para receber o link de redefinição de senha.
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-fit p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Email enviado!</p>
                <p className="text-sm text-muted-foreground">
                  Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
                  Verifique sua caixa de entrada e spam.
                </p>
              </div>
              <Button onClick={closeResetDialog} className="w-full">
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {resetError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeResetDialog} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={resetLoading} className="flex-1">
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Link'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
