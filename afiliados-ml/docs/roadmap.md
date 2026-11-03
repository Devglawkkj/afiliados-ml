# Etapas e validação

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
