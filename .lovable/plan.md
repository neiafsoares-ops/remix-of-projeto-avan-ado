

## Plano: Adicionar Banner Inline na Página de Bolões

### O que será feito
Adicionar um card/banner clicável na página de Bolões (`src/pages/Pools.tsx`) que aparece no topo da listagem. Esse banner será baseado na imagem enviada (mostrando o "BRASILEIRÃO ZAPIONS") e ao clicar, redireciona o usuário para `https://bolaozapions.lovable.app/pools`.

### Como será implementado

1. **Copiar a imagem** enviada para `src/assets/` para uso como referência visual do banner.

2. **Criar um card inline** na página `src/pages/Pools.tsx`, posicionado entre a barra de busca e a grid de bolões. O card será um link externo (`<a href="https://bolaozapions.lovable.app/pools" target="_blank">`) estilizado como um card destacado, reproduzindo o layout da imagem:
   - Logo/imagem do bolão
   - Nome "BRASILEIRÃO ZAPIONS"
   - Badges "Ativo" e "Público"
   - Info de participantes e data
   - Botão "Ver Detalhes"

3. **Estilo**: Card com borda destacada (gradient ou cor primária) para diferenciá-lo dos bolões normais, com hover effect e transição suave.

### Arquivo alterado
- `src/pages/Pools.tsx` — adicionar o banner inline antes da grid de pools

