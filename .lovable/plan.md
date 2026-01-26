
## Plano: Sistema de Notificações com Ícone de Sino

### Objetivo

Criar um sistema centralizado de notificações com um ícone de sino (Bell) na Navbar, exibindo diferentes tipos de alertas para os usuários, com funcionalidades específicas para Mestres do Bolão.

---

### Tipos de Notificações

| Tipo | Destinatário | Descrição |
|------|--------------|-----------|
| `invitation_received` | Todos | Convite recebido para participar de bolão |
| `message_received` | Todos | Mensagem recebida (futuro) |
| `round_updated` | Participantes | Rodada atualizada com novos jogos ou placares |
| `new_suggestion` | Todos | Nova sugestão Zapions adicionada |
| `plan_expiring` | Mestres | Aviso 30 dias antes do vencimento do pacote |
| `new_participant` | Mestres | Novo participante ou convite para bolão criado |
| `moderator_action` | Mestres | Ações de moderadores (aprovação, remoção) |
| `scores_updated` | Participantes | Placares atualizados em uma rodada |

---

### Estrutura do Banco de Dados

```text
notifications
├── id (uuid, PK)
├── user_id (uuid, FK -> auth.users) - destinatário
├── type (text) - tipo da notificação
├── title (text) - título curto
├── message (text) - descrição
├── data (jsonb) - dados extras (pool_id, round_id, etc)
├── is_read (boolean, default: false)
├── created_at (timestamp)
└── read_at (timestamp, nullable)
```

**RLS Policies:**
- SELECT: usuário pode ver apenas suas notificações
- UPDATE: usuário pode marcar como lida
- DELETE: usuário pode remover suas notificações

**Realtime:** Habilitar para atualizações em tempo real

---

### Componentes a Criar

#### 1. NotificationBell (Navbar)

Ícone de sino com badge de contagem de não lidas:

```text
┌─────────────────────────────────────────────┐
│  [Logo]  Bolões  Meus Palpites  [🔔3] [👤] │
└─────────────────────────────────────────────┘
```

**Comportamento:**
- Badge vermelho com número quando há notificações não lidas
- Ao clicar, abre dropdown com lista de notificações recentes
- Link "Ver todas" para página dedicada (opcional)

#### 2. NotificationDropdown

Lista de notificações recentes com:
- Ícone por tipo (Mail, Trophy, Star, Clock, etc)
- Título e preview da mensagem
- Tempo relativo ("há 5 minutos")
- Indicador visual de não lida
- Ação de marcar como lida ao clicar

#### 3. Hook: useNotifications

```typescript
// Funcionalidades:
- Buscar notificações do usuário
- Contagem de não lidas
- Marcar como lida
- Marcar todas como lidas
- Subscription realtime para novas notificações
```

---

### Triggers para Criar Notificações

| Evento | Trigger/Função | Notificação Criada |
|--------|----------------|-------------------|
| Novo convite | INSERT em `pool_invitations` | Para o convidado |
| Nova sugestão | INSERT em `suggested_pools` | Para todos Mestres |
| Placar atualizado | UPDATE em `matches` (score changed) | Para participantes do pool |
| Rodada atualizada | INSERT em `matches` | Para participantes do pool |
| Novo participante | INSERT em `pool_participants` | Para criador do pool |
| Plano expirando | CRON (verificar diariamente) | Para Mestres com < 30 dias |

---

### Fluxo de Implementação

**Fase 1: Infraestrutura**
1. Criar tabela `notifications` com RLS
2. Habilitar realtime na tabela
3. Criar funções helper para inserir notificações

**Fase 2: UI**
1. Criar hook `useNotifications`
2. Criar componente `NotificationBell`
3. Integrar na Navbar (desktop e mobile)

**Fase 3: Triggers de Eventos**
1. Trigger para convites
2. Trigger para novas sugestões
3. Trigger para atualizações de placar
4. Trigger para novos participantes

**Fase 4: Notificações de Mestres**
1. Lógica para verificar expiração de plano
2. Notificações de ações de moderadores

---

### Detalhes da UI

**NotificationBell no Desktop:**
```text
┌──────────────────────────────────────┐
│  🔔                                  │
│  ├── Badge: número de não lidas      │
│  └── Dropdown ao clicar:             │
│      ┌─────────────────────────────┐ │
│      │ Notificações           ✓All │ │
│      ├─────────────────────────────┤ │
│      │ 📧 Convite para Copa 2025   │ │
│      │    de @zapions • há 5min    │ │
│      ├─────────────────────────────┤ │
│      │ ⭐ Nova sugestão Zapions    │ │
│      │    Brasileirão 2026 • 1h    │ │
│      ├─────────────────────────────┤ │
│      │ 📊 Placares atualizados     │ │
│      │    Copa Zapions • 2h        │ │
│      └─────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Mobile:**
- Sino aparece junto aos outros ícones
- Toque abre sheet/drawer com lista completa

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/notifications.sql` | Criar tabela e triggers |
| `src/hooks/use-notifications.ts` | Hook para gerenciar notificações |
| `src/components/notifications/NotificationBell.tsx` | Ícone com badge |
| `src/components/notifications/NotificationDropdown.tsx` | Lista de notificações |
| `src/components/notifications/NotificationItem.tsx` | Item individual |
| `src/components/layout/Navbar.tsx` | Integrar NotificationBell |

---

### Ícones por Tipo de Notificação

| Tipo | Ícone | Cor |
|------|-------|-----|
| invitation_received | Mail | primary |
| message_received | MessageSquare | blue |
| round_updated | Calendar | green |
| new_suggestion | Star | yellow |
| plan_expiring | AlertTriangle | orange |
| new_participant | UserPlus | green |
| moderator_action | Shield | purple |
| scores_updated | Trophy | primary |

---

### Exemplos de Notificações

**Convite Recebido:**
```json
{
  "type": "invitation_received",
  "title": "Convite para bolão",
  "message": "zapions convidou você para Copa 2025",
  "data": { "pool_id": "...", "inviter_name": "zapions" }
}
```

**Plano Expirando (Mestre):**
```json
{
  "type": "plan_expiring",
  "title": "Seu plano vence em breve",
  "message": "Seu plano Mestre expira em 28 dias. Renove para continuar!",
  "data": { "days_remaining": 28, "plan_type": "intermediario" }
}
```

**Novo Participante (Mestre):**
```json
{
  "type": "new_participant",
  "title": "Novo participante",
  "message": "joaosilva entrou no seu bolão Copa 2025",
  "data": { "pool_id": "...", "participant_name": "joaosilva" }
}
```

---

### Comportamento Esperado

1. **Ao receber notificação:** Badge aparece/atualiza no sino
2. **Ao clicar no sino:** Dropdown abre com lista recente
3. **Ao clicar em notificação:** Marca como lida e navega (se aplicável)
4. **"Marcar todas como lidas":** Limpa o badge
5. **Realtime:** Novas notificações aparecem instantaneamente

---

### Considerações de Performance

- Limitar dropdown a 10 notificações mais recentes
- Paginação para página completa de notificações
- Índices no banco: `user_id`, `is_read`, `created_at`
- Subscription realtime filtrada por `user_id`
