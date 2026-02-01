
## Plano: Corrigir Auto-preenchimento do Deadline

### Problema Identificado
O horário de encerramento de palpites está sendo calculado incorretamente. Quando o jogo está marcado para 17:00, o deadline mostra 19:59 em vez de 16:59.

**Causa:** O código usa `toISOString().slice(0, 16)` para formatar a data, mas `toISOString()` converte para UTC (adiciona 3 horas ao horário de Brasília).

**Exemplo do bug:**
- Usuário digita: 17:00 (horário de Brasília)
- Sistema calcula: 17:00 - 1 minuto = 16:59 (correto)
- Sistema formata com `toISOString()`: converte para UTC = 19:59
- Campo mostra: 19:59 (ERRADO - deveria ser 16:59)

---

### Solução

Criar uma função auxiliar que formata a data para o formato `datetime-local` usando o **horário local** (não UTC):

```typescript
function formatToDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
```

---

### Arquivos a Atualizar

| Arquivo | Linha | Problema |
|---------|-------|----------|
| `src/pages/TorcidaMestreManage.tsx` | 461 | `matchTime.toISOString().slice(0, 16)` |
| `src/components/matches/AddGamesScreen.tsx` | 611 | `matchTime.toISOString().slice(0, 16)` |
| `src/components/matches/AddGamesScreen.tsx` | 631 | `matchTime.toISOString().slice(0, 16)` |
| `src/components/matches/AddGamesScreen.tsx` | 955 | `matchTime.toISOString().slice(0, 16)` |

Cada ocorrência será substituída pela nova função que usa horário local.

---

### Validação Adicional

Vou adicionar uma validação para garantir que o deadline nunca seja superior ao horário do jogo:

```typescript
// Validação: deadline não pode ser após o horário do jogo
if (new Date(prediction_deadline) >= new Date(match_date)) {
  toast.error('O prazo para palpites deve ser anterior ao horário do jogo');
  return;
}
```

---

### Resultado Esperado

Quando o administrador configurar:
- Jogo: 01/02/2026 às 17:00
- Deadline automático: 01/02/2026 às **16:59** (1 minuto antes)

O usuário ainda poderá editar manualmente o deadline, mas o sistema garantirá que nunca seja posterior ao horário do jogo.
