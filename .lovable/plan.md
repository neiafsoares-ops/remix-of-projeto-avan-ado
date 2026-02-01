
# Plano: Implementar Torcida Mestre

## Resumo do Produto

O **Torcida Mestre** e um novo tipo de bolao focado em um unico time (ex: Bolao do Cruzeiro). Diferente do bolao tradicional, nao ha sistema de pontos progressivos - apenas o placar exato conta como vitoria. Se ninguem acertar ou se o time perder, o premio acumula para a proxima rodada.

## Regras de Negocio

- Cada bolao e vinculado a um time especifico (ex: Cruzeiro, Flamengo)
- Participante palpita apenas no jogo em que foi aprovado pelo admin (apos pagamento)
- Vitoria = placar exato E time vencedor (a menos que empates estejam habilitados)
- Se ninguem acertar ou time perder: premio acumula
- Premio dividido igualmente entre vencedores
- Multiplos tickets permitidos por participante
- Apenas administradores podem criar boloes Torcida Mestre

---

## Mudancas Necessarias

### 1. Novas Tabelas no Banco de Dados

```sql
-- Tabela principal dos boloes Torcida Mestre
CREATE TABLE public.torcida_mestre_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  club_id UUID REFERENCES public.clubs(id),
  club_name TEXT NOT NULL,
  club_image TEXT,
  entry_fee NUMERIC DEFAULT 0,
  admin_fee_percent NUMERIC DEFAULT 0,
  allow_draws BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rodadas do Torcida Mestre
CREATE TABLE public.torcida_mestre_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.torcida_mestre_pools(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  name TEXT,
  opponent_name TEXT NOT NULL,
  opponent_club_id UUID REFERENCES public.clubs(id),
  opponent_image TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  prediction_deadline TIMESTAMPTZ NOT NULL,
  is_home BOOLEAN DEFAULT TRUE,
  home_score INTEGER,
  away_score INTEGER,
  is_finished BOOLEAN DEFAULT FALSE,
  accumulated_prize NUMERIC DEFAULT 0,
  previous_accumulated NUMERIC DEFAULT 0,
  entry_fee_override NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Participantes por rodada (diferente do bolao comum)
CREATE TABLE public.torcida_mestre_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.torcida_mestre_pools(id) ON DELETE CASCADE NOT NULL,
  round_id UUID REFERENCES public.torcida_mestre_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  paid_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Palpites do Torcida Mestre
CREATE TABLE public.torcida_mestre_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.torcida_mestre_rounds(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.torcida_mestre_participants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  prize_won NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Politicas RLS

```sql
-- Admins podem gerenciar tudo
-- Usuarios autenticados podem ver pools ativos
-- Participantes aprovados podem fazer palpites
```

### 3. Novas Paginas e Componentes

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/TorcidaMestre.tsx` | Lista de boloes Torcida Mestre |
| `src/pages/TorcidaMestreDetail.tsx` | Detalhes de um bolao especifico |
| `src/pages/TorcidaMestreManage.tsx` | Gerenciamento para admins |
| `src/components/torcida-mestre/TorcidaMestreCard.tsx` | Card de exibicao do bolao |
| `src/components/torcida-mestre/TorcidaMestreRoundCard.tsx` | Card da rodada com palpite |
| `src/components/torcida-mestre/CreateTorcidaMestreDialog.tsx` | Dialog para criar bolao |
| `src/components/torcida-mestre/TorcidaMestreRanking.tsx` | Exibicao dos vencedores |

### 4. Atualizacoes na Pagina Inicial

Adicionar um novo botao/card na Hero Section:

```tsx
<Button variant="outline" size="lg" asChild>
  <Link to="/torcida-mestre">
    <Crown className="h-4 w-4 mr-2" />
    Torcida Mestre
  </Link>
</Button>
```

### 5. Rotas no App.tsx

```tsx
<Route path="/torcida-mestre" element={<TorcidaMestre />} />
<Route path="/torcida-mestre/:id" element={<TorcidaMestreDetail />} />
<Route path="/torcida-mestre/:id/manage" element={<TorcidaMestreManage />} />
```

### 6. Logica de Calculo de Premio

```typescript
// torcida-mestre-utils.ts
export function calculateTorcidaMestreWinners(
  round: TorcidaMestreRound,
  predictions: TorcidaMestrePrediction[],
  allowDraws: boolean
) {
  const clubWon = round.is_home 
    ? round.home_score > round.away_score
    : round.away_score > round.home_score;
  
  const isDraw = round.home_score === round.away_score;
  
  // Se o time perdeu, acumula
  if (!clubWon && !(allowDraws && isDraw)) {
    return { winners: [], shouldAccumulate: true };
  }
  
  // Filtrar quem acertou placar exato
  const winners = predictions.filter(p => 
    p.home_score === round.home_score && 
    p.away_score === round.away_score
  );
  
  // Se ninguem acertou, acumula
  if (winners.length === 0) {
    return { winners: [], shouldAccumulate: true };
  }
  
  return { winners, shouldAccumulate: false };
}

export function dividePrize(
  totalPrize: number,
  winnersCount: number,
  adminFeePercent: number
): number {
  const afterFee = totalPrize * (1 - adminFeePercent / 100);
  return afterFee / winnersCount;
}
```

---

## Fluxo de Usuario

```text
1. Usuario acessa /torcida-mestre
2. Ve lista de boloes por time (Cruzeiro, Flamengo, etc)
3. Clica em um bolao e ve as rodadas disponiveis
4. Solicita participacao em uma rodada (clica "Participar")
5. Status fica "Pendente" ate admin aprovar (apos pagamento)
6. Apos aprovado, pode fazer palpite ate o deadline
7. Apos o jogo:
   - Se time venceu E acertou placar: VENCEDOR
   - Se time perdeu ou nao acertou: Premio acumula
```

---

## Interface Visual

### Card do Torcida Mestre na Pagina Inicial
- Icone: Crown (Coroa)
- Cor destaque: Dourado/Amarelo (#F59E0B)
- Subtitulo: "Boloes por time - Acerte o placar exato!"

### Pagina de Listagem
- Filtro por time/clube
- Cards com escudo do time
- Exibir premio acumulado atual
- Badge "X vencedores na ultima rodada" ou "Premio Acumulado!"

### Detalhes da Rodada
- Escudos dos times (time do bolao vs adversario)
- Campo de palpite (similar ao MatchCard)
- Lista de participantes aprovados
- Se finalizado: Lista de VENCEDORES ou "Sem vencedores - Acumulou!"

---

## Secao Administrativa

Na aba Admin, adicionar sub-aba "Torcida Mestre" com:

1. **Criar Novo Bolao**
   - Selecionar clube (autocomplete)
   - Nome do bolao
   - Toggle "Considerar Empate"

2. **Gerenciar Rodadas**
   - Criar rodada (adversario, data, deadline)
   - Aprovar participantes pendentes
   - Lancar resultado
   - Encerrar rodada (calcular vencedores)
   - Criar proxima rodada (carrega acumulado)

3. **Relatorios**
   - Historico de vencedores
   - Total arrecadado/distribuido

---

## Resumo de Arquivos a Criar/Modificar

| Acao | Arquivo |
|------|---------|
| Criar | `src/pages/TorcidaMestre.tsx` |
| Criar | `src/pages/TorcidaMestreDetail.tsx` |
| Criar | `src/pages/TorcidaMestreManage.tsx` |
| Criar | `src/components/torcida-mestre/TorcidaMestreCard.tsx` |
| Criar | `src/components/torcida-mestre/TorcidaMestreRoundCard.tsx` |
| Criar | `src/components/torcida-mestre/CreateTorcidaMestreDialog.tsx` |
| Criar | `src/components/torcida-mestre/TorcidaMestreRanking.tsx` |
| Criar | `src/lib/torcida-mestre-utils.ts` |
| Criar | `src/types/torcida-mestre.ts` |
| Modificar | `src/pages/Index.tsx` - Adicionar botao |
| Modificar | `src/pages/Admin.tsx` - Adicionar aba |
| Modificar | `src/App.tsx` - Adicionar rotas |
| Migracao | Criar tabelas no banco |
