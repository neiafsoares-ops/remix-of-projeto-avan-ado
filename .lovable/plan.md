

## Plano: Melhorias na Experiência de Resposta do Quiz 10

### Objetivo

Implementar três funcionalidades para melhorar a experiência do participante no Quiz 10:

1. **Duas opções de visualização** para responder perguntas (formato atual e formato carrossel)
2. **Confirmação antes do envio** avisando que não será possível editar após submeter
3. **Preview das perguntas** antes de ingressar no quiz (formato carrossel)

---

### 1. Opções de Visualização para Responder

#### Comportamento

- Adicionar toggle para alternar entre dois modos:
  - **Lista**: Formato atual com todas as perguntas visíveis
  - **Carrossel**: Uma pergunta por vez, estilo Facebook

#### Estados Necessários

```tsx
const [viewMode, setViewMode] = useState<'list' | 'carousel'>('list');
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
```

#### Toggle de Visualização

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Modo de Visualização:   [📋 Lista]  [🎠 Carrossel]                  │
└─────────────────────────────────────────────────────────────────────┘
```

Usando ToggleGroup:

```tsx
<ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v)}>
  <ToggleGroupItem value="list">
    <List className="h-4 w-4 mr-1" />
    Lista
  </ToggleGroupItem>
  <ToggleGroupItem value="carousel">
    <LayoutGrid className="h-4 w-4 mr-1" />
    Carrossel
  </ToggleGroupItem>
</ToggleGroup>
```

#### Modo Carrossel

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          Pergunta 3 de 10                           │
│  ●●○○○○○○○○                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Qual time venceu a Copa do Brasil 2025?                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ○  A) Flamengo                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ●  B) Palmeiras                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ○  C) Corinthians                                             │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ○  D) São Paulo                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│        [← Anterior]                        [Próxima →]              │
│                                                                     │
│                    ou                                               │
│                                                                     │
│        [← Anterior]              [✓ Finalizar Respostas]           │
│        (última pergunta)                                            │
└─────────────────────────────────────────────────────────────────────┘
```

#### Lógica do Carrossel

```tsx
// Componente de indicadores de progresso
const ProgressDots = () => (
  <div className="flex gap-1 justify-center">
    {questions.map((_, idx) => (
      <div
        key={idx}
        className={cn(
          "w-2 h-2 rounded-full transition-colors",
          idx === currentQuestionIndex 
            ? "bg-primary" 
            : answers[questions[idx].id] 
              ? "bg-primary/50" 
              : "bg-muted"
        )}
      />
    ))}
  </div>
);

// Navegação
const handleNext = () => {
  if (currentQuestionIndex < questions.length - 1) {
    setCurrentQuestionIndex(prev => prev + 1);
  }
};

const handlePrevious = () => {
  if (currentQuestionIndex > 0) {
    setCurrentQuestionIndex(prev => prev - 1);
  }
};
```

---

### 2. Confirmação Antes do Envio

#### Dialog de Confirmação

```text
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️ Confirmar Envio de Respostas                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Você está prestes a enviar suas respostas para a                   │
│  rodada "Rodada 1".                                                 │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ ⚠️  Após o envio, suas respostas NÃO poderão ser editadas.    │ │
│  │     Certifique-se de que todas as respostas estão corretas.   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Resumo:                                                            │
│  • Perguntas respondidas: 8 de 10                                   │
│  • Perguntas não respondidas: 2                                     │
│                                                                     │
│                           [Revisar]  [Confirmar Envio]              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Estados e Lógica

```tsx
const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

// Contagem de respostas
const answeredCount = Object.keys(answers).length;
const unansweredCount = questions.length - answeredCount;

// Ao clicar em salvar, abre o dialog
const handleSaveClick = () => {
  setConfirmDialogOpen(true);
};

// Após confirmar, salva as respostas
const handleConfirmSubmit = async () => {
  setConfirmDialogOpen(false);
  await handleSaveAnswers();
};
```

#### Componente AlertDialog

```tsx
<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Confirmar Envio de Respostas
      </AlertDialogTitle>
      <AlertDialogDescription asChild>
        <div className="space-y-4">
          <p>
            Você está prestes a enviar suas respostas para a rodada "{currentRound?.name}".
          </p>
          <Alert variant="warning" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Após o envio, suas respostas <strong>NÃO</strong> poderão ser editadas.
              Certifique-se de que todas as respostas estão corretas.
            </AlertDescription>
          </Alert>
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p>• Perguntas respondidas: <strong>{answeredCount} de {questions.length}</strong></p>
            {unansweredCount > 0 && (
              <p className="text-destructive">• Perguntas não respondidas: <strong>{unansweredCount}</strong></p>
            )}
          </div>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Revisar</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmSubmit} className="bg-primary">
        Confirmar Envio
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 3. Preview das Perguntas Antes de Ingressar

#### Comportamento

- Botão "Ver Perguntas" visível para usuários não participantes
- Abre modal com perguntas em formato carrossel (somente leitura)
- Não mostra as opções de resposta (ou mostra desabilitadas)
- Após ver todas, exibe CTA para participar

#### Botão de Preview

```text
┌───────────────────────────────────────────────────────────────────────┐
│  Você precisa participar do quiz para responder às perguntas.        │
│                                                                       │
│  [👁️ Ver Perguntas]    [Participar do Quiz]                          │
└───────────────────────────────────────────────────────────────────────┘
```

#### Modal de Preview (Carrossel)

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👁️ Preview das Perguntas                              [X]          │
├─────────────────────────────────────────────────────────────────────┤
│                          Pergunta 1 de 10                           │
│  ●○○○○○○○○○                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Qual time venceu a Copa do Brasil 2025?                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ A) ████████████████████████                                   │ │ (blur/oculto)
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ B) ████████████████████████                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ C) ████████████████████████                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ D) ████████████████████████                                   │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│        [← Anterior]                        [Próxima →]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Ao chegar na última pergunta:

│        [← Anterior]     [🎯 Participar do Quiz!]                    │
```

#### Estados e Lógica

```tsx
const [previewOpen, setPreviewOpen] = useState(false);
const [previewIndex, setPreviewIndex] = useState(0);

// Preview mostra apenas texto da pergunta
// Opções ficam com blur ou placeholder
```

---

### Novo Componente: QuizCarouselView

Criar componente reutilizável para o modo carrossel:

**Arquivo:** `src/components/quiz/QuizCarouselView.tsx`

```tsx
interface QuizCarouselViewProps {
  questions: QuizQuestion[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  answers?: Record<string, string>;
  onAnswerChange?: (questionId: string, answer: string) => void;
  disabled?: boolean;
  previewMode?: boolean; // true = não mostra opções
  onComplete?: () => void;
  completeCTA?: string;
}
```

---

### Resumo dos Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/quiz/QuizCarouselView.tsx` | Criar | Componente reutilizável para visualização em carrossel |
| `src/pages/QuizDetail.tsx` | Modificar | Adicionar toggle de visualização, carrossel, confirmação e preview |

---

### Fluxo de Usuário

```text
Usuário não participante:
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Acessa quiz → Vê informações e botão "Ver Perguntas"            │
│ 2. Clica "Ver Perguntas" → Abre modal carrossel (preview)          │
│ 3. Navega pelas perguntas → Última pergunta mostra CTA             │
│ 4. Clica "Participar" → Fecha modal e entra no quiz                │
└─────────────────────────────────────────────────────────────────────┘

Usuário participante respondendo:
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Escolhe modo de visualização (Lista ou Carrossel)               │
│ 2. Responde perguntas no modo escolhido                            │
│ 3. Clica "Salvar Respostas" ou "Finalizar" (carrossel)            │
│ 4. Vê confirmação com resumo de respostas                          │
│ 5. Confirma → Respostas salvas (não editáveis mais)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Observações Técnicas

- O componente Carousel do shadcn/ui já está disponível no projeto (embla-carousel)
- O toggle usará ToggleGroup já existente
- A confirmação usará AlertDialog seguindo o padrão do projeto
- O preview não exibirá as opções de resposta para não dar vantagem antes de participar
- Após confirmação do envio, o estado `canAnswer` será atualizado para bloquear edições

