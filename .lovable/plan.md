
## Plano: Criar Página "Meus Palpites" (MyPredictions)

### Problema
A rota `/my-predictions` está referenciada no menu de navegação (Navbar) mas a página e a rota não existem no sistema, causando erro 404.

### Análise

**Referências existentes:**
- `src/components/layout/Navbar.tsx` (linhas 98-101, 185-191): Link para `/my-predictions`
- `src/App.tsx`: Falta a rota e o import

**Dados a buscar (3 produtos):**

| Produto | Tabela de Palpites | Tabela de Participação | Info Adicional |
|---------|-------------------|------------------------|----------------|
| Bolão Tradicional | `predictions` | `pool_participants` | `matches`, `pools`, `rounds` |
| Quiz 10 | `quiz_answers` | `quiz_participants` | `quiz_questions`, `quizzes`, `quiz_rounds` |
| Torcida Mestre | `torcida_mestre_predictions` | `torcida_mestre_participants` | `torcida_mestre_rounds`, `torcida_mestre_pools` |

---

### Solução

#### 1. Criar Nova Página `MyPredictions.tsx`

**Arquivo:** `src/pages/MyPredictions.tsx`

**Estrutura:**
- Layout com abas (Tabs): Bolões | Quiz 10 | Torcida Mestre
- Cada aba mostra os palpites do usuário organizados por bolão/rodada
- Links diretos para os bolões/quizzes específicos

**Visual proposto:**

```text
┌─────────────────────────────────────────────────────────────┐
│  ← Meus Palpites                                            │
├─────────────────────────────────────────────────────────────┤
│  [Bolões]    [Quiz 10]    [Torcida Mestre]                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Copa do Mundo 2026                                    │ │
│  │ Rodada 1 • 10 palpites • 25 pontos                   │ │
│  │ [Ver Bolão →]                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Libertadores 2025                                     │ │
│  │ Rodada 3 • 8 palpites • 18 pontos                    │ │
│  │ [Ver Bolão →]                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Registrar Rota no App.tsx

Adicionar import e rota:

```typescript
import MyPredictions from "./pages/MyPredictions";

// Na lista de rotas:
<Route path="/my-predictions" element={<MyPredictions />} />
```

---

### Estrutura de Dados por Aba

#### Aba "Bolões" (Bolão Tradicional)

Buscar participações do usuário e agregar palpites:

```typescript
// 1. Buscar participações do usuário
const { data: participations } = await supabase
  .from('pool_participants')
  .select(`
    id,
    ticket_number,
    total_points,
    pools (id, name, description)
  `)
  .eq('user_id', user.id);

// 2. Buscar palpites com informações do jogo
const { data: predictions } = await supabase
  .from('predictions')
  .select(`
    id,
    home_score,
    away_score,
    points_earned,
    matches (
      id,
      home_team,
      away_team,
      home_score,
      away_score,
      is_finished,
      pool_id
    )
  `)
  .eq('user_id', user.id);
```

**Exibição:**
- Card por bolão
- Resumo: nome, número de palpites, pontos totais
- Botão "Ver Bolão" → navega para `/pools/:id`

#### Aba "Quiz 10"

```typescript
// Buscar participações em quizzes
const { data: quizParticipations } = await supabase
  .from('quiz_participants')
  .select(`
    id,
    ticket_number,
    total_points,
    quizzes (id, name, description)
  `)
  .eq('user_id', user.id);

// Buscar respostas
const { data: answers } = await supabase
  .from('quiz_answers')
  .select(`
    id,
    selected_answer,
    is_correct,
    points_earned,
    quiz_id
  `)
  .eq('user_id', user.id);
```

**Exibição:**
- Card por quiz
- Resumo: nome, respostas corretas/total, pontos
- Botão "Ver Quiz" → navega para `/quiz/:id`

#### Aba "Torcida Mestre"

```typescript
// Buscar participações
const { data: torcidaParticipations } = await supabase
  .from('torcida_mestre_participants')
  .select(`
    id,
    ticket_number,
    status,
    torcida_mestre_pools (id, name, club_name, club_image)
  `)
  .eq('user_id', user.id)
  .eq('status', 'approved');

// Buscar palpites
const { data: torcidaPredictions } = await supabase
  .from('torcida_mestre_predictions')
  .select(`
    id,
    home_score,
    away_score,
    is_winner,
    prize_won,
    torcida_mestre_rounds (
      id,
      round_number,
      opponent_name,
      home_score,
      away_score,
      is_finished,
      pool_id
    )
  `)
  .eq('user_id', user.id);
```

**Exibição:**
- Card por bolão Torcida Mestre
- Resumo: clube, tickets, rodadas participadas, prêmios ganhos
- Botão "Ver Bolão" → navega para `/torcida-mestre/:id`

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/MyPredictions.tsx` | **Criar** - Página principal |
| `src/App.tsx` | **Modificar** - Adicionar import e rota |

---

### Proteção de Rota

A página só é acessível para usuários logados:
- Verificar `user` do contexto de autenticação
- Redirecionar para `/auth` se não autenticado

```typescript
useEffect(() => {
  if (!authLoading && !user) {
    navigate('/auth');
  }
}, [user, authLoading, navigate]);
```

---

### Componentes Reutilizados

| Componente | Uso |
|------------|-----|
| `Layout` | Container padrão com Navbar |
| `Tabs` (shadcn) | Navegação entre produtos |
| `Card` (shadcn) | Cards de resumo por bolão |
| `Badge` (shadcn) | Status e contadores |
| `Button` (shadcn) | Links para bolões |
| `Loader2` (lucide) | Estado de carregamento |

---

### Estados da Página

1. **Carregando**: Skeleton ou spinner
2. **Sem palpites**: Mensagem incentivando participação
3. **Com palpites**: Lista organizada por abas

---

### Resultado Esperado

- Usuário acessa `/my-predictions` sem erro 404
- Visualiza todos seus palpites organizados por produto
- Navega facilmente para cada bolão específico
- Interface consistente com o resto do sistema
