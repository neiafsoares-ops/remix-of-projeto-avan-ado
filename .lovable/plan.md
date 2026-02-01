

## Plano: Múltiplos Palpites por Usuário (Sistema de Tickets)

### Objetivo

Permitir que um mesmo usuário participe mais de uma vez do mesmo bolão ou quiz utilizando tickets. Cada ticket representa uma participação independente com seus próprios palpites e pontuação.

---

### Visão Geral da Arquitetura

```text
ANTES (Modelo Atual)
┌─────────────────────────────────────────────────────────────────────┐
│ pool_participants                                                   │
│ ├── user_id (única participação por usuário)                       │
│ └── total_points (acumulado do usuário)                            │
│                                                                     │
│ predictions                                                         │
│ └── user_id → vinculado diretamente ao usuário                     │
└─────────────────────────────────────────────────────────────────────┘

DEPOIS (Modelo com Tickets)
┌─────────────────────────────────────────────────────────────────────┐
│ pools / quizzes                                                     │
│ └── allow_multiple_tickets: boolean (nova coluna)                  │
│                                                                     │
│ pool_participants / quiz_participants                               │
│ ├── user_id                                                         │
│ ├── ticket_number (novo: auto-incremento por pool/quiz)            │
│ └── total_points (acumulado do ticket)                             │
│                                                                     │
│ predictions / quiz_answers                                          │
│ └── participant_id (novo: referência ao ticket específico)         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Alterações no Banco de Dados

#### 1. Tabela `pools` - Adicionar configuração

```sql
ALTER TABLE pools
ADD COLUMN allow_multiple_tickets BOOLEAN DEFAULT false;
```

#### 2. Tabela `quizzes` - Adicionar configuração

```sql
ALTER TABLE quizzes
ADD COLUMN allow_multiple_tickets BOOLEAN DEFAULT false;
```

#### 3. Tabela `pool_participants` - Adicionar número do ticket

```sql
ALTER TABLE pool_participants
ADD COLUMN ticket_number INTEGER DEFAULT 1;

-- Atualizar registros existentes
UPDATE pool_participants 
SET ticket_number = 1 
WHERE ticket_number IS NULL;

-- Remover constraint de unicidade existente (user_id, pool_id)
-- e criar nova com ticket_number
ALTER TABLE pool_participants
DROP CONSTRAINT IF EXISTS pool_participants_pool_id_user_id_key;

ALTER TABLE pool_participants
ADD CONSTRAINT pool_participants_unique_ticket 
UNIQUE (pool_id, user_id, ticket_number);
```

#### 4. Tabela `quiz_participants` - Adicionar número do ticket

```sql
ALTER TABLE quiz_participants
ADD COLUMN ticket_number INTEGER DEFAULT 1;

UPDATE quiz_participants 
SET ticket_number = 1 
WHERE ticket_number IS NULL;

ALTER TABLE quiz_participants
DROP CONSTRAINT IF EXISTS quiz_participants_quiz_id_user_id_key;

ALTER TABLE quiz_participants
ADD CONSTRAINT quiz_participants_unique_ticket 
UNIQUE (quiz_id, user_id, ticket_number);
```

#### 5. Tabela `predictions` - Adicionar referência ao participante

```sql
ALTER TABLE predictions
ADD COLUMN participant_id UUID REFERENCES pool_participants(id);

-- Migrar dados existentes (vincular ao primeiro ticket do usuário)
UPDATE predictions p
SET participant_id = (
  SELECT pp.id 
  FROM pool_participants pp
  JOIN matches m ON m.pool_id = pp.pool_id
  WHERE m.id = p.match_id 
    AND pp.user_id = p.user_id 
    AND pp.ticket_number = 1
  LIMIT 1
);
```

#### 6. Tabela `quiz_answers` - Adicionar referência ao participante

```sql
ALTER TABLE quiz_answers
ADD COLUMN participant_id UUID REFERENCES quiz_participants(id);

-- Migrar dados existentes
UPDATE quiz_answers qa
SET participant_id = (
  SELECT qp.id 
  FROM quiz_participants qp
  WHERE qp.quiz_id = qa.quiz_id 
    AND qp.user_id = qa.user_id 
    AND qp.ticket_number = 1
  LIMIT 1
);
```

---

### Alterações de Código

#### 1. Formulário de Criação - Pool (`CreatePoolWizard.tsx`)

**Adicionar no Step 1 (Configurações básicas):**

```text
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│ [Outros campos existentes...]                                          │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🎟️ Múltiplos Palpites                              [○ OFF ]      │  │
│ │    Permite que um mesmo usuário participe                        │  │
│ │    mais de uma vez usando tickets                                │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Componente com tooltip:**

```tsx
<TooltipProvider>
  <div className="flex items-center justify-between p-4 border rounded-lg">
    <div className="flex items-center gap-3">
      <Ticket className="h-5 w-5 text-muted-foreground" />
      <div className="flex items-center gap-1">
        <p className="font-medium">Múltiplos Palpites</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p>Permite que um mesmo usuário participe mais de uma vez 
            do bolão, cada participação gerando um ticket independente 
            com sua própria pontuação.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="text-sm text-muted-foreground">
        Permite participação múltipla via tickets
      </p>
    </div>
    <Switch
      checked={allowMultipleTickets}
      onCheckedChange={setAllowMultipleTickets}
    />
  </div>
</TooltipProvider>
```

#### 2. Formulário de Criação - Quiz (`CreateQuizDialog.tsx`)

Adicionar o mesmo componente de toggle com tooltip no diálogo de criação.

#### 3. Configuração do Pool (`PoolConfigTab.tsx` ou `PoolManage.tsx`)

Permitir editar a opção `allow_multiple_tickets` após criação:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Configurações do Bolão                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 🎟️ Múltiplos Palpites                                  [● ON ]    │
│    Atualmente: 3 usuários com múltiplos tickets                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4. Página de Detalhe do Pool (`PoolDetail.tsx`)

**Modificar fluxo de entrada:**

```tsx
// Se allow_multiple_tickets está ativo
const handleJoinPool = async () => {
  // Obter próximo número de ticket para o usuário
  const { data: existingTickets } = await supabase
    .from('pool_participants')
    .select('ticket_number')
    .eq('pool_id', id)
    .eq('user_id', user.id)
    .order('ticket_number', { ascending: false })
    .limit(1);

  const nextTicketNumber = existingTickets?.length 
    ? existingTickets[0].ticket_number + 1 
    : 1;

  await supabase.from('pool_participants').insert({
    pool_id: id,
    user_id: user.id,
    ticket_number: nextTicketNumber,
    status: needsApproval ? 'pending' : 'active',
  });
};
```

**Adicionar seletor de ticket quando usuário tem múltiplos:**

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🎟️ Seus Tickets                                                    │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐                  │
│ │Ticket 1 │ │Ticket 2 │ │Ticket 3 │ │ + Novo    │                  │
│ │ ●       │ │         │ │         │ │           │                  │
│ └─────────┘ └─────────┘ └─────────┘ └───────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5. Sistema de Palpites (`MatchCard.tsx`, `handlePredictionChange`)

Modificar para vincular palpite ao `participant_id` (ticket) em vez de apenas `user_id`:

```tsx
const handlePredictionChange = async (
  matchId: string, 
  homeScore: number, 
  awayScore: number,
  participantId: string  // Novo parâmetro
) => {
  await supabase.from('predictions').upsert({
    match_id: matchId,
    user_id: user.id,
    participant_id: participantId,  // Vinculado ao ticket específico
    home_score: homeScore,
    away_score: awayScore,
  });
};
```

#### 6. Ranking (`PoolDetail.tsx` - Sidebar de Ranking)

**Antes:**
```text
Ranking
1. 🥇 @lucas         87 pts
2. 🥈 @maria         72 pts
3. 🥉 @pedro         65 pts
```

**Depois (com tickets):**
```text
Ranking
1. 🥇 @lucas – Ticket 001    87 pts
2. 🥈 @maria – Ticket 001    72 pts
3. 🥉 @lucas – Ticket 008    65 pts
4.    @lucas – Ticket 009    52 pts
5.    @pedro – Ticket 001    48 pts
```

**Código modificado:**

```tsx
interface RankedParticipant {
  id: string;
  user_id: string;
  ticket_number: number;
  total_points: number;
  public_id: string;
  full_name: string | null;
}

// Exibição no ranking
<div className="flex-1">
  <p className="font-medium">@{participant.public_id}</p>
  {pool.allow_multiple_tickets && (
    <p className="text-xs text-muted-foreground">
      Ticket {String(participant.ticket_number).padStart(3, '0')}
    </p>
  )}
</div>
```

#### 7. Detalhes do Participante (`RankingParticipantDetails.tsx`)

Modificar para receber e exibir informação do ticket:

```tsx
interface RankingParticipantDetailsProps {
  // ... props existentes
  ticketNumber?: number;
  allowMultipleTickets?: boolean;
}

// No header do dialog
<DialogDescription className="flex items-center gap-2">
  <Badge variant="outline" className="font-mono text-xs">
    ID: {String(participantNumericId).padStart(5, '0')}
  </Badge>
  {allowMultipleTickets && ticketNumber && (
    <>
      <span className="text-muted-foreground">•</span>
      <Badge variant="secondary" className="font-mono text-xs">
        Ticket {String(ticketNumber).padStart(3, '0')}
      </Badge>
    </>
  )}
</DialogDescription>
```

#### 8. Quiz - Mesmas Alterações

Aplicar padrão idêntico em:
- `CreateQuizDialog.tsx` - Adicionar toggle
- `QuizManage.tsx` - Configuração editável
- `QuizDetail.tsx` - Seletor de ticket e ranking por ticket
- `quiz_answers` - Vincular ao `participant_id`

---

### Regras de Negócio

#### Criação de Novo Ticket

```tsx
const canCreateNewTicket = (pool: Pool, userParticipation: Participant[]) => {
  // Não permitido se opção desativada
  if (!pool.allow_multiple_tickets) {
    return userParticipation.length === 0;
  }
  
  // Permitido sempre se opção ativada
  return true;
};
```

#### Cálculo de Pontos

Cada ticket tem sua própria pontuação calculada independentemente:

```tsx
// Ao finalizar rodada, calcular por participant_id
const calculatePoints = async (matchId: string, homeScore: number, awayScore: number) => {
  const predictions = await supabase
    .from('predictions')
    .select('id, participant_id, home_score, away_score')
    .eq('match_id', matchId);

  for (const pred of predictions) {
    const points = getPointsForPrediction(pred, homeScore, awayScore);
    
    // Atualizar pontos da predição
    await supabase.from('predictions')
      .update({ points_earned: points })
      .eq('id', pred.id);
    
    // Atualizar total do TICKET (não do usuário)
    await supabase.rpc('increment_participant_points', {
      participant_id: pred.participant_id,
      points_to_add: points,
    });
  }
};
```

---

### Políticas RLS

#### Atualizar RLS para predictions

```sql
-- Permitir inserção apenas se participant_id pertence ao usuário
CREATE POLICY "Users can create predictions for their tickets"
ON predictions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pool_participants pp
    WHERE pp.id = predictions.participant_id
    AND pp.user_id = auth.uid()
    AND pp.status = 'active'
  )
);
```

---

### Resumo dos Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Adicionar colunas e constraints |
| `CreatePoolWizard.tsx` | Modificar | Toggle "Múltiplos Palpites" com tooltip |
| `CreateQuizDialog.tsx` | Modificar | Toggle "Múltiplos Palpites" com tooltip |
| `PoolManage.tsx` | Modificar | Configuração editável |
| `QuizManage.tsx` | Modificar | Configuração editável |
| `PoolDetail.tsx` | Modificar | Seletor de tickets + ranking por ticket |
| `QuizDetail.tsx` | Modificar | Seletor de tickets + ranking por ticket |
| `MatchCard.tsx` | Modificar | Receber `participantId` |
| `RankingParticipantDetails.tsx` | Modificar | Exibir número do ticket |
| `src/lib/points-utils.ts` | Verificar | Garantir cálculo por ticket |

---

### Fluxo do Usuário

```text
1. Admin cria bolão com "Múltiplos Palpites" ativado
   ↓
2. Lucas entra no bolão → Ticket 001 criado automaticamente
   ↓
3. Lucas faz palpites para Ticket 001
   ↓
4. Lucas clica em "+ Novo Ticket" → Ticket 002 criado
   ↓
5. Lucas alterna entre tickets para fazer palpites diferentes
   ↓
6. Ranking lista: "Lucas – Ticket 001 (87pts)", "Lucas – Ticket 002 (52pts)"
   ↓
7. Cada ticket compete independentemente
```

---

### Interface do Seletor de Tickets

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Seus Tickets                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Ticket 1   │  │  Ticket 2   │  │  + Novo     │                 │
│  │  ─────────  │  │  ─────────  │  │             │                 │
│  │  87 pts     │  │  52 pts     │  │  Adicionar  │                 │
│  │  [Ativo ●]  │  │  [Selec.]   │  │  ticket     │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                     │
│  💡 Dica: Cada ticket compete de forma independente no ranking     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

