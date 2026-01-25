
## Plano: Implementar Salvamento Automatico nos Confrontos e Palpites

### Situacao Atual

Analisando o codigo, identifiquei os seguintes comportamentos:

#### 1. Criacao de Confrontos (AddGamesScreen.tsx)
- **Atual**: O salvamento e **manual** - o administrador precisa clicar no botao "Salvar" apos preencher todos os campos (equipes + datas)
- **Problema**: Nao salva automaticamente apos adicionar as duas equipes

#### 2. Palpites dos Participantes (MatchCard.tsx)
- **Atual**: **Ja implementado** com debounce de 800ms - salva automaticamente apos digitar os dois placares
- **Codigo existente** (linhas 51-80): Usa `useEffect` que monitora `homeScore` e `awayScore`, valida os valores e chama `onPredictionChange` automaticamente
- **Status visual**: Mostra "Salvando...", "Palpite salvo" e "Erro ao salvar"

---

### Mudancas Necessarias

#### Arquivo: `src/components/matches/AddGamesScreen.tsx`

Implementar auto-save com debounce quando ambas as equipes forem selecionadas (similar ao MatchCard).

#### Nova Logica de Auto-Save para Slots de Jogos

1. **Adicionar refs para tracking de salvamento** por slot
2. **Criar useEffect** que monitora mudancas nos slots
3. **Disparar salvamento automatico** quando:
   - Home team E away team estiverem preenchidos
   - Houver mudanca desde o ultimo salvamento
   - As datas estiverem preenchidas (validacao)

```typescript
// Novo ref para rastrear ultimos valores salvos
const lastSavedSlots = useRef<Record<number, {
  home_team: string;
  away_team: string;
  match_date: string;
  prediction_deadline: string;
}>>({});

// Auto-save effect para slots individuais
useEffect(() => {
  if (!user || !currentRound) return;

  matchSlots.forEach((slot, index) => {
    // So salva se ambas equipes estiverem preenchidas
    if (!slot.home_team || !slot.away_team) return;
    
    // Verificar se ja foi salvo com os mesmos valores
    const lastSaved = lastSavedSlots.current[index];
    const hasChanged = !lastSaved ||
      lastSaved.home_team !== slot.home_team ||
      lastSaved.away_team !== slot.away_team ||
      lastSaved.match_date !== slot.match_date ||
      lastSaved.prediction_deadline !== slot.prediction_deadline;
    
    if (!hasChanged || slot.isSaved) return;
    
    // Validar dados obrigatorios
    if (!slot.match_date || !slot.prediction_deadline) return;
    
    // Debounce de 1000ms
    const timeoutId = setTimeout(async () => {
      await saveSlot(index);
      lastSavedSlots.current[index] = {
        home_team: slot.home_team,
        away_team: slot.away_team,
        match_date: slot.match_date,
        prediction_deadline: slot.prediction_deadline,
      };
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  });
}, [matchSlots, currentRound, user]);
```

#### Mesma Logica para Slots de Grupos (Cup Format)

```typescript
// Auto-save effect para group slots
useEffect(() => {
  if (!user) return;

  Object.entries(groupMatchSlots).forEach(([key, slots]) => {
    const [groupName, roundId] = key.split('-');
    
    slots.forEach((slot, index) => {
      if (!slot.home_team || !slot.away_team) return;
      if (!slot.match_date || !slot.prediction_deadline) return;
      if (!slot.isModified) return;
      
      const timeoutId = setTimeout(async () => {
        await saveGroupSlot(groupName, roundId, index);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    });
  });
}, [groupMatchSlots, user]);
```

---

### Indicador Visual de Salvamento Automatico

Adicionar feedback visual similar ao MatchCard:

```typescript
// Novo estado para status de salvamento por slot
const [slotSaveStatus, setSlotSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

// Renderizar status no slot
{slotSaveStatus[slotKey] === 'saving' && (
  <div className="flex items-center gap-1 text-muted-foreground">
    <Loader2 className="w-3 h-3 animate-spin" />
    <span className="text-xs">Salvando...</span>
  </div>
)}
{slotSaveStatus[slotKey] === 'saved' && (
  <div className="flex items-center gap-1 text-green-600">
    <CheckCircle2 className="w-3 h-3" />
    <span className="text-xs">Salvo automaticamente</span>
  </div>
)}
```

---

### Comportamento Esperado Apos Implementacao

#### Para Criadores de Bolao (AddGamesScreen)

1. Selecionar time mandante (busca ou criacao)
2. Selecionar time visitante (busca ou criacao)
3. Preencher data do jogo
4. Preencher prazo para palpites
5. **Salvamento automatico dispara** apos 1 segundo de inatividade
6. Indicador visual "Salvando..." aparece
7. Indicador muda para "Salvo automaticamente"

#### Para Participantes (MatchCard) - JA FUNCIONA

1. Digitar placar mandante
2. Digitar placar visitante
3. **Salvamento automatico dispara** apos 800ms
4. Indicador "Salvando..." aparece
5. Indicador muda para "Palpite salvo"

---

### Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/matches/AddGamesScreen.tsx` | Adicionar auto-save com debounce para slots de jogos (standard e cup format) |

---

### Notas Tecnicas

1. **Debounce de 1000ms** para confrontos (um pouco maior que palpites) pois envolve mais campos
2. **Validacao obrigatoria**: Ambas as equipes + datas devem estar preenchidas
3. **Remover necessidade de botao Salvar individual** apos implementacao (pode manter como fallback)
4. **Manter toast de confirmacao** para feedback adicional
5. **Palpites dos participantes**: Ja funciona corretamente - nao precisa alterar

