import { Layout } from '@/components/layout/Layout';
import { useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqItems = [
  {
    question: 'O que encontro no Zapions?',
    answer: `O Zapions reúne diferentes formatos de entretenimento para quem ama futebol, competição e resenha entre amigos.

• **Bolões** – Crie ou participe de bolões com pontuação escalonável conforme o nível de acerto.
• **Quiz 10** – Responda 10 perguntas de múltipla escolha sobre os jogos da rodada. Se ninguém atingir a pontuação mínima, o prêmio acumula.
• **Time Mestre** – Escolha seu time e dê o palpite de placar. A premiação sai apenas para acertos exatos e acumula em caso de derrota.

Tudo pensado para deixar cada rodada mais divertida e competitiva.`,
  },
  {
    question: 'O Zapions é gratuito?',
    answer:
      'Sim. Criar conta e participar de bolões básicos é 100% gratuito. Você pode jogar, criar ligas e competir com amigos sem pagar nada.',
  },
  {
    question: 'O Zapions é responsável por todos os bolões e premiações da plataforma?',
    answer:
      'Não. Existem bolões oficiais do Zapions, mas muitos são criados por organizadores independentes. Regras, valores e premiações são de responsabilidade do organizador de cada bolão.',
  },
  {
    question: 'Posso participar de mais de um bolão?',
    answer:
      'Sim. Você pode participar de quantos bolões quiser, respeitando apenas as regras definidas por cada organizador.',
  },
  {
    question: 'Como o ranking é atualizado?',
    answer:
      'Nosso sistema calcula automaticamente a pontuação, os resultados e a classificação. Assim que os jogos terminam, o ranking é atualizado em tempo real.',
  },
  {
    question: 'Como os placares dos jogos reais são lançados?',
    answer:
      'Existem dois formatos: atualização manual pelo organizador do bolão ou atualização automática realizada pela equipe do Zapions e integrações com provedores de dados esportivos.',
  },
  {
    question: 'Tem premiação em dinheiro?',
    answer:
      'A premiação é definida por cada bolão. O Zapions fornece apenas a plataforma de controle e organização, não gerenciando pagamentos de terceiros.',
  },
  {
    question: 'Quais as vantagens de ser organizador (mestre) de bolões?',
    answer:
      'Você pode criar competições, definir regras, convidar participantes, gerenciar campeonatos e contar com resultados automáticos, tendo total controle sobre o evento.',
  },
  {
    question: 'Posso participar mais de uma vez do mesmo bolão, quiz ou Time Mestre?',
    answer:
      'Sim, quando o organizador permitir. Algumas competições liberam múltiplas participações (tickets), oferecendo mais chances e posições diferentes no ranking.',
  },
];

export default function FAQ() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <div className="container py-8 md:py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-full bg-primary/10">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">FAQ – Perguntas Frequentes</h1>
            <p className="text-muted-foreground mt-1">
              Tire suas dúvidas sobre o Zapions
            </p>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border rounded-lg px-4 bg-card shadow-sm"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-medium text-base md:text-lg">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-line">
                {item.answer.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="text-foreground">
                      {part}
                    </strong>
                  ) : (
                    part
                  )
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Layout>
  );
}
