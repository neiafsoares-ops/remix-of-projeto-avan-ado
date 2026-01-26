

## Plano: Aprimoramento do Módulo Quiz 10

### Objetivo

Adicionar funcionalidades adicionais ao módulo Quiz 10 seguindo os padrões já estabelecidos nos bolões:

1. **Criação de Quiz pelo Administrador** com personalização completa
2. **5 opções de resposta** por pergunta (atualmente são 4)
3. **Definição de prazo** para respostas (igual ao bolão)
4. **Gabarito pós-prazo** definido pelo administrador
5. **Ranking com pontuação** acumulada
6. **Prêmio estimado** na capa (sem taxa administrativa)
7. **Valor de entrada** definido na criação do quiz

---

### Alterações Necessárias

#### 1. Migração de Banco de Dados

**Adicionar coluna `option_e` na tabela `quiz_questions`:**

```sql
ALTER TABLE quiz_questions 
ADD COLUMN option_e TEXT;
```

A tabela `quizzes` já possui os campos necessários:
- `entry_fee` (numeric) - valor de entrada
- `admin_fee_percent` (numeric) - taxa administrativa
- `accumulated_prize` (numeric) - prêmio acumulado

---

#### 2. Página de Criação de Quiz (Admin)

**Novo componente:** `src/components/admin/CreateQuizDialog.tsx`

Formulário em dialog seguindo o padrão do `CreatePoolWizard`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Nome | Input | Nome do quiz (obrigatório) |
| Descrição | Textarea | Descrição opcional |
| Valor de entrada | Input numérico | R$ 0,00 por padrão |
| Taxa administrativa | Slider | 0-50% (padrão 0%) |
| Imagem de capa | ImageUpload | Upload opcional |
| Público/Privado | Switch | Público por padrão |

**Cálculo do prêmio estimado:**
```typescript
const estimatedPrize = (entryFee * participantCount) - 
                       (entryFee * participantCount * adminFeePercent / 100);
```

---

#### 3. Modificar QuizManage.tsx

**Adicionar opção E nas perguntas:**

```tsx
// Estado atual
const [newQuestion, setNewQuestion] = useState({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  option_e: '', // NOVO
});
```

**Formulário de pergunta com 5 opções:**

```text
┌────────────────────────────────────────────────────────────────┐
│ Nova Pergunta                                                   │
├────────────────────────────────────────────────────────────────┤
│ Pergunta: [________________________________]                    │
│                                                                 │
│ A) [________________] (obrigatório)                            │
│ B) [________________] (obrigatório)                            │
│ C) [________________] (opcional)                               │
│ D) [________________] (opcional)                               │
│ E) [________________] (opcional) ← NOVO                        │
│                                                                 │
│                              [Cancelar]  [Adicionar Pergunta]  │
└────────────────────────────────────────────────────────────────┘
```

---

#### 4. Atualizar QuizDetail.tsx

**Adicionar prêmio estimado no cabeçalho:**

```tsx
// Calcular prêmio estimado
const estimatedPrize = useMemo(() => {
  if (!quiz || quiz.entry_fee <= 0) return 0;
  const total = quiz.entry_fee * participants.length;
  const adminFee = total * (quiz.admin_fee_percent || 0) / 100;
  return total - adminFee;
}, [quiz, participants]);
```

**UI do prêmio na capa:**

```text
┌──────────────────────────────────────────────────────────────┐
│  💰 Prêmio Estimado                                          │
│     R$ 450,00                                                │
│                                                               │
│  ℹ️ Taxa de entrada: R$ 10,00                                │
│     50 participantes × R$ 10 - 10% taxa admin                │
└──────────────────────────────────────────────────────────────┘
```

**Exibir opção E nas respostas:**

```tsx
{question.option_e && (
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="e" id={`${question.id}-e`} />
    <Label htmlFor={`${question.id}-e`}>E) {question.option_e}</Label>
  </div>
)}
```

---

#### 5. Atualizar Quiz10.tsx (Listagem)

**Exibir prêmio estimado nos cards:**

```tsx
// Calcular prêmio estimado
const estimatedPrize = useMemo(() => {
  if (quiz.entry_fee <= 0) return 0;
  const total = quiz.entry_fee * (quiz.participant_count || 0);
  const fee = total * (quiz.admin_fee_percent || 0) / 100;
  return total - fee;
}, [quiz]);
```

**Seção do card:**

```text
┌──────────────────────────────────────────┐
│ 🎯 Quiz Esportes 2026                    │
│                                          │
│ 👤 @zapions                              │
│ 👥 25 participantes | 📅 Rodada 3        │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ 💰 Prêmio estimado: R$ 225,00        │ │
│ │ 💵 Taxa de entrada: R$ 10,00         │ │
│ └──────────────────────────────────────┘ │
│                                          │
│          [Ver Detalhes →]                │
└──────────────────────────────────────────┘
```

---

#### 6. Adicionar Aba "Quiz 10" no Admin

**Modificar `src/pages/Admin.tsx`:**

Nova aba para gerenciamento de quizzes:

```tsx
<TabsTrigger value="quizzes" className="gap-2">
  <Target className="h-4 w-4" />
  <span className="hidden sm:inline">Quiz 10</span>
</TabsTrigger>

<TabsContent value="quizzes">
  <QuizAdminTab />
</TabsContent>
```

**Novo componente:** `src/components/admin/QuizAdminTab.tsx`

Funcionalidades:
- Botão "Criar Quiz" → abre `CreateQuizDialog`
- Lista todos os quizzes do sistema
- Link para gerenciar cada quiz (`/quiz/{id}/manage`)
- Opções: Editar, Ativar/Desativar, Excluir

---

### Resumo dos Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Adicionar coluna `option_e` em `quiz_questions` |
| `src/components/admin/CreateQuizDialog.tsx` | Criar | Dialog para criação de quiz com todos os campos |
| `src/components/admin/QuizAdminTab.tsx` | Criar | Aba de administração de quizzes |
| `src/pages/Admin.tsx` | Modificar | Adicionar aba "Quiz 10" |
| `src/pages/QuizManage.tsx` | Modificar | Adicionar opção E e melhorar formulário |
| `src/pages/QuizDetail.tsx` | Modificar | Exibir prêmio estimado e opção E |
| `src/pages/Quiz10.tsx` | Modificar | Exibir prêmio estimado e taxa de entrada nos cards |

---

### Interface de Criação de Quiz (Dialog)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Criar Novo Quiz                               │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Nome do Quiz *                                                         │
│ [Quiz Esportes Janeiro 2026_____________________________]              │
│                                                                        │
│ Descrição                                                              │
│ [Responda 10 perguntas e acumule pontos!________________]              │
│ [______________________________________________________]              │
│                                                                        │
│ ┌─────────────────────────────┐  ┌─────────────────────────────┐      │
│ │ 💵 Valor de Entrada         │  │ 📊 Taxa Administrativa      │      │
│ │ R$ [10,00___]               │  │ [────●────] 10%             │      │
│ └─────────────────────────────┘  └─────────────────────────────┘      │
│                                                                        │
│ 📋 Prêmio estimado por participante: R$ 9,00                          │
│    (Valor entrada - taxa admin)                                        │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🖼️ Imagem de Capa (opcional)                                      │  │
│ │ [Clique para fazer upload ou arraste uma imagem]                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🌐 Quiz Público                                      [✓ ON ]     │  │
│ │    Qualquer pessoa pode ver e participar                          │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│                                        [Cancelar]  [🎯 Criar Quiz]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Fluxo de Uso do Administrador

```text
1. Admin acessa painel → Aba "Quiz 10"
   ↓
2. Clica em "Criar Quiz"
   ↓
3. Preenche: nome, descrição, valor entrada, taxa admin
   ↓
4. Quiz criado → Redireciona para /quiz/{id}/manage
   ↓
5. Admin cria rodada (nome + prazo)
   ↓
6. Admin adiciona 10 perguntas (A, B, C, D, E opcionais)
   ↓
7. Participantes respondem até o prazo
   ↓
8. Após prazo, admin define gabarito
   ↓
9. Admin finaliza rodada → Pontos calculados
   ↓
10. Se alguém atingiu 10 pontos → Vencedor!
    Senão → Prêmio acumula para próxima rodada
```

---

### Benefícios

- Interface consistente com o módulo de bolões
- 5 opções de resposta oferece mais flexibilidade
- Prêmio estimado visível incentiva participação
- Taxa administrativa garante sustentabilidade para o criador
- Aba dedicada no Admin centraliza gestão

