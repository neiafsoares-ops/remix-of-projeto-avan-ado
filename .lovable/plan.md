
## Plano: Corrigir Navegação das Notificações do Torcida Mestre

### Problema Identificado
Quando um administrador clica em uma notificação "Nova solicitação - Torcida Mestre", o sistema tenta navegar para `/pools/{pool_id}`, mas o ID pertence a um bolão do Torcida Mestre, não a um pool regular. Isso causa o erro "Error fetching pool data: 0 rows".

### Causa Raiz

| Problema | Localização |
|----------|-------------|
| Tipos de notificação faltando | `use-notifications.ts` linha 6-23 |
| Navegação genérica para /pools/ | `NotificationBell.tsx` linha 36-41 |
| Ícones não mapeados | `NotificationItem.tsx` linha 23-41 |

Os triggers no banco geram notificações com tipos:
- `torcida_mestre_participant_request` - quando alguém solicita participação
- `torcida_mestre_approved` - quando participação é aprovada

Porém esses tipos não existem no frontend.

---

### Solução

#### 1. Adicionar tipos de notificação (`use-notifications.ts`)

Incluir os novos tipos no enum:

```typescript
export type NotificationType = 
  | 'invitation_received'
  | ... (existentes)
  | 'torcida_mestre_participant_request'  // NOVO
  | 'torcida_mestre_approved';             // NOVO
```

#### 2. Atualizar navegação (`NotificationBell.tsx`)

Modificar `handleNotificationClick` para detectar o tipo de notificação e navegar para a rota correta:

```typescript
const handleNotificationClick = (notification: typeof notifications[0]) => {
  const poolId = notification.data?.pool_id as string | undefined;
  
  switch (notification.type) {
    // Notificações do Torcida Mestre - navegar para gestão
    case 'torcida_mestre_participant_request':
      if (poolId) navigate(`/torcida-mestre/${poolId}/manage`);
      break;
    
    // Usuário aprovado - navegar para detalhe do bolão
    case 'torcida_mestre_approved':
      if (poolId) navigate(`/torcida-mestre/${poolId}`);
      break;
    
    // Notificações de pools regulares
    default:
      if (poolId) navigate(`/pools/${poolId}`);
      break;
  }
};
```

#### 3. Mapear ícones (`NotificationItem.tsx`)

Adicionar ícones específicos para os novos tipos:

```typescript
const iconMap: Record<NotificationType, { icon: typeof Mail; colorClass: string }> = {
  // ... existentes
  torcida_mestre_participant_request: { icon: UserPlus, colorClass: 'text-amber-500' },
  torcida_mestre_approved: { icon: CheckCircle, colorClass: 'text-green-500' },
};
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/use-notifications.ts` | Adicionar 2 novos tipos ao enum |
| `src/components/notifications/NotificationBell.tsx` | Atualizar lógica de navegação por tipo |
| `src/components/notifications/NotificationItem.tsx` | Adicionar ícones para novos tipos |

---

### Fluxo Corrigido

```text
Admin clica na notificação "Nova solicitação - Torcida Mestre"
    ↓
Sistema detecta tipo = 'torcida_mestre_participant_request'
    ↓
Navega para /torcida-mestre/{pool_id}/manage
    ↓
Admin vê a página de gestão com as solicitações pendentes
```

---

### Resultado Esperado
- Admin poderá clicar nas notificações de solicitação e ser direcionado para a página correta de gestão
- Usuário aprovado clica na notificação e é direcionado para o detalhe do bolão
- Ícones específicos (âmbar para solicitação, verde para aprovado) facilitam identificação visual
