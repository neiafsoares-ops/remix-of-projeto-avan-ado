import { useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Shield, Database, Lock, Users, Cookie, Clock, UserCheck, Mail, RefreshCw, FileCheck } from 'lucide-react';

const sections = [
  { id: 1, title: 'Introdução', icon: Shield },
  { id: 2, title: 'Dados Coletados', icon: Database },
  { id: 3, title: 'Finalidade do Uso dos Dados', icon: FileCheck },
  { id: 4, title: 'Eventos Pagos e Premiações', icon: Users },
  { id: 5, title: 'Compartilhamento de Dados', icon: Users },
  { id: 6, title: 'Cookies e Tecnologias Semelhantes', icon: Cookie },
  { id: 7, title: 'Segurança das Informações', icon: Lock },
  { id: 8, title: 'Retenção dos Dados', icon: Clock },
  { id: 9, title: 'Direitos dos Usuários', icon: UserCheck },
  { id: 10, title: 'Canal de Contato', icon: Mail },
  { id: 11, title: 'Atualizações desta Política', icon: RefreshCw },
  { id: 12, title: 'Disposições Finais', icon: FileCheck },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Política de Privacidade – Zapions</h1>
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
                    href={`#privacy-section-${section.id}`}
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
          <section id="privacy-section-1" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">1.</span> Introdução
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                A Zapions é uma plataforma digital de gerenciamento de campeonatos, bolões e quizzes online, 
                comprometida com a proteção dos dados pessoais de seus usuários e com o cumprimento da 
                Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).
              </p>
              <p>
                Esta Política de Privacidade tem como objetivo explicar, de forma clara e transparente, 
                como os dados pessoais são coletados, utilizados, armazenados e protegidos no âmbito da plataforma.
              </p>
            </div>
          </section>

          {/* Seção 2 */}
          <section id="privacy-section-2" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">2.</span> Dados Coletados
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p className="mb-3">
                A Zapions poderá coletar as seguintes informações, conforme necessárias para o funcionamento da plataforma:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Nome, apelido ou identificação escolhida pelo usuário;</li>
                <li>Endereço de e-mail;</li>
                <li>Senha de acesso (armazenada de forma segura e criptografada);</li>
                <li>Dados de acesso e navegação, como endereço IP, data, horário e informações do dispositivo;</li>
                <li>Informações fornecidas voluntariamente pelo usuário;</li>
                <li>Dados necessários para pagamento de premiações ou taxas, quando aplicável.</li>
              </ul>
            </div>
          </section>

          {/* Seção 3 */}
          <section id="privacy-section-3" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">3.</span> Finalidade do Uso dos Dados
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p className="mb-3">Os dados coletados são utilizados exclusivamente para:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Criação, autenticação e gerenciamento de contas;</li>
                <li>Funcionamento de campeonatos, bolões e quizzes;</li>
                <li>Comunicação com usuários;</li>
                <li>Processamento de pagamentos e premiações, quando aplicável;</li>
                <li>Cumprimento de obrigações legais e regulatórias;</li>
                <li>Garantia da segurança, prevenção de fraudes e melhoria da plataforma.</li>
              </ul>
            </div>
          </section>

          {/* Seção 4 */}
          <section id="privacy-section-4" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">4.</span> Eventos Pagos e Premiações
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                Em eventos pagos ou que envolvam premiações, a Zapions poderá solicitar dados adicionais 
                estritamente necessários para a realização de pagamentos ou entrega de prêmios.
              </p>
              <p>
                Esses dados serão utilizados apenas para essa finalidade específica e mantidos pelo tempo 
                necessário para cumprimento de obrigações legais.
              </p>
            </div>
          </section>

          {/* Seção 5 */}
          <section id="privacy-section-5" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">5.</span> Compartilhamento de Dados
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p className="mb-3 font-medium text-foreground">
                A Zapions não comercializa dados pessoais.
              </p>
              <p className="mb-3">O compartilhamento poderá ocorrer apenas quando necessário para:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Provedores de hospedagem e infraestrutura tecnológica;</li>
                <li>Serviços de pagamento e instituições financeiras;</li>
                <li>APIs e serviços técnicos essenciais ao funcionamento da plataforma;</li>
                <li>Cumprimento de determinações legais ou ordens judiciais.</li>
              </ul>
            </div>
          </section>

          {/* Seção 6 */}
          <section id="privacy-section-6" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">6.</span> Cookies e Tecnologias Semelhantes
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p className="mb-3">A plataforma poderá utilizar cookies e tecnologias similares para:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                <li>Garantir o funcionamento adequado do sistema;</li>
                <li>Manter sessões de login;</li>
                <li>Melhorar a experiência do usuário;</li>
                <li>Coletar dados estatísticos de uso.</li>
              </ul>
              <p>
                O usuário pode, a qualquer momento, configurar seu navegador para bloquear cookies, 
                ciente de que algumas funcionalidades poderão ser limitadas.
              </p>
            </div>
          </section>

          {/* Seção 7 */}
          <section id="privacy-section-7" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">7.</span> Segurança das Informações
            </h2>
            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p className="flex items-center gap-2 font-medium text-foreground mb-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Proteção de Dados
                </p>
                <p>
                  A Zapions adota medidas técnicas e administrativas razoáveis para proteger os dados 
                  pessoais contra acessos não autorizados, perda, alteração ou divulgação indevida.
                </p>
                <p>
                  Apesar disso, nenhum sistema é totalmente imune a falhas, não sendo possível garantir 
                  segurança absoluta.
                </p>
              </div>
            </Card>
          </section>

          {/* Seção 8 */}
          <section id="privacy-section-8" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">8.</span> Retenção dos Dados
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p className="mb-3">Os dados pessoais serão armazenados:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Enquanto a conta do usuário estiver ativa;</li>
                <li>Pelo período necessário para cumprimento de obrigações legais;</li>
                <li>Ou até solicitação de exclusão, quando legalmente possível.</li>
              </ul>
            </div>
          </section>

          {/* Seção 9 */}
          <section id="privacy-section-9" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">9.</span> Direitos dos Usuários
            </h2>
            <div className="text-muted-foreground leading-relaxed">
              <p className="mb-3">Nos termos da LGPD, o usuário poderá solicitar:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Confirmação da existência de tratamento de dados;</li>
                <li>Acesso aos seus dados pessoais;</li>
                <li>Correção de dados incompletos ou desatualizados;</li>
                <li>Exclusão de dados, quando aplicável;</li>
                <li>Revogação de consentimento.</li>
              </ul>
            </div>
          </section>

          {/* Seção 10 */}
          <section id="privacy-section-10" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">10.</span> Canal de Contato
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A Zapions disponibilizará canal oficial para atendimento de solicitações relacionadas 
              à privacidade e proteção de dados, o qual será informado na própria plataforma.
            </p>
          </section>

          {/* Seção 11 */}
          <section id="privacy-section-11" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">11.</span> Atualizações desta Política
            </h2>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                Esta Política de Privacidade poderá ser atualizada a qualquer momento para refletir 
                melhorias, ajustes legais ou mudanças operacionais.
              </p>
              <p>Recomenda-se que o usuário revise este documento periodicamente.</p>
            </div>
          </section>

          {/* Seção 12 */}
          <section id="privacy-section-12" className="scroll-mt-20">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="text-primary">12.</span> Disposições Finais
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao utilizar a plataforma Zapions, o usuário declara ciência e concordância com esta 
              Política de Privacidade.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}
