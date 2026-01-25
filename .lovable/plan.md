

## Plano: Layout de Fase de Grupos Estilo Copa do Mundo

### Resumo das Mudancas

Implementar o novo layout visual para fase de grupos do formato Copa com:

1. **Navegacao independente por grupo** - Cada grupo terá seu próprio seletor de rodada
2. **Placar com fundo destacado** - Visual mais claro para resultados e palpites
3. **Separacao visual melhorada** - Divisores claros entre os jogos
4. **Header integrado com navegacao** - Cada card de grupo terá navegação própria

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/cup/CupFormatView.tsx` | Navegacao independente por grupo, visual melhorado do placar |

---

### Mudancas Tecnicas Detalhadas

#### 1. Estado de Navegacao por Grupo (Linha 186)

**De:**
```typescript
const [selectedGroupRound, setSelectedGroupRound] = useState<number>(1);
```

**Para:**
```typescript
const [groupRoundSelection, setGroupRoundSelection] = useState<Record<string, number>>({});

const getSelectedRound = (groupName: string) => groupRoundSelection[groupName] || 1;
const setSelectedRound = (groupName: string, round: number) => {
  setGroupRoundSelection(prev => ({ ...prev, [groupName]: round }));
};
```

#### 2. Visual do Placar com Fundo Destacado (Linhas 338-396)

**De:**
```typescript
<div className="flex items-center gap-1 px-2 min-w-[90px] justify-center flex-shrink-0">
  {match.is_finished ? (
    <div className="flex items-center gap-1">
      <span className="text-lg font-bold ...">{match.home_score}</span>
      <span className="text-muted-foreground text-sm mx-1">x</span>
      <span className="text-lg font-bold ...">{match.away_score}</span>
    </div>
  ) : canPred ? (
    <div className="flex items-center gap-1">
      <Input ... className="w-10 h-8 text-center p-0 text-sm font-bold" />
      <span className="text-muted-foreground text-xs">x</span>
      <Input ... className="w-10 h-8 text-center p-0 text-sm font-bold" />
    </div>
  ) : ...
}
```

**Para:**
```typescript
<div className="flex items-center justify-center flex-shrink-0">
  {match.is_finished ? (
    <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-4 py-2 min-w-[100px] justify-center">
      <span className="text-xl font-bold w-8 text-center ...">{match.home_score}</span>
      <span className="text-muted-foreground font-medium">x</span>
      <span className="text-xl font-bold w-8 text-center ...">{match.away_score}</span>
    </div>
  ) : canPred ? (
    <div className="flex items-center gap-2 bg-primary/10 dark:bg-primary/20 rounded-lg px-3 py-1.5">
      <Input ... className="w-12 h-9 text-center p-0 text-lg font-bold bg-background" />
      <span className="text-muted-foreground font-medium">x</span>
      <Input ... className="w-12 h-9 text-center p-0 text-lg font-bold bg-background" />
    </div>
  ) : ...
}
```

#### 3. Header do Card de Grupo com Navegacao (Linhas 457-470)

**De:**
```typescript
<CardHeader className="py-2 px-4 border-b bg-muted/30">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <CardTitle className="text-sm font-semibold text-foreground">
        RODADA {selectedGroupRound}
      </CardTitle>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
    <button className="text-xs text-primary hover:underline flex items-center gap-1">
      <Filter className="h-3 w-3" /> equipes
    </button>
  </div>
</CardHeader>
```

**Para:**
```typescript
<CardHeader className="py-3 px-4 border-b bg-muted/30">
  <div className="flex items-center justify-between">
    <CardTitle className="text-sm font-semibold uppercase tracking-wide">
      Rodada {getSelectedRound(groupName)}
    </CardTitle>
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setSelectedRound(groupName, getSelectedRound(groupName) - 1)}
        disabled={getSelectedRound(groupName) <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[50px] text-center">
        {getSelectedRound(groupName)}/{totalGroupRounds}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setSelectedRound(groupName, getSelectedRound(groupName) + 1)}
        disabled={getSelectedRound(groupName) >= totalGroupRounds}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
</CardHeader>
```

#### 4. Uso do Estado por Grupo (Linha 441)

**De:**
```typescript
const currentGroupRoundMatches = groupData?.rounds[selectedGroupRound] || [];
```

**Para:**
```typescript
const currentGroupRoundMatches = groupData?.rounds[getSelectedRound(groupName)] || [];
```

#### 5. Remover Navegacao Global (Linhas 489-512)

Remover o bloco de navegacao global que aparece abaixo de todos os grupos, já que agora cada grupo terá sua própria navegação.

**Remover:**
```typescript
{/* Round Navigation for Groups */}
{maxGroupRounds > 1 && (
  <div className="flex items-center justify-center gap-2 pt-4 border-t">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setSelectedGroupRound(prev => Math.max(1, prev - 1))}
      disabled={selectedGroupRound <= 1}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <span className="text-sm font-medium min-w-[120px] text-center">
      Rodada {selectedGroupRound} de {maxGroupRounds}
    </span>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setSelectedGroupRound(prev => Math.min(maxGroupRounds, prev + 1))}
      disabled={selectedGroupRound >= maxGroupRounds}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
)}
```

#### 6. Separacao Visual Entre Jogos (Linha 478)

**De:**
```typescript
<div>
  {currentGroupRoundMatches.slice(0, matchesPerRound).map(renderGroupMatchCard)}
</div>
```

**Para:**
```typescript
<div className="divide-y divide-border">
  {currentGroupRoundMatches.slice(0, matchesPerRound).map(renderGroupMatchCard)}
</div>
```

E no `renderGroupMatchCard` ajustar o padding:

**De:**
```typescript
<div key={match.id} className="py-3 border-b last:border-b-0">
```

**Para:**
```typescript
<div key={match.id} className="py-4 first:pt-2 last:pb-2">
```

#### 7. Remover Import do Filter (Linha 7)

Remover `Filter` dos imports pois nao sera mais usado.

---

### Novo Visual Esperado

```text
+-------------------------------------------+  +-------------------------------------------+
| GRUPO A                                   |  | Rodada 1                        < 1/3 >  |
+-------------------------------------------+  +-------------------------------------------+
| #  | Equipe      | P | J | V | E | D |...|  |                                           |
|----|-------------|---|---|---|---|---|---|  |  Haylles FC  [logo] [  6  x  6  ] [logo] Inter|
| 1  | Haylles FC  | 9 | 3 | 3 | 0 | 0 |...|  |                 (fundo destacado)          |
| 2  | Inter       | 6 | 3 | 2 | 0 | 1 |...|  |  ----------------------------------------- |
| 3  | D@niboy FC  | 3 | 3 | 1 | 0 | 2 |...|  |  D@niboy FC  [logo] [  6  x  5  ] [logo] Napoli|
| 4  | Napoli      | 0 | 3 | 0 | 0 | 3 |...|  |                 (fundo destacado)          |
+-------------------------------------------+  +-------------------------------------------+

+-------------------------------------------+  +-------------------------------------------+
| GRUPO B                                   |  | Rodada 2                        < 2/3 >  |
+-------------------------------------------+  +-------------------------------------------+
|         (pode estar em rodada diferente)  |  |         (navegacao independente)          |
+-------------------------------------------+  +-------------------------------------------+
```

---

### Layout para Palpites (Participantes)

Quando o participante pode fazer palpite, o visual fica:

```text
+-------------------------------------------+
|  Haylles FC  [logo] [ ___ x ___ ] [logo] Inter|
|                (fundo destacado)           |
|             (inputs editaveis)             |
+-------------------------------------------+
```

Os inputs mantêm o fundo destacado igual aos placares finais.

---

### Comportamento Esperado

1. **Tabela de Grupos**: Exibe classificação apenas com nome do time
2. **Jogos por Rodada**: Cada grupo tem sua própria navegação independente (pode ver Grupo A na Rodada 1 e Grupo B na Rodada 3)
3. **Visual do Placar**: Números em destaque com fundo colorido (primary/10)
4. **Inputs de Palpite**: Mesmo visual com fundo destacado, mas campos editáveis
5. **Responsividade**: Em mobile, layout em coluna única (tabela em cima, jogos embaixo)

---

### Sem Impacto

- Fase de mata-mata (knockout) - permanece inalterada
- GroupStandingsTable - sem alterações
- Outros componentes - não afetados

