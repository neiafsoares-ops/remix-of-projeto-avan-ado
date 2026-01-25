import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, CheckCircle, Mail, Crown, Zap, Infinity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import mestreBackground from '@/assets/mestre_do_bolao.png';

const plans = [
  {
    id: 'iniciante',
    name: 'Mestre Iniciante',
    icon: Star,
    price: 14.90,
    duration: '3 meses',
    durationDays: 90,
    poolLimit: 3,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-500',
    badgeVariant: 'secondary' as const,
  },
  {
    id: 'intermediario',
    name: 'Mestre Intermediário',
    icon: Zap,
    price: 29.80,
    duration: '6 meses',
    durationDays: 180,
    poolLimit: 8,
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-500',
    badgeVariant: 'secondary' as const,
    popular: true,
  },
  {
    id: 'supremo',
    name: 'Mestre Supremo',
    icon: Crown,
    price: 47.90,
    duration: '1 ano',
    durationDays: 365,
    poolLimit: null, // unlimited
    color: 'from-accent/20 to-accent/10',
    borderColor: 'border-accent/50',
    iconColor: 'text-accent',
    badgeVariant: 'default' as const,
  },
];

export default function MestreDoBolao() {
  return (
    <Layout>
      <div className="relative min-h-screen">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${mestreBackground})` }}
        />
        
        <div className="container py-12 max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-6">
              <Star className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Mestre do Bolão ⚽
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Crie e gerencie seus próprios bolões sem limites de jogos, rodadas ou participantes.
              Escolha o plano ideal para você!
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {plans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <Card 
                  key={plan.id} 
                  className={`relative border-2 ${plan.borderColor} bg-gradient-to-br ${plan.color} transition-all hover:scale-[1.02] hover:shadow-xl`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500">
                      Mais Popular
                    </Badge>
                  )}
                  <CardContent className="py-8 px-6">
                    <div className="text-center mb-6">
                      <div className={`w-14 h-14 mx-auto rounded-full bg-background/50 flex items-center justify-center mb-4`}>
                        <IconComponent className={`h-7 w-7 ${plan.iconColor}`} />
                      </div>
                      <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                      <Badge variant={plan.badgeVariant} className="mb-4">
                        {plan.duration}
                      </Badge>
                    </div>

                    <div className="text-center mb-6">
                      <p className="text-4xl font-bold">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        pagamento único
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-background/30">
                        {plan.poolLimit === null ? (
                          <>
                            <Infinity className="h-5 w-5 text-accent shrink-0" />
                            <span className="font-medium">Bolões ilimitados</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                            <span>Até <strong>{plan.poolLimit} bolões</strong> simultâneos</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        <span>Jogos ilimitados</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        <span>Rodadas ilimitadas</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                        <span>Participantes ilimitados</span>
                      </div>
                    </div>

                    <Button 
                      variant={plan.id === 'supremo' ? 'hero' : 'outline'} 
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Contratar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Features Section */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Tenha controle total do seu bolão
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Ao se tornar Mestre do Bolão, você assume o controle completo da sua liga.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: "⚽", title: "Escolha os jogos do bolão", desc: "Selecione partidas de ligas nacionais, internacionais, clássicos e finais." },
                { icon: "🗓", title: "Organize em rodadas", desc: "Defina quantas rodadas e jogos existirão em cada uma." },
                { icon: "⏰", title: "Horário limite automático", desc: "Bloqueio automático de palpites antes do início das partidas." },
                { icon: "🔒", title: "Jogo limpo garantido", desc: "Palpites ficam travados — ninguém altera após o prazo." },
                { icon: "🧮", title: "Pontuação automática", desc: "Sem contas manuais, tudo calculado pelo sistema." },
                { icon: "📊", title: "Ranking em tempo real", desc: "Atualização automática quando os placares são lançados." },
                { icon: "👥", title: "Gerencie participantes", desc: "Controle entradas, saídas e participação dos membros." },
                { icon: "🔐", title: "Liga aberta ou privada", desc: "Escolha quem pode participar do seu bolão." },
              ].map((item, index) => (
                <Card key={index} className="p-4 flex items-start gap-4 hover:bg-accent/5 transition-colors">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Rules Info */}
          <Card className="p-6 bg-muted/30 mb-8">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">ℹ️</span>
              Regras importantes
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• A validade começa na data do pagamento ou ativação</li>
              <li>• Ao expirar, seus bolões existentes continuam funcionando</li>
              <li>• Bolões excluídos não contam no limite do plano</li>
              <li>• Se o plano expirar durante um bolão ativo, você poderá atualizar apenas a rodada vigente</li>
              <li>• Para criar novos bolões após expiração, basta renovar seu plano</li>
            </ul>
          </Card>

          {/* Contact CTA */}
          <Card className="p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Em breve!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              O pagamento online estará disponível em breve. Por enquanto, entre em contato conosco 
              para se tornar um Mestre do Bolão.
            </p>
            <Button variant="hero" size="lg" className="gap-2">
              <Mail className="h-5 w-5" />
              Entrar em Contato
            </Button>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
