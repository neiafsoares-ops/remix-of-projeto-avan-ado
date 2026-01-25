
## Plano: Edição Completa da Estrutura do Bolão (Parte 3 do Wizard)

### Objetivo

Permitir que o criador de bolões **edite todos os aspectos da estrutura** (equivalente ao Passo 3 do wizard de criação) para bolões que ainda **não foram iniciados** (sem rodadas finalizadas e sem jogos com resultados).

---

### Funcionalidades a Implementar

1. **Detecção do formato atual do bolão** (Standard, Copa, Knockout)
2. **Verificação se o bolão pode ser editado** (não iniciado)
3. **Interface completa de edição** igual ao wizard de criação
4. **Regeneração de rodadas** quando a estrutura muda
5. **Aba "Configurações" no PoolManage** com todas as opções

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/pools/PoolStructureConfigTab.tsx` | **Criar** | Novo componente que detecta formato e renderiza a interface de edição apropriada |
| `src/pages/PoolManage.tsx` | **Modificar** | Adicionar aba "Configurações" que renderiza o novo componente |

---

### Detalhes Técnicos

#### 1. Detectar Formato do Bolão

Analisar os nomes das rodadas existentes para identificar o formato:

```typescript
// Detectar formato baseado nos nomes das rodadas
const detectPoolFormat = (rounds: Round[]): 'standard' | 'cup' | 'knockout' => {
  const hasGroupRounds = rounds.some(r => r.name?.startsWith('Grupo'));
  const hasKnockoutRounds = rounds.some(r => 
    r.name?.includes('Oitavas') || 
    r.name?.includes('Quartas') || 
    r.name?.includes('Semifinal') || 
    r.name?.includes('Final')
  );
  
  if (hasGroupRounds && hasKnockoutRounds) return 'cup';
  if (hasKnockoutRounds && !hasGroupRounds) return 'knockout';
  return 'standard';
};
```

#### 2. Verificar se Bolão Pode Ser Editado

```typescript
const canEditStructure = (rounds: Round[], matches: Match[]): boolean => {
  // Não pode editar se alguma rodada foi finalizada
  const hasFinalizedRounds = rounds.some(r => r.is_finalized);
  if (hasFinalizedRounds) return false;
  
  // Não pode editar se algum jogo já tem resultado
  const hasFinishedMatches = matches.some(m => m.is_finished);
  if (hasFinishedMatches) return false;
  
  return true;
};
```

#### 3. Interface Condicional por Formato

```typescript
// Renderização condicional baseada no formato
{poolFormat === 'standard' && (
  <PoolStructureStep
    totalRounds={totalRounds}
    matchesPerRound={matchesPerRound}
    onTotalRoundsChange={setTotalRounds}
    onMatchesPerRoundChange={setMatchesPerRound}
    maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
  />
)}

{poolFormat === 'cup' && (
  <CupFormatStep
    config={cupConfig}
    onChange={setCupConfig}
    maxTeams={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxTeams}
    maxGroups={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxGroups}
    maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
  />
)}

{poolFormat === 'knockout' && (
  <KnockoutOnlyStep
    config={knockoutConfig}
    onChange={setKnockoutConfig}
    maxTeams={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxTeams}
    maxMatches={isPrivilegedUser ? undefined : MEMBER_LIMITS.maxMatches}
  />
)}
```

#### 4. Lógica de Salvamento

Ao salvar as alterações da estrutura:

1. **Deletar rodadas existentes** (se vazias)
2. **Atualizar tabela `pools`** com novos valores
3. **Regenerar rodadas** usando a mesma lógica do wizard:
   - Para Standard: criar X rodadas simples
   - Para Cup: criar grupos + fases eliminatórias
   - Para Knockout: criar fases eliminatórias

```typescript
const handleSaveStructure = async () => {
  // 1. Deletar rodadas vazias existentes
  const emptyRoundIds = rounds
    .filter(r => (r.matchCount || 0) === 0 && !r.is_finalized)
    .map(r => r.id);
    
  if (emptyRoundIds.length > 0) {
    await supabase.from('rounds').delete().in('id', emptyRoundIds);
  }
  
  // 2. Atualizar pool com nova configuração
  await supabase.from('pools').update({
    total_rounds: calculatedTotalRounds,
    matches_per_round: calculatedMatchesPerRound,
  }).eq('id', poolId);
  
  // 3. Gerar novas rodadas baseado no formato
  if (poolFormat === 'cup') {
    const newRounds = generateCupRounds(poolId, cupConfig);
    await supabase.from('rounds').insert(newRounds);
  } else if (poolFormat === 'knockout') {
    const newRounds = generateKnockoutRounds(poolId, knockoutConfig);
    await supabase.from('rounds').insert(newRounds);
  } else {
    const newRounds = generateStandardRounds(poolId, totalRounds, matchesPerRound);
    await supabase.from('rounds').insert(newRounds);
  }
};
```

---

### Novo Componente: PoolStructureConfigTab

Props do componente:

```typescript
interface PoolStructureConfigTabProps {
  poolId: string;
  pool: Pool;
  rounds: Round[];
  matches: Match[];
  userId: string;
  isPrivilegedUser: boolean;
  onConfigUpdated: () => void;
}
```

Estados internos:
- `poolFormat`: 'standard' | 'cup' | 'knockout'
- `canEdit`: boolean (se o bolão pode ser editado)
- `cupConfig`: CupFormatConfig
- `knockoutConfig`: KnockoutOnlyConfig
- `totalRounds`, `matchesPerRound`: para formato standard
- `saving`: boolean

---

### Aba Configurações no PoolManage

Adicionar nova aba ao TabsList:

```typescript
<TabsList>
  <TabsTrigger value="rounds">Rodadas</TabsTrigger>
  <TabsTrigger value="config">Configurações</TabsTrigger>
  <TabsTrigger value="participants">Participantes</TabsTrigger>
  <TabsTrigger value="predictions">Palpites</TabsTrigger>
</TabsList>

<TabsContent value="config">
  <PoolStructureConfigTab
    poolId={id!}
    pool={pool}
    rounds={rounds}
    matches={matches}
    userId={user!.id}
    isPrivilegedUser={userRoles.includes('admin') || userRoles.includes('moderator')}
    onConfigUpdated={fetchData}
  />
</TabsContent>
```

---

### Layout Visual Esperado

```text
+------------------------------------------------------------------+
| ⚙️ Configurações da Estrutura                                     |
+------------------------------------------------------------------+
| ✅ Este bolão ainda não foi iniciado e pode ser reconfigurado     |
+------------------------------------------------------------------+

[Formato Detectado: Copa]

+------------------------------------------------------------------+
| 👥 Configurações Gerais                                          |
+------------------------------------------------------------------+
| Total de Equipes: [32]  Total de Grupos: [8]  Classificados: [2] |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| 🏳️ Fase de Grupos                                                |
+------------------------------------------------------------------+
| (●) Somente ida  ( ) Ida e volta                                  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| ⚔️ Mata-mata                                                      |
+------------------------------------------------------------------+
| Definição: (●) Sorteio Automático  ( ) Escolha Manual            |
| Formato: ( ) Somente ida  (●) Ida e volta                        |
| Disputa 3º lugar: ( ) Não  (●) Sim                               |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| 🏆 Jogo Final                                                     |
+------------------------------------------------------------------+
| (●) Jogo único  ( ) Ida e volta                                  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| 📊 Resumo: 8 grupos | 48 equipes no mata-mata | ~120 partidas    |
+------------------------------------------------------------------+

                    [ 💾 Salvar Alterações ]

+------------------------------------------------------------------+
| ⚠️ ATENÇÃO: Salvar irá remover as rodadas atuais e criar novas   |
|    baseadas na configuração acima. Jogos existentes sem          |
|    resultados serão removidos.                                   |
+------------------------------------------------------------------+
```

---

### Quando Bolão NÃO Pode Ser Editado

Se houver rodadas finalizadas ou jogos com resultados:

```text
+------------------------------------------------------------------+
| ⚙️ Configurações da Estrutura                                     |
+------------------------------------------------------------------+
| 🔒 Este bolão já foi iniciado e não pode ser reconfigurado        |
|                                                                   |
| Motivo:                                                           |
| - 3 rodadas já foram finalizadas                                  |
| - 12 jogos já possuem resultados lançados                        |
+------------------------------------------------------------------+

[Configuração Atual - Somente Leitura]
...
```

---

### Reutilização de Código

A lógica de geração de rodadas (`generateCupRounds`, `generateKnockoutRounds`) já existe no `CreatePoolWizard.tsx`. Será extraída para um utilitário ou reutilizada diretamente.

---

### Comportamento Esperado

1. **Acesso**: Criador acessa aba "Configurações" no gerenciamento do bolão
2. **Detecção**: Sistema detecta formato atual (Standard/Cup/Knockout)
3. **Verificação**: Sistema verifica se pode ser editado
4. **Edição**: Se permitido, exibe interface completa do Passo 3
5. **Salvamento**: Ao salvar, regenera toda a estrutura de rodadas
6. **Feedback**: Toast de sucesso/erro e atualização da lista de rodadas
