# Endpoints externos

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
