

## Implementação das Partes Faltantes do Sistema de Tickets

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/PoolDetail.tsx` | Integrar TicketSelector, gerenciar ticket ativo, passar participant_id para MatchCard |
| `src/pages/QuizDetail.tsx` | Mesma lógica de tickets do PoolDetail |
| `src/pages/QuizManage.tsx` | Adicionar toggle de múltiplos palpites |
| `src/components/MatchCard.tsx` | Receber e usar participant_id nos palpites |
| `src/components/RankingParticipantDetails.tsx` | Exibir número do ticket quando aplicável |

### Resumo das Mudanças

1. **PoolDetail.tsx**: Buscar tickets do usuário, exibir TicketSelector, criar novos tickets, passar `participantId` para MatchCard

2. **MatchCard.tsx**: Adicionar prop `participantId` e incluir no upsert de predictions

3. **QuizDetail.tsx**: Aplicar mesma lógica de tickets

4. **QuizManage.tsx**: Adicionar switch para `allow_multiple_tickets`

5. **RankingParticipantDetails.tsx**: Adicionar props `ticketNumber` e `allowMultipleTickets`, exibir badge do ticket

### Lógica Principal

```tsx
// PoolDetail - Buscar tickets do usuário
const userTickets = participants.filter(p => p.user_id === user.id);
const [activeTicketId, setActiveTicketId] = useState(userTickets[0]?.id);

// Criar novo ticket
const handleCreateTicket = async () => {
  const nextNumber = Math.max(...userTickets.map(t => t.ticket_number)) + 1;
  await supabase.from('pool_participants').insert({
    pool_id: id,
    user_id: user.id,
    ticket_number: nextNumber,
    status: 'active'
  });
};

// MatchCard - Salvar com participant_id
await supabase.from('predictions').upsert({
  match_id: matchId,
  user_id: user.id,
  participant_id: participantId, // <- novo
  home_score,
  away_score
});
```

