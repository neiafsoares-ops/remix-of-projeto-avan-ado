
## Plano: Padronização de Uso e Visualização de Tickets

### Objetivo
Implementar um padrão único de visualização e navegação entre tickets para **Torcida Mestre**, **Bolão Tradicional** e **Quiz 10**, mantendo todas as regras de pontuação e pagamento existentes.

---

## Análise do Estado Atual

| Produto | Suporte a Múltiplos Tickets | Menu de Tickets | Fluxo Sequencial | Transparência |
|---------|----------------------------|-----------------|------------------|---------------|
| Bolão | Parcial (TicketSelector) | Básico | Não | Não |
| Quiz 10 | Parcial | Não | Não | Não |
| Torcida Mestre | Parcial (DB) | Não | Não | Parcial |

O componente `TicketSelector` já existe mas só é usado no Bolão e não implementa o fluxo sequencial nem mostra status detalhado.

---

## Arquitetura da Solução

### 1. Novo Componente Reutilizável: `TicketStatusPanel`

**Arquivo:** `src/components/TicketStatusPanel.tsx`

Um painel/menu fixo e visível que mostra todos os tickets do usuário na rodada atual:

```text
┌────────────────────────────────────────┐
│  Tickets da Rodada                     │
├────────────────────────────────────────┤
│  ✔ Ticket 1 – Palpitado (2x0)         │
│  ✔ Ticket 2 – Palpitado (3x0)         │
│  ⏳ Ticket 3 – Ainda não palpitou      │
│  ⏳ Ticket 4 – Ainda não palpitou      │
└────────────────────────────────────────┘
```

**Props:**
```typescript
interface TicketStatusPanelProps {
  tickets: {
    id: string;
    ticket_number: number;
    prediction?: { home_score: number; away_score: number } | null;
    status: 'filled' | 'empty';
  }[];
  activeTicketId: string;
  onTicketSelect: (ticketId: string) => void;
  variant: 'torcida-mestre' | 'pool' | 'quiz';
}
```

### 2. Componente de Alerta: `DuplicatePredictionAlert`

**Arquivo:** `src/components/DuplicatePredictionAlert.tsx`

Alerta modal exclusivo para Torcida Mestre quando detectar placar repetido:

```text
⚠️ Você já possui esse mesmo placar em outro ticket desta rodada.
   Deseja continuar mesmo assim?

   [Alterar placar]  [Continuar]
```

### 3. Componente de Transparência: `RoundPredictionsTable`

**Arquivo:** `src/components/torcida-mestre/RoundPredictionsTable.tsx`

Tabela visível após encerramento do prazo (exclusivo Torcida Mestre):

| Usuário | Ticket | Placar |
|---------|--------|--------|
| @joao | #1 | 2x0 |
| @marcio | #1 | 1x0 |
| @joao | #2 | 3x2 |

---

## Alterações por Produto

### Torcida Mestre

**Arquivos a modificar:**
- `src/pages/TorcidaMestreDetail.tsx`
- `src/components/torcida-mestre/TorcidaMestreRoundCard.tsx`

**Funcionalidades:**

1. **Menu de Tickets (TicketStatusPanel)**
   - Listar todos os tickets do usuário na rodada
   - Mostrar status: palpitado (✔) ou pendente (⏳)
   - Exibir placar se já preenchido
   - Permitir clicar para editar (se prazo aberto)

2. **Fluxo Sequencial**
   - Após salvar Ticket N → abrir automaticamente Ticket N+1
   - Se todos preenchidos → mostrar resumo
   - Se sair com tickets vazios → exibir alerta

3. **Alerta de Placar Repetido**
   - Ao salvar, verificar se placar já existe em outro ticket
   - Mostrar `DuplicatePredictionAlert` para confirmação

4. **Transparência Após Deadline**
   - Após encerramento: bloquear edições
   - Exibir `RoundPredictionsTable` com todos os palpites
   - Resumo por usuário: "João — 8 Tickets — Rodada 2"

**Mudanças específicas em `TorcidaMestreDetail.tsx`:**
- Alterar lógica de `userParticipant` para retornar TODOS os tickets do usuário (não apenas o primeiro)
- Adicionar estado `activeTicketId` e `userTickets`
- Integrar `TicketStatusPanel` no layout
- Implementar callback `onNextTicket` no `TorcidaMestreRoundCard`

### Bolão Tradicional

**Arquivos a modificar:**
- `src/pages/PoolDetail.tsx`

**Funcionalidades:**

1. **Menu de Tickets (TicketStatusPanel)**
   - Integrar acima da lista de jogos
   - Mostrar quantos jogos foram palpitados por ticket
   - Exemplo: "Ticket 1 – 8/10 jogos"

2. **Melhorar TicketSelector Existente**
   - Atualizar para usar o novo padrão visual
   - Adicionar indicador de preenchimento

**Mudanças específicas:**
- Substituir/complementar `TicketSelector` com `TicketStatusPanel`
- Mostrar progresso de preenchimento por ticket

### Quiz 10

**Arquivos a modificar:**
- `src/pages/QuizDetail.tsx`

**Funcionalidades:**

1. **Menu de Tickets (TicketStatusPanel)**
   - Mostrar tickets e quantas perguntas foram respondidas
   - Exemplo: "Ticket 1 – 10/10 respondidas"

2. **Navegação Entre Tickets**
   - Permitir trocar de ticket a qualquer momento
   - Manter respostas independentes por ticket

---

## Novos Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/TicketStatusPanel.tsx` | Menu de status de tickets (reutilizável) |
| `src/components/DuplicatePredictionAlert.tsx` | Alerta de placar repetido |
| `src/components/torcida-mestre/RoundPredictionsTable.tsx` | Tabela de transparência |

---

## Fluxo Sequencial Detalhado (Torcida Mestre)

```text
1. Usuário entra na rodada com 4 tickets
2. Sistema abre Ticket 1 para palpite
3. Usuário preenche 2x0 e salva
4. Sistema:
   a) Verifica se placar é repetido → se sim, mostra alerta
   b) Salva palpite
   c) Abre automaticamente Ticket 2
5. Repete até Ticket 4
6. Se usuário sair antes:
   → "⚠️ Você ainda possui 2 tickets não utilizados nesta rodada."
```

---

## Mudanças no Banco de Dados

Não são necessárias alterações no schema. A estrutura atual já suporta:
- Múltiplos tickets por usuário (`ticket_number`)
- Predictions vinculadas a `participant_id`

---

## Componentes Existentes a Reutilizar

| Componente | Uso |
|------------|-----|
| `TicketSelector.tsx` | Base para o novo `TicketStatusPanel` |
| `TorcidaMestreRoundCard.tsx` | Adicionar props para fluxo sequencial |
| `AlertDialog` (shadcn) | Para `DuplicatePredictionAlert` |
| `Table` (shadcn) | Para `RoundPredictionsTable` |

---

## Estimativa de Complexidade

| Tarefa | Complexidade |
|--------|-------------|
| TicketStatusPanel | Média |
| DuplicatePredictionAlert | Baixa |
| RoundPredictionsTable | Média |
| Integração Torcida Mestre | Alta |
| Integração Bolão | Média |
| Integração Quiz | Média |

---

## Resumo Visual Final

### Torcida Mestre (Mais Completo)
- ✔ Menu de tickets com status
- ✔ Fluxo sequencial automático
- ✔ Alerta de placar repetido
- ✔ Tabela de transparência após deadline
- ✔ Resumo por usuário

### Bolão Tradicional
- ✔ Menu de tickets com status
- ✔ Indicador de preenchimento por ticket
- ❌ Sem fluxo sequencial (usuário escolhe jogos livremente)

### Quiz 10
- ✔ Menu de tickets com status
- ✔ Indicador de respostas por ticket
- ❌ Sem fluxo sequencial (usuário escolhe perguntas livremente)
