
## Plano: Corrigir Erro "created_by column not found" no Salvamento de Jogos

### Diagnóstico do Problema

O erro **"Could not find the 'created_by' column of 'matches' in the schema cache"** ocorre porque a implementação do salvamento automático está tentando inserir/atualizar um campo `created_by` que **não existe** na tabela `matches`.

#### Schema Real da Tabela `matches`:
```
- id (uuid)
- round_id (uuid)
- pool_id (uuid)
- home_team (text)
- away_team (text)
- home_team_image (text, nullable)
- away_team_image (text, nullable)
- match_date (timestamp)
- prediction_deadline (timestamp)
- home_score (integer, nullable)
- away_score (integer, nullable)
- is_finished (boolean)
- created_at (timestamp) ← existe apenas created_AT, não created_BY
```

#### Locais Afetados:

O campo `created_by: user.id` foi incorretamente adicionado em **4 funções** no arquivo `AddGamesScreen.tsx`:

1. **performAutoSave** (linha 362) - Auto-save para slots standard
2. **performGroupAutoSave** (linha 432) - Auto-save para slots de grupos (copa)
3. **saveSlot** (linha 698) - Salvamento manual para slots standard
4. **saveGroupSlot** (linha 783) - Salvamento manual para slots de grupos

---

### Solução

Remover a linha `created_by: user.id,` de todos os 4 objetos `matchData` nas funções citadas.

#### Mudanças Necessárias:

**Antes:**
```typescript
const matchData = {
  pool_id: poolId,
  round_id: currentRound.id,
  home_team: slot.home_team,
  away_team: slot.away_team,
  home_team_image: slot.home_team_image || null,
  away_team_image: slot.away_team_image || null,
  match_date: new Date(slot.match_date).toISOString(),
  prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
  created_by: user.id, // ← REMOVER ESTA LINHA
};
```

**Depois:**
```typescript
const matchData = {
  pool_id: poolId,
  round_id: currentRound.id,
  home_team: slot.home_team,
  away_team: slot.away_team,
  home_team_image: slot.home_team_image || null,
  away_team_image: slot.away_team_image || null,
  match_date: new Date(slot.match_date).toISOString(),
  prediction_deadline: new Date(slot.prediction_deadline).toISOString(),
};
```

---

### Detalhes Técnicos das Alterações

| Função | Linha Atual | Ação |
|--------|-------------|------|
| `performAutoSave` | 362 | Remover `created_by: user.id,` |
| `performGroupAutoSave` | 432 | Remover `created_by: user.id,` |
| `saveSlot` | 698 | Remover `created_by: user.id,` |
| `saveGroupSlot` | 783 | Remover `created_by: user.id,` |

**Arquivo Afetado:**
- `src/components/matches/AddGamesScreen.tsx`

---

### Por Que o Erro Ocorreu?

Durante a implementação do auto-save, foi adicionado incorretamente um campo `created_by` presumindo que a tabela `matches` teria uma referência ao usuário que criou o jogo. 

Porém, a tabela `matches` **não precisa** deste campo porque:
- O relacionamento de "quem criou" já existe através de `rounds.created_by` e `pools.created_by`
- A tabela `matches` está vinculada à rodada (`round_id`) que por sua vez está vinculada ao bolão (`pool_id`)
- As políticas RLS da tabela `matches` já verificam permissões através da cadeia `matches → rounds → pools`

---

### Comportamento Esperado Após a Correção

1. **Auto-save funcionará corretamente** ao preencher ambas equipes + datas
2. **Indicador visual** mostrará "Salvando..." → "Salvo automaticamente"
3. **Salvamento manual** via botão "Salvar" também funcionará
4. **Sem erros de schema** no console ou toasts de erro

---

### Validação

Após a correção, testar:

✅ Criar novo jogo em rodada standard (auto-save)
✅ Criar novo jogo em rodada de grupo/copa (auto-save)
✅ Editar jogo existente em rodada standard (auto-save)
✅ Editar jogo existente em rodada de grupo (auto-save)
✅ Clicar em "Salvar" manualmente (fallback)
✅ Verificar que não há erros no console do navegador
