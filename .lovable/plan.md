

## Plano: Expandir Sistema de Notificações

### Objetivo

Adicionar novos tipos de notificações para cobrir cenários importantes do ciclo de vida de convites e assinaturas Mestre.

---

### Novos Tipos de Notificação a Adicionar

| Tipo | Destinatário | Descrição |
|------|--------------|-----------|
| `invitation_accepted` | Quem convidou | Convite aceito pelo destinatário |
| `invitation_rejected` | Quem convidou | Convite recusado pelo destinatário |
| `plan_expiring_30` | Mestre | Aviso 30 dias antes do vencimento |
| `plan_expiring_15` | Mestre | Aviso 15 dias antes do vencimento |
| `plan_expiring_7` | Mestre | Aviso 7 dias antes do vencimento |
| `plan_expiring_1` | Mestre | Aviso 1 dia antes do vencimento |
| `plan_expired` | Mestre | Pacote expirou |
| `became_mestre` | Novo Mestre | Usuário se tornou Mestre do Bolão |

---

### Fase 1: Atualizar Tipos no Frontend

**Arquivo:** `src/hooks/use-notifications.ts`

Adicionar novos tipos ao union type:

```typescript
export type NotificationType = 
  | 'invitation_received'
  | 'invitation_accepted'    // NOVO
  | 'invitation_rejected'    // NOVO
  | 'message_received'
  | 'round_updated'
  | 'new_suggestion'
  | 'plan_expiring'
  | 'plan_expiring_30'       // NOVO
  | 'plan_expiring_15'       // NOVO
  | 'plan_expiring_7'        // NOVO
  | 'plan_expiring_1'        // NOVO
  | 'plan_expired'           // NOVO
  | 'became_mestre'          // NOVO
  | 'new_participant'
  | 'moderator_action'
  | 'scores_updated';
```

---

### Fase 2: Atualizar Ícones no NotificationItem

**Arquivo:** `src/components/notifications/NotificationItem.tsx`

Adicionar novos ícones ao mapa:

```typescript
import { 
  // ... existentes
  CheckCircle,
  XCircle,
  Clock,
  Crown
} from 'lucide-react';

const iconMap: Record<NotificationType, { icon: typeof Mail; colorClass: string }> = {
  // ... existentes
  invitation_accepted: { icon: CheckCircle, colorClass: 'text-green-500' },
  invitation_rejected: { icon: XCircle, colorClass: 'text-red-500' },
  plan_expiring_30: { icon: Clock, colorClass: 'text-yellow-500' },
  plan_expiring_15: { icon: Clock, colorClass: 'text-orange-400' },
  plan_expiring_7: { icon: AlertTriangle, colorClass: 'text-orange-500' },
  plan_expiring_1: { icon: AlertTriangle, colorClass: 'text-red-500' },
  plan_expired: { icon: AlertTriangle, colorClass: 'text-red-600' },
  became_mestre: { icon: Crown, colorClass: 'text-yellow-500' },
};
```

---

### Fase 3: Trigger para Convite Aceito/Recusado

**Migração SQL:**

```sql
-- Trigger function para notificar quando convite muda de status
CREATE OR REPLACE FUNCTION public.notify_on_invitation_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_name TEXT;
  invitee_name TEXT;
BEGIN
  -- Só processa se status mudou para accepted ou rejected
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    
    -- Get pool name
    SELECT name INTO pool_name FROM public.pools WHERE id = NEW.pool_id;
    
    -- Get invitee name from username
    SELECT public_id INTO invitee_name FROM public.profiles 
    WHERE public_id = NEW.invitee_username;
    
    IF NEW.status = 'accepted' THEN
      PERFORM public.create_notification(
        NEW.inviter_id,
        'invitation_accepted',
        'Convite aceito!',
        invitee_name || ' aceitou seu convite para ' || pool_name,
        jsonb_build_object(
          'pool_id', NEW.pool_id, 
          'invitee_name', invitee_name,
          'invitation_id', NEW.id
        )
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.create_notification(
        NEW.inviter_id,
        'invitation_rejected',
        'Convite recusado',
        invitee_name || ' recusou seu convite para ' || pool_name,
        jsonb_build_object(
          'pool_id', NEW.pool_id, 
          'invitee_name', invitee_name,
          'invitation_id', NEW.id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_invitation_response
AFTER UPDATE ON public.pool_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_invitation_response();
```

---

### Fase 4: Trigger para Novo Mestre

**Migração SQL:**

```sql
-- Trigger para notificar quando usuário se torna Mestre
CREATE OR REPLACE FUNCTION public.notify_on_became_mestre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_name TEXT;
  user_name TEXT;
BEGIN
  -- Get plan name
  SELECT name INTO plan_name FROM public.mestre_plans WHERE id = NEW.plan_id;
  
  -- Get user name
  SELECT public_id INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  PERFORM public.create_notification(
    NEW.user_id,
    'became_mestre',
    'Parabéns! Você é Mestre do Bolão!',
    'Seu plano ' || plan_name || ' está ativo. Aproveite todos os benefícios!',
    jsonb_build_object(
      'plan_type', plan_name,
      'expires_at', NEW.expires_at,
      'subscription_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_mestre_subscription_created
AFTER INSERT ON public.mestre_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_became_mestre();
```

---

### Fase 5: Função para Verificar Expiração de Planos

Esta função será chamada por um CRON job diário:

```sql
-- Função para verificar e notificar sobre planos expirando
CREATE OR REPLACE FUNCTION public.check_mestre_plan_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  days_remaining INTEGER;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  already_notified BOOLEAN;
BEGIN
  -- Buscar todas as assinaturas ativas
  FOR sub IN 
    SELECT 
      ms.id as subscription_id,
      ms.user_id,
      ms.expires_at,
      mp.name as plan_name,
      mp.plan_type
    FROM public.mestre_subscriptions ms
    JOIN public.mestre_plans mp ON ms.plan_id = mp.id
    WHERE ms.expires_at > now()
  LOOP
    days_remaining := EXTRACT(DAY FROM (sub.expires_at - now()));
    
    -- Determinar tipo de notificação baseado nos dias
    IF days_remaining = 30 THEN
      notification_type := 'plan_expiring_30';
      notification_title := 'Seu plano expira em 30 dias';
      notification_message := 'Renove seu plano ' || sub.plan_name || ' para continuar aproveitando os benefícios!';
    ELSIF days_remaining = 15 THEN
      notification_type := 'plan_expiring_15';
      notification_title := 'Seu plano expira em 15 dias';
      notification_message := 'Não esqueça de renovar seu plano ' || sub.plan_name || '!';
    ELSIF days_remaining = 7 THEN
      notification_type := 'plan_expiring_7';
      notification_title := 'Seu plano expira em 7 dias!';
      notification_message := 'Seu plano ' || sub.plan_name || ' expira em breve. Renove agora!';
    ELSIF days_remaining = 1 THEN
      notification_type := 'plan_expiring_1';
      notification_title := 'Seu plano expira AMANHÃ!';
      notification_message := 'Último dia para renovar seu plano ' || sub.plan_name || '!';
    ELSE
      CONTINUE;
    END IF;
    
    -- Verificar se já notificou hoje para este tipo
    SELECT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = sub.user_id 
      AND type = notification_type
      AND data->>'subscription_id' = sub.subscription_id::text
    ) INTO already_notified;
    
    IF NOT already_notified THEN
      PERFORM public.create_notification(
        sub.user_id,
        notification_type,
        notification_title,
        notification_message,
        jsonb_build_object(
          'subscription_id', sub.subscription_id,
          'plan_type', sub.plan_type,
          'days_remaining', days_remaining,
          'expires_at', sub.expires_at
        )
      );
    END IF;
  END LOOP;
  
  -- Verificar planos que expiraram hoje
  FOR sub IN 
    SELECT 
      ms.id as subscription_id,
      ms.user_id,
      ms.expires_at,
      mp.name as plan_name
    FROM public.mestre_subscriptions ms
    JOIN public.mestre_plans mp ON ms.plan_id = mp.id
    WHERE ms.expires_at <= now()
    AND ms.expires_at > now() - INTERVAL '1 day'
  LOOP
    -- Verificar se já notificou
    SELECT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = sub.user_id 
      AND type = 'plan_expired'
      AND data->>'subscription_id' = sub.subscription_id::text
    ) INTO already_notified;
    
    IF NOT already_notified THEN
      PERFORM public.create_notification(
        sub.user_id,
        'plan_expired',
        'Seu plano expirou',
        'Seu plano ' || sub.plan_name || ' expirou. Renove para continuar criando bolões!',
        jsonb_build_object(
          'subscription_id', sub.subscription_id,
          'expired_at', sub.expires_at
        )
      );
    END IF;
  END LOOP;
END;
$$;
```

---

### Fase 6: Configurar CRON Job

Agendar a função para rodar diariamente às 9:00 da manhã:

```sql
-- Habilitar extensões necessárias (se não estiverem)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendar verificação diária de expiração
SELECT cron.schedule(
  'check-mestre-plan-expirations',
  '0 9 * * *',  -- Todo dia às 9:00 AM
  $$SELECT public.check_mestre_plan_expirations()$$
);
```

---

### Resumo das Alterações

| Componente | Alteração |
|------------|-----------|
| `use-notifications.ts` | Adicionar 8 novos tipos de notificação |
| `NotificationItem.tsx` | Adicionar ícones e cores para novos tipos |
| Migração SQL | Trigger para `invitation_accepted` e `invitation_rejected` |
| Migração SQL | Trigger para `became_mestre` (nova assinatura) |
| Migração SQL | Função `check_mestre_plan_expirations()` |
| CRON (via insert) | Agendar verificação diária de planos |

---

### Fluxo de Notificações

```text
CONVITE ACEITO/RECUSADO
pool_invitations UPDATE (status: pending -> accepted/rejected)
         |
         v
  on_invitation_response trigger
         |
         v
  Notifica INVITER com resultado

NOVO MESTRE
mestre_subscriptions INSERT
         |
         v
  on_mestre_subscription_created trigger
         |
         v
  Notifica usuário com boas-vindas

EXPIRAÇÃO DE PLANO
CRON diário às 9:00
         |
         v
  check_mestre_plan_expirations()
         |
         +---> 30 dias: plan_expiring_30
         +---> 15 dias: plan_expiring_15
         +---> 7 dias: plan_expiring_7
         +---> 1 dia: plan_expiring_1
         +---> 0 dias: plan_expired
```

---

### Exemplos de Notificações

**Convite Aceito:**
```json
{
  "type": "invitation_accepted",
  "title": "Convite aceito!",
  "message": "joaosilva aceitou seu convite para Copa 2025",
  "data": { "pool_id": "...", "invitee_name": "joaosilva" }
}
```

**Novo Mestre:**
```json
{
  "type": "became_mestre",
  "title": "Parabéns! Você é Mestre do Bolão!",
  "message": "Seu plano Intermediário está ativo. Aproveite todos os benefícios!",
  "data": { "plan_type": "intermediario", "expires_at": "..." }
}
```

**Plano Expirando (7 dias):**
```json
{
  "type": "plan_expiring_7",
  "title": "Seu plano expira em 7 dias!",
  "message": "Seu plano Supremo expira em breve. Renove agora!",
  "data": { "days_remaining": 7, "plan_type": "supremo" }
}
```

**Plano Expirado:**
```json
{
  "type": "plan_expired",
  "title": "Seu plano expirou",
  "message": "Seu plano Intermediário expirou. Renove para continuar criando bolões!",
  "data": { "expired_at": "..." }
}
```

