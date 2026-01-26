

## Plano: Adicionar Seção Explicativa "O que é Sugestão Zapions?"

### Objetivo

Adicionar um card informativo no lado direito da seção de Sugestões Zapions que explique claramente o que é o recurso, o que o usuário precisa gerenciar e o que já vem pronto.

---

### Layout Proposto

O grid atual (`md:grid-cols-2`) será ajustado para mostrar:
- **Coluna Esquerda**: Cards das sugestões disponíveis (comportamento atual)
- **Coluna Direita**: Card explicativo fixo com informações sobre o recurso

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ✨ Sugestões Zapions                                                            │
│    Adote uma sugestão pronta com todos os jogos já configurados                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────┐   ┌──────────────────────────────────────┐   │
│  │ 🎯 Sugestão Zapions         │   │ ❓ O que é Sugestão Zapions?         │   │
│  │                              │   │                                      │   │
│  │ 📅 17 rodadas  ⚽ 48 jogos   │   │ É um modelo de bolão já criado e    │   │
│  │                              │   │ totalmente configurado pela          │   │
│  │ ✓ Jogos já configurados      │   │ plataforma.                          │   │
│  │                              │   │                                      │   │
│  │ [Adotar Sugestão]            │   │ ⚙️ O que você gerencia:              │   │
│  │                              │   │ • Participantes                      │   │
│  └──────────────────────────────┘   │ • Gratuito ou pago                   │   │
│                                      │ • Aprovações                         │   │
│                                      │ • Premiações                         │   │
│                                      │                                      │   │
│                                      │ ✅ O que já vem pronto:              │   │
│                                      │ • Jogos e rodadas configurados       │   │
│                                      │ • Atualização automática             │   │
│                                      │ • Cálculo de pontuação               │   │
│                                      │ • Ranking em tempo real              │   │
│                                      │                                      │   │
│                                      │ 🎯 Ideal para quem quer praticidade  │   │
│                                      │ e não quer perder tempo configurando │   │
│                                      └──────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Alterações no Componente

**Arquivo:** `src/components/mestre/SuggestedPoolsSection.tsx`

#### Modificar o Layout do Grid

Trocar de `grid md:grid-cols-2` para um layout que separe as sugestões do card explicativo:

```typescript
<div className="grid lg:grid-cols-3 gap-6">
  {/* Coluna das Sugestões (2/3 do espaço) */}
  <div className="lg:col-span-2 space-y-4">
    <div className="grid md:grid-cols-2 gap-4">
      {suggestedPools.map((pool) => (
        // ... cards de sugestões existentes
      ))}
    </div>
  </div>
  
  {/* Coluna Explicativa (1/3 do espaço) */}
  <div className="lg:col-span-1">
    <Card className="h-full bg-gradient-to-br from-accent/10 to-background border-accent/20">
      {/* Conteúdo explicativo */}
    </Card>
  </div>
</div>
```

---

### Conteúdo do Card Explicativo

```tsx
<Card className="h-full bg-gradient-to-br from-accent/10 to-background border-accent/20 sticky top-4">
  <CardHeader className="pb-4">
    <CardTitle className="flex items-center gap-2 text-lg">
      <HelpCircle className="h-5 w-5 text-accent" />
      O que é Sugestão Zapions?
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-5">
    {/* Introdução */}
    <p className="text-sm text-muted-foreground">
      É um modelo de bolão <strong>já criado e totalmente configurado</strong> pela plataforma.
      Todos os jogos, rodadas, datas e atualizações acontecem automaticamente.
    </p>
    
    {/* O que você gerencia */}
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Settings className="h-4 w-4 text-primary" />
        O que você gerencia:
      </h4>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          Quantidade de participantes
        </li>
        <li className="flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-primary" />
          Gratuito ou pago
        </li>
        <li className="flex items-center gap-2">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
          Aprovação de participantes
        </li>
        <li className="flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-primary" />
          Pagamento das premiações
        </li>
      </ul>
    </div>
    
    {/* O que já vem pronto */}
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        O que já vem pronto:
      </h4>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-green-500" />
          Jogos e rodadas configurados
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-green-500" />
          Atualização automática de placares
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-green-500" />
          Cálculo automático de pontuação
        </li>
        <li className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-green-500" />
          Ranking atualizado em tempo real
        </li>
      </ul>
    </div>
    
    {/* Separador */}
    <Separator />
    
    {/* Para quem é */}
    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-primary" />
        Para quem é ideal?
      </h4>
      <p className="text-xs text-muted-foreground">
        Para quem quer <strong>praticidade</strong>, não quer perder tempo 
        configurando e prefere apenas gerenciar participantes e premiações.
      </p>
    </div>
  </CardContent>
</Card>
```

---

### Novos Ícones a Importar

```typescript
import {
  // ... existentes
  HelpCircle,
  Settings,
  Users,
  Coins,
  UserCheck,
  CheckCircle2,
  Check
} from 'lucide-react';
```

---

### Importar Separator

```typescript
import { Separator } from '@/components/ui/separator';
```

---

### Responsividade

- **Desktop (lg+)**: Grid de 3 colunas - sugestões ocupam 2, explicação ocupa 1
- **Tablet (md)**: Card explicativo aparece acima ou abaixo das sugestões
- **Mobile**: Tudo em coluna única, card explicativo no topo para dar contexto primeiro

```typescript
// Para mobile/tablet, mostrar o card explicativo primeiro
<div className="grid lg:grid-cols-3 gap-6">
  {/* Card explicativo - aparece primeiro em mobile */}
  <div className="lg:col-span-1 lg:order-2">
    <Card className="...">
      {/* conteúdo explicativo */}
    </Card>
  </div>
  
  {/* Sugestões - aparecem depois em mobile */}
  <div className="lg:col-span-2 lg:order-1">
    <div className="grid md:grid-cols-2 gap-4">
      {/* cards das sugestões */}
    </div>
  </div>
</div>
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/mestre/SuggestedPoolsSection.tsx` | Reorganizar layout para grid 3 colunas e adicionar card explicativo |

### Ícones Utilizados

| Ícone | Uso |
|-------|-----|
| `HelpCircle` | Título "O que é Sugestão Zapions?" |
| `Settings` | Seção "O que você gerencia" |
| `Users` | Participantes |
| `Coins` | Gratuito/Pago |
| `UserCheck` | Aprovação de participantes |
| `Trophy` | Premiações |
| `CheckCircle2` | Seção "O que já vem pronto" |
| `Check` | Items da lista do que vem pronto |
| `Target` | Seção "Para quem é ideal" |

### Visual Final Esperado

O card explicativo terá:
- Fundo com gradiente sutil (`from-accent/10`)
- Bordas suaves combinando com a seção
- Texto organizado em seções claras
- Ícones coloridos para facilitar leitura rápida
- Destaque especial na seção "Para quem é ideal" com fundo diferenciado

