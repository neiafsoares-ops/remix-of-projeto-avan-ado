
# Plano: Adicionar Campo de Premiacao Inicial na Criacao de Boloes

## Contexto

O criador do bolao atualmente nao consegue definir um valor de premiacao inicial garantida. O ideal e que esse campo fique na primeira etapa do wizard de criacao, com um tooltip explicativo ao passar o mouse.

## Mudancas Necessarias

### 1. Migracao de Banco de Dados

Adicionar coluna `initial_prize` na tabela `pools`:

```sql
ALTER TABLE public.pools 
ADD COLUMN initial_prize numeric DEFAULT 0;

COMMENT ON COLUMN public.pools.initial_prize IS 'Valor de premiacao inicial garantido pelo criador, somado a arrecadacao das taxas de inscricao';
```

### 2. Atualizar Wizard de Criacao

**Arquivo:** `src/components/pools/CreatePoolWizard.tsx`

Adicoes na Etapa 1:
- Novo estado `initialPrize` com valor padrao `'0'`
- Campo de input com Label + Tooltip explicativo
- Incluir campo no reset do formulario
- Incluir campo na insercao do pool

**Interface do campo:**

```text
+--------------------------------------------------+
| Premiacao Inicial (R$)           [?] (tooltip)   |
| +----------------------------------------------+ |
| |  0.00                                        | |
| +----------------------------------------------+ |
| Texto: "Valor garantido pelo organizador..."     |
+--------------------------------------------------+
```

**Tooltip ao passar o mouse:**
> "Valor garantido pelo organizador que sera somado ao total arrecadado com as taxas de inscricao. Util para atrair participantes com um premio inicial atrativo."

### 3. Atualizar Calculo de Premio

**Arquivo:** `src/lib/prize-utils.ts`

Atualizar a funcao `calculateEstimatedPrize` para incluir o premio inicial:

```typescript
export function calculateEstimatedPrize(
  entryFee: number,
  participantCount: number,
  adminFeePercent: number = 0,
  initialPrize: number = 0  // Novo parametro
): number {
  const totalFromFees = entryFee * participantCount;
  const adminFee = totalFromFees * (adminFeePercent / 100);
  return initialPrize + totalFromFees - adminFee;
}
```

### 4. Atualizar Preview de Premio no Wizard

O preview atual mostra:
> "Premio estimado (10 participantes): R$ X"

Atualizar para incluir o premio inicial na formula:
> "Formula: Premiacao Inicial + (Taxa x Participantes) - Taxa Administrativa"

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `migrations/add_initial_prize.sql` | Criar coluna `initial_prize` na tabela `pools` |
| `src/components/pools/CreatePoolWizard.tsx` | Adicionar campo com tooltip na etapa 1 |
| `src/lib/prize-utils.ts` | Atualizar funcao para somar premio inicial |

## Detalhes Tecnicos

### Imports Necessarios no Wizard
- `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` de `@/components/ui/tooltip`
- Icone `HelpCircle` de `lucide-react`

### Posicao do Campo
O campo sera inserido dentro do grid de 2 colunas, junto com a "Taxa de Entrada", na seguinte ordem:
1. Taxa de Entrada (R$)
2. Premiacao Inicial (R$) - **NOVO**
3. Max. Participantes

### Validacao
- Valor minimo: 0
- Tipo: number com step de 0.01
- Campo opcional (default 0)
