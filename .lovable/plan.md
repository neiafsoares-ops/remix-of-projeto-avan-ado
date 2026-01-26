

## Plano: Ajustar Alinhamento do Card Explicativo

### Objetivo

Reorganizar o conteúdo do card "O que é Sugestão Zapions?" para que fique alinhado verticalmente com o card da sugestão à esquerda, usando a segunda imagem como referência visual para estilo mais compacto.

---

### Problema Atual

O card explicativo contém muito conteúdo vertical e ultrapassa a altura do card de sugestão ao lado, quebrando o alinhamento visual.

---

### Solução Proposta

Tornar o card explicativo mais compacto utilizando:
1. **Layout em colunas** para "O que você gerencia" e "O que já vem pronto" lado a lado
2. **Redução de espaçamentos** verticais
3. **Texto mais conciso** na introdução
4. **Remoção da seção "Para quem é ideal?"** ou integração como texto simples no final

---

### Alterações no Componente

**Arquivo:** `src/components/mestre/SuggestedPoolsSection.tsx`

#### Estrutura Compacta Proposta

```tsx
<Card className="h-fit bg-gradient-to-br from-accent/10 to-background border-accent/20">
  <CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-base">
      <HelpCircle className="h-5 w-5 text-accent" />
      O que é Sugestão Zapions?
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Introdução compacta */}
    <p className="text-sm text-muted-foreground leading-relaxed">
      Seu bolão <strong>configurado, pronto e atualizado automaticamente!</strong>
    </p>
    
    {/* Grid 2 colunas para as duas seções */}
    <div className="grid grid-cols-2 gap-4">
      {/* O que você gerencia */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <Settings className="h-3.5 w-3.5 text-primary" />
          O que você gerencia:
        </h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary shrink-0" />
            Participantes
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary shrink-0" />
            Gratuito ou pago
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary shrink-0" />
            Aprovações
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary shrink-0" />
            Premiações
          </li>
        </ul>
      </div>
      
      {/* O que já vem pronto */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          O que já vem pronto:
        </h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-500 shrink-0" />
            Jogos e rodadas
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-500 shrink-0" />
            Placares automáticos
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-500 shrink-0" />
            Cálculo de pontos
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-green-500 shrink-0" />
            Ranking em tempo real
          </li>
        </ul>
      </div>
    </div>
    
    {/* Frase final compacta */}
    <p className="text-xs text-center text-primary font-medium pt-2 border-t border-border/50">
      Ideal para quem quer praticidade!
    </p>
  </CardContent>
</Card>
```

---

### Principais Mudanças

| Elemento | Antes | Depois |
|----------|-------|--------|
| Layout das seções | Vertical (empilhado) | Grid 2 colunas lado a lado |
| Tamanho da fonte | `text-sm` / `text-xs` | Uniformizado em `text-xs` |
| Espaçamento | `space-y-5` | `space-y-4` (reduzido) |
| Introdução | 2 linhas explicativas | 1 linha concisa + destaque |
| Seção "Para quem é" | Card destacado com ícone | Linha simples no rodapé |
| Ícones individuais | 4 diferentes por seção | Todos usando `Check` |
| Altura do card | `h-full` | `h-fit` (ajusta ao conteúdo) |

---

### Comparativo Visual

```text
ANTES (muito alto)                    DEPOIS (compacto)
┌────────────────────┐                ┌────────────────────────────┐
│ ❓ O que é...      │                │ ❓ O que é Sugestão Zapions│
│                    │                │                            │
│ É um modelo...     │                │ Seu bolão configurado,     │
│ Todos os jogos...  │                │ pronto e atualizado!       │
│                    │                │                            │
│ ⚙️ O que gerencia: │                │ ⚙️ Gerencia:  ✅ Pronto:   │
│ • Participantes    │                │ ✓ Partic.    ✓ Jogos      │
│ • Gratuito/pago    │                │ ✓ Pago/grátis✓ Placares   │
│ • Aprovações       │                │ ✓ Aprovações ✓ Pontos     │
│ • Premiações       │                │ ✓ Prêmios   ✓ Ranking     │
│                    │                │                            │
│ ✅ O que vem pronto│                │ ─────────────────────────  │
│ • Jogos e rodadas  │                │ Ideal para quem quer       │
│ • Placares auto    │                │ praticidade!               │
│ • Cálculo pontos   │                └────────────────────────────┘
│ • Ranking tempo    │
│                    │
│ ─────────────────  │
│ 🎯 Para quem é?    │
│ Para quem quer     │
│ praticidade...     │
└────────────────────┘
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/mestre/SuggestedPoolsSection.tsx` | Reorganizar layout do card explicativo (linhas 361-443) para usar grid 2 colunas e texto mais compacto |

---

### Ícones Removidos/Simplificados

- `Users`, `Coins`, `UserCheck` → substituídos por `Check` (mais compacto)
- `Target` → removido (seção "Para quem é" simplificada)
- `Separator` → substituído por `border-t` simples

### Benefícios

- ✅ Card explicativo alinha verticalmente com o card de sugestão
- ✅ Layout inspirado na referência (segunda imagem)
- ✅ Informação mantida, mas mais escaneável
- ✅ Melhor experiência em telas menores

