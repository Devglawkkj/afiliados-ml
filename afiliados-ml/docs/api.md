# Contrato do MVP para o front-end

## Escopo e organização

API de leitura versionada em `/api/v1`. O adapter FastAPI chama serviços que
consultam o banco; os serviços não importam FastAPI. Os DTOs Pydantic são
explícitos e não expõem automaticamente novas colunas ORM.

O comando `python -m app.seed_demo` adiciona seis produtos inventados, com sete
observações fictícias de preço por produto. As datas de janeiro de 2026 são
fixas e não representam pesquisas reais. Rodar novamente não altera produtos
existentes nem duplica os exemplos. O seed não roda na inicialização do servidor.
Os itens usam `DEMO001` a `DEMO006` e `source=demo`. Não são IDs do Mercado Livre.

Exibir uma indicação de demonstração no front-end e desabilitar a ação de
comprar quando `source=demo`: os links `example.invalid` são intencionalmente
inválidos. As imagens SVG são placeholders locais, sem dependência de imagens
remotas. `image_url` é relativa à **origem da API**, não à origem do front-end.

## Autenticação e CORS

Enviar `Authorization: Bearer <API_TOKEN>` em todas as rotas `/api/v1/*`.
O token fica no `.env` local e não deve aparecer em URLs, Git ou logs.
`python -m app.setup_local` cria o token se ausente. O setup não troca um token
existente. A inicialização falha se o token tiver menos de 32 caracteres ou se
as migrações não tiverem sido aplicadas.

Swagger, OpenAPI e os assets fictícios são públicos para desenvolvimento.
CORS aceita somente as origens configuradas em `CORS_ORIGINS`, com GET e o
cabeçalho Authorization. Essa política de navegador não impede clientes HTTP
de chamar o servidor: a autenticação continua obrigatória.

Este token compartilhado é uma solução local. Não embuti-lo em um build público,
armazená-lo em repositório ou enviar para domínios externos. Um painel hospedado
precisará de autenticação de usuários e HTTPS em uma etapa própria.

## Endpoints implementados

Base local: `http://127.0.0.1:8000`.

| Método e rota | Parâmetros | Resposta de sucesso |
| --- | --- | --- |
| `GET /api/v1/health` | Nenhum | 200, `{"status":"ok"}` após consultar o banco |
| `GET /api/v1/products` | `page` padrão 1, `page_size` padrão 20/máximo 100, `q` opcional 1–120 caracteres, `category_id` opcional 1–64 caracteres | 200, `ProductPage` |
| `GET /api/v1/products/{product_id}` | ID inteiro positivo | 200, `ProductRead` |
| `GET /api/v1/products/{product_id}/prices` | ID positivo, `page` e `page_size` com os mesmos limites | 200, `PricePage` |
| `GET /demo-images/{name}.svg` | Nome de asset existente | 200, `image/svg+xml` |
| `GET /docs` | Nenhum | Swagger UI |
| `GET /openapi.json` | Nenhum | Contrato OpenAPI gerado |

As listas usam `{data, meta}`. `meta` contém `page`, `page_size` e `total`.
Página além do total retorna lista vazia. Produtos são ordenados por ID crescente;
histórico por `observed_at` e ID decrescentes. A busca `q` é local e literal
no título; não busca no Mercado Livre e não implementa remoção de acentos.
Caracteres `%` e `_` não funcionam como wildcards fornecidos pelo cliente.

## Exemplo ilustrativo de listagem

IDs numéricos dependem dos registros já existentes; obtenha o ID da listagem.

```json
{
  "data": [
    {
      "id": 1,
      "item_id": "DEMO001",
      "variation_id": "",
      "title": "Fone sem fio Aurora",
      "permalink": "https://example.invalid/demo/DEMO001",
      "image_url": "/demo-images/audio.svg",
      "category_id": "audio",
      "currency": "BRL",
      "source": "demo",
      "created_at": "2026-11-03T12:00:00Z",
      "latest_price": {
        "id": 7,
        "price_cents": 15990,
        "observed_at": "2026-01-07T12:00:00Z"
      }
    }
  ],
  "meta": {"page": 1, "page_size": 1, "total": 6}
}
```

O detalhe retorna o objeto diretamente. Produto sem observações retorna
`latest_price: null` e histórico vazio. Produto inexistente retorna 404.
Datas incluem fuso UTC; preços são centavos inteiros. Não há percentual de
desconto no contrato: nenhuma detecção de promoção foi implementada.

Exemplo de histórico:

```json
{
  "data": [{"id": 7, "price_cents": 15990, "observed_at": "2026-01-07T12:00:00Z"}],
  "meta": {"page": 1, "page_size": 1, "total": 7}
}
```

## Erros, limites e retries

Envelope comum dos erros da aplicação:

```json
{"error":{"code":"product_not_found","message":"Produto não encontrado."}}
```

| Status | Código | Tratamento no front-end |
| --- | --- | --- |
| 401 | `unauthorized` | Solicitar token válido; não repetir automaticamente |
| 404 | `product_not_found` / `not_found` | Mostrar estado de recurso ausente |
| 405 | `method_not_allowed` | Corrigir método; nenhuma escrita HTTP existe neste MVP |
| 422 | `validation_error` | Corrigir parâmetros conforme OpenAPI |
| 503 | `database_unavailable` | Mostrar falha temporária; permitir tentar novamente |
| 500 | `internal_error` | Mostrar erro genérico e permitir nova tentativa manual |

Não há quota de requisições implementada no MVP local; o limite é de 100 itens
por página. Antes de expor publicamente, definir política de acesso e rate
limiting. Nenhuma chamada externa ou retry externo existe agora. GETs podem
ser repetidos; evitar loops sem limite no front-end. Falhas de CORS e de rede
podem ser apresentadas pelo navegador fora do envelope JSON.

## Consumo no front-end

`apiToken` abaixo deve vir de uma entrada local do usuário, mantida em memória,
e não de uma string embutida no build. Não persistir em localStorage neste exemplo.

```javascript
const apiBase = "http://127.0.0.1:8000";

async function listProducts(apiToken, page = 1) {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  const response = await fetch(`${apiBase}/api/v1/products?${params}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Falha na API");
  return body;
}

// Para imagens retornadas pela API:
// const src = new URL(product.image_url, apiBase).href;
// Para exibir o valor:
// new Intl.NumberFormat("pt-BR", { style: "currency", currency: product.currency })
//   .format(product.latest_price.price_cents / 100);
```

O front-end deve tratar preço/imagem ausentes e estados de carregamento,
lista vazia, erro e dados de demonstração.

## Evolução da captação

O coletor futuro será um serviço separado para normalizar a resposta oficial,
inserir produtos com `source=mercadolivre` e acrescentar observações em centavos.
Os endpoints de leitura continuarão consultando o mesmo banco. A interface
pública não depende do formato da API externa.

Mudanças incompatíveis exigem outra versão de rota; campos novos opcionais
podem ser adicionados em v1. O esquema é gerado automaticamente em
`/openapi.json` e copiado para `docs/openapi.json` neste PR. Regenerar a cópia
quando mudar o contrato. Não construir novos endpoints antes da necessidade
e da validação da etapa correspondente.

## Git deste MVP

Comandos da etapa, executados na raiz do repositório (pasta pai do projeto):

```powershell
git fetch origin
git switch -c feature/products-api origin/main
git add afiliados-ml/.env.example afiliados-ml/app afiliados-ml/migrations afiliados-ml/static afiliados-ml/tests/test_api.py afiliados-ml/requirements.txt afiliados-ml/requirements.lock.txt
git commit -m "feat: expose read-only products API with fictional demo data" -m "Add versioned FastAPI contracts, reusable query services, local demo assets and repeatable seed. Authenticate reads, configure explicit CORS and preserve existing data with a source migration. Validation: 44 tests passed; pip check and alembic check passed."
git add afiliados-ml/README.md afiliados-ml/docs
git commit -m "docs: document demo API and frontend integration contract" -m "Explain fictional data, endpoints, response shapes, errors, authentication and local setup. Export OpenAPI and defer real Mercado Livre capture. Validation: git diff origin/main --check."
git push -u origin feature/products-api
```

Não repetir criação de branch e commits se já foram executados. O merge será
feito pelo PR após aprovação explícita, preservando os commits; nenhum merge
local ou push direto de código para `main` faz parte desta etapa.
