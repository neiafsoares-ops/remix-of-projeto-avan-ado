
## Plano: Melhorar Mensagens de Erro no Cadastro

### Problema Atual
Quando o usuário tenta se cadastrar, as mensagens de erro não são claras sobre qual campo está causando o problema:
- Email já cadastrado: mensagem genérica
- Nome de usuário já existe: mensagem pode não aparecer claramente

### Análise Técnica

**Fluxo de cadastro:**
1. `supabase.auth.signUp()` tenta criar usuário em `auth.users`
2. Se email já existe: erro "User already registered"
3. Se criado com sucesso, trigger `handle_new_user` tenta criar perfil
4. Se `public_id` já existe: erro de constraint UNIQUE

**Erros possíveis do Supabase:**

| Cenário | Mensagem do Supabase |
|---------|---------------------|
| Email já existe | `User already registered` |
| Username duplicado | `duplicate key value violates unique constraint "profiles_public_id_key"` |
| Rate limit | `429` ou `rate` |

---

### Solução

#### 1. Verificação Prévia do Username

Antes de tentar o signup, verificar se o `public_id` já existe no banco:

```typescript
// Em auth-context.tsx - função signUp
const signUp = async (email: string, password: string, publicId: string, fullName: string) => {
  // Verificar se o public_id já existe
  const { data: existingUser, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('public_id', publicId)
    .maybeSingle();
  
  if (existingUser) {
    return { error: new Error('USERNAME_ALREADY_EXISTS') };
  }
  
  // Continuar com o signup normal...
  const { error } = await supabase.auth.signUp({...});
  
  return { error: error as Error | null };
};
```

#### 2. Tratamento de Erros no Auth.tsx

Atualizar o `handleSignup` para mostrar mensagens específicas:

```typescript
if (error) {
  if (error.message === 'USERNAME_ALREADY_EXISTS') {
    setError('Este nome de usuário já está em uso. Por favor, escolha outro.');
  } else if (error.message.includes('already registered') || error.message.includes('User already registered')) {
    setError('Este email já está cadastrado. Tente fazer login ou recuperar sua senha.');
  } else if (error.message.includes('duplicate key') && error.message.includes('public_id')) {
    setError('Este nome de usuário já está em uso. Por favor, escolha outro.');
  } else if (error.message.includes('rate') || error.message.includes('429')) {
    setError('Muitas tentativas. Aguarde alguns segundos e tente novamente.');
  } else {
    setError('Erro ao criar conta. Tente novamente.');
  }
}
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/auth-context.tsx` | Adicionar verificação prévia de username antes do signup |
| `src/pages/Auth.tsx` | Atualizar tratamento de erros com mensagens específicas |

---

### Mensagens de Erro Finais

| Erro | Mensagem ao Usuário |
|------|---------------------|
| Email duplicado | "Este email já está cadastrado. Tente fazer login ou recuperar sua senha." |
| Username duplicado | "Este nome de usuário já está em uso. Por favor, escolha outro." |
| Rate limit | "Muitas tentativas. Aguarde alguns segundos e tente novamente." |
| Outro erro | "Erro ao criar conta. Tente novamente." |

---

### Benefícios
- Usuário saberá exatamente qual campo corrigir
- Verificação prévia do username evita criar usuário no auth e falhar no perfil
- Mensagens em português claro e objetivo
