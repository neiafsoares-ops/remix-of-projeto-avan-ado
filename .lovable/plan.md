

## Plano: Notificacao de Palpites Completos por Rodada/Grupo

### Objetivo

Adicionar notificacao visual quando o participante preencher todos os palpites de uma rodada (formato standard) ou de um grupo (formato Copa), informando que todos os palpites foram salvos com sucesso.

---

### Analise da Situacao Atual

**Formato Standard (MatchCard):**
- Cada card exibe individualmente "Palpite salvo" apos o salvamento
- Nao ha verificacao se todos os jogos da rodada foram preenchidos

**Formato Copa (CupFormatView):**
- Salvamento ocorre no `onBlur` de cada campo
- Nao ha feedback visual apos salvamento individual
- Nao ha verificacao de completude por grupo

---

### Solucao Proposta

Implementar verificacao de completude que:
1. Detecta quando todos os jogos **abertos** de uma rodada/grupo possuem palpites
2. Exibe um Toast ou badge visual informando "Todos os palpites salvos"
3. A mensagem aparece apenas uma vez quando o ultimo palpite e preenchido

---

### Componentes Afetados

| Componente | Alteracao |
|------------|-----------|
| `PoolDetail.tsx` | Adicionar logica de verificacao de completude e callback para notificacao |
| `CupFormatView.tsx` | Adicionar tracking de palpites salvos e exibir notificacao por grupo |
| `MatchCard.tsx` | (Opcional) Adicionar callback para notificar quando salvo |

---

### Detalhes da Implementacao

#### 1. PoolDetail.tsx - Adicionar Verificacao de Completude

```typescript
// Funcao para verificar se todos os palpites de uma rodada estao preenchidos
const checkRoundCompletion = useCallback((roundId: string) => {
  const roundMatches = matches.filter(m => m.round_id === roundId);
  
  // Filtrar apenas jogos com prazo aberto (que permitem palpites)
  const openMatches = roundMatches.filter(m => {
    const deadline = new Date(m.prediction_deadline);
    return deadline > new Date() && !m.is_finished;
  });
  
  if (openMatches.length === 0) return false;
  
  // Verificar se todos os jogos abertos tem palpite
  const allFilled = openMatches.every(m => predictions[m.id] !== undefined);
  
  return allFilled;
}, [matches, predictions]);
```

#### 2. Modificar handlePredictionChange para detectar completude

```typescript
const handlePredictionChange = async (matchId: string, homeScore: number, awayScore: number) => {
  // ... codigo existente ...
  
  // Apos salvar com sucesso, verificar completude
  const match = matches.find(m => m.id === matchId);
  if (match) {
    // Atualizar predictions state primeiro
    const updatedPredictions = {
      ...predictions,
      [matchId]: { match_id: matchId, home_score: homeScore, away_score: awayScore, points_earned: null }
    };
    
    // Verificar se a rodada/grupo esta completa
    const roundMatches = matches.filter(m => m.round_id === match.round_id);
    const openMatches = roundMatches.filter(m => {
      const deadline = new Date(m.prediction_deadline);
      return deadline > new Date() && !m.is_finished;
    });
    
    const allFilled = openMatches.every(m => updatedPredictions[m.id] !== undefined);
    
    if (allFilled && openMatches.length > 0) {
      // Encontrar nome da rodada
      const round = rounds.find(r => r.id === match.round_id);
      const roundName = round?.name || 'Rodada';
      
      toast({
        title: 'Palpites Completos!',
        description: `Todos os ${openMatches.length} palpites de "${roundName}" foram salvos.`,
      });
    }
  }
};
```

#### 3. CupFormatView.tsx - Tracking por Grupo

Adicionar estado para rastrear notificacoes ja exibidas:

```typescript
const [notifiedGroups, setNotifiedGroups] = useState<Set<string>>(new Set());

// Modificar onBlur para incluir verificacao de grupo
const handleGroupPredictionComplete = (groupName: string, matchId: string) => {
  const groupData = matchesByGroup[groupName];
  if (!groupData) return;
  
  // Obter todos os jogos do grupo em todas as rodadas
  const allGroupMatches: Match[] = [];
  Object.values(groupData.rounds).forEach(roundMatches => {
    allGroupMatches.push(...roundMatches);
  });
  
  // Filtrar jogos abertos
  const openMatches = allGroupMatches.filter(m => canPredict(m));
  
  // Verificar se todos tem palpite
  const allFilled = openMatches.every(m => 
    predictions[m.id] || localPredictions[m.id]?.home !== '' && localPredictions[m.id]?.away !== ''
  );
  
  if (allFilled && openMatches.length > 0 && !notifiedGroups.has(groupName)) {
    setNotifiedGroups(prev => new Set([...prev, groupName]));
    // Callback para exibir toast
    onGroupComplete?.(groupName, openMatches.length);
  }
};
```

#### 4. Visual Badge no Card de Grupo

Adicionar indicador visual quando todos os palpites do grupo estiverem preenchidos:

```tsx
{allGroupPredictionsFilled && (
  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
    <CheckCircle2 className="h-4 w-4" />
    <span className="text-sm font-medium">
      Todos os palpites do {groupName} salvos!
    </span>
  </div>
)}
```

---

### Fluxo de Usuario

```text
1. Participante abre bolao
         |
         v
2. Preenche palpite do jogo 1
         |
         v
3. Sistema salva automaticamente
   (feedback individual: "Palpite salvo")
         |
         v
4. Preenche palpite do jogo 2 (ultimo da rodada)
         |
         v
5. Sistema salva automaticamente
         |
         v
6. Detecta: todos os jogos abertos tem palpite
         |
         v
7. Exibe Toast: "Palpites Completos! Todos os X palpites de [Rodada/Grupo] foram salvos"
```

---

### Prevencao de Notificacoes Duplicadas

Para evitar que a mensagem apareca multiplas vezes:

1. **Estado de notificacao**: Manter Set com rodadas/grupos ja notificados
2. **Reset ao mudar rodada**: Limpar estado quando usuario muda de rodada
3. **Verificar apenas apos salvamento**: Nao disparar na carga inicial da pagina

---

### Resumo das Alteracoes

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/PoolDetail.tsx` | Adicionar verificacao de completude no `handlePredictionChange` e exibir toast |
| `src/components/cup/CupFormatView.tsx` | Adicionar tracking de grupos completos e indicador visual por grupo |

---

### Comportamento Esperado

**Formato Standard:**
- Ao completar todos os palpites da rodada, aparece toast: "Palpites Completos! Todos os X palpites de [nome da rodada] foram salvos"

**Formato Copa:**
- Ao completar todos os palpites de um grupo (em todas as rodadas do grupo), aparece toast: "Palpites Completos! Todos os X palpites do [Grupo A/B/etc] foram salvos"
- Badge visual permanece visivel no card do grupo indicando completude

