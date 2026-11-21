# Estoque fictício do fornecedor — parte 3

## Uso

Com o frontend em execução, abrir http://localhost:5173, escolher **Fornecedor**
e acessar **Meu estoque**. Não é necessário iniciar ou conectar a API Python
para experimentar esta área.

**Cadastrar produto** abre o formulário. **Adicionar exemplos** insere dois
produtos inventados; repetir essa ação não sobrescreve cadastros com os mesmos
códigos. O preço é de fornecimento, não preço final ou lucro do vendedor.

| Campo | Regra do protótipo |
| --- | --- |
| Título | 3 a 120 caracteres |
| Código/SKU | 2 a 40 letras/números/hífens/sublinhados; normalizado em maiúsculas e único |
| Categoria | Obrigatória, até 64 caracteres; sugestões locais |
| Descrição | 10 a 3.000 caracteres |
| Preço | Positivo, até 9.999.999,99; usar `129,90` sem separador de milhar |
| Quantidade | Inteiro de 0 a 999.999 |
| Prazo para envio | Inteiro de 0 a 30 dias úteis para despachar; não prazo de entrega |
| Disponibilidade | Ativo ou pausado; ativo com quantidade zero aparece como sem estoque |
| Fotos | Opcionais no protótipo; até três JPG/PNG/WebP de até 5 MB cada |

A primeira foto é a capa. Cada arquivo é decodificado e convertido localmente
para uma imagem de até 1.000 pixels no lado maior, com limite de aproximadamente
360 mil caracteres em data URL por foto. SVGs ou URLs externas fornecidos pelo
usuário não são aceitos. O SVG fixo usado pelos exemplos é um asset do projeto.
Fotos não são enviadas ao servidor. É possível remover fotos antes de salvar.

Editar preserva o ID e incrementa a revisão. Fechar, cancelar ou sair da área
descarta alterações ainda não salvas; fotos em processamento não aparecem em
outro formulário. Não há exclusão de produtos nesta parte: usar Pausado para
indicar indisponibilidade sem perder o cadastro.

A lista oferece busca local por título/código, filtros de disponível/sem
estoque/pausado e indicadores de produtos, unidades totais e itens disponíveis.
Somente itens ativos com quantidade positiva contam como disponíveis.

## Persistência e limites

Os exemplos ficam em **localStorage**, na chave `garimpo.demo-inventory.v1`,
em um documento com versão de formato 1. São restaurados ao recarregar e
permanecem ao trocar perfil; a sessão de perfil e o token continuam em memória.
Um navegador/origem tem um único estoque fictício compartilhado, sem isolamento
de contas. Outro navegador, origem ou dispositivo não recebe esses cadastros.
Limpar dados do navegador apaga o protótipo local.

O adapter aceita até 30 produtos. A quota real do navegador pode ser atingida
antes disso, especialmente com fotos. Se uma gravação falhar, a versão anterior
é preservada e o formulário permanece aberto com erro. Se os dados armazenados
estiverem inválidos, não são sobrescritos automaticamente.

A revisão detecta uma edição feita com versão desatualizada. Isso não oferece
transações entre abas nem sincronização de estoque: essa consistência deverá
ser implementada no backend ao substituir o adapter local.

## Organização e próxima integração

- `src/inventory-store.js`: contrato local, validação, dinheiro em centavos,
  leitura/gravação, SKU único e revisão de edição.
- `src/inventory-photos.js`: preparação de arquivos locais.
- `src/inventory-ui.js`: formulário, cards, estados, busca e filtros.
- `src/inventory.css`: componentes responsivos usando os tokens de tema.
- `public/inventory-demo.svg`: placeholder próprio de produto fictício.

Nenhuma dependência, modelo Python, migração ou endpoint HTTP foi adicionado.
O catálogo do vendedor continua usando a API anterior: os itens deste estoque
ainda não aparecem nele. A parte 4 conectará o catálogo de demonstração a esses
cadastros, após revisão desta parte. Publicação, pedidos, reserva de quantidade,
frete, pagamentos e usuários reais permanecem fora desta entrega.

## Verificação

Em `afiliados-ml/frontend/`:

```powershell
npm test
npm run build
```

19 testes passaram: validação monetária, persistência, edição, código duplicado,
revisão obsoleta, valores inválidos, fotos executáveis, limite local, quota e
dados corrompidos, além dos testes anteriores. Build de produção gerado.

No navegador foram conferidos exemplos, cadastro com foto raster local, erro
de SKU duplicado, edição, remoção de foto, filtro de pausados, restauração após
reload e layout móvel do formulário. Foram usados apenas exemplos fictícios.

## Git

Registro dos comandos a partir de `MLIAGLAU/`; não repetir se já executados:

```powershell
git fetch origin
git switch -c feature/supplier-inventory origin/main
git add afiliados-ml/frontend/src afiliados-ml/frontend/public/inventory-demo.svg afiliados-ml/frontend/tests/inventory.test.js
git commit -m "feat: add local supplier demo inventory editor" -m "Add validated product, price, quantity, dispatch and photo editing with a local inventory adapter. Preserve prior data on storage failures and reject duplicate SKUs and stale edits. Validation: 19 frontend tests passed, build generated and browser create/edit/photo/reload flows reviewed."
git add afiliados-ml/README.md afiliados-ml/frontend/README.md afiliados-ml/docs
git commit -m "docs: explain supplier demo inventory and local persistence" -m "Document stock fields, photo limits, local storage behavior and validation. Keep seller integration and real backend persistence in later stages. Validation: git diff origin/main --check."
git push -u origin feature/supplier-inventory
```

Abrir PR para main e aguardar validação explícita antes do merge.
