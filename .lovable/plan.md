

## Plano: Adicionar Opção para Ocultar Perguntas no Quiz 10

### Objetivo

Permitir que o administrador marque perguntas específicas como "ocultas" durante a criação. Perguntas ocultas aparecerão com o **texto da pergunta borrado** na visualização prévia (para não-participantes), enquanto as respostas permanecem visíveis.

---

### Situação Atual

- O modo preview (`previewMode=true`) já borra **todas as opções de resposta**
- Não existe campo no banco para controlar quais perguntas devem ser ocultadas
- O administrador não tem controle individual sobre o que mostrar/ocultar

---

### Alterações Necessárias

#### 1. Migração de Banco de Dados

Adicionar coluna `is_hidden` na tabela `quiz_questions`:

```sql
ALTER TABLE quiz_questions 
ADD COLUMN is_hidden BOOLEAN DEFAULT false;
```

---

#### 2. Modificar Formulário de Criação de Pergunta (QuizManage.tsx)

**Adicionar switch para "Ocultar Pergunta":**

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Nova Pergunta                                  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Pergunta                                                               │
│ [Qual time venceu a Copa do Brasil 2025?____________________]          │
│                                                                        │
│ ┌────────────────────────────────┐  ┌────────────────────────────────┐│
│ │ Opção A *                      │  │ Opção B *                      ││
│ │ [Flamengo_________]            │  │ [Palmeiras_________]           ││
│ └────────────────────────────────┘  └────────────────────────────────┘│
│ ...                                                                    │
│                                                                        │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ 🙈 Ocultar Pergunta                                   [○ OFF ]   │  │
│ │    O texto da pergunta ficará borrado para                       │  │
│ │    quem visualizar antes de participar                           │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│                                        [Cancelar]  [Adicionar]        │
└────────────────────────────────────────────────────────────────────────┘
```

**Alterações no estado:**

```tsx
const [newQuestion, setNewQuestion] = useState({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  option_e: '',
  is_hidden: false, // NOVO
});
```

**Componente Switch:**

```tsx
<div className="flex items-center justify-between p-4 border rounded-lg">
  <div className="flex items-center gap-3">
    <EyeOff className="h-5 w-5 text-muted-foreground" />
    <div>
      <p className="font-medium">Ocultar Pergunta</p>
      <p className="text-sm text-muted-foreground">
        O texto da pergunta ficará borrado na visualização prévia
      </p>
    </div>
  </div>
  <Switch
    checked={newQuestion.is_hidden}
    onCheckedChange={(checked) => setNewQuestion({ ...newQuestion, is_hidden: checked })}
  />
</div>
```

---

#### 3. Atualizar Interface QuizQuestion

Adicionar campo `is_hidden` na interface:

```tsx
interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  option_e: string | null;
  correct_answer: string | null;
  is_hidden: boolean; // NOVO
}
```

---

#### 4. Indicador Visual na Lista de Perguntas (QuizManage.tsx)

Mostrar badge quando pergunta está oculta:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Qual time venceu a Copa do Brasil 2025?             [🙈 Oculta] [🗑]│
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │ A) Flamengo │ │ B) Palmeiras│ │ C) Corinthians│ │ D) São Paulo│       │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                                         │
│ Resposta Correta: [Opção B ▼]                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Código:**

```tsx
<div className="flex items-start justify-between">
  <div className="flex items-center gap-2">
    <CardTitle className="text-base">
      {index + 1}. {question.question_text}
    </CardTitle>
    {question.is_hidden && (
      <Badge variant="secondary" className="flex items-center gap-1">
        <EyeOff className="h-3 w-3" />
        Oculta
      </Badge>
    )}
  </div>
  {/* botão delete */}
</div>
```

---

#### 5. Modificar QuizCarouselView.tsx

Adicionar prop `is_hidden` na interface e lógica para borrar apenas perguntas marcadas:

```tsx
interface QuizQuestion {
  // ... campos existentes
  is_hidden?: boolean; // NOVO
}

interface QuizCarouselViewProps {
  // ... props existentes
  previewMode?: boolean;
}
```

**Lógica de blur seletivo:**

```tsx
// No CardHeader - título da pergunta
<CardTitle className={cn(
  "text-base md:text-lg font-medium",
  previewMode && question.is_hidden && "blur-sm select-none"
)}>
  {currentIndex + 1}. {question.question_text}
</CardTitle>

// Mensagem quando pergunta está oculta
{previewMode && question.is_hidden && (
  <p className="text-center text-sm text-muted-foreground mt-2">
    Esta pergunta está oculta. Participe do quiz para visualizá-la!
  </p>
)}
```

**Comportamento no Preview Mode:**

| Configuração | Texto da Pergunta | Opções de Resposta |
|--------------|-------------------|-------------------|
| `is_hidden: false` | Normal | Borradas (comportamento atual) |
| `is_hidden: true` | **Borrado** | Borradas (comportamento atual) |

---

#### 6. Atualizar QuizDetail.tsx

A lógica já utiliza `QuizCarouselView` com `previewMode={true}` para não-participantes. A mudança será aplicada automaticamente após atualizar o componente.

---

### Resumo dos Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Adicionar coluna `is_hidden` em `quiz_questions` |
| `src/pages/QuizManage.tsx` | Modificar | Adicionar Switch no formulário e badge na lista |
| `src/pages/QuizDetail.tsx` | Modificar | Atualizar interface `QuizQuestion` |
| `src/components/quiz/QuizCarouselView.tsx` | Modificar | Implementar blur seletivo por pergunta |

---

### Fluxo do Administrador

```text
1. Admin cria nova pergunta
   ↓
2. Decide se quer ocultar → Ativa switch "Ocultar Pergunta"
   ↓
3. Pergunta salva com is_hidden = true
   ↓
4. Na lista de perguntas, aparece badge "🙈 Oculta"
   ↓
5. Usuário não-participante visualiza preview
   ↓
6. Perguntas com is_hidden=true aparecem borradas
   Perguntas com is_hidden=false aparecem normais
   (Todas as opções de resposta permanecem borradas no preview)
```

---

### Visualização Comparativa

**Pergunta Normal no Preview:**

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Qual time venceu a Copa do Brasil 2025?                         │ ← visível
├─────────────────────────────────────────────────────────────────────┤
│  A) ████████████                                                    │ ← borrado
│  B) ████████████                                                    │ ← borrado
│  C) ████████████                                                    │ ← borrado
│  D) ████████████                                                    │ ← borrado
└─────────────────────────────────────────────────────────────────────┘
```

**Pergunta Oculta no Preview:**

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ██████████████████████████████████████████████?                 │ ← BORRADO
├─────────────────────────────────────────────────────────────────────┤
│  Esta pergunta está oculta. Participe do quiz para visualizá-la!   │
│                                                                     │
│  A) ████████████                                                    │ ← borrado
│  B) ████████████                                                    │ ← borrado
│  C) ████████████                                                    │ ← borrado
│  D) ████████████                                                    │ ← borrado
└─────────────────────────────────────────────────────────────────────┘
```

---

### Benefícios

- Administrador tem controle granular sobre o que mostrar
- Perguntas-chave podem ser ocultadas para gerar curiosidade
- Melhora a experiência de "teaser" antes de participar
- Mantém consistência com o padrão existente de blur

