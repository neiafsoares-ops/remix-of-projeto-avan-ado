

## Plano: Interface de Gestao de Grupos como Novo Padrao para Todos os Boloes

### Objetivo

Implementar o layout de gestao de grupos estilo Copa do Mundo como padrao para **todos os boloes**, permitindo ao administrador/criador visualizar claramente:

1. **Qual e o grupo** (Grupo A, Grupo B, etc.)
2. **Em qual rodada cada grupo se encontra** (Rodada 1 de 3, etc.)
3. **Quantos jogos podem ser adicionados** (ex: 2 jogos para grupo de 4 equipes)

A interface sera consistente tanto para boloes normais quanto para sugestoes Zapions.

---

### Arquivos a Modificar

| Arquivo | Tipo de Bolao | Alteracao |
|---------|---------------|-----------|
| `src/components/matches/AddGamesScreen.tsx` | Boloes normais | Detectar formato Copa e renderizar layout de grupos organizado |
| `src/components/admin/SuggestedPoolMatchesScreen.tsx` | Sugestoes Zapions | Mesma logica de grupos aplicada |

---

### Resumo das Mudancas Tecnicas

#### 1. Deteccao de Formato Copa

Reutilizar a mesma logica ja existente em `CupFormatView.tsx`:

```typescript
// Identificar rodadas de grupo
const groupRounds = useMemo(() => 
  rounds.filter(r => r.name?.startsWith('Grupo')),
  [rounds]
);

// Obter grupos unicos
const uniqueGroups = useMemo(() => {
  const groups = new Set<string>();
  groupRounds.forEach(r => {
    if (r.name) {
      const groupMatch = r.name.match(/^Grupo\s+[A-Za-z]/);
      if (groupMatch) groups.add(groupMatch[0]);
    }
  });
  return Array.from(groups).sort();
}, [groupRounds]);

const isCupFormat = uniqueGroups.length > 0;
```

#### 2. Navegacao Independente por Grupo

Cada grupo tera sua propria rodada selecionada:

```typescript
const [groupRoundSelection, setGroupRoundSelection] = useState<Record<string, number>>({});

const getSelectedRound = (groupName: string) => groupRoundSelection[groupName] || 0;
const setSelectedRound = (groupName: string, roundIndex: number) => {
  setGroupRoundSelection(prev => ({ ...prev, [groupName]: roundIndex }));
};
```

#### 3. Calculo de Jogos por Rodada Baseado em Equipes

Funcao para determinar automaticamente quantos jogos uma rodada de grupo pode ter:

```typescript
// n times jogam n/2 partidas por rodada (todos contra todos por turno)
// 4 times = 2 jogos, 6 times = 3 jogos, 8 times = 4 jogos
function calculateMatchesPerRound(teamCount: number): number {
  if (teamCount <= 2) return 1;
  return Math.floor(teamCount / 2);
}
```

#### 4. Organizacao de Dados por Grupo

```typescript
const matchesByGroup = useMemo(() => {
  const byGroup: Record<string, { 
    rounds: Round[]; 
    matchesByRound: Record<string, Match[]>;
    teamCount: number;
    matchesPerRound: number;
  }> = {};
  
  uniqueGroups.forEach(groupName => {
    // Filtrar rodadas deste grupo
    const groupRoundsList = groupRounds
      .filter(r => r.name?.startsWith(groupName))
      .sort((a, b) => a.round_number - b.round_number);
    
    // Mapear jogos por rodada e contar times
    const matchesByRoundMap: Record<string, Match[]> = {};
    const teamsInGroup = new Set<string>();
    
    groupRoundsList.forEach(round => {
      const roundMatches = matches.filter(m => m.round_id === round.id);
      matchesByRoundMap[round.id] = roundMatches;
      roundMatches.forEach(m => {
        teamsInGroup.add(m.home_team);
        teamsInGroup.add(m.away_team);
      });
    });
    
    const teamCount = Math.max(teamsInGroup.size, 4); // Minimo 4 equipes
    
    byGroup[groupName] = {
      rounds: groupRoundsList,
      matchesByRound: matchesByRoundMap,
      teamCount,
      matchesPerRound: calculateMatchesPerRound(teamCount)
    };
  });
  
  return byGroup;
}, [uniqueGroups, groupRounds, matches]);
```

---

### Novo Layout Visual

A estrutura visual sera:

```text
+------------------------------------------------------------------+
| GRUPO A                         < Rodada 1 de 3 >                |
| [4 equipes] [2 jogos por rodada] [1/2 preenchidos]               |
+------------------------------------------------------------------+
|                                                                  |
|  Jogo 1                                           [Modificado]   |
|  +----------------------------------------------------------+   |
|  |  [Manchester United    ] x [Liverpool FC       ]         |   |
|  |  [____Data Jogo____]       [____Prazo Palpite____]       |   |
|  |                                             [Salvar]     |   |
|  +----------------------------------------------------------+   |
|                                                                  |
|  Jogo 2                                                          |
|  +----------------------------------------------------------+   |
|  |  [Buscar mandante...   ] x [Buscar visitante...]         |   |
|  |  [____Data Jogo____]       [____Prazo Palpite____]       |   |
|  |                                             [Salvar]     |   |
|  +----------------------------------------------------------+   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| GRUPO B                         < Rodada 2 de 3 >                |
| [4 equipes] [2 jogos por rodada] [0/2 preenchidos]               |
+------------------------------------------------------------------+
|  (pode estar em rodada diferente do Grupo A)                     |
+------------------------------------------------------------------+
```

---

### Componente de Card de Grupo

```typescript
{isCupFormat && (
  <div className="space-y-6">
    {uniqueGroups.map(groupName => {
      const groupData = matchesByGroup[groupName];
      const selectedRoundIndex = getSelectedRound(groupName);
      const currentRound = groupData.rounds[selectedRoundIndex];
      const totalGroupRounds = groupData.rounds.length;
      const matchesPerRound = groupData.matchesPerRound;
      const currentMatches = currentRound 
        ? groupData.matchesByRound[currentRound.id] || [] 
        : [];
      
      return (
        <Card key={groupName}>
          {/* Header do Grupo com Navegacao */}
          <CardHeader className="py-3 px-4 border-b bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Nome do Grupo */}
              <CardTitle className="text-base font-semibold uppercase">
                {groupName}
              </CardTitle>
              
              {/* Navegacao de Rodada */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedRound(groupName, selectedRoundIndex - 1)}
                  disabled={selectedRoundIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  Rodada {selectedRoundIndex + 1} de {totalGroupRounds}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedRound(groupName, selectedRoundIndex + 1)}
                  disabled={selectedRoundIndex >= totalGroupRounds - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Badges Informativos */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline">
                {groupData.teamCount} equipes
              </Badge>
              <Badge variant="secondary">
                {matchesPerRound} jogos por rodada
              </Badge>
              <Badge variant={currentMatches.length >= matchesPerRound ? "default" : "outline"}>
                {currentMatches.length}/{matchesPerRound} preenchidos
              </Badge>
            </div>
          </CardHeader>
          
          {/* Slots de Jogos */}
          <CardContent className="p-4">
            <div className="space-y-4">
              {Array.from({ length: matchesPerRound }, (_, i) => {
                const match = currentMatches[i];
                return renderMatchSlot(groupName, currentRound?.id, i, match);
              })}
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
)}
```

---

### Alteracoes em AddGamesScreen.tsx

1. **Adicionar imports**: `useMemo`
2. **Adicionar estados**:
   - `groupRoundSelection` para navegacao por grupo
3. **Adicionar funcoes**:
   - `getSelectedRound`, `setSelectedRound`
   - `calculateMatchesPerRound`
4. **Adicionar memos**:
   - `groupRounds`, `uniqueGroups`, `matchesByGroup`, `isCupFormat`
5. **Renderizacao condicional**:
   - Se `isCupFormat`: renderizar layout de grupos
   - Senao: manter layout atual (lista de slots linear)

---

### Alteracoes em SuggestedPoolMatchesScreen.tsx

Mesmas alteracoes do AddGamesScreen.tsx, adaptadas para:
- Usar `SuggestedPoolRound` em vez de `Round`
- Usar `SuggestedPoolMatch` em vez de `Match`
- Usar tabelas `suggested_pool_*` em vez de tabelas normais

---

### Comportamento Esperado

1. **Deteccao automatica**: Sistema detecta formato Copa quando existem rodadas com nome "Grupo X"
2. **Navegacao independente**: Cada grupo pode estar em rodada diferente simultaneamente
3. **Limite de jogos claro**: Badges mostram "2 jogos por rodada" para grupos de 4 equipes
4. **Slots corretos**: Apenas o numero correto de slots aparece (2 para 4 times, 3 para 6 times, etc.)
5. **Fallback**: Boloes sem formato Copa continuam usando o layout linear atual

---

### Notas Importantes

- O calculo de `matchesPerRound` e baseado no numero de times **ja adicionados** ao grupo
- Se nenhum jogo foi adicionado ainda, assume-se o minimo de 4 equipes (2 jogos por rodada)
- A navegacao global e mantida para rodadas que NAO sao de grupo (oitavas, quartas, etc.)
- O layout de grupos e exclusivo para rodadas com nome "Grupo [Letra]"

