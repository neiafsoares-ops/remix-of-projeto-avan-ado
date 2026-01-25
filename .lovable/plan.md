

## Plano: Bolões com Taxa de Inscrição

### Resumo das Funcionalidades

Este plano implementa um sistema completo de gerenciamento de bolões com taxa de inscrição, incluindo:
- **Aprovação obrigatória** para qualquer bolão com taxa > R$ 0
- **Exibição do prêmio estimado** calculado dinamicamente
- **Taxa administrativa configurável** pelo criador

---

### 1. Regras de Participação

**Comportamento:**
- Quando o bolão tem **taxa de inscrição > R$ 0**, toda solicitação de participação entra com status **"Aguardando aprovação"** (pendente)
- Isso vale mesmo para bolões públicos - a taxa torna a aprovação obrigatória
- Bolões **gratuitos** mantêm a regra atual (público = entrada direta, privado = aprovação)

**Quem pode aprovar:**
- ✅ Criador do bolão (Mestre do Bolão)
- ✅ Moderadores da plataforma  
- ✅ Administradores da plataforma

---

### 2. Exibição do Prêmio Estimado

**Onde será exibido:**
- 🏆 Card do bolão na listagem (página Pools)
- 🏆 Página de detalhes do bolão
- 🏆 Capa do bolão

**Informações exibidas:**
- Taxa de inscrição (R$ X,XX)
- Número de participantes ativos (aprovados)
- **Prêmio estimado** (valor dinâmico)

**Fórmula do prêmio:**
```
Prêmio Estimado = (Taxa de Inscrição × Participantes Ativos) - Taxa Administrativa
```

Exemplo: Taxa R$ 50, 10 participantes, 10% taxa administrativa
→ (50 × 10) - 10% = R$ 450,00

---

### 3. Taxa Administrativa

**Configuração:**
- Campo novo: **"Taxa Administrativa (%)"**
- Exclusivo para o **criador do bolão** configurar
- Valor em porcentagem (0% a 50%)
- Valor padrão: **0%**

**Onde aparece:**
- Wizard de criação do bolão
- Aba de configurações do bolão (edição)
- Página do bolão (transparência para participantes)

---

### 4. Mudanças no Banco de Dados

**Tabela `pools` - Novo campo:**
- `admin_fee_percent` (DECIMAL) - Porcentagem da taxa administrativa (0-50)

---

### 5. Mudanças na Interface

**Wizard de Criação (CreatePoolWizard):**
- Adicionar campo "Taxa Administrativa (%)" quando taxa de entrada > 0
- Slider ou input numérico de 0% a 50%
- Preview do prêmio estimado baseado nos valores inseridos

**Página de Bolões (Pools.tsx):**
- Mostrar "Prêmio: R$ X" para bolões com taxa
- Badge indicando que requer aprovação

**Página de Detalhes (PoolDetail.tsx):**
- Card com: Taxa de Inscrição | Participantes | Prêmio Estimado | Taxa Administrativa
- Aviso visual de que a participação requer aprovação

**Fluxo de Entrada:**
- Mensagem clara: "Este bolão possui taxa de inscrição. Sua participação ficará pendente até aprovação."
- Após solicitação: "Aguardando aprovação do administrador"

---

### 6. Lógica de Aprovação

**Ao clicar em "Participar":**
1. Verificar se `entry_fee > 0`
2. Se sim: inserir participante com status `'pending'`
3. Exibir mensagem de aguardando aprovação
4. Notificar o criador/moderadores (opcional - futura melhoria)

**Gestão de Participantes (PoolManage):**
- Lista de participantes pendentes em destaque
- Botões de Aprovar/Rejeitar
- Contador de pendências visível

