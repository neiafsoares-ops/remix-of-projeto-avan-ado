

## Plano: Criar Notificações no Painel Administrativo

### Objetivo

Adicionar uma nova aba/seção no painel administrativo que permite ao administrador criar notificações personalizadas para enviar a grupos específicos de usuários.

---

### Funcionalidades

| Campo | Descrição | Validação |
|-------|-----------|-----------|
| Título | Título da notificação | Máximo 40 caracteres |
| Corpo | Mensagem da notificação | Máximo 150 caracteres |
| Público-alvo | Quem receberá a notificação | Seleção: Todos, Moderadores, Mestres |

---

### Opções de Público-alvo

| Opção | Descrição | Query para obter usuários |
|-------|-----------|---------------------------|
| `all` | Todos os usuários | Todos os registros em `profiles` |
| `moderators` | Usuários com role `moderator` | `user_roles` onde `role = 'moderator'` |
| `mestres` | Usuários com plano Mestre ativo | `mestre_plans` onde `is_active = true` |

---

### Estrutura da UI

```text
┌─────────────────────────────────────────────────────────────┐
│ Criar Notificação                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Título *                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Aviso importante                            32/40  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Mensagem *                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Esta é uma mensagem de teste para todos os         │   │
│  │ usuários da plataforma.                   85/150   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Público-alvo *                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [○] Todos os usuários                               │   │
│  │ [○] Apenas Moderadores                              │   │
│  │ [○] Apenas Mestres                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [ Preview da Notificação ]                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📢 Aviso importante                                 │   │
│  │    Esta é uma mensagem de teste para todos os       │   │
│  │    usuários da plataforma.                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                        [Enviar Notificação] │
└─────────────────────────────────────────────────────────────┘
```

---

### Tipo de Notificação

Adicionar um novo tipo `admin_broadcast` para identificar notificações criadas pelo admin:

```typescript
export type NotificationType = 
  // ... tipos existentes
  | 'admin_broadcast';  // NOVO
```

---

### Componentes a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/CreateNotificationForm.tsx` | **Criar** - Formulário para criar notificações |
| `src/pages/Admin.tsx` | **Modificar** - Adicionar nova aba "Notificações" |
| `src/hooks/use-notifications.ts` | **Modificar** - Adicionar tipo `admin_broadcast` |
| `src/components/notifications/NotificationItem.tsx` | **Modificar** - Adicionar ícone para `admin_broadcast` |

---

### Fase 1: Atualizar Tipos e Ícones

**`use-notifications.ts`** - Adicionar novo tipo:
```typescript
export type NotificationType = 
  // ... existentes
  | 'admin_broadcast';
```

**`NotificationItem.tsx`** - Adicionar ícone:
```typescript
import { Megaphone } from 'lucide-react';

const iconMap = {
  // ... existentes
  admin_broadcast: { icon: Megaphone, colorClass: 'text-accent' },
};
```

---

### Fase 2: Criar Componente CreateNotificationForm

**Estrutura do componente:**

```typescript
// Props
interface CreateNotificationFormProps {
  onSuccess?: () => void;
}

// Estado do formulário
interface FormState {
  title: string;        // max 40 chars
  message: string;      // max 150 chars
  audience: 'all' | 'moderators' | 'mestres';
}
```

**Validações:**
- Título: obrigatório, máximo 40 caracteres
- Mensagem: obrigatório, máximo 150 caracteres
- Público-alvo: obrigatório

**Fluxo de envio:**
1. Validar campos
2. Buscar lista de user_ids com base no público-alvo:
   - `all`: Buscar todos de `profiles`
   - `moderators`: Buscar de `user_roles` onde `role = 'moderator'`
   - `mestres`: Buscar de `mestre_plans` onde `is_active = true`
3. Inserir notificações em batch para todos os usuários selecionados
4. Mostrar toast de sucesso com contagem de notificações enviadas

---

### Fase 3: Integrar no Admin.tsx

**Adicionar nova aba na TabsList:**
```tsx
<TabsTrigger value="notifications" className="gap-2">
  <Bell className="h-4 w-4" />
  <span className="hidden sm:inline">Notificações</span>
</TabsTrigger>
```

**Adicionar TabsContent:**
```tsx
<TabsContent value="notifications" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        Criar Notificação
      </CardTitle>
      <CardDescription>
        Envie notificações personalizadas para grupos de usuários
      </CardDescription>
    </CardHeader>
    <CardContent>
      <CreateNotificationForm />
    </CardContent>
  </Card>
</TabsContent>
```

---

### Lógica de Busca de Usuários

```typescript
const getTargetUsers = async (audience: 'all' | 'moderators' | 'mestres') => {
  switch (audience) {
    case 'all': {
      const { data } = await supabase.from('profiles').select('id');
      return data?.map(p => p.id) || [];
    }
    case 'moderators': {
      const { data } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'moderator');
      return data?.map(r => r.user_id) || [];
    }
    case 'mestres': {
      const { data } = await supabase
        .from('mestre_plans')
        .select('user_id')
        .eq('is_active', true);
      return data?.map(p => p.user_id) || [];
    }
  }
};
```

---

### Inserção em Batch

```typescript
const sendNotifications = async (
  userIds: string[], 
  title: string, 
  message: string
) => {
  const notifications = userIds.map(userId => ({
    user_id: userId,
    type: 'admin_broadcast',
    title,
    message,
    data: { sent_by: 'admin' },
  }));
  
  // Inserir em lotes de 100 para evitar timeout
  const batchSize = 100;
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    await supabase.from('notifications').insert(batch);
  }
  
  return notifications.length;
};
```

---

### Exemplo de Notificação Criada

```json
{
  "type": "admin_broadcast",
  "title": "Manutenção programada",
  "message": "O sistema ficará indisponível amanhã das 2h às 4h para manutenção.",
  "data": { "sent_by": "admin" }
}
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-notifications.ts` | Adicionar tipo `admin_broadcast` |
| `src/components/notifications/NotificationItem.tsx` | Adicionar ícone Megaphone para broadcasts |
| `src/components/admin/CreateNotificationForm.tsx` | **Novo** - Formulário de criação |
| `src/pages/Admin.tsx` | Adicionar aba "Notificações" com o formulário |

---

### UX Features

- **Contador de caracteres**: Exibe caracteres restantes em tempo real
- **Preview em tempo real**: Mostra como a notificação aparecerá para o usuário
- **Confirmação antes de enviar**: Dialog confirmando a quantidade de destinatários
- **Feedback de sucesso**: Toast com número de notificações enviadas
- **Loading state**: Botão desabilitado e spinner durante o envio

---

### Segurança

- Apenas usuários com role `admin` podem acessar esta funcionalidade
- A verificação de admin já existe no componente Admin.tsx (`isAdmin` state)
- RLS da tabela `notifications` já permite INSERT para qualquer usuário autenticado (via trigger/system)

