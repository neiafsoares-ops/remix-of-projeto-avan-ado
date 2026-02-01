
# Plano: Melhorias no Torcida Mestre

## Resumo das Melhorias Solicitadas

1. Notificar administrador sobre nova solicitacao de participante
2. Notificar usuario sobre aprovacao
3. Verificar/corrigir campo de palpite apos aprovacao
4. Adicionar "Torcida Mestre" no menu superior (Navbar)
5. Adicionar botao "Solicitar Participacao" ao lado de "Ver Bolao" no card
6. Mostrar numero de participantes e estimativa de premiacao no card

---

## Analise Tecnica

### Problema Identificado no Campo de Palpite

Analisando o codigo, identifiquei que a logica de verificacao de participante aprovado esta correta:

- Linha 240-242 em `TorcidaMestreDetail.tsx`: busca participante com status `active`
- Linha 159 em `TorcidaMestreRoundCard.tsx`: so mostra input se `isApproved && !deadlinePassed`

O problema pode ser que o `userParticipant` retorna `undefined` mesmo apos aprovacao porque o estado nao esta sendo atualizado corretamente apos a aprovacao. A pagina precisa recarregar os dados ou usar realtime.

---

## Mudancas Necessarias

### 1. Migracao de Banco de Dados - Triggers de Notificacao

Criar triggers similares aos existentes para pool_participants:

```sql
-- Trigger: Notificar admins quando novo participante solicita entrada
CREATE OR REPLACE FUNCTION public.notify_torcida_mestre_participant_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_creator_id UUID;
  pool_name TEXT;
  participant_name TEXT;
  admin_users UUID[];
BEGIN
  -- Get pool info
  SELECT created_by, name INTO pool_creator_id, pool_name 
  FROM public.torcida_mestre_pools WHERE id = NEW.pool_id;
  
  -- Get participant name
  SELECT public_id INTO participant_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get all admin user IDs
  SELECT ARRAY_AGG(user_id) INTO admin_users
  FROM public.user_roles WHERE role = 'admin';
  
  -- Notify all admins
  IF admin_users IS NOT NULL THEN
    FOR i IN 1..array_length(admin_users, 1) LOOP
      IF admin_users[i] != NEW.user_id THEN
        PERFORM public.create_notification(
          admin_users[i],
          'torcida_mestre_participant_request',
          'Nova solicitacao - Torcida Mestre',
          participant_name || ' solicitou participacao no ' || pool_name,
          jsonb_build_object(
            'pool_id', NEW.pool_id, 
            'round_id', NEW.round_id,
            'participant_name', participant_name,
            'participant_id', NEW.id
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_torcida_mestre_participant_request
AFTER INSERT ON public.torcida_mestre_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_torcida_mestre_participant_request();

-- Trigger: Notificar usuario quando aprovado
CREATE OR REPLACE FUNCTION public.notify_torcida_mestre_participant_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_name TEXT;
  round_name TEXT;
BEGIN
  -- Only notify when status changes from pending to active
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    -- Get pool name
    SELECT name INTO pool_name 
    FROM public.torcida_mestre_pools WHERE id = NEW.pool_id;
    
    -- Get round name
    SELECT COALESCE(name, 'Rodada ' || round_number) INTO round_name
    FROM public.torcida_mestre_rounds WHERE id = NEW.round_id;
    
    PERFORM public.create_notification(
      NEW.user_id,
      'torcida_mestre_approved',
      'Participacao aprovada!',
      'Voce foi aprovado para participar do ' || pool_name || ' - ' || round_name || '. Faca seu palpite!',
      jsonb_build_object(
        'pool_id', NEW.pool_id,
        'round_id', NEW.round_id,
        'participant_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_torcida_mestre_participant_approved
AFTER UPDATE ON public.torcida_mestre_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_torcida_mestre_participant_approved();
```

### 2. Navbar - Adicionar Link "Torcida Mestre"

**Arquivo:** `src/components/layout/Navbar.tsx`

Adicionar link no menu desktop (apos "Quiz 10") e no menu mobile:

```tsx
// Desktop (linha ~93)
<Link to="/torcida-mestre" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
  <Crown className="h-4 w-4 text-amber-500" />
  Torcida Mestre
</Link>

// Mobile (apos Quiz 10)
<Link
  to="/torcida-mestre"
  className="px-4 py-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
  onClick={() => setMobileMenuOpen(false)}
>
  <Crown className="h-4 w-4 text-amber-500" />
  Torcida Mestre
</Link>
```

### 3. TorcidaMestreCard - Adicionar Botao e Infos

**Arquivo:** `src/components/torcida-mestre/TorcidaMestreCard.tsx`

Adicionar:
- Contagem de participantes ativos
- Estimativa de premiacao
- Botao "Participar" ao lado de "Ver Bolao"

```tsx
// No tipo TorcidaMestrePoolWithRounds, adicionar:
participants_count?: number;

// Calcular estimativa de premiacao
const estimatedPrize = pool.entry_fee * (pool.participants_count || 0);

// Mostrar info de participantes
<div className="flex items-center justify-between text-sm">
  <div className="flex items-center gap-1 text-muted-foreground">
    <Users className="h-4 w-4" />
    <span>{pool.participants_count || 0} participantes</span>
  </div>
  <div className="text-sm font-medium text-amber-600">
    Premio: {formatPrize(estimatedPrize + (pool.total_accumulated || 0))}
  </div>
</div>

// Botoes lado a lado
<div className="flex gap-2">
  <Button asChild variant="outline" className="flex-1">
    <Link to={`/torcida-mestre/${pool.id}`}>
      Ver Bolao
    </Link>
  </Button>
  <Button className="flex-1 bg-amber-500">
    <Link to={`/torcida-mestre/${pool.id}`}>
      Participar
    </Link>
  </Button>
</div>
```

### 4. TorcidaMestre.tsx - Buscar Contagem de Participantes

**Arquivo:** `src/pages/TorcidaMestre.tsx`

Atualizar a query para incluir contagem de participantes:

```tsx
// Apos buscar pools, buscar contagem de participantes
const { data: participantCounts } = await supabase
  .from('torcida_mestre_participants')
  .select('pool_id, status')
  .eq('status', 'active');

const countMap = new Map<string, number>();
(participantCounts || []).forEach(p => {
  countMap.set(p.pool_id, (countMap.get(p.pool_id) || 0) + 1);
});

// Adicionar ao pool
poolsWithRounds.map(pool => ({
  ...pool,
  participants_count: countMap.get(pool.id) || 0,
}));
```

### 5. TorcidaMestreRoundCard - Corrigir Estado do Palpite

**Arquivo:** `src/components/torcida-mestre/TorcidaMestreRoundCard.tsx`

O componente ja esta correto. O problema pode ser que o estado `userPrediction` nao esta sincronizado. Vou adicionar um `useEffect` para atualizar os valores do input quando `userPrediction` mudar:

```tsx
useEffect(() => {
  setHomeScore(userPrediction?.home_score?.toString() ?? '');
  setAwayScore(userPrediction?.away_score?.toString() ?? '');
}, [userPrediction]);
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `migration.sql` | Criar triggers de notificacao |
| `src/components/layout/Navbar.tsx` | Adicionar link Torcida Mestre |
| `src/components/torcida-mestre/TorcidaMestreCard.tsx` | Mostrar participantes, premio e botao Participar |
| `src/pages/TorcidaMestre.tsx` | Buscar contagem de participantes |
| `src/components/torcida-mestre/TorcidaMestreRoundCard.tsx` | Adicionar useEffect para sincronizar estado |
| `src/types/torcida-mestre.ts` | Adicionar `participants_count` ao tipo |

---

## Fluxo de Notificacoes

```
Usuario solicita participacao
        |
        v
Trigger INSERT -> Notifica todos os admins
        |
        v
Admin aprova no painel
        |
        v
Trigger UPDATE (pending -> active) -> Notifica usuario
        |
        v
Usuario recebe notificacao e pode fazer palpite
```

---

## Detalhes Tecnicos

### Import Necessario na Navbar
```tsx
import { Crown } from 'lucide-react';
```

### Tipo Atualizado
```typescript
export interface TorcidaMestrePoolWithRounds extends TorcidaMestrePool {
  rounds: TorcidaMestreRound[];
  current_round?: TorcidaMestreRound;
  total_accumulated?: number;
  participants_count?: number; // NOVO
}
```
