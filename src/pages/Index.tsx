import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { 
  Target, 
  Users, 
  TrendingUp, 
  Zap,
  ChevronRight,
  Star,
  PlusCircle,
  UserPlus,
  Trophy,
  Crown
} from 'lucide-react';
import { CircularLogo } from '@/components/CircularLogo';
import heroBackground from '@/assets/hero-background.png';

// Features reorganized following user journey
const features = [
  {
    icon: PlusCircle,
    title: 'Crie seu Bolão',
    description: 'Comece seu bolão em poucos cliques.',
  },
  {
    icon: UserPlus,
    title: 'Convide Amigos',
    description: 'Chame seus amigos e monte o seu time.',
  },
  {
    icon: Target,
    title: 'Faça Palpites',
    description: 'Dê seus palpites e ganhe pontos pelos acertos.',
  },
  {
    icon: TrendingUp,
    title: 'Acompanhe o Ranking',
    description: 'Veja a classificação em tempo real e dispute pelo topo.',
  },
];

const scoringRules = [
  { points: 5, description: 'Placar exato', color: 'text-accent', bgColor: 'bg-accent/10', example: '2x1' },
  { points: 3, description: 'Vencedor + diferença correta', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', example: '1x0, 3x2' },
  { points: 1, description: 'Apenas o vencedor', color: 'text-blue-500', bgColor: 'bg-blue-500/10', example: '2x0, 4x0' },
  { points: 0, description: 'Errou o resultado', color: 'text-muted-foreground', bgColor: 'bg-muted/50', example: '1x2, 1x1' },
];

const howItWorksSteps = [
  {
    step: 1,
    icon: PlusCircle,
    title: 'Crie seu bolão',
    description: 'Escolha o campeonato e personalize seu bolão.',
  },
  {
    step: 2,
    icon: Users,
    title: 'Convide amigos',
    description: 'Envie convites e junte sua turma do trabalho ou amigos.',
  },
  {
    step: 3,
    icon: Trophy,
    title: 'Faça palpites',
    description: 'Cada um dá seus palpites e acompanha o ranking.',
  },
];

export default function Index() {
  return (
    <Layout>
      {/* Hero Section */}
      <section 
        className="relative overflow-hidden min-h-[85vh] flex items-center pt-16"
        style={{
          backgroundImage: `url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-black/70" />
        
        <div className="container py-16 md:py-24 lg:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 backdrop-blur-sm text-emerald-300 text-sm font-medium animate-fade-in border border-emerald-500/30">
              <Star className="h-4 w-4 fill-current" />
              A melhor plataforma de bolões esportivos
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight animate-slide-up text-white drop-shadow-lg">
              Crie bolões, faça{' '}
              <span className="text-[#A78BFA]">palpites</span>
              {' '}e dispute com amigos
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto animate-slide-up drop-shadow-md">
              Organize bolões esportivos com sistema automático de pontuação, rankings em tempo real 
              e gestão completa de participantes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Button 
                variant="hero" 
                size="xl" 
                asChild 
                className="shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-lg px-8"
              >
                <Link to="/auth?tab=signup">
                  Começar Agora
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                asChild 
                className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/pools">
                  Ver Bolões
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                asChild 
                className="bg-accent/20 backdrop-blur-sm border-accent/50 text-white hover:bg-accent/30 hover:text-white"
              >
                <Link to="/quiz">
                  <Target className="h-4 w-4 mr-2" />
                  Quiz 10
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                asChild 
                className="bg-amber-500/20 backdrop-blur-sm border-amber-500/50 text-white hover:bg-amber-500/30 hover:text-white"
              >
                <Link to="/torcida-mestre">
                  <Crown className="h-4 w-4 mr-2" />
                  Time Mestre
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Reorganized following user journey */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo o que você precisa para seus bolões
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma plataforma completa para criar e gerenciar bolões esportivos com amigos.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-shadow duration-300">
                    <feature.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring Rules Section - Highlighted as differentiator */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-4">
                <Zap className="h-4 w-4" />
                Diferencial do produto
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Sistema de pontuação inteligente
              </h2>
              <p className="text-muted-foreground text-lg font-medium">
                Premia quem entende de futebol, não quem chuta!
              </p>
            </div>

            {/* Example Match Highlight */}
            <Card className="mb-8 bg-gradient-to-r from-blue-500/10 to-red-500/10 border-2 border-primary/20 shadow-lg">
              <CardContent className="py-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">Exemplo de resultado</p>
                  <div className="flex items-center justify-center gap-4 md:gap-8">
                    <div className="text-right">
                      <span className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">Time Azul</span>
                    </div>
                    <div className="flex items-center gap-2 text-3xl md:text-4xl font-bold">
                      <span className="text-blue-600 dark:text-blue-400">2</span>
                      <span className="text-muted-foreground">x</span>
                      <span className="text-red-600 dark:text-red-400">1</span>
                    </div>
                    <div className="text-left">
                      <span className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400">Time Vermelho</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">(Diferença de gols: 1)</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {scoringRules.map((rule) => (
                <Card 
                  key={rule.points} 
                  className={`text-center hover:shadow-lg transition-all duration-300 border-2 ${rule.bgColor}`}
                >
                  <CardContent className="pt-6 pb-4">
                    <div className={`text-4xl md:text-5xl font-bold mb-2 ${rule.color}`}>
                      {rule.points}
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {rule.points === 1 ? 'ponto' : 'pontos'}
                    </p>
                    <p className="text-muted-foreground text-sm mb-2">
                      {rule.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      ex: {rule.example}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="mt-8 bg-primary/5 border-primary/20">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Exemplos de palpites</h4>
                    <p className="text-muted-foreground text-sm mb-3">
                      Resultado real: <strong className="text-foreground">Time Azul 2 x 1 Time Vermelho</strong>
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="text-accent font-bold min-w-[50px]">5 pts</span>
                        <span className="text-muted-foreground">→ Palpite 2x1 (placar exato)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold min-w-[50px]">3 pts</span>
                        <span className="text-muted-foreground">→ Palpite 1x0 ou 3x2 (vencedor + diferença de 1 gol)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-blue-500 font-bold min-w-[50px]">1 pt</span>
                        <span className="text-muted-foreground">→ Palpite 2x0 ou 4x1 (apenas vencedor correto)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-muted-foreground font-bold min-w-[50px]">0 pts</span>
                        <span className="text-muted-foreground">→ Palpite 1x2 ou 1x1 (errou o resultado)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section - New 3 steps section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Como funciona em 3 passos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simples, rápido e divertido. Comece seu bolão em minutos!
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorksSteps.map((step, index) => (
              <div 
                key={step.step}
                className="relative text-center"
              >
                {/* Connector line for desktop */}
                {index < howItWorksSteps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
                )}
                
                {/* Step number badge */}
                <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow relative">
                  <step.icon className="h-10 w-10 text-primary-foreground" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                    {step.step}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <Card className="gradient-primary text-primary-foreground overflow-hidden">
            <CardContent className="py-12 md:py-16 text-center relative">
              <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <CircularLogo size={100} className="mx-auto md:w-[120px] md:h-[120px]" />
                <h2 className="text-3xl md:text-4xl font-bold">
                  Pronto para começar?
                </h2>
                <p className="text-primary-foreground/80 text-lg">
                  Crie sua conta gratuitamente e comece a participar de bolões agora mesmo.
                </p>
                <Button 
                  variant="accent" 
                  size="xl" 
                  asChild 
                  className="shadow-accent-glow hover:scale-105 transition-all duration-300"
                >
                  <Link to="/auth?tab=signup">
                    Criar Conta Grátis
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
