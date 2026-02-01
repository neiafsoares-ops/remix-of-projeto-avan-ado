import { useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { ScrollText, AlertTriangle, Star } from 'lucide-react';

const sections = [
  { id: 1, title: 'Aceitação dos Termos' },
  { id: 2, title: 'Objeto da Plataforma' },
  { id: 3, title: 'Cadastro e Elegibilidade' },
  { id: 4, title: 'Condutas Permitidas e Proibidas' },
  { id: 5, title: 'Campeonatos, Bolões e Taxas' },
  { id: 6, title: 'Palpites e Prazos' },
  { id: 7, title: 'Pontuação e Resultados' },
  { id: 8, title: 'Quizzes e Natureza Recreativa' },
  { id: 9, title: 'Premiações (Regra Exclusiva)' },
  { id: 10, title: 'Responsabilidades' },
  { id: 11, title: 'Suspensão e Encerramento de Contas' },
  { id: 12, title: 'Foro' },
  { id: 13, title: 'Disposições Finais' },
];

export default function TermsOfUse() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <ScrollText className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Termos de Uso – Zapions</h1>
          <p className="text-muted-foreground">Última atualização: Fevereiro de 2026</p>
        </div>

        {/* Índice navegável */}
        <Card className="mb-8 p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-4">Índice</h2>
          <nav>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sections.map((section) => (
                <li key={section.id}>
                  <a 
                    href={`#section-${section.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {section.id}. {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Card>

        {/* Seções */}
        <div className="space-y-8">
          {/* Seção 1 */}
          <section id="section-1" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">1.</span> Aceitação dos Termos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar ou utilizar a plataforma Zapions, o usuário declara que leu, compreendeu e concorda 
              integralmente com os presentes Termos de Uso. Caso não concorde, deverá interromper 
              imediatamente o uso da plataforma.
            </p>
          </section>

          {/* Seção 2 */}
          <section id="section-2" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">2.</span> Objeto da Plataforma
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zapions é uma plataforma digital destinada à criação, gestão e participação em campeonatos, bolões 
              e quizzes esportivos e recreativos, permitindo a interação entre usuários e administradores de 
              campeonatos, denominados <strong className="text-foreground">MESTRE DOS BOLÕES</strong>.
            </p>
          </section>

          {/* Seção 3 */}
          <section id="section-3" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">3.</span> Cadastro e Elegibilidade
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>O cadastro na plataforma é permitido a usuários de qualquer idade.</p>
              <p>
                A participação em eventos pagos, incluindo campeonatos e quizzes com taxa de inscrição, é exclusiva 
                para maiores de 18 (dezoito) anos, sendo de responsabilidade do usuário o cumprimento dessa condição.
              </p>
              <p>A Zapions não se responsabiliza por informações falsas prestadas no momento do cadastro.</p>
            </div>
          </section>

          {/* Seção 4 */}
          <section id="section-4" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">4.</span> Condutas Permitidas e Proibidas
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p>
                O usuário compromete-se a utilizar a plataforma de forma ética, responsável e em conformidade com a 
                legislação vigente.
              </p>
              <div>
                <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  É expressamente proibido:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Praticar, incentivar ou divulgar qualquer ato ilícito;</li>
                  <li>Publicar conteúdos que façam apologia a crimes ou atividades ilegais;</li>
                  <li>Utilizar linguagem ofensiva, discriminatória, ameaçadora ou que viole direitos de terceiros;</li>
                  <li>Publicar conteúdos de cunho sexual explícito, violento ou inadequado;</li>
                  <li>Utilizar imagens de perfil ou conteúdos que violem direitos autorais, de imagem ou de personalidade;</li>
                  <li>Tentar fraudar resultados, sistemas de pontuação ou mecanismos da plataforma;</li>
                  <li>Utilizar a plataforma para fins diversos daqueles a que se destina.</li>
                </ul>
              </div>
              <p>
                O descumprimento dessas regras poderá resultar em bloqueio temporário ou exclusão definitiva da 
                conta, sem aviso prévio.
              </p>
            </div>
          </section>

          {/* Seção 5 */}
          <section id="section-5" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">5.</span> Campeonatos, Bolões e Taxas
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-4">
              <p>
                Os participantes não são cobrados pela Zapions para ingressar em campeonatos organizados por 
                terceiros (MESTRE DOS BOLÕES).
              </p>
              <p>
                Poderão existir campeonatos e quizzes com taxa de inscrição, cujo objetivo é a formação de 
                premiação, sendo a gestão financeira de responsabilidade do organizador do evento.
              </p>
              <Card className="p-4 border-accent bg-accent/10">
                <p className="flex items-center gap-2 font-medium text-foreground mb-2">
                  <Star className="h-4 w-4 text-accent" />
                  Regra exclusiva:
                </p>
                <p>
                  Campeonatos e quizzes organizados diretamente pela Zapions poderão conter taxa administrativa, 
                  previamente informada em página específica do evento.
                </p>
              </Card>
            </div>
          </section>

          {/* Seção 6 */}
          <section id="section-6" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">6.</span> Palpites e Prazos
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>Os palpites devem ser realizados dentro do prazo estabelecido para cada evento.</p>
              <p>
                A plataforma não permite tecnicamente a realização de palpites fora do prazo. A perda do prazo 
                implica, automaticamente, a impossibilidade de participação naquela rodada, sem direito a 
                compensações.
              </p>
              <p>A Zapions não se responsabiliza por palpites não realizados dentro do período permitido.</p>
            </div>
          </section>

          {/* Seção 7 */}
          <section id="section-7" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">7.</span> Pontuação e Resultados
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                Os critérios de pontuação poderão variar conforme o campeonato ou quiz e serão informados 
                previamente na página específica do evento.
              </p>
              <p>
                A Zapions reserva-se o direito de ajustar regras de pontuação em campeonatos organizados pela 
                própria plataforma, sempre com transparência aos participantes.
              </p>
            </div>
          </section>

          {/* Seção 8 */}
          <section id="section-8" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">8.</span> Quizzes e Natureza Recreativa
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                Os quizzes disponibilizados pela Zapions possuem caráter recreativo e educativo, não envolvendo 
                previsões sobre eventos futuros, resultados ou qualquer modalidade que possa caracterizar jogo de 
                azar.
              </p>
              <p>Esta regra aplica-se exclusivamente a quizzes organizados pela plataforma Zapions.</p>
            </div>
          </section>

          {/* Seção 9 */}
          <section id="section-9" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">9.</span> Premiações (Regra Exclusiva)
            </h2>
            <Card className="p-4 border-accent bg-accent/10">
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p className="flex items-center gap-2 font-medium text-foreground mb-2">
                  <Star className="h-4 w-4 text-accent" />
                  Regra Exclusiva da Plataforma
                </p>
                <p>
                  Nos campeonatos e quizzes organizados diretamente pela Zapions, o pagamento das premiações 
                  ocorrerá em até 5 (cinco) dias úteis, contados a partir da confirmação do resultado final e do 
                  fornecimento correto dos dados necessários pelo vencedor.
                </p>
                <p>O prazo poderá ser excepcionalmente estendido em situações alheias ao controle da plataforma.</p>
                <p>
                  A Zapions não se responsabiliza por premiações de eventos organizados por terceiros (MESTRE DOS 
                  BOLÕES).
                </p>
              </div>
            </Card>
          </section>

          {/* Seção 10 */}
          <section id="section-10" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">10.</span> Responsabilidades
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p>A Zapions atua como plataforma intermediadora, não sendo responsável por:</p>
              <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                <li>Pagamentos, premiações ou obrigações assumidas por organizadores terceiros;</li>
                <li>Conteúdos publicados por usuários;</li>
                <li>Falhas decorrentes de mau uso da plataforma ou informações incorretas fornecidas pelos usuários.</li>
              </ul>
            </div>
          </section>

          {/* Seção 11 */}
          <section id="section-11" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">11.</span> Suspensão e Encerramento de Contas
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zapions poderá, a seu critério, suspender ou encerrar contas que violem estes Termos ou a legislação 
              vigente, sem necessidade de aviso prévio.
            </p>
          </section>

          {/* Seção 12 */}
          <section id="section-12" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">12.</span> Foro
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Fica eleito o foro da Comarca de Belo Horizonte/MG para dirimir quaisquer controvérsias oriundas 
              destes Termos de Uso, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          {/* Seção 13 */}
          <section id="section-13" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">13.</span> Disposições Finais
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                A Zapions poderá atualizar estes Termos de Uso a qualquer tempo. Recomenda-se que o usuário revise 
                periodicamente este documento.
              </p>
              <p>O uso contínuo da plataforma após alterações implica concordância com os novos termos.</p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
