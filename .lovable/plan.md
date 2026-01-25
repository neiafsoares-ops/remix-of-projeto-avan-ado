

## Plano: Qualificar zapions como Administrador

### Informações do Usuário
| Campo | Valor |
|-------|-------|
| **ID** | `1d342da7-01fa-40be-a7a4-34f4be5f737b` |
| **Username** | zapions |
| **Nome** | Lucas Mendes de Paula |
| **Email** | lucasmdp93@gmail.com |
| **Roles Atuais** | Nenhuma |

---

### Ação Necessária

Inserir um registro na tabela `user_roles` para conceder o papel de **administrador** ao usuário.

---

### Detalhes Tecnicos

**Tabela:** `user_roles`

**Comando SQL a ser executado:**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('1d342da7-01fa-40be-a7a4-34f4be5f737b', 'admin');
```

---

### Permissoes Concedidas

Como administrador, o usuario tera acesso a:

- Gerenciar todos os boloes da plataforma
- Aprovar/rejeitar sugestoes de boloes
- Gerenciar clubes no sistema
- Visualizar logs de auditoria
- Atribuir/remover papeis de outros usuarios
- Gerenciar planos Mestre do Bolao

---

### Validacao

Apos a execucao, o sistema reconhecera o usuario como admin atraves da funcao `has_role()` que ja esta implementada no banco de dados.

