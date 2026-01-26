

## Plano: Melhorias nas Sugestoes Zapions - Visibilidade para Todos

### Objetivo

Tornar as sugestoes Zapions visiveis para **todos os usuarios** (incluindo membros comuns), mantendo as restricoes de adocao baseadas nos limites de cada tipo de usuario.

---

### Situacao Atual

| Aspecto | Comportamento Atual |
|---------|---------------------|
| **Visibilidade** | Apenas admins, moderadores e mestres veem as sugestoes |
| **Verificacao de limites** | Ja existe no `checkPoolLimits()` - funciona corretamente |
| **Bloqueio de adocao** | Ja implementado com botoes "Torne-se Mestre" e "Limite atingido" |
| **Exibicao no Dashboard** | Condicional `{isPrivilegedUser && <SuggestedPoolsSection />}` |

---

### Solucao Proposta

#### 1. Remover Restricao de Visibilidade no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx`

**Mudanca:** Remover a condicao `isPrivilegedUser` da exibicao do componente

```typescript
// ANTES (linha 154):
{isPrivilegedUser && <SuggestedPoolsSection />}

// DEPOIS:
<SuggestedPoolsSection />
```

#### 2. Melhorar Mensagens Contextuais no SuggestedPoolsSection

**Arquivo:** `src/components/mestre/SuggestedPoolsSection.tsx`

**Mudancas:**

**a) Mensagem diferenciada para Mestres que atingiram limite vs membros comuns:**

Quando o usuario nao pode adotar, exibir mensagem especifica:
- **Membro comum:** "Torne-se Mestre para adotar esta sugestao"
- **Mestre com limite atingido:** "Renove ou faca upgrade do seu plano"

**b) Adicionar banner informativo para membros comuns:**

```typescript
{!isPrivilegedUser && (
  <Alert className="mb-4 border-primary/30 bg-primary/5">
    <Crown className="h-4 w-4 text-primary" />
    <AlertDescription>
      Voce pode adotar sugestoes que respeitem seus limites (ate 8 equipes, 2 grupos e 15 partidas).
      Para sugestoes maiores, torne-se Mestre do Bolao!
    </AlertDescription>
  </Alert>
)}
```

**c) Melhorar logica do botao de adocao:**

```typescript
// Quando nao pode criar e e mestre com limite atingido
{!canCreateNewPool && isMestreBolao ? (
  <>
    <Lock className="h-4 w-4" />
    Renove seu plano
  </>
) : !canCreateNewPool ? (
  <>
    <Crown className="h-4 w-4" />
    Torne-se Mestre
  </>
) : !withinLimits ? (
  <>
    <Crown className="h-4 w-4" />
    Requer plano Mestre
  </>
) : (
  <>
    <Copy className="h-4 w-4" />
    Adotar Sugestao
  </>
)}
```

**d) Adicionar link diferenciado no rodape do card:**

```typescript
{(!canAdopt) && (
  <Button
    variant="link"
    size="sm"
    className="w-full text-xs text-primary"
    onClick={() => navigate('/mestre-do-bolao')}
  >
    <Crown className="h-3 w-3 mr-1" />
    {!canCreateNewPool && isMestreBolao 
      ? 'Renove ou faca upgrade do plano'
      : 'Conheca os planos Mestre do Bolao'}
  </Button>
)}
```

---

### Fluxo de Usuario Apos Implementacao

```text
MEMBRO COMUM abre Dashboard
         |
         v
Ve secao "Sugestoes Zapions" com banner informativo
         |
         +---> Sugestao dentro dos limites (<=15 jogos, <=4 rodadas)
         |            |
         |            v
         |     Botao "Adotar Sugestao" HABILITADO
         |            |
         |            v
         |     Pode criar bolao normalmente
         |
         +---> Sugestao acima dos limites (>15 jogos ou estrutura maior)
                      |
                      v
               Alerta: "Excede seus limites"
                      |
                      v
               Botao "Requer plano Mestre" (desabilitado)
                      |
                      v
               Link: "Conheca os planos Mestre do Bolao"


MESTRE COM LIMITE ATINGIDO abre Dashboard
         |
         v
Ve todas as sugestoes
         |
         v
Alerta: "Limite de boloes atingido"
         |
         v
Botao: "Renove seu plano" (desabilitado)
         |
         v
Link: "Renove ou faca upgrade do plano"
```

---

### Resumo das Alteracoes

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Dashboard.tsx` | Remover condicao `isPrivilegedUser` da exibicao de sugestoes |
| `src/components/mestre/SuggestedPoolsSection.tsx` | Adicionar banner para membros comuns |
| `src/components/mestre/SuggestedPoolsSection.tsx` | Melhorar textos dos botoes para diferenciar cenarios |
| `src/components/mestre/SuggestedPoolsSection.tsx` | Adicionar mensagem especifica para Mestres renovarem plano |

---

### Detalhes Tecnicos

**Logica de decisao do botao:**

| canCreateNewPool | withinLimits | isMestreBolao | Resultado |
|------------------|--------------|---------------|-----------|
| true | true | * | Adotar Sugestao (habilitado) |
| true | false | * | Requer plano Mestre (desabilitado) |
| false | * | true | Renove seu plano (desabilitado) |
| false | * | false | Torne-se Mestre (desabilitado) |

**Limites para membros comuns (ja existentes):**
- `maxTeams: 8`
- `maxGroups: 2`
- `maxMatches: 15`

---

### Beneficios da Implementacao

1. **Marketing:** Membros comuns veem o que esta disponivel, incentivando upgrade
2. **Transparencia:** Usuarios entendem exatamente o que podem ou nao fazer
3. **UX clara:** Mensagens especificas para cada cenario evitam confusao
4. **Conversao:** CTAs direcionados para pagina de planos

