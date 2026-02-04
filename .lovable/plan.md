
## Plano: Corrigir Exclusão de Bolão + Confirmação com Senha para Bolões de Outros Usuários

### Problema Identificado

#### 1. Erro de Foreign Key
O erro `update or delete on table "pools" violates foreign key constraint "matches_pool_id_fkey" on table "matches"` ocorre porque a função `handleDeletePool` no **Admin.tsx** tenta excluir o pool diretamente sem remover as tabelas relacionadas primeiro.

**Tabelas com Foreign Keys para `pools`:**

| Tabela | Coluna FK | Referência |
|--------|-----------|------------|
| `matches` | pool_id | pools.id |
| `rounds` | pool_id | pools.id |
| `pool_participants` | pool_id | pools.id |
| `pool_invitations` | pool_id | pools.id |
| `mestre_pool_instances` | pool_id | pools.id |
| `predictions` | match_id | matches.id (indireta) |
| `round_limit_requests` | round_id | rounds.id (indireta) |

**Ordem correta de exclusão:**
1. predictions (via match_id)
2. round_limit_requests (via round_id)
3. matches
4. rounds  
5. pool_invitations
6. pool_participants
7. mestre_pool_instances
8. pools

#### 2. Falta de Proteção para Bolões de Outros Usuários
Administradores podem excluir bolões de outros usuários sem nenhuma confirmação adicional, correndo risco de exclusão acidental.

---

### Solução

#### 1. Novo Componente: `DeletePoolDialog`

**Arquivo:** `src/components/admin/DeletePoolDialog.tsx`

Um componente reutilizável que:
- Detecta se o bolão é do próprio usuário ou de outro
- Para bolões de outros: solicita senha do administrador
- Mostra alerta claro sobre a ação irreversível
- Executa a exclusão na ordem correta respeitando foreign keys

**Comportamento:**

```text
┌──────────────────────────────────────────────────────────┐
│  ⚠️ ATENÇÃO: Excluir Bolão de Outro Usuário             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Você está prestes a excluir o bolão "Copa 2025"        │
│  criado por @joao_silva                                  │
│                                                          │
│  Esta ação é IRREVERSÍVEL e removerá:                   │
│  • 45 jogos                                              │
│  • 320 palpites                                          │
│  • 25 participantes                                      │
│  • Todo o histórico de rodadas                          │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Para confirmar, digite sua senha:                       │
│  [________________________]                              │
│                                                          │
│  ☐ Confirmo que desejo excluir este bolão               │
│                                                          │
│         [Cancelar]          [Excluir Bolão]             │
└──────────────────────────────────────────────────────────┘
```

**Para bolões do próprio usuário:** Mostra apenas confirmação simples (sem senha).

#### 2. Função de Exclusão Completa

**Lógica de exclusão na ordem correta:**

```typescript
const handleDeletePool = async (poolId: string, adminPassword?: string) => {
  // 1. Se bolão de outro usuário, verificar senha
  if (isOtherUserPool && adminPassword) {
    // Reautenticar admin com supabase.auth.signInWithPassword
    const { error } = await supabase.auth.signInWithPassword({
      email: currentUserEmail,
      password: adminPassword
    });
    if (error) throw new Error('Senha incorreta');
  }

  // 2. Buscar IDs necessários
  const { data: rounds } = await supabase
    .from('rounds')
    .select('id')
    .eq('pool_id', poolId);
  
  const { data: matches } = await supabase
    .from('matches')
    .select('id')
    .eq('pool_id', poolId);

  const roundIds = rounds?.map(r => r.id) || [];
  const matchIds = matches?.map(m => m.id) || [];

  // 3. Excluir na ordem correta
  if (matchIds.length > 0) {
    await supabase.from('predictions').delete().in('match_id', matchIds);
  }
  
  if (roundIds.length > 0) {
    await supabase.from('round_limit_requests').delete().in('round_id', roundIds);
  }
  
  await supabase.from('matches').delete().eq('pool_id', poolId);
  await supabase.from('rounds').delete().eq('pool_id', poolId);
  await supabase.from('pool_invitations').delete().eq('pool_id', poolId);
  await supabase.from('pool_participants').delete().eq('pool_id', poolId);
  await supabase.from('mestre_pool_instances').delete().eq('pool_id', poolId);
  
  // 4. Finalmente excluir o pool
  await supabase.from('pools').delete().eq('id', poolId);
};
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/DeletePoolDialog.tsx` | **Criar** - Novo componente de exclusão com senha |
| `src/pages/Admin.tsx` | **Modificar** - Usar novo componente e corrigir ordem de exclusão |
| `src/pages/PoolManage.tsx` | **Modificar** - Adicionar exclusões faltantes (pool_invitations, round_limit_requests, mestre_pool_instances) |

---

### Detalhes Técnicos

#### DeletePoolDialog Props

```typescript
interface DeletePoolDialogProps {
  pool: {
    id: string;
    name: string;
    created_by: string;
    creator_public_id: string;
  };
  currentUserId: string;
  currentUserEmail: string;
  onDelete: () => void;
  onSuccess: () => void;
  children: React.ReactNode; // Trigger button
}
```

#### Estados do Dialog

| Estado | Descrição |
|--------|-----------|
| `isOwnPool` | Bolão é do próprio admin |
| `passwordRequired` | Precisa digitar senha (bolão de outro) |
| `password` | Valor da senha digitada |
| `confirmed` | Checkbox de confirmação |
| `deleting` | Carregando durante exclusão |
| `poolStats` | Estatísticas (jogos, palpites, participantes) |

---

### Fluxo de Exclusão

```text
Admin clica em "Excluir" no bolão
         ↓
    É bolão dele?
    /           \
  SIM           NÃO
   ↓             ↓
Dialog      Dialog com
simples     campo senha
   ↓             ↓
Confirma    Digita senha
checkbox    + confirma
   ↓             ↓
      Validações OK?
           ↓
  Executa exclusão cascata:
  1. predictions
  2. round_limit_requests
  3. matches
  4. rounds
  5. pool_invitations
  6. pool_participants  
  7. mestre_pool_instances
  8. pools
           ↓
  Toast de sucesso + atualiza lista
```

---

### Correção Adicional no PoolManage.tsx

A função `handleDeletePool` atual (linhas 913-973) já tem a lógica correta para a maioria das tabelas, mas precisa adicionar:

```typescript
// Após deletar predictions e antes de matches:

// Delete round_limit_requests
const roundIds = rounds.map(r => r.id);
if (roundIds.length > 0) {
  const { error: limitError } = await supabase
    .from('round_limit_requests')
    .delete()
    .in('round_id', roundIds);
  if (limitError) throw limitError;
}

// Delete pool_invitations
const { error: invError } = await supabase
  .from('pool_invitations')
  .delete()
  .eq('pool_id', pool.id);
if (invError) throw invError;

// Delete mestre_pool_instances
const { error: mestreError } = await supabase
  .from('mestre_pool_instances')
  .delete()
  .eq('pool_id', pool.id);
if (mestreError) throw mestreError;
```

---

### Resultado Esperado

1. **Erro resolvido**: Exclusão de bolões funciona sem erros de foreign key
2. **Segurança**: Admin deve digitar senha para excluir bolões de outros usuários
3. **Clareza**: Alerta visual destacado para evitar exclusões acidentais
4. **Transparência**: Mostra estatísticas do que será excluído (X jogos, Y palpites, Z participantes)
