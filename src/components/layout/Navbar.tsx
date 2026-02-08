import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon, Menu, X, User, LogOut, LayoutDashboard, Shield, Star, ChevronDown, BookOpen, Trophy, Crown, Target, Zap, HelpCircle, Heart } from 'lucide-react';
import { CircularLogo } from '@/components/CircularLogo';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLearnMenuOpen, setMobileLearnMenuOpen] = useState(false);
  const [mobileBetMenuOpen, setMobileBetMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canCreatePools, setCanCreatePools] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for shrink effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      checkUserRoles();
    } else {
      setIsAdmin(false);
      setCanCreatePools(false);
    }
  }, [user]);

  const checkUserRoles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const roles = data?.map(r => r.role) || [];
    setIsAdmin(roles.includes('admin'));
    setCanCreatePools(roles.includes('admin') || roles.includes('moderator') || roles.includes('mestre_bolao'));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const learnMenuItems = [
    {
      title: 'Como funcionam os Bolões',
      description: 'Entenda o sistema de palpites e pontuação',
      href: '/aprenda-a-jogar#boloes',
      icon: Trophy,
    },
    {
      title: 'O que é o Time Mestre',
      description: 'Bolão focado no seu time do coração',
      href: '/aprenda-a-jogar#timemestre',
      icon: Crown,
    },
    {
      title: 'Como funciona o Quiz 10',
      description: 'Teste seus conhecimentos sobre futebol',
      href: '/aprenda-a-jogar#quiz10',
      icon: Target,
    },
  ];

  const betNowMenuItems = [
    {
      title: 'Bolões',
      description: 'Participe de bolões e dispute com amigos',
      href: '/pools',
      icon: Trophy,
    },
    {
      title: 'Quiz 10',
      description: 'Teste seus conhecimentos sobre futebol',
      href: '/quiz',
      icon: HelpCircle,
    },
    {
      title: 'Time Mestre',
      description: 'Aposte no seu time do coração',
      href: '/torcida-mestre',
      icon: Heart,
    },
  ];

  return (
    <nav 
      className={cn(
        "fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
        isScrolled ? "h-14 shadow-md" : "h-16"
      )}
    >
      <div className={cn(
        "container flex items-center justify-between transition-all duration-300",
        isScrolled ? "h-14" : "h-16"
      )}>
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <CircularLogo 
            size={isScrolled ? 40 : 50} 
            className="transition-all duration-300"
          />
          <span className="hidden sm:inline">Bolão Zapions</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/quem-somos" className="text-muted-foreground hover:text-foreground transition-colors">
            Quem Somos
          </Link>
          
          {/* Aprenda a Jogar Dropdown */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent text-muted-foreground hover:text-foreground">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Aprenda a Jogar
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4">
                    {learnMenuItems.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-primary" />
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Palpite Agora Dropdown */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-primary/10 hover:bg-primary/20 focus:bg-primary/20 data-[state=open]:bg-primary/20 text-primary hover:text-primary font-semibold">
                  <Zap className="h-4 w-4 mr-1" />
                  Palpite Agora
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4">
                    {betNowMenuItems.map((item) => (
                      <li key={item.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="flex items-center gap-2">
                              <item.icon className="h-4 w-4 text-primary" />
                              <div className="text-sm font-medium leading-none">{item.title}</div>
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {user && (
            <Link to="/my-predictions" className="text-muted-foreground hover:text-foreground transition-colors">
              Meus Palpites
            </Link>
          )}
          {user && !canCreatePools && (
            <Link 
              to="/mestre-do-bolao" 
              className="text-accent hover:text-accent/80 transition-colors flex items-center gap-1 font-medium"
            >
              <Star className="h-4 w-4" />
              Seja Mestre do Bolão
            </Link>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {user && <NotificationBell />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">Conta</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Administração
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Entrar
              </Button>
              <Button 
                variant="hero" 
                onClick={() => navigate('/auth?tab=signup')}
                className="shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Cadastrar
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          {user && <NotificationBell />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-slide-up">
          <div className="container py-4 flex flex-col gap-3">
            <Link
              to="/quem-somos"
              className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Quem Somos
            </Link>
            
            {/* Mobile Aprenda a Jogar Accordion */}
            <div>
              <button
                className="w-full px-4 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                onClick={() => setMobileLearnMenuOpen(!mobileLearnMenuOpen)}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Aprenda a Jogar
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  mobileLearnMenuOpen && "rotate-180"
                )} />
              </button>
              
              {mobileLearnMenuOpen && (
                <div className="pl-6 mt-1 space-y-1">
                  {learnMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileLearnMenuOpen(false);
                      }}
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {/* Mobile Palpite Agora Accordion */}
            <div>
              <button
                className="w-full px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-between font-semibold"
                onClick={() => setMobileBetMenuOpen(!mobileBetMenuOpen)}
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Palpite Agora
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  mobileBetMenuOpen && "rotate-180"
                )} />
              </button>
              
              {mobileBetMenuOpen && (
                <div className="pl-6 mt-1 space-y-1">
                  {betNowMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileBetMenuOpen(false);
                      }}
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            {user && (
              <>
                <Link
                  to="/my-predictions"
                  className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Meus Palpites
                </Link>
                <Link
                  to="/profile"
                  className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Meu Perfil
                </Link>
                <Link
                  to="/dashboard"
                  className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {!canCreatePools && (
                  <Link
                    to="/mestre-do-bolao"
                    className="px-4 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Star className="h-4 w-4" />
                    Seja Mestre do Bolão
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Administração
                  </Link>
                )}
                <Button
                  variant="destructive"
                  className="mt-2"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            )}
            {!user && (
              <div className="flex flex-col gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                >
                  Entrar
                </Button>
                <Button
                  variant="hero"
                  className="shadow-lg"
                  onClick={() => {
                    navigate('/auth?tab=signup');
                    setMobileMenuOpen(false);
                  }}
                >
                  Cadastrar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
