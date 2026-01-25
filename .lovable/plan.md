

## Plano: Habilitar Formato "Somente Mata-Mata" para Sugestoes Zapions

### Objetivo

Adicionar a terceira opcao de formato **"Somente Mata-Mata"** no wizard de criacao de sugestoes de boloes (funcao de administrador), similar ao que ja existe no `CreatePoolWizard`.

---

### Situacao Atual

O componente `SuggestedPoolsTab.tsx` atualmente oferece apenas **2 formatos**:

| Formato | Descricao |
|---------|-----------|
| `standard` | Rodadas tradicionais (Brasileirao, Premier League) |
| `cup` | Grupos + Mata-Mata (Copa do Mundo, Champions) |

O formato **"Somente Mata-Mata"** (`knockout`) ja existe no `CreatePoolWizard.tsx` e no componente `KnockoutOnlyStep.tsx`, mas nao foi implementado para as sugestoes Zapions.

---

### Mudancas Necessarias

#### 1. Atualizar o Tipo de Formato

**Arquivo:** `src/components/admin/SuggestedPoolsTab.tsx`

Alterar a definicao do tipo `PoolFormat`:

```text
De: type PoolFormat = 'standard' | 'cup';
Para: type PoolFormat = 'standard' | 'cup' | 'knockout';
```

---

#### 2. Adicionar Estado para Configuracao do Knockout

Adicionar novo estado para armazenar a configuracao do knockout:

```typescript
const [knockoutConfig, setKnockoutConfig] = useState<KnockoutOnlyConfig>({
  totalTeams: 16,
  knockoutFormat: 'single',
  finalFormat: 'single',
  hasThirdPlace: false,
  awayGoalsRule: false,
});
```

---

#### 3. Adicionar Opcao no RadioGroup (Passo 2)

Adicionar terceira opcao na selecao de formato:

| Icone | Titulo | Descricao | Exemplos |
|-------|--------|-----------|----------|
| Swords (vermelho) | Somente Mata-Mata | Eliminatorias diretas sem fase de grupos | Copa do Brasil, FA Cup |

---

#### 4. Renderizar KnockoutOnlyStep no Passo 3

Quando `format === 'knockout'`, renderizar o componente `KnockoutOnlyStep` com a configuracao apropriada.

---

#### 5. Gerar Rodadas de Knockout na Criacao

Criar funcao `generateSuggestedKnockoutRounds()` que gera as rodadas baseadas na configuracao:

**Logica:**
- Para cada fase (32 avos, 16 avos, Oitavas, Quartas, Semi, Final)
- Se formato Ida/Volta: criar 2 rodadas por fase
- Se jogo unico: criar 1 rodada por fase
- Adicionar Disputa de 3o Lugar se habilitado

**Exemplo com 16 times, jogo unico:**
- Oitavas de Final
- Quartas de Final
- Semifinal
- (Opcional) Disputa 3o Lugar
- Final

---

#### 6. Atualizar Validacao do Wizard

Atualizar `canProceedStep2` e `canProceedStep3`:

```typescript
const canProceedStep2 = format === 'standard' || format === 'cup' || format === 'knockout';

const canProceedStep3 = 
  format === 'standard' 
    ? (formData.total_rounds >= 1 && formData.matches_per_round >= 1)
    : format === 'cup'
      ? (cupConfig.totalTeams >= 4 && cupConfig.totalGroups >= 1)
      : (knockoutConfig.totalTeams >= 4); // knockout
```

---

#### 7. Atualizar handleCreate

Adicionar logica para criar bolao no formato knockout:

```typescript
if (format === 'knockout') {
  // Calcular total de rodadas baseado na configuracao
  // Gerar rodadas de knockout
  // Inserir no banco
}
```

---

#### 8. Atualizar Reset do Formulario

Resetar tambem `knockoutConfig` no `resetForm()`.

---

### Resumo Visual do Wizard Atualizado

**Passo 2 - Selecao de Formato (com 3 opcoes):**

```text
+-------------------+  +-------------------+  +-------------------+
|      Layers       |  |      Award        |  |      Swords       |
|                   |  |                   |  |                   |
| Formato Padrao    |  | Formato Copa      |  | Somente Mata-Mata |
| Rodadas           |  | Grupos + Knockout |  | Eliminatorias     |
| tradicionais      |  | com final         |  | diretas           |
|                   |  |                   |  |                   |
| Brasileirao,      |  | Copa do Mundo,    |  | Copa do Brasil,   |
| Premier League    |  | Champions         |  | FA Cup            |
+-------------------+  +-------------------+  +-------------------+
```

---

### Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/components/admin/SuggestedPoolsTab.tsx` | Adicionar formato knockout, importar KnockoutOnlyStep, gerar rodadas de knockout |

---

### Detalhes Tecnicos

**Import adicional:**
```typescript
import { KnockoutOnlyStep, KnockoutOnlyConfig } from '@/components/pools/KnockoutOnlyStep';
import { Swords } from 'lucide-react';
```

**Nova funcao para gerar rodadas:**
```typescript
const generateSuggestedKnockoutRounds = (poolId: string) => {
  const rounds = [];
  let roundNumber = 1;
  const multiplier = knockoutConfig.knockoutFormat === 'home_away' ? 2 : 1;
  
  if (knockoutConfig.totalTeams >= 64) { /* 32 avos */ }
  if (knockoutConfig.totalTeams >= 32) { /* 16 avos */ }
  if (knockoutConfig.totalTeams >= 16) { /* Oitavas */ }
  if (knockoutConfig.totalTeams >= 8)  { /* Quartas */ }
  if (knockoutConfig.totalTeams >= 4)  { /* Semi */ }
  if (knockoutConfig.hasThirdPlace)    { /* 3o Lugar */ }
  /* Final - com formato proprio */
  
  return rounds;
};
```

