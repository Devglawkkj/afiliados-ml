# Etapas e validação

## Evolução validada: fornecedor e vendedor

Parte 1 integrada pelo PR #5. A parte 2 em `feature/demo-profiles` adiciona
seleção de perfis e navegações próprias, com sessões visuais em memória. A
escolha não autentica usuários. O fornecedor vê a preparação do estoque e o
vendedor reutiliza o catálogo fictício. Cadastro de estoque fica na parte 3,
após validação do PR desta entrega.

O fornecedor cadastra seu estoque no SaaS e executa separação, embalagem,
expedição e logística. O vendedor escolhe os itens, personaliza seu anúncio
para a própria conta Mercado Livre e cuida do chat e do pós-venda. O cadastro
do fornecedor, o rascunho de cada vendedor e o pedido terão identidades próprias.

Entregas em partes, com branch, commits explicativos e PR antes de cada merge:

1. `feature/design-dark-mode`: melhorias de design e temas claro/escuro/sistema.
2. Perfis de demonstração de vendedor e fornecedor, com navegações próprias.
   Seleção de perfil não será apresentada como autenticação real.
3. Cadastro fictício de estoque do fornecedor: produto, fotos, descrição,
   quantidade, preço de fornecimento e prazo de expedição.
4. Catálogo do vendedor: disponíveis, fotos, valores, quantidades e fornecedor.
5. Editor de rascunho do vendedor: título, subtítulo de divulgação, descrição,
   fotos, preço e quantidade; permitir copiar textos e preparar imagens.
6. Pedidos e responsabilidades de envio/pós-venda; definir reserva de estoque,
   repasse e rastreamento antes de operar vendas reais.
7. Integrações reais: autenticação, permissões, persistência compartilhada,
   sincronização de estoque e publicação oficial, em etapas próprias.

O link do anúncio é separado do eventual link de afiliado, informado pelo
vendedor. Cadastro de anúncio não gera automaticamente link de afiliado.
A publicação automática depende da conexão autorizada à conta do vendedor,
dos atributos exigidos e do fluxo oficial vigente. O editor do vendedor não
deve alterar o produto original do fornecedor.

A parte 1 implementa apenas aparência; as demais aguardam validação sequencial.

## Escopo atual acordado

O MVP da API foi integrado no PR #3. A etapa atual, `feature/frontend-catalog`,
adiciona o catálogo visual local conectado a essa API: busca, filtros, cards,
detalhes e histórico de preços. As telas não fazem captação ou publicação.
O front-end será revisado por PR próprio antes de qualquer merge.

O usuário antecipou a API para esboçar o front-end com **produtos fictícios**.
As etapas 1 e 2 já foram integradas (PRs #1 e #2).
A branch `feature/products-api` entrega contrato HTTP versionado, consultas,
dados e imagens locais de demonstração. Não implementa busca de produtos reais,
importação por JSON/link, tela de painel ou publicação. A sequência original
abaixo passa a ser um backlog, não autorização para implementar tudo agora.

Após validar este MVP, o front-end pode usar os endpoints atuais. A captação
real será um serviço separado, populando os mesmos modelos e sem alterar os
DTOs da API. Regras de desconto e publicadores continuam adiados.

## Fluxo obrigatório a partir desta etapa

1. Explicar o objetivo antes de implementar.
2. Criar uma branch `feature/<nome>` a partir da `main` validada.
3. Implementar somente a etapa autorizada, com testes e documentação.
4. Criar commits pequenos em Conventional Commits. No corpo, explicar o que
   mudou, o motivo e a validação executada, sem incluir segredos.
5. Enviar a branch ao GitHub e abrir Pull Request para `main`.
6. Informar o link do PR, escopo, testes e limitações para validação do usuário.
7. Aguardar aprovação explícita antes de fazer merge ou iniciar a próxima etapa.

Nenhum push direto para main. O primeiro commit local antecedeu este fluxo;
não reescrever seu histórico apenas para simular um PR retroativo.

## Preparação do GitHub pelo usuário

Criar um repositório vazio, preferencialmente `afiliados-ml`, sem README,
licença ou gitignore gerados pelo GitHub, e enviar sua URL nesta conversa.
Não enviar tokens. O Git local fica na pasta pai do projeto.

Depois de receber a URL, conectar o remoto e publicar o histórico inicial em
uma branch de importação. Se o remoto estiver realmente vazio, criar uma base
remota com um commit inicial vazio, sem alterações de aplicação, para permitir
um PR contendo todos os arquivos da etapa 1. Preservar o histórico local e
verificar ancestralidade antes de qualquer envio. Não usar force push.
Se já houver histórico remoto, inspecionar e adaptar o plano sem sobrescrevê-lo.

## Sequência proposta

Etapa 1 integrada pelo PR #1. Etapa 2 implementada em `feature/product-models`,
com 24 testes locais passando, aguardando revisão e aprovação no respectivo PR.

| Etapa | Branch | Entrega e critério de aceite |
| --- | --- | --- |
| 1 | `feature/config-database` | Ambiente, configuração e sessões; quatro testes já passaram localmente |
| 2 | `feature/product-models` | Produtos, histórico monetário e ofertas com pending/approved/published/rejected; migrações e testes de persistência |
| 3 | `feature/mercadolivre-client` | Verificar acesso oficial, autenticação e termos; busca, coleta de preços, timeout, retries e tratamento de limites |
| 4 | `feature/discount-detection` | Política de desconto baseada em histórico suficiente, comparando a mesma oferta/variante e moeda; testes contra promoções artificiais |
| 5 | `feature/affiliate-links` | Confirmar mecanismo oficial; na ausência de API pública documentada, receber link gerado pelo usuário na ferramenta oficial |
| 6 | `feature/offer-approval` | Formatação, aprovação por comando local e fila persistida por canal; sem painel web |
| 7 | `feature/telegram-publisher` | Interface publish(offer), registro de adapters e envio Telegram; persistir resultado e evitar reenvios automáticos ambíguos |
| 8 | `feature/scheduled-pipeline` | Jobs finos com APScheduler, regras em serviços; retomada após falhas e revisão ponta a ponta |
| 9 | `feature/instagram-publisher` | Após MVP: imagem gerada, permissões oficiais e publicação; link na bio configurado separadamente |
| 10 | `feature/whatsapp-publisher` | Após Instagram: Cloud API oficial, consentimento, templates e limites aplicáveis |

O estado de cada entrega por canal é separado do estado da oferta: uma falha
no Instagram não pode provocar um novo envio ao Telegram. Novos adapters são
registrados por configuração, sem editar as regras do pipeline.

## Documentação por etapa

Atualizar README, docstrings públicas e `docs/endpoints.md`. Cada endpoint
implementado deve registrar método, URL, autenticação, parâmetros, exemplo
sanitizado de resposta, limites documentados, erros e comportamento de retry.
Não inventar cotas fixas quando dependem da aplicação ou conta.

O painel FastAPI permanece fora do MVP. Nenhuma rota HTTP interna é criada agora.
WhatsApp usará somente a API oficial; bibliotecas não oficiais podem resultar
em bloqueio da conta e não fazem parte do plano.
