

## Plano: Melhorar Seletor de Data e Hora para Prazo do Quiz 10

### Objetivo

Aprimorar o formulário de criação de rodada do Quiz 10 para incluir um seletor de data e hora mais visual e intuitivo, seguindo o padrão do bolão.

---

### Situação Atual

O sistema já possui:
- Campo `deadline` na tabela `quiz_rounds` (timestamp with time zone)
- Input `datetime-local` básico no formulário de criação de rodada
- Exibição formatada do prazo para os participantes ("dd/MM/yyyy às HH:mm")

---

### Melhorias Propostas

Substituir o input `datetime-local` por um componente visual com:

1. **Calendário visual** (usando shadcn DatePicker)
2. **Campo de hora** separado para maior clareza
3. **Exibição prévia** da data e hora selecionadas

---

### Alterações no QuizManage.tsx

#### 1. Adicionar Imports

```tsx
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
```

#### 2. Modificar Estados

Substituir:
```tsx
const [newRoundDeadline, setNewRoundDeadline] = useState('');
```

Por:
```tsx
const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(undefined);
const [deadlineTime, setDeadlineTime] = useState('18:00');
```

#### 3. Novo Formulário Visual

**Layout do Dialog de Nova Rodada:**

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          Criar Nova Rodada                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Nome da Rodada                                                         │
│ [Rodada 1_____________________________________]                        │
│                                                                        │
│ ┌────────────────────────────┐  ┌────────────────────┐                │
│ │ 📅 Data do Prazo           │  │ ⏰ Hora            │                │
│ │ [📅 27/01/2026 ▼]          │  │ [18:00]            │                │
│ └────────────────────────────┘  └────────────────────┘                │
│                                                                        │
│ Ao clicar no calendário:                                               │
│ ┌────────────────────────────────────────────────────────────────────┐│
│ │                     Janeiro 2026                                    ││
│ │ Dom  Seg  Ter  Qua  Qui  Sex  Sab                                  ││
│ │                   1    2    3    4                                  ││
│ │  5    6    7    8    9   10   11                                   ││
│ │ 12   13   14   15   16   17   18                                   ││
│ │ 19   20   21   22   23   24   25                                   ││
│ │ 26  [27]  28   29   30   31                                        ││
│ └────────────────────────────────────────────────────────────────────┘│
│                                                                        │
│ 📝 Resumo: Prazo até 27/01/2026 às 18:00                              │
│                                                                        │
│                                        [Cancelar]  [Criar Rodada]     │
└────────────────────────────────────────────────────────────────────────┘
```

#### 4. Código do Componente de Data/Hora

```tsx
<div className="grid grid-cols-2 gap-4">
  {/* Data */}
  <div className="space-y-2">
    <Label>Data do Prazo</Label>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !deadlineDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {deadlineDate ? format(deadlineDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={deadlineDate}
          onSelect={setDeadlineDate}
          disabled={(date) => date < new Date()}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  </div>

  {/* Hora */}
  <div className="space-y-2">
    <Label>Hora do Prazo</Label>
    <Input
      type="time"
      value={deadlineTime}
      onChange={(e) => setDeadlineTime(e.target.value)}
    />
  </div>
</div>

{/* Preview */}
{deadlineDate && (
  <div className="p-3 bg-muted/50 rounded-lg text-sm">
    <Clock className="inline h-4 w-4 mr-2" />
    Prazo: {format(deadlineDate, "dd/MM/yyyy", { locale: ptBR })} às {deadlineTime}
  </div>
)}
```

#### 5. Modificar handleCreateRound

```tsx
const handleCreateRound = async () => {
  if (!newRoundName || !deadlineDate || !deadlineTime) {
    toast({
      title: 'Erro',
      description: 'Preencha todos os campos.',
      variant: 'destructive',
    });
    return;
  }

  try {
    setCreatingRound(true);

    // Combinar data e hora
    const [hours, minutes] = deadlineTime.split(':').map(Number);
    const deadline = new Date(deadlineDate);
    deadline.setHours(hours, minutes, 0, 0);

    const roundNumber = rounds.length + 1;

    const { data, error } = await supabase
      .from('quiz_rounds')
      .insert({
        quiz_id: id,
        round_number: roundNumber,
        name: newRoundName,
        deadline: deadline.toISOString(),
      })
      .select()
      .single();

    // ... resto do código
  }
};
```

#### 6. Resetar estados ao fechar o dialog

```tsx
setNewRoundOpen(false);
setNewRoundName('');
setDeadlineDate(undefined);
setDeadlineTime('18:00');
```

---

### Resumo das Alterações

| Arquivo | Ação |
|---------|------|
| `src/pages/QuizManage.tsx` | Substituir `datetime-local` por DatePicker + input de hora |
| `src/components/ui/calendar.tsx` | Adicionar `pointer-events-auto` (já recomendado no contexto) |

---

### Benefícios

- Interface mais visual e intuitiva
- Calendário facilita a seleção de datas
- Campo de hora separado evita confusão
- Preview do prazo antes de criar a rodada
- Consistência com padrões de UX modernos
- Validação de datas passadas (não permite selecionar datas anteriores a hoje)

