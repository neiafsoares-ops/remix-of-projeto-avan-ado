

## Plano: Campo de Pesquisa Inline para Convidar Usuario

### Objetivo

Substituir o botao "Convidar Usuario" (que requer um clique para abrir o modal) por um campo de pesquisa inline que aparece diretamente na interface, eliminando um clique desnecessario.

---

### Situacao Atual

```text
+---------------------------+   +------------------+
| 👤+ Convidar Usuario     |   | 🔗 Copiar Link   |
+---------------------------+   +------------------+
            |
            v (clique abre modal)
     +-----------------------------+
     |       Modal Dialog          |
     |  +------------------------+ |
     |  | 🔍 Buscar usuario...  | |
     |  +------------------------+ |
     |       [Resultado]          |
     +-----------------------------+
```

**Problemas:**
- Requer clique adicional para ver o campo de pesquisa
- Quebra o fluxo de trabalho do administrador

---

### Solucao Proposta

Substituir por um campo de pesquisa inline com Popover para resultados:

```text
+----------------------------------------+   +------------------+
| 🔍 Buscar usuario (ID ou @username)... |   | 🔗 Copiar Link   |
+----------------------------------------+   +------------------+
            |
            v (resultados aparecem em popover)
     +-----------------------------+
     |   Popover com Resultado     |
     |   [Avatar] @usuario #12345  |
     |   [👤+ Enviar Convite]      |
     +-----------------------------+
```

---

### Mudancas Tecnicas

#### 1. Criar Novo Componente: `InviteUserInline.tsx`

Novo componente que combina a funcionalidade do `InviteUserDialog.tsx` em formato inline:

**Estrutura:**
```typescript
interface InviteUserInlineProps {
  poolId: string;
}

export function InviteUserInline({ poolId }: InviteUserInlineProps) {
  // Reutiliza hook existente
  const { searchUser, searchingUser, sendInvitation } = usePoolInvitations(poolId);
  
  // Estados locais
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // Logica de busca igual ao dialog atual
}
```

**UI:**
- Input de pesquisa sempre visivel com icone de lupa
- Popover que abre automaticamente ao encontrar resultado
- Mostra avatar, nome, username e botao de enviar convite
- Fecha automaticamente apos enviar convite com sucesso

---

#### 2. Atualizar `PoolManage.tsx`

**Remover:**
- Estado `inviteDialogOpen`
- Componente `InviteUserDialog`
- Botao que abre o dialog

**Substituir por:**
```tsx
{canManagePool() && (
  <div className="flex items-center gap-2">
    <InviteUserInline poolId={id!} />
    <ShareInviteLink poolId={id!} />
  </div>
)}
```

---

### Fluxo de Interacao

```text
1. Usuario ve campo de pesquisa inline
   +----------------------------------------+
   | 🔍 Buscar usuario (ID ou @username)... |
   +----------------------------------------+

2. Usuario digita e pressiona Enter ou clica na lupa
   +----------------------------------------+
   | joao123                            [🔍]|
   +----------------------------------------+

3. Popover abre com resultado
   +----------------------------------------+
   | joao123                            [🔍]|
   +----------------------------------------+
   | +----------------------------------+ |
   | | [😀] Joao Silva                  | |
   | |      @joao123  #00045            | |
   | | +----------------------------+   | |
   | | | 👤+ Enviar Convite        |   | |
   | | +----------------------------+   | |
   | +----------------------------------+ |

4. Apos enviar, popover fecha e input limpa
   +----------------------------------------+
   | 🔍 Buscar usuario (ID ou @username)... |
   +----------------------------------------+
   ✅ Toast: "Convite enviado!"
```

---

### Estados do Resultado

| Estado | Visual |
|--------|--------|
| Buscando | Spinner no botao de busca |
| Nao encontrado | Popover com icone de alerta |
| Ja participa | Badge "Ja participa" |
| Convite pendente | Badge "Convite pendente" |
| Disponivel | Botao "Enviar Convite" |

---

### Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/pools/InviteUserInline.tsx` | **Criar** - Novo componente inline |
| `src/pages/PoolManage.tsx` | **Modificar** - Substituir dialog por inline |
| `src/components/pools/InviteUserDialog.tsx` | **Manter** - Pode ser util em outros contextos |

---

### Detalhes do Componente InviteUserInline

```typescript
// Imports
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Loader2, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { usePoolInvitations } from '@/hooks/use-pool-invitations';

// Estrutura JSX principal
<div className="relative">
  <div className="flex gap-2">
    <Input
      placeholder="Buscar usuario (ID ou @username)..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      className="w-64"
    />
    <Button onClick={handleSearch} disabled={searchingUser} size="icon">
      {searchingUser ? <Loader2 className="animate-spin" /> : <Search />}
    </Button>
  </div>
  
  <Popover open={popoverOpen && hasSearched} onOpenChange={setPopoverOpen}>
    <PopoverTrigger asChild>
      <span /> {/* Trigger invisivel ancorado no input */}
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80">
      {/* Resultado da busca */}
    </PopoverContent>
  </Popover>
</div>
```

---

### Beneficios

- **1 clique a menos**: Usuario ve campo de pesquisa imediatamente
- **Fluxo mais rapido**: Nao precisa esperar modal abrir/fechar
- **UX moderna**: Padrao comum em aplicacoes modernas
- **Mantém funcionalidade**: Mesmas features do dialog (busca, validacao, envio)

