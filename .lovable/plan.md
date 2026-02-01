

## Plano: Criar Página de Termos de Uso

### Objetivo

Criar uma página dedicada para os Termos de Uso da Zapions, acessível através do link na aba "Legal" do Footer.

---

### Estrutura da Página

A página seguirá o mesmo padrão visual das outras páginas do projeto, usando o componente `Layout` e estilização consistente.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         [Navbar]                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📜 TERMOS DE USO – ZAPIONS                                        │
│  ────────────────────────────                                       │
│                                                                     │
│  Última atualização: [data]                                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Índice (links de navegação rápida)                            │ │
│  │ • 1. Aceitação dos Termos                                     │ │
│  │ • 2. Objeto da Plataforma                                     │ │
│  │ • 3. Cadastro e Elegibilidade                                 │ │
│  │ • ... (demais seções)                                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  1. Aceitação dos Termos                                           │
│  ─────────────────────────                                          │
│  Ao acessar ou utilizar a plataforma Zapions, o usuário            │
│  declara que leu, compreendeu e concorda integralmente...          │
│                                                                     │
│  2. Objeto da Plataforma                                           │
│  ─────────────────────────                                          │
│  A Zapions é uma plataforma digital destinada à criação...         │
│                                                                     │
│  ... (demais seções)                                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
│                         [Footer]                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Alterações Necessárias

#### 1. Criar Nova Página: `src/pages/TermsOfUse.tsx`

Conteúdo estruturado com:
- Cabeçalho com título e data de atualização
- Card com índice navegável (âncoras para cada seção)
- 13 seções formatadas com tipografia adequada
- Cards de destaque para pontos importantes (como regras exclusivas)

Seções a incluir:
1. Aceitação dos Termos
2. Objeto da Plataforma
3. Cadastro e Elegibilidade
4. Condutas Permitidas e Proibidas
5. Campeonatos, Bolões e Taxas
6. Palpites e Prazos
7. Pontuação e Resultados
8. Quizzes e Natureza Recreativa
9. Premiações (Regra Exclusiva)
10. Responsabilidades
11. Suspensão e Encerramento de Contas
12. Foro
13. Disposições Finais

---

#### 2. Adicionar Rota no App.tsx

```tsx
import TermsOfUse from "./pages/TermsOfUse";

// Na lista de rotas:
<Route path="/termos-de-uso" element={<TermsOfUse />} />
```

---

#### 3. Atualizar Link no Footer

Alterar o link de "Termos de Uso" de `/` para `/termos-de-uso`:

```tsx
<Link to="/termos-de-uso" className="hover:text-foreground transition-colors">
  Termos de Uso
</Link>
```

---

### Design Visual

| Elemento | Estilo |
|----------|--------|
| Título principal | `text-3xl md:text-4xl font-bold` |
| Subtítulos de seção | `text-xl font-semibold` com ícone de âncora |
| Texto | `text-muted-foreground` com boa legibilidade |
| Índice | Card com fundo `bg-muted/30` |
| Destaques | Cards com `border-accent` para regras exclusivas |
| Lista de proibições | Com ícones de alerta ou bullets estilizados |

---

### Estrutura do Componente

```tsx
export default function TermsOfUse() {
  return (
    <Layout>
      <div className="container py-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <ScrollText className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1>Termos de Uso – Zapions</h1>
          <p>Última atualização: Fevereiro de 2026</p>
        </div>

        {/* Índice navegável */}
        <Card className="mb-8 p-6 bg-muted/30">
          <h2>Índice</h2>
          <nav>
            <ul>
              {sections.map((section) => (
                <li>
                  <a href={`#section-${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </Card>

        {/* Seções */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section id={`section-${section.id}`}>
              <h2>{section.number}. {section.title}</h2>
              <div>{section.content}</div>
            </section>
          ))}
        </div>
      </div>
    </Layout>
  );
}
```

---

### Resumo dos Arquivos

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/TermsOfUse.tsx` | Criar | Página completa com os Termos de Uso |
| `src/App.tsx` | Modificar | Adicionar rota `/termos-de-uso` |
| `src/components/layout/Footer.tsx` | Modificar | Atualizar link para `/termos-de-uso` |

---

### Acessibilidade

- Âncoras de navegação para cada seção
- Contraste adequado para leitura
- Estrutura semântica com headings corretos (h1, h2)
- Responsivo para mobile

