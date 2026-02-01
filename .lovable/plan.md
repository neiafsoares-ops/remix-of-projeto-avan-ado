
# Plano: Corrigir Campainha de Notificações que Não Abre

## Problema Identificado

O componente `BellButton` no arquivo `NotificationBell.tsx` não está repassando corretamente as props e a referência (`ref`) necessárias para que o `DropdownMenuTrigger` e `SheetTrigger` funcionem com `asChild`.

### Causa Raiz

Quando usamos `asChild` em triggers do Radix UI (DropdownMenuTrigger, SheetTrigger), o componente precisa:
1. Aceitar e repassar uma `ref` via `forwardRef`
2. Repassar todas as props recebidas (especialmente eventos de clique)

O `BellButton` atual:
- Aceita `asChild` mas não faz nada com ela
- Não usa `forwardRef`
- Não repassa as props do trigger para o Button

## Solucao

Refatorar o componente `BellButton` para usar `React.forwardRef` e repassar todas as props necessarias.

## Mudancas Tecnicas

### Arquivo: `src/components/notifications/NotificationBell.tsx`

**Antes:**
```typescript
const BellButton = ({ asChild = false }: { asChild?: boolean }) => {
  const ButtonComponent = asChild ? 'div' : Button;
  
  return (
    <Button variant="ghost" size="icon" className="relative" aria-label="Notificacoes">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge ...>
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};
```

**Depois:**
```typescript
const BellButton = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Button>>(
  (props, ref) => (
    <Button 
      ref={ref}
      variant="ghost" 
      size="icon" 
      className="relative" 
      aria-label="Notificacoes"
      {...props}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge ...>
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
);
BellButton.displayName = 'BellButton';
```

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/notifications/NotificationBell.tsx` | Refatorar `BellButton` para usar `forwardRef` e repassar props |

## Resultado Esperado

- Clicar na campainha no desktop abrira o dropdown com as notificacoes
- Clicar na campainha no mobile abrira o sheet lateral com as notificacoes
- Badge de contagem continuara funcionando normalmente
