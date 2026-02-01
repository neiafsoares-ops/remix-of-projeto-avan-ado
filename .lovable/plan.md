
## Plano: Adicionar Cards Introdutivos nos Produtos

### Objetivo
Replicar o card de regras/resumo do Quiz 10 para as páginas de **Bolões** e **Torcida Mestre**, cada um com seu conteúdo específico.

---

### Referência: Card existente no Quiz 10 (linhas 228-249)
```tsx
<Card className="mb-8 bg-gradient-to-r from-accent/10 to-primary/5 border-accent/20">
  <CardContent className="py-4">
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-accent" />
        <span><strong>10 perguntas</strong> por rodada</span>
      </div>
      ...
    </div>
  </CardContent>
</Card>
```

---

### 1. Card para Torcida Mestre

**Arquivo:** `src/pages/TorcidaMestre.tsx`

**Posição:** Entre o header (linha 120) e o campo de busca (linha 123)

**Conteúdo sugerido:**

| Ícone | Texto |
|-------|-------|
| Trophy | **Palpite** no jogo do seu time |
| Target | Válido apenas **placar exato** |
| Users | **Tickets ilimitados** por usuário |
| Crown | Sem vencedor? **Prêmio acumula!** |

**Estilo:** Gradiente âmbar (`from-amber-500/10 to-amber-600/5 border-amber-500/20`)

---

### 2. Card para Bolões

**Arquivo:** `src/pages/Pools.tsx`

**Posição:** Entre o header (linha 249) e as tabs/busca (linha 251)

**Conteúdo sugerido:**

| Ícone | Pontos | Descrição |
|-------|--------|-----------|
| Trophy | **5 pontos** | Placar exato |
| Zap | **3 pontos** | Vencedor + diferença de gols |
| Target | **1 ponto** | Apenas vencedor |

**Título:** "Esquema de pontuação inteligente"

**Estilo:** Gradiente primário (`from-primary/10 to-accent/5 border-primary/20`)

---

### Alterações por Arquivo

#### `src/pages/TorcidaMestre.tsx`
- Importar componentes: `Card`, `CardContent` de `@/components/ui/card`
- Importar ícones: `Trophy`, `Target`, `Users` de `lucide-react`
- Adicionar Card entre linhas 120-123

#### `src/pages/Pools.tsx`
- Importar `Card`, `CardContent` de `@/components/ui/card` (já importados)
- Importar ícones: `Target`, `Zap` de `lucide-react` (precisam ser adicionados)
- Adicionar Card entre linhas 249-251

---

### Código do Card - Torcida Mestre

```tsx
{/* Regras do jogo */}
<Card className="mb-8 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/20">
  <CardContent className="py-4">
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <span><strong>Palpite</strong> no jogo do seu time</span>
      </div>
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-amber-500" />
        <span>Válido apenas <strong>placar exato</strong></span>
      </div>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-amber-500" />
        <span><strong>Tickets ilimitados</strong> por usuário</span>
      </div>
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-500" />
        <span>Sem vencedor? <strong>Prêmio acumula!</strong></span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### Código do Card - Bolões

```tsx
{/* Sistema de Pontuação */}
<Card className="mb-8 bg-gradient-to-r from-primary/10 to-accent/5 border-primary/20">
  <CardContent className="py-4">
    <div className="flex flex-wrap items-center gap-6 text-sm">
      <span className="font-medium text-primary">Esquema de pontuação:</span>
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent" />
        <span><strong>5 pontos</strong> placar exato</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-emerald-500" />
        <span><strong>3 pontos</strong> vencedor + diferença de gols</span>
      </div>
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-blue-500" />
        <span><strong>1 ponto</strong> apenas vencedor</span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### Resumo Visual

| Produto | Cor Principal | Itens no Card |
|---------|---------------|---------------|
| Quiz 10 | Accent (laranja) | 4 itens (existente) |
| Torcida Mestre | Amber (dourado) | 4 itens (novo) |
| Bolões | Primary/Accent | 3 itens + título (novo) |
