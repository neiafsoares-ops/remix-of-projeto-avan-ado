

## Plano: Usar Limite da Rodada como Padrao para Numero de Jogos

### Problema Identificado

Ao clicar em "Adicionar Jogos", o sistema mostra **10 slots** de jogos mesmo quando a rodada esta configurada para **4 jogos** (como "Quartas de Final").

**Causa:**
No `AddGamesScreen.tsx`, linha 128:
```typescript
const totalSlots = Math.max(matchesPerRound, maxMatches);
```

- `matchesPerRound` vem do pool (`pool.matches_per_round || 10`)
- `maxMatches` vem da rodada (`round.match_limit + extra_matches_allowed`)

O sistema esta usando o **maior valor** entre os dois, quando deveria usar apenas o limite especifico da rodada.

---

### Solucao

Alterar a logica para usar o limite da rodada (`maxMatches`) como fonte primaria, ignorando o `matchesPerRound` do pool.

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/matches/AddGamesScreen.tsx` | Usar `maxMatches` em vez de `Math.max(matchesPerRound, maxMatches)` |
| `src/components/admin/SuggestedPoolMatchesScreen.tsx` | Ja usa `pool.matches_per_round` corretamente, verificar se precisa ajuste |

---

### Mudancas Tecnicas

#### 1. AddGamesScreen.tsx (Linha 128)

**De:**
```typescript
const totalSlots = Math.max(matchesPerRound, maxMatches);
```

**Para:**
```typescript
const totalSlots = maxMatches;
```

Isso garante que o numero de slots corresponda exatamente ao limite configurado para aquela rodada especifica.

---

#### 2. Opcional: Remover prop `matchesPerRound`

Se a prop `matchesPerRound` nao for mais utilizada para calcular slots, ela pode ser removida da interface do componente. Porem, ela ainda pode ser util para outras finalidades (como referencia ou logs), entao avaliaremos durante a implementacao.

---

### Comportamento Esperado

**Antes:**
- Quartas de Final (4 jogos configurados) → Abre com 10 slots

**Depois:**
- Quartas de Final (4 jogos configurados) → Abre com 4 slots
- Oitavas de Final (8 jogos configurados) → Abre com 8 slots
- Final (1 jogo configurado) → Abre com 1 slot

---

### Impacto

| Contexto | Afetado |
|----------|---------|
| Boloes normais (PoolManage) | Sim |
| Sugestoes Zapions (Admin) | Verificar se precisa ajuste similar |
| Boloes de formato copa/knockout | Sim, ja usam `match_limit` por fase |

---

### Validacao

1. Abrir uma rodada de "Quartas de Final" configurada para 4 jogos
2. Verificar que aparecem exatamente 4 slots
3. Abrir uma rodada de "Oitavas" configurada para 8 jogos
4. Verificar que aparecem exatamente 8 slots

