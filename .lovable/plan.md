
## Plano: Módulo de Auditoria para Administradores

### Objetivo

Criar uma nova aba exclusiva "Auditoria" no painel administrativo que permite ao administrador visualizar e editar estruturalmente todos os bolões do sistema, sem impactar pontuações já calculadas.

---

### Resumo das Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| Listar todos os bolões | Tabela com todos os campeonatos do sistema, com busca e filtros |
| Selecionar bolão para auditar | Expandir detalhes do bolão e acessar edições estruturais |
| Editar estrutura de grupos | Modificar nomes de grupos, adicionar/remover grupos |
| Substituir equipes no mata-mata | Trocar times em confrontos de fases eliminatórias |
| Corrigir chaves/confrontos | Ajustar distribuição de equipes nas rodadas |
| Confirmação obrigatória | Todas as alterações requerem confirmação antes de salvar |

---

### Regras de Segurança

- **Nenhuma alteração pode**:
  - Recalcular pontuação de participantes
  - Alterar resultados já lançados (home_score, away_score)
  - Modificar o campo `is_finished` dos jogos
  - Impactar rankings existentes

- **As edições são apenas**:
  - Nomes de times (home_team, away_team)
  - Imagens de times (home_team_image, away_team_image)
  - Nomes de rodadas/grupos
  - Estrutura organizacional

---

### Arquitetura de Componentes

```text
src/
├── pages/
│   └── Admin.tsx                      # Adicionar nova aba "Auditoria"
├── components/
│   └── admin/
│       ├── AuditPoolsTab.tsx          # NOVO - Lista de bolões para auditar
│       ├── AuditPoolDetail.tsx        # NOVO - Detalhes e edição de bolão
│       ├── AuditGroupEditor.tsx       # NOVO - Editor de estrutura de grupos
│       └── AuditKnockoutEditor.tsx    # NOVO - Editor de confrontos mata-mata
```

---

### Componente 1: AuditPoolsTab

**Responsabilidades:**
- Listar todos os bolões do sistema (independente do criador)
- Busca por nome/criador
- Filtros por status (ativo/inativo) e formato (standard/cup/knockout)
- Ao selecionar um bolão, exibir `AuditPoolDetail`

**Estrutura:**

```tsx
interface AuditPoolsTabProps {}

// Estados
- pools: PoolWithDetails[]
- selectedPoolId: string | null
- searchTerm: string
- filters: { status: 'all' | 'active' | 'inactive', format: 'all' | 'standard' | 'cup' | 'knockout' }
- loading: boolean

// Dados por bolão
- id, name, created_by, creator_public_id
- participant_count
- rounds_count, matches_count
- finalized_rounds_count (rodadas já finalizadas)
- finished_matches_count (jogos já encerrados)
- format (detectado: standard/cup/knockout)
```

**UI:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 🔍 Auditoria de Bolões                                                 │
│    Selecione um bolão para visualizar e editar sua estrutura           │
├────────────────────────────────────────────────────────────────────────┤
│ [🔎 Buscar bolão...]  [Filtro: Todos ▼] [Formato: Todos ▼]            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🏆 Copa do Mundo 2026                            @zapions        │  │
│ │    👥 45 participantes  📅 17 rodadas  ⚽ 64 jogos               │  │
│ │    🔒 3 rodadas finalizadas | ✅ 12 jogos encerrados            │  │
│ │    [Copa] [Ativo]                                   [Auditar →] │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ ⚽ Brasileirão 2026                               @teste         │  │
│ │    👥 12 participantes  📅 38 rodadas  ⚽ 380 jogos              │  │
│ │    🔒 0 rodadas finalizadas | ✅ 0 jogos encerrados             │  │
│ │    [Padrão] [Ativo]                                 [Auditar →] │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Componente 2: AuditPoolDetail

**Responsabilidades:**
- Exibir informações detalhadas do bolão selecionado
- Mostrar lista de rodadas/grupos com contagem de jogos
- Permitir navegação para edição de grupos ou mata-mata
- Confirmar alterações antes de salvar

**Estados:**

```tsx
interface AuditPoolDetailProps {
  poolId: string;
  onBack: () => void;
}

// Estados internos
- pool: Pool
- rounds: Round[]
- matches: Match[]
- activeView: 'overview' | 'groups' | 'knockout'
- pendingChanges: Change[]  // Alterações pendentes de confirmação
- confirmDialogOpen: boolean
```

**UI:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [← Voltar]                                                             │
│                                                                        │
│ 🔍 Auditoria: Copa do Mundo 2026                                       │
│    Criado por @zapions em 25/01/2026                                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│ │ 👥 Participantes│  │ 📅 Rodadas      │  │ ⚽ Jogos        │         │
│ │      45         │  │      17         │  │      64         │         │
│ └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                        │
│ ⚠️ Atenção: Alterações estruturais não afetam pontuações já           │
│    calculadas. Resultados lançados não podem ser modificados.          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ [Editar Grupos]        [Editar Mata-Mata]        [Ver Todas Rodadas]  │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Rodadas do Bolão                                                  │  │
│ ├──────────────────────────────────────────────────────────────────┤  │
│ │ Grupo A          │ 6 jogos │ 2 finalizados │ ⚠️ Estrutura       │  │
│ │ Grupo B          │ 6 jogos │ 0 finalizados │ ✏️ Editável        │  │
│ │ ...              │         │               │                     │  │
│ │ Oitavas de Final │ 8 jogos │ 0 finalizados │ ✏️ Editável        │  │
│ │ Quartas de Final │ 4 jogos │ 0 finalizados │ ✏️ Editável        │  │
│ │ Final            │ 1 jogo  │ 0 finalizados │ ✏️ Editável        │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 📝 Alterações Pendentes (2)                    [Confirmar Todas] │  │
│ │ • Grupo A: Time "Brasil" substituído por "Argentina"             │  │
│ │ • Oitavas: Confronto 3 alterado                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Componente 3: AuditGroupEditor

**Responsabilidades:**
- Editar nomes de grupos (ex: "Grupo A" → "Grupo 1")
- Substituir times dentro de grupos
- Exibir aviso quando há jogos finalizados no grupo
- Preservar placares já lançados

**Regras:**
- Jogos com `is_finished = true` mostram aviso mas permitem edição de times
- Alterações em times NÃO recalculam pontos
- Cada alteração fica pendente até confirmação

**UI:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [← Voltar]  Editar Grupos                                              │
├────────────────────────────────────────────────────────────────────────┤
│ Navegação: [A] [B] [C] [D] [E] [F] [G] [H]                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ 📋 Grupo A                                         [Renomear Grupo]   │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Jogo 1: Brasil 2 x 0 Sérvia                    ✅ Finalizado     │  │
│ │         [🔄 Substituir Brasil] [🔄 Substituir Sérvia]            │  │
│ │         ⚠️ Placar já lançado - será preservado                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ Jogo 2: Suíça vs Camarões                      ⏳ Pendente       │  │
│ │         [🔄 Substituir Suíça] [🔄 Substituir Camarões]           │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Componente 4: AuditKnockoutEditor

**Responsabilidades:**
- Reutilizar lógica do `EditKnockoutMatchupsScreen` existente
- Adicionar camada de confirmação antes de salvar
- Exibir claramente quais confrontos já têm resultado

**Diferenças do componente original:**
- Modo "auditoria" com confirmação obrigatória
- Log de alterações para audit_logs
- Não permite alterar placares (somente times)

---

### Fluxo de Confirmação

Todas as alterações seguem o mesmo fluxo:

```text
1. Usuário seleciona alteração (ex: substituir time)
2. Alteração é adicionada à lista de "pendingChanges"
3. Preview da alteração aparece na tela
4. Usuário pode desfazer alteração pendente
5. Quando pronto, clica em "Confirmar Alterações"
6. Dialog de confirmação exibe resumo completo
7. Usuário confirma → alterações são aplicadas ao banco
8. Log de auditoria é registrado
```

**Dialog de Confirmação:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️ Confirmar Alterações de Auditoria                                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Você está prestes a aplicar 3 alterações estruturais:                  │
│                                                                        │
│ 📝 Alterações:                                                         │
│ 1. [Grupo A, Jogo 1] Time casa: "Brasil" → "Argentina"                │
│ 2. [Grupo A, Jogo 1] Time fora: "Sérvia" → "Chile"                    │
│ 3. [Oitavas, Jogo 5] Time casa: "A Definir" → "França"                │
│                                                                        │
│ ⚠️ Importante:                                                         │
│ • Placares já lançados serão preservados                              │
│ • Pontuações dos participantes não serão afetadas                     │
│ • Rankings existentes permanecerão inalterados                        │
│                                                                        │
│                              [Cancelar]  [✅ Confirmar Alterações]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Registro de Auditoria

Cada alteração confirma gera um registro em `audit_logs`:

```typescript
await supabase.rpc('insert_audit_log', {
  p_action: 'AUDIT_POOL_STRUCTURE',
  p_table_name: 'matches',
  p_record_id: matchId,
  p_old_data: { home_team: 'Brasil', away_team: 'Sérvia' },
  p_new_data: { home_team: 'Argentina', away_team: 'Chile' },
});
```

---

### Alterações em Admin.tsx

**Adicionar nova aba na TabsList:**

```tsx
<TabsTrigger value="audit" className="gap-2">
  <Search className="h-4 w-4" />
  <span className="hidden sm:inline">Auditoria</span>
</TabsTrigger>
```

**Adicionar TabsContent:**

```tsx
<TabsContent value="audit" className="space-y-6">
  <AuditPoolsTab />
</TabsContent>
```

**Atualizar grid de tabs para 7 colunas:**

```tsx
<TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
```

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/AuditPoolsTab.tsx` | Lista de bolões para auditoria |
| `src/components/admin/AuditPoolDetail.tsx` | Detalhes e coordenação de edições |
| `src/components/admin/AuditGroupEditor.tsx` | Editor de estrutura de grupos |
| `src/components/admin/AuditKnockoutEditor.tsx` | Editor de confrontos mata-mata |

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Admin.tsx` | Adicionar aba "Auditoria" e importar componente |

---

### Ícones Utilizados

| Ícone | Uso |
|-------|-----|
| `Search` | Aba de Auditoria no menu |
| `ClipboardCheck` | Título da seção |
| `AlertTriangle` | Avisos sobre jogos finalizados |
| `Pencil` | Indicador de editável |
| `Lock` | Indicador de bloqueado (resultado lançado) |
| `RotateCcw` | Desfazer alteração pendente |
| `CheckCircle2` | Confirmar alterações |

---

### Tipos TypeScript

```typescript
interface PendingChange {
  id: string;
  type: 'team_substitution' | 'round_rename';
  targetTable: 'matches' | 'rounds';
  targetId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  description: string;  // Ex: "Grupo A, Jogo 1: Brasil → Argentina"
}

interface AuditPoolInfo {
  id: string;
  name: string;
  created_by: string;
  creator_public_id: string;
  is_active: boolean;
  participant_count: number;
  rounds_count: number;
  matches_count: number;
  finalized_rounds_count: number;
  finished_matches_count: number;
  format: 'standard' | 'cup' | 'knockout';
}
```

---

### Benefícios

- Correção de erros de configuração sem impacto em pontuações
- Rastreabilidade completa via logs de auditoria
- Confirmação obrigatória previne alterações acidentais
- Interface intuitiva reutilizando padrões existentes
- Separação clara entre edição estrutural e competitiva
