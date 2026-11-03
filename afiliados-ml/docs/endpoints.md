# Endpoints externos

## Perfis de demonstração — parte 2

Nenhuma rota HTTP foi adicionada ou alterada. Seleção de perfil e URLs com hash
são navegação do front-end, não endpoints ou autenticação. O vendedor reutiliza
health, catálogo e histórico; o fornecedor visualiza páginas locais de preparação.
O Bearer token não ganha permissões por perfil nesta etapa.

## Design e modo escuro — parte 1

Nenhum endpoint foi adicionado ou alterado. A preferência de aparência é local;
catálogo, autenticação por token e histórico usam os contratos já existentes.

## MVP atual — API interna e exemplos fictícios

O front-end em `frontend/` consome os endpoints existentes de health, produtos,
detalhes e histórico, além dos assets locais. Não adiciona ou altera endpoints
do backend. A origem de desenvolvimento é `http://localhost:5173`.

Os endpoints internos agora estão implementados e documentados em
[contrato da API](api.md) e [OpenAPI versionado](openapi.json).
Rotas de leitura: `GET /api/v1/health`, `GET /api/v1/products`,
`GET /api/v1/products/{product_id}` e `GET /api/v1/products/{product_id}/prices`.
Os assets fictícios são servidos em `GET /demo-images/{name}.svg`.
Swagger: `GET /docs`; esquema gerado: `GET /openapi.json`.

Nenhum endpoint externo foi adicionado ou chamado para captar dados.
O seed produz somente produtos inventados, com imagens locais e links
`example.invalid`. As referências futuras abaixo continuam sem implementação.

## Etapa 2

Nenhum endpoint foi adicionado ou chamado. A etapa implementa somente modelos,
persistência e migrações; veja [banco de dados](database.md).

## Etapa 1

Nenhum endpoint externo é utilizado. O comando local executa somente `SELECT 1`.

Antes de implementar cada integração, registrar aqui a documentação oficial
consultada, URL e versão, método, autenticação, parâmetros, resposta de exemplo
sem dados pessoais, limites de uso, erros e política de retries.

Integrações futuras: Mercado Livre, Telegram Bot API, Instagram Graph API e
WhatsApp Cloud API. A disponibilidade de busca de produtos e de geração oficial
de links de afiliado será verificada antes de implementar esses serviços.

Não há API interna nesta etapa.

## Contratos previstos — ainda não implementados

| Serviço | Método e URL | Finalidade / parâmetros previstos |
| --- | --- | --- |
| Mercado Livre | `GET https://api.mercadolibre.com/sites/MLB/search` | Busca; `q`, `category`, `limit`, `offset`; verificar permissões e autenticação antes de implementar |
| Telegram | `POST https://api.telegram.org/bot<TOKEN>/sendPhoto` | Oferta com imagem; `chat_id`, `photo`, `caption`, `parse_mode` |
| Telegram | `POST https://api.telegram.org/bot<TOKEN>/sendMessage` | Oferta em texto; `chat_id`, `text`, `parse_mode` |

Referências oficiais consultadas em 2026-11-03:

- [Busca Mercado Livre](https://developers.mercadolivre.com.br/en_us/items-and-searches):
  o resultado indexado mostra Authorization Bearer. A leitura direta retornou
  403 nesta consulta. Acesso público irrestrito e disponibilidade para esta
  aplicação ainda não foram confirmados.
- [Telegram Bot API](https://core.telegram.org/bots/api): respostas possuem
  `ok` e, no sucesso, `result`; erros possuem descrição e código. Em limitação,
  respeitar `parameters.retry_after` quando fornecido. Nunca registrar a URL
  com o token nos logs. Limites detalhados e exemplos serão adicionados com o adapter.
- [Gerador oficial de afiliados](https://www.mercadolivre.com.br/l/afiliados-gere-seus-links):
  ferramenta para gerar links. Nenhuma API pública oficial de geração de links
  foi confirmada nesta consulta. Não construir URLs de comissão por suposição.

Instagram e WhatsApp: URLs, versão Graph e permissões serão definidas após
selecionar o fluxo oficial de autenticação e verificar a documentação acessível.
A consulta direta ao guia Instagram retornou 429; não fixar uma versão por palpite.

Estes contratos não representam integrações testadas. Exemplos completos,
limites e erros são requisitos de aceite das respectivas etapas.
