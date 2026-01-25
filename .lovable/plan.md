

## Plano: Aplicar Migração do Novo Schema de Bolões Sugeridos

### Problema Identificado

O erro **"Could not find the 'created_by' column of 'suggested_pools' in the schema cache"** ocorre porque:

**Tabela atual no banco:**
| Coluna | Tipo |
|--------|------|
| id | uuid |
| name | text |
| description | text |
| competition_type | text |
| status | text |
| suggested_by | uuid |
| approved_by | uuid |
| created_at | timestamp |

**Tabela esperada pelo código (nova):**
| Coluna | Tipo |
|--------|------|
| id | uuid |
| name | text |
| description | text |
| cover_image | text |
| total_rounds | integer |
| matches_per_round | integer |
| is_active | boolean |
| **created_by** | uuid |
| created_at | timestamp |
| updated_at | timestamp |

A migração definida em `src/sql/suggested_pools_migration.sql` **não foi aplicada** ao banco de dados.

---

### Solução

Aplicar uma migração para:
1. Remover as tabelas antigas (se existirem dados, fazer backup primeiro)
2. Criar as novas tabelas com o schema correto
3. Criar funções de segurança
4. Configurar RLS policies
5. Criar índices de performance

---

### Migração SQL Necessária

A migração precisará:

1. **Remover estruturas antigas** (com segurança):
```sql
DROP TABLE IF EXISTS public.suggested_pool_matches CASCADE;
DROP TABLE IF EXISTS public.suggested_pool_rounds CASCADE;
DROP TABLE IF EXISTS public.suggested_pool_moderators CASCADE;
DROP TABLE IF EXISTS public.mestre_pool_instances CASCADE;
DROP TABLE IF EXISTS public.suggested_pools CASCADE;
```

2. **Criar novas tabelas**:
   - `suggested_pools` - com colunas: id, name, description, cover_image, total_rounds, matches_per_round, is_active, **created_by**, created_at, updated_at
   - `suggested_pool_moderators` - moderadores por sugestão
   - `suggested_pool_rounds` - rodadas do template
   - `suggested_pool_matches` - jogos com round_id, clubs, scores
   - `mestre_pool_instances` - instâncias criadas pelos Mestres

3. **Criar funções de segurança**:
   - `is_suggested_pool_moderator()` - verifica se usuário é moderador
   - `can_edit_suggested_pool_matches()` - verifica permissão de edição

4. **Habilitar RLS e criar policies** para todas as tabelas

5. **Criar triggers** para atualizar `updated_at`

6. **Criar índices** para otimização de queries

---

### Notas Importantes

- A migração removerá dados existentes nas tabelas de sugestões (se houver)
- Todas as tabelas novas terão RLS habilitado
- Apenas admins podem criar/gerenciar bolões sugeridos
- Moderadores podem gerenciar jogos das sugestões que moderam
- Qualquer usuário autenticado pode visualizar sugestões ativas

---

### Impacto

| Item | Status |
|------|--------|
| Dados existentes em suggested_pools | Serão removidos |
| Código do admin (SuggestedPoolsTab) | Funcionará após migração |
| Código do mestre (SuggestedPoolsSection) | Funcionará após migração |
| Outras funcionalidades | Não afetadas |

