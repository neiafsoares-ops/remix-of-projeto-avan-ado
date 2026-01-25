

## Plano: Corrigir Auto-Save Disparando Continuamente

### Problema Identificado

O auto-save está disparando repetidamente porque o sistema de tracking (`lastSavedSlots.current`) **não é inicializado** com os valores dos jogos existentes quando a página carrega. 

Quando a rodada é carregada:
1. Os slots são preenchidos com jogos já existentes no banco
2. O `lastSavedSlots.current` permanece vazio `{}`
3. O `useEffect` de auto-save verifica: `!lastSaved` → retorna `true` (parece mudança)
4. Auto-save dispara desnecessariamente
5. Após salvar, atualiza `lastSavedSlots.current`
6. O ciclo deveria parar, **MAS** se algo causar re-render, o problema pode se repetir

### Solução

Inicializar `lastSavedSlots.current` e `lastSavedGroupSlots.current` com os valores dos jogos existentes **quando os slots são carregados**.

### Mudanças Necessárias

#### Arquivo: `src/components/matches/AddGamesScreen.tsx`

**1. Modificar o useEffect que inicializa os slots (linhas 280-336)**

Adicionar a inicialização do tracking quando os slots são criados:

```typescript
// ANTES (linha 333-336):
setMatchSlots(slots);
// Reset saved tracking when round changes
lastSavedSlots.current = {};

// DEPOIS:
setMatchSlots(slots);

// Inicializar tracking com valores dos jogos existentes
const initialSavedValues: Record<number, SavedSlotData> = {};
slots.forEach((slot, index) => {
  if (slot.isSaved && slot.home_team && slot.away_team) {
    initialSavedValues[index] = {
      home_team: slot.home_team,
      away_team: slot.away_team,
      match_date: slot.match_date,
      prediction_deadline: slot.prediction_deadline,
    };
  }
});
lastSavedSlots.current = initialSavedValues;
```

**2. Fazer o mesmo para groupMatchSlots**

Na inicialização dos slots de grupos (se existir lógica similar), também inicializar `lastSavedGroupSlots.current` com os valores já existentes.

**3. Adicionar verificação extra no useEffect de auto-save**

Como segurança adicional, verificar se o slot `isSaved` e `!isModified`:

```typescript
// No useEffect de auto-save, adicionar esta verificação
if (slot.isSaved && !slot.isModified) return;
```

---

### Comparação Antes/Depois

| Cenário | Antes | Depois |
|---------|-------|--------|
| Página carrega com jogos existentes | Auto-save dispara para todos | Nenhum auto-save (já tracked) |
| Usuário modifica um jogo | Auto-save dispara após 1s | Auto-save dispara após 1s |
| Usuário não modifica nada | Auto-save pode disparar | Nenhum auto-save |

---

### Detalhes Técnicos

**useEffect de inicialização** (linhas ~280-336):
- Já marca slots existentes com `isSaved: true` e `isModified: false`
- **Falta**: Popular `lastSavedSlots.current` com esses valores

**useEffect de auto-save** (linhas ~487-522):
- Verifica `hasChanged` comparando com `lastSavedSlots.current`
- **Problema**: Se `lastSavedSlots.current` está vazio, `!lastSaved` é sempre `true`

---

### Comportamento Esperado Após a Correção

1. **Ao carregar página** → Nenhum auto-save dispara (jogos existentes já estão no tracking)
2. **Ao modificar time** → Aguarda 1 segundo e salva automaticamente
3. **Ao modificar data** → Aguarda 1 segundo e salva automaticamente
4. **Sem modificações** → Nenhum salvamento ocorre
5. **Indicador visual** → Aparece apenas quando há salvamento real

---

### Validação

Após implementação, verificar no console:
- Nenhum `UPDATE` deve aparecer ao simplesmente abrir a página
- `UPDATE` deve aparecer apenas após o usuário modificar algo

