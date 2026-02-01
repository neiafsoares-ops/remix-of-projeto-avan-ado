
# Plano: Atualização Visual dos Cards de Bolões e Quizzes com Premiação

## Visão Geral

Atualizar o design visual dos cards de bolões e quizzes que possuem taxa de inscrição e/ou premiação, seguindo o padrão da imagem de referência:
- Quadro com cores mais sofisticadas
- Tipografia diferenciada (branca e em destaque)
- Taxa de inscrição em um sub-quadro mais escuro
- Prêmio estimado em um sub-quadro com tom laranja

---

## Mudanças Propostas

### 1. Criar Novo Componente de Exibição de Preço/Prêmio

Criar um componente reutilizável `PrizeDisplayCard` que será usado em:
- Listagem de bolões (`Pools.tsx`)
- Listagem de quizzes (`Quiz10.tsx`)
- Detalhes do bolão (`PoolDetail.tsx`)
- Detalhes do quiz (`QuizDetail.tsx`)

**Estrutura Visual:**
```text
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐   │
│  │  💰 TAXA DE INSCRIÇÃO               │   │  ← Fundo mais escuro (bg-card/80 ou similar)
│  │                          R$ 50,00   │   │  ← Valor em branco, negrito
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  🏆 PRÊMIO ESTIMADO                 │   │  ← Fundo laranja/âmbar (bg-accent/20)
│  │                         R$ 450,00   │   │  ← Valor grande, amarelo dourado
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 2. Estilos CSS Específicos

Adicionar ao `index.css`:
- Classe `.prize-box-dark` para o sub-quadro da taxa (fundo escuro)
- Classe `.prize-box-highlight` para o sub-quadro do prêmio (borda/fundo laranja)
- Tipografia com font-weight maior e cor branca para valores

### 3. Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/index.css` | Adicionar novas classes de estilo para os sub-quadros |
| `src/components/PrizeDisplayCard.tsx` | **NOVO** - Componente reutilizável |
| `src/pages/Pools.tsx` | Substituir exibição atual por `PrizeDisplayCard` |
| `src/pages/Quiz10.tsx` | Substituir exibição atual por `PrizeDisplayCard` |
| `src/pages/PoolDetail.tsx` | Aplicar novo visual na seção de prêmio |
| `src/pages/QuizDetail.tsx` | Aplicar novo visual na seção de prêmio |

---

## Detalhes Técnicos

### Novo Componente: `PrizeDisplayCard`

```typescript
interface PrizeDisplayCardProps {
  entryFee: number;           // Taxa de inscrição
  estimatedPrize: number;     // Prêmio estimado calculado
  initialPrize?: number;      // Prêmio inicial (opcional)
  accumulatedPrize?: number;  // Prêmio acumulado (para quizzes)
  adminFeePercent?: number;   // Taxa administrativa (para exibir se necessário)
  compact?: boolean;          // Versão compacta para cards de listagem
}
```

### Estilos CSS

```css
/* Sub-quadro escuro para taxa de inscrição */
.prize-box-dark {
  background: hsl(160, 18%, 10%);
  border: 1px solid hsl(160, 15%, 20%);
  border-radius: 12px;
  padding: 12px 16px;
}

/* Sub-quadro com destaque laranja para prêmio */
.prize-box-highlight {
  background: linear-gradient(135deg, hsl(21, 90%, 48%, 0.15) 0%, hsl(48, 96%, 53%, 0.1) 100%);
  border: 2px solid hsl(21, 90%, 48%);
  border-radius: 12px;
  padding: 12px 16px;
}
```

### Formato de Moeda

O valor já está sendo formatado corretamente com `formatBRL()` que retorna no padrão brasileiro:
- `R$ 50,00` (correto, já implementado)

### Hierarquia Visual

1. **Taxa de Inscrição**: Fundo escuro, texto branco, valor em destaque
2. **Prêmio Estimado**: Borda laranja, fundo com gradiente sutil, valor grande em amarelo/dourado

---

## Fluxo de Implementação

1. Adicionar novas classes CSS ao `index.css`
2. Criar componente `PrizeDisplayCard.tsx`
3. Atualizar `Pools.tsx` - substituir div de taxa/prêmio pelo novo componente
4. Atualizar `Quiz10.tsx` - mesma substituição
5. Atualizar `PoolDetail.tsx` - aplicar na seção de informações do bolão
6. Atualizar `QuizDetail.tsx` - aplicar na seção de informações do quiz

---

## Resultado Esperado

- Visual moderno e consistente com a identidade da plataforma
- Destaque claro para valores de entrada e premiação
- Melhor hierarquia visual entre taxa (secundário) e prêmio (principal)
- Componente reutilizável para manter consistência em toda a aplicação
