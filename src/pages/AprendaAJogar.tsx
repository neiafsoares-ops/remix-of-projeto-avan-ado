import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Crown, 
  Target, 
  Users, 
  Star, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Settings,
  Calendar,
  MessageCircle,
  Shield,
  HelpCircle,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function AprendaAJogar() {
  const location = useLocation();

  // Scroll to anchor on load
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  const scoringRules = [
    { points: 5, description: 'Placar exato', color: 'text-accent', bgColor: 'bg-accent/10' },
    { points: 3, description: 'Vencedor + diferença de gols', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { points: 1, description: 'Apenas o vencedor', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { points: 0, description: 'Errou o resultado', color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
  ];

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Hero Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="h-4 w-4" />
            Central de Ajuda
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Aprenda a Jogar
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Entenda como funcionam os recursos da Zapions e participe com segurança.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <a href="#boloes" className="block">
            <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-primary/20 hover:border-primary/50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Bolões</h3>
                  <p className="text-sm text-muted-foreground">Sistema de palpites</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </a>
          <a href="#timemestre" className="block">
            <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-amber-500/20 hover:border-amber-500/50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Time Mestre</h3>
                  <p className="text-sm text-muted-foreground">Bolão do seu time</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </a>
          <a href="#quiz10" className="block">
            <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer border-accent/20 hover:border-accent/50">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Quiz 10</h3>
                  <p className="text-sm text-muted-foreground">Perguntas e respostas</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </a>
        </div>

        {/* ==================== SEÇÃO 1: BOLÕES ==================== */}
        <section id="boloes" className="scroll-mt-24 mb-16 md:mb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Como funcionam os Bolões</h2>
              <p className="text-muted-foreground">Entenda tudo sobre o sistema de palpites</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* O que é um Bolão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  O que é um Bolão na Zapions?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  O bolão é um espaço criado por usuários (criadores) para organizar palpites de partidas de futebol. 
                  Pode envolver amigos, grupos, comunidades ou qualquer público. Cada bolão tem suas próprias regras, 
                  definidas pelo criador, como valor de entrada, premiações e formato do campeonato.
                </p>
              </CardContent>
            </Card>

            {/* Como entrar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Como o participante entra no bolão?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { step: 1, title: 'Crie sua conta', desc: 'Cadastre-se gratuitamente na plataforma' },
                    { step: 2, title: 'Explore bolões', desc: 'Acesse os bolões disponíveis' },
                    { step: 3, title: 'Leia as regras', desc: 'Confira informações e regras do bolão' },
                    { step: 4, title: 'Participe', desc: 'Entre conforme as regras do criador' },
                  ].map((item) => (
                    <div key={item.step} className="text-center p-4 rounded-lg bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 font-bold">
                        {item.step}
                      </div>
                      <h4 className="font-medium mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tela do Bolão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  O que você encontra na tela do bolão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: Trophy, label: 'Nome do bolão' },
                    { icon: Users, label: 'Responsável (mestre do bolão)' },
                    { icon: BookOpen, label: 'Descrição com regras completas' },
                    { icon: Star, label: 'Valor para participar (se houver)' },
                    { icon: Users, label: 'Limite de participantes' },
                    { icon: Calendar, label: 'Data/hora máxima para palpites' },
                    { icon: MessageCircle, label: 'Link para contato ou grupo' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <item.icon className="h-5 w-5 text-primary" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerta de Responsabilidade */}
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Regras e Responsabilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Cada criador define suas próprias regras, incluindo: valor de entrada, limites de participação, 
                  premiações e administração do dinheiro.
                </p>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    ⚠️ A Zapions não se responsabiliza por pagamentos, repasses ou acordos financeiros 
                    feitos entre participantes e administradores.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Recomendamos que você participe de bolões com pessoas conhecidas 
                  ou indicadas por amigos.
                </p>
              </CardContent>
            </Card>

            {/* Personalização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Personalização dos Bolões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">O criador do bolão pode personalizar:</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {['Confrontos', 'Datas e horários', 'Número de rodadas', 'Campeonatos personalizados'].map((item) => (
                    <div key={item} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sistema de Pontuação */}
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Sistema de Pontuação Zapions
                  <Badge variant="secondary" className="ml-2">Automático</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  O sistema de pontuação é <strong>padrão e automático</strong> em todos os bolões:
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {scoringRules.map((rule) => (
                    <Card key={rule.points} className={`text-center ${rule.bgColor} border-0`}>
                      <CardContent className="pt-6 pb-4">
                        <div className={`text-4xl font-bold mb-1 ${rule.color}`}>
                          {rule.points}
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-3">Exemplo prático:</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Resultado real: <strong className="text-foreground">Time A 2 x 1 Time B</strong>
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
              </CardContent>
            </Card>

            {/* Atualização de Placares */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Atualização de Placares Reais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Bolões criados por usuários</h4>
                    <p className="text-sm text-muted-foreground">
                      O responsável pode precisar lançar os placares manualmente após o término das partidas.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-medium mb-2 text-green-700 dark:text-green-400">Sugestões Zapions</h4>
                    <p className="text-sm text-muted-foreground">
                      Em campeonatos já configurados pela plataforma, o sistema atualiza automaticamente os resultados.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sugestões Zapions */}
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <Star className="h-5 w-5" />
                  Sugestões Zapions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Existem bolões prontos sugeridos pela plataforma onde:
                </p>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    'Confrontos já configurados',
                    'Estrutura pronta para usar',
                    'Placares lançados automaticamente',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 p-3 rounded-lg bg-accent/10">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  O criador define as regras e gerencia participantes, enquanto a plataforma cuida do resto!
                </p>
              </CardContent>
            </Card>

            {/* Para Criadores */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Para Criadores de Bolão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Qualquer usuário pode criar bolões e definir tudo sobre seu campeonato:
                </p>
                
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    'Formato do campeonato',
                    'Número de participantes',
                    'Número de rodadas',
                    'Taxa de inscrição',
                    'Taxa administrativa',
                    'Confrontos',
                    'Horário máximo para palpites',
                    'Foto de perfil',
                    'Moderadores para ajudar',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-3">Formatos disponíveis:</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-background border">
                      <h5 className="font-medium mb-1">🏆 Padrão</h5>
                      <p className="text-xs text-muted-foreground">Pontos corridos (ex: Brasileirão)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <h5 className="font-medium mb-1">⚔️ Mata-mata</h5>
                      <p className="text-xs text-muted-foreground">Eliminatórias (ex: Copa do Brasil)</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background border">
                      <h5 className="font-medium mb-1">🌍 Copa</h5>
                      <p className="text-xs text-muted-foreground">Grupos + mata-mata (ex: Copa do Mundo)</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm">
                    <strong>Plano Gratuito:</strong> Todo usuário pode criar bolões com até 8 equipes, 
                    até 2 grupos e no máximo 15 partidas/rodadas configuradas.
                  </p>
                </div>

                <div className="text-center pt-4">
                  <p className="text-lg font-medium mb-4">
                    Quer criar bolões maiores e mais completos?
                  </p>
                  <Button asChild size="lg" className="gap-2">
                    <Link to="/mestre-do-bolao">
                      <Crown className="h-5 w-5" />
                      Torne-se Mestre dos Bolões
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ==================== SEÇÃO 2: TIME MESTRE ==================== */}
        <section id="timemestre" className="scroll-mt-24 mb-16 md:mb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-7 w-7 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">O que é o Time Mestre</h2>
              <p className="text-muted-foreground">Bolão focado no seu time do coração</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Conceito */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Um formato especial para apaixonados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  O <strong className="text-foreground">Time Mestre</strong> é um formato especial de bolão 
                  onde existe apenas <strong className="text-foreground">uma partida principal por rodada</strong>, 
                  relacionada ao time escolhido como Time Mestre.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-medium mb-2 text-amber-600 dark:text-amber-400">🎯 Objetivo</h4>
                    <p className="text-sm text-muted-foreground">
                      Acertar o <strong>placar exato</strong> do jogo do seu time do coração
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <h4 className="font-medium mb-2 text-amber-600 dark:text-amber-400">❤️ Para quem?</h4>
                    <p className="text-sm text-muted-foreground">
                      Perfeito para quem quer apostar focado no time que torce
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sistema Anti-Zebra */}
            <Card className="border-2 border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Shield className="h-5 w-5" />
                  Sistema Anti-Zebra 🦓
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  O Time Mestre possui um sistema único que torna o jogo ainda mais emocionante:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-600 dark:text-red-400 mb-1">Se o Time Mestre PERDER</h4>
                      <p className="text-sm text-muted-foreground">
                        Não existe ganhador naquela rodada. O valor arrecadado <strong>acumula</strong> para a próxima rodada.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-600 dark:text-green-400 mb-1">Se o Time Mestre VENCER</h4>
                      <p className="text-sm text-muted-foreground">
                        Quem acertou o placar exato divide o prêmio. O bolão reinicia com nova rodada.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-center text-muted-foreground italic">
                    "O bolão só termina quando um ou mais participantes acertarem o placar exato 
                    de uma vitória do Time Mestre!"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Curiosidade divertida */}
            <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30">
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-bold">💡 Curiosidade</h3>
                  <div className="max-w-2xl mx-auto space-y-4 text-muted-foreground">
                    <p>
                      Se o Time Mestre for um <strong className="text-foreground">time muito forte</strong> e 
                      candidato ao título, pode haver ganhadores rapidamente e o bolão reinicia com frequência.
                    </p>
                    <p>
                      Mas se for um <strong className="text-foreground">time azarão</strong> ou candidato ao 
                      rebaixamento, o prêmio pode <strong className="text-amber-600 dark:text-amber-400">acumular bastante</strong> até 
                      alguém finalmente acertar! 🎉
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center py-8">
              <Button asChild size="lg" className="gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950">
                <Link to="/torcida-mestre">
                  <Crown className="h-5 w-5" />
                  Explorar bolões Time Mestre
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ==================== SEÇÃO 3: QUIZ 10 ==================== */}
        <section id="quiz10" className="scroll-mt-24 mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Target className="h-7 w-7 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Como funciona o Quiz 10</h2>
              <p className="text-muted-foreground">Teste seus conhecimentos sobre futebol</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Conceito */}
            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-accent" />
                  O que é o Quiz 10?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  O <strong className="text-foreground">Quiz 10</strong> é um jogo de perguntas e respostas 
                  sobre futebol. Teste seus conhecimentos e dispute com outros participantes!
                </p>
              </CardContent>
            </Card>

            {/* Regras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  Regras Principais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-accent mb-2">10</div>
                    <h4 className="font-medium mb-1">Perguntas por rodada</h4>
                    <p className="text-sm text-muted-foreground">Cada rodada contém 10 perguntas sobre futebol</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="text-3xl font-bold text-accent mb-2">1</div>
                    <h4 className="font-medium mb-1">Ponto por acerto</h4>
                    <p className="text-sm text-muted-foreground">Cada resposta correta vale 1 ponto</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="text-3xl font-bold text-green-500 mb-2">🏆</div>
                    <h4 className="font-medium mb-1">Meta: 10 pontos</h4>
                    <p className="text-sm text-muted-foreground">Vence quem atingir 10 pontos primeiro</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="text-3xl font-bold text-amber-500 mb-2">💰</div>
                    <h4 className="font-medium mb-1">Prêmio acumula</h4>
                    <p className="text-sm text-muted-foreground">Se ninguém atingir 10 pts, acumula para próxima rodada</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exemplos de Perguntas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-accent" />
                  Exemplos de Perguntas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  As perguntas são no formato de múltipla escolha. Veja alguns exemplos:
                </p>
                
                {/* Exemplo 1 */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="font-medium mb-3">
                    "Quais jogos terminarão empatados na primeira rodada do grupo H?"
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'A) Espanha x Cabo Verde',
                      'B) Arábia Saudita x Uruguai',
                      'C) Não terá empates',
                      'D) Ambos terminarão empatados',
                    ].map((option) => (
                      <div key={option} className="p-2 rounded bg-background border text-sm">
                        {option}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exemplo 2 */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="font-medium mb-3">
                    "Entre os seguintes artilheiros, quem fará gol na primeira rodada?"
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'A) Haaland',
                      'B) Messi',
                      'C) Ambos marcam',
                      'D) Nenhum marca',
                    ].map((option) => (
                      <div key={option} className="p-2 rounded bg-background border text-sm">
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center py-8">
              <Button asChild size="lg" className="gap-2">
                <Link to="/quiz">
                  <Target className="h-5 w-5" />
                  Explorar quizzes disponíveis
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <Card className="gradient-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Pronto para começar?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
              Agora que você sabe como funciona, é hora de entrar em um bolão e mostrar seus conhecimentos!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" asChild>
                <Link to="/pools">
                  <Trophy className="h-5 w-5 mr-2" />
                  Ver Bolões
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Link to="/auth?tab=signup">
                  Criar Conta Grátis
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
