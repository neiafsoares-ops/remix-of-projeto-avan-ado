import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Trophy, 
  Smartphone, 
  Target, 
  Flame, 
  Users, 
  User, 
  Rocket,
  Image as ImageIcon
} from 'lucide-react';
import logoZapions from '@/assets/logo-zapions.png';

// Gallery images - edit this array to update the gallery
// Each item should have an imageUrl (or null for placeholder) and optional description (max 50 chars)
const galleryImages: { imageUrl: string | null; description: string }[] = [
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
  { imageUrl: null, description: '' },
];

const sections = [
  {
    icon: Trophy,
    title: 'Quem Somos',
    content: `A/O Zapions nasceu muito antes de virar plataforma.

Nasceu da resenha, dos grupos lotados, das discussões pós-jogo e daquela rivalidade saudável entre amigos que todo apaixonado por futebol conhece bem.

Desde 2014, reunimos torcedores de todos os times para debater futebol, criar bolões, organizar competições e jogar fantasy games — sempre com o mesmo objetivo: deixar o esporte mais divertido quando é compartilhado.`
  },
  {
    icon: Smartphone,
    title: 'Nossa origem',
    content: `Tudo começou nos grupos de WhatsApp, numa época em que cada grupo suportava apenas 100 pessoas.
A comunidade cresceu tão rápido que precisávamos criar vários grupos ao mesmo tempo para dar conta de todo mundo.

Depois, levamos a resenha para o Facebook, onde ultrapassamos 25 mil participantes, conectando torcedores do Brasil inteiro.

Entre palpites, rankings, campeonatos e provocações saudáveis, uma coisa ficou clara: o futebol fica muito melhor quando é vivido em grupo.`
  },
  {
    icon: Target,
    title: 'De comunidade para plataforma',
    content: `Com o tempo, os bolões ficaram maiores, as competições mais organizadas e os participantes cada vez mais engajados.

Já foram:
• mais de 500 participantes simultâneos
• mais de 50 competições realizadas
• milhares de palpites registrados

Mas fazer tudo em planilhas, mensagens e controles manuais começou a ficar limitado. Então decidimos criar o Zapions: uma plataforma feita sob medida para organizar bolões, campeonatos, quizzes e fantasy games de forma simples, automática e divertida.`
  },
  {
    icon: Flame,
    title: 'O que acreditamos',
    content: `Acreditamos que futebol é mais do que assistir jogo.

É competir com amigos, zoar no grupo, subir no ranking, disputar até a última rodada e criar histórias para contar depois.

Nossa missão é transformar isso em uma experiência digital completa. Sem complicação. Sem barreiras. Só diversão e competição saudável.`
  },
  {
    icon: Users,
    title: 'Para todos',
    content: `A Zapions é para todo mundo.

Não importa seu time, sua cidade ou sua rivalidade. Aqui o que vale é a paixão pelo futebol, a amizade e a resenha. Porque no fim das contas, o melhor do jogo sempre foi jogar junto.`
  },
  {
    icon: User,
    title: 'Fundador',
    content: `O projeto é liderado por Lucas Mendes, criador da comunidade desde o início, com o objetivo simples e direto: construir a melhor plataforma para organizar campeonatos, bolões e reunir pessoas em torno do futebol.

Sem distinções. Sem exclusões. Só a paixão pelo esporte.`
  },
  {
    icon: Rocket,
    title: 'Hoje',
    content: `Hoje a Zapions evoluiu de grupos para uma plataforma completa onde você pode:

• Criar bolões
• Convidar amigos
• Fazer palpites
• Acompanhar rankings
• Organizar competições
• Viver o futebol de forma mais interativa

E isso é só o começo.`
  },
];

export default function QuemSomos() {
  return (
    <Layout>
      <div className="container py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <img 
            src={logoZapions} 
            alt="Bolão Zapions" 
            className="h-[80px] md:h-[100px] w-auto mx-auto mb-6" 
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Quem Somos
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Conheça a história por trás da maior comunidade de bolões esportivos do Brasil
          </p>
        </div>

        {/* Content Sections */}
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <Card key={section.title} className="overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                      <section.icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
                      {section.title}
                    </h2>
                    <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                      {section.content}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Gallery Section */}
        <div className="max-w-6xl mx-auto mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Nossa Galeria</h2>
            <p className="text-muted-foreground">Momentos que marcaram nossa história</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((item, index) => (
              <div key={index} className="group relative">
                <div className="aspect-square rounded-xl overflow-hidden bg-muted border-2 border-dashed border-border">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.description || `Imagem ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs opacity-50">Imagem {index + 1}</span>
                    </div>
                  )}
                </div>
                {item.description && (
                  <p className="mt-2 text-sm text-center text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
          
          {/* Instructions for editing */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Para editar a galeria:</strong> Modifique o array <code className="bg-muted px-1 rounded">galleryImages</code> no arquivo <code className="bg-muted px-1 rounded">src/pages/QuemSomos.tsx</code>. 
              Adicione a URL da imagem em <code className="bg-muted px-1 rounded">imageUrl</code> e uma descrição de até 50 caracteres.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
