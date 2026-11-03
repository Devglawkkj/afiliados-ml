# Garimpo — front-end local

## Perfis de demonstração — parte 2

A primeira tela permite escolher **Entrar como vendedor** ou **Entrar como
fornecedor**, sem email, senha ou criação de conta.

- Vendedor: **Catálogo** e **Meu espaço**. Mantém a conexão manual à API e os
  produtos fictícios existentes.
- Fornecedor: **Visão geral** e **Meu estoque**. O estoque mostra a estrutura
  planejada e informa que o cadastro virá na parte 3; não cria produtos nesta entrega.
- **Trocar perfil** retorna à seleção, desconecta a API, limpa token/filtros,
  cancela consultas e fecha diálogos. A preferência de tema é preservada.
- Recarregar exige nova escolha. Hash na URL não seleciona perfil automaticamente.

Esses acessos organizam o protótipo: não são autenticação, contas isoladas ou
permissões de backend. Os endpoints continuam usando o Bearer token local.
Autenticação real e permissões serão uma etapa própria antes de usuários reais.

Para conferir: entrar como fornecedor e visitar Meu estoque; trocar para
vendedor e conectar a API; conferir os seis produtos; trocar de perfil e voltar
ao vendedor, verificando que exige conexão novamente; recarregar e confirmar
retorno à seleção, preservando o tema.

`src/profiles.js` mantém configuração das navegações, resolução de páginas e
sessão visual em memória. `src/profiles.css` usa os tokens claro/escuro existentes.
`src/main.js` conecta os eventos ao catálogo. Nenhuma chamada externa foi adicionada.

Validação: 12 testes frontend passaram e build gerado; navegador confirmou
fornecedor/estoque, vendedor com seis produtos, desconexão ao trocar, retorno
à seleção após reload e layout móvel sem overflow horizontal nas dimensões verificadas.

Comandos desta parte, na raiz `MLIAGLAU/` (registro; não repetir se já executados):

```powershell
git fetch origin
git switch -c feature/demo-profiles origin/main
git add afiliados-ml/frontend/index.html afiliados-ml/frontend/src/main.js afiliados-ml/frontend/src/profiles.js afiliados-ml/frontend/src/profiles.css afiliados-ml/frontend/tests/profiles.test.js
git commit -m "feat: add seller and supplier demo profile navigation" -m "Introduce explicit demo entry, role-specific pages and in-memory profile sessions. Reset catalog connections on profile changes and preserve appearance preferences. Validation: 12 frontend tests passed, build generated and browser seller/supplier/mobile flows reviewed."
git add afiliados-ml/frontend/README.md afiliados-ml/README.md afiliados-ml/docs
git commit -m "docs: explain demo profiles and staged inventory delivery" -m "Document profile selection, connection reset and limits of simulated access. Update setup, roadmap and endpoint inventory for part 2. Validation: git diff origin/main --check."
git push -u origin feature/demo-profiles
```

Merge somente após validação explícita do PR.

Interface do MVP para visualizar o catálogo da API existente. Usa HTML,
CSS e JavaScript com módulos, e Vite para desenvolvimento/build. Nenhum
framework de UI ou serviço externo é necessário. Não realiza compras,
captação real, aprovação de ofertas ou publicações.

## Aparência — parte 1

O seletor **Aparência**, no topo, oferece Claro, Escuro e Sistema. A opção
Sistema acompanha a configuração do dispositivo, inclusive mudanças enquanto
a página está aberta. A escolha é restaurada antes da primeira pintura para
evitar um clarão claro ao abrir o modo escuro.

Somente a preferência `garimpo.theme` é salva em localStorage. O token da API
continua somente em memória. Se o navegador bloquear o armazenamento, a troca
de tema funciona na aba atual e a próxima abertura usa o tema do sistema.

Os temas abrangem catálogo, formulários, conexão, estados de erro/vazio,
detalhes, tabela e gráfico. O design também melhora tamanhos de texto,
contraste de rótulos e hierarquia dos preços. Cores compartilhadas estão em
`src/theme.css`; comportamento e preferências em `src/theme.js`; inicialização
visual antes da pintura em `public/theme-init.js`.

Validação desta parte: nove testes do frontend passaram, build gerado e revisão
no navegador dos temas claro/escuro, detalhes e restauração após reload. O layout
foi inspecionado em viewport de celular sem overflow horizontal.

Fluxo Git desta parte, na raiz `MLIAGLAU/` (registro dos comandos da entrega):

```powershell
git fetch origin
git switch -c feature/design-dark-mode origin/main
git add afiliados-ml/frontend/index.html afiliados-ml/frontend/public/theme-init.js afiliados-ml/frontend/src/main.js afiliados-ml/frontend/src/theme.css afiliados-ml/frontend/src/theme.js afiliados-ml/frontend/tests/theme.test.js
git commit -m "feat: add dark mode and improve catalog design" -m "Add light, dark and system appearance with resilient preference persistence. Improve typography, contrast and card hierarchy across catalog, dialogs and price history. Validation: nine frontend tests passed, build generated and browser theme/mobile review completed."
git add afiliados-ml/frontend/README.md afiliados-ml/docs
git commit -m "docs: record theme controls and supplier seller delivery stages" -m "Document appearance behavior and the approved supplier-to-seller workflow. Keep profile, inventory, listing editor and logistics work in subsequent reviewable steps. Validation: git diff origin/main --check."
git push -u origin feature/design-dark-mode
```

Não repetir criação de branch/commits já existentes. Fazer merge somente após
validação explícita do PR.

## Execução

Requer Node.js 22.12+ e npm. As dependências exatas estão em `package-lock.json`.

Terminal 1, dentro de `afiliados-ml/`, com o ambiente Python preparado:

```powershell
.\.venv\Scripts\python.exe -m app.setup_local
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed_demo
.\.venv\Scripts\python.exe -m uvicorn app.api.application:create_app --factory --host 127.0.0.1 --port 8000 --reload
```

Terminal 2:

```powershell
cd C:\Users\glauc\OneDrive\Documents\ChatGPT\MLIAGLAU\afiliados-ml\frontend
npm ci
npm run dev
```

Abra **http://localhost:5173**, escolha **Entrar como vendedor**, clique em
**Conectar API** e informe
o endereço `http://127.0.0.1:8000` e o valor de `API_TOKEN` do `.env` do backend,
sem as aspas. O setup local configura essa origem em `CORS_ORIGINS` quando
a variável ainda não existe. Se já houver uma configuração própria, incluir
`http://localhost:5173` na lista JSON e reiniciar a API.

O Vite usa porta estrita: se 5173 estiver ocupada, encerre o processo anterior
ou ajuste porta e CORS juntos. `127.0.0.1:5173` e `localhost:5173` são origens
diferentes. O comando permanece no terminal; Ctrl+C encerra cada servidor.

## Fluxo de uso

- Conectar: valida `/api/v1/health` e carrega os produtos.
- Buscar: enviar o formulário pelo botão ou Enter. A busca é local no título.
- Filtrar: selecionar a categoria atualiza os resultados e volta à primeira página.
- Limpar filtros: restaura a listagem sem alterar os produtos do banco.
- Explorar produto: abre detalhes, gráfico e tabela acessível do histórico.
- Paginar: seis produtos por página; histórico com vinte observações por página.
  Os controles aparecem somente quando há mais de uma página.
- Atualizar: consulta novamente a API sem modificar dados.
- Desconectar: abrir o botão de conexão e selecionar Desconectar.

O catálogo começa vazio até conectar à API; não há outro mock duplicado no
front-end. Produtos e imagens fictícios vêm do seed Python e são identificados
como demonstração. Nenhuma compra ou publicação é oferecida na interface.
As categorias de exemplo são apresentadas inicialmente; códigos adicionais
encontrados nas páginas consultadas são incorporados ao filtro. Um catálogo
real completo poderá ganhar um endpoint próprio de categorias posteriormente.

## Organização

- `src/api.js`: cliente HTTP, origem e URLs de imagens; sem acesso ao DOM.
- `src/format.js`: formatação de moeda/data e escape de texto externo.
- `src/main.js`: estado da interface, eventos e renderização dos componentes.
- `src/style.css`: layout responsivo e estados visuais.
- `tests/api.test.js`: contrato de chamadas, credenciais, erros e renderização segura.

O contrato completo continua em `../docs/api.md` e `../docs/openapi.json`.
O backend não foi alterado nesta etapa. A futura captação oficial alimentará
o mesmo catálogo sem exigir que os componentes conheçam a API Mercado Livre.

## Tratamento de falhas e credenciais

O token fica somente na memória da aba e é enviado no header Authorization.
Não é salvo em localStorage, sessionStorage, URL ou variáveis VITE_*. Ao
recarregar, é necessário conectar novamente. O campo é limpo ao fechar o diálogo.
Redirecionamentos HTTP são recusados. Tokens não são enviados com imagens.

As chamadas têm timeout de 12 segundos. Consultas substituídas e detalhes
fechados são cancelados para evitar resultados antigos na tela. Uma resposta
401 encerra a conexão e solicita novo token. A interface trata falha de rede,
erro da API, ausência de imagem/preço e listas vazias, com nova tentativa manual.
Texto externo é escapado antes de entrar em templates HTML; imagens aceitam
somente HTTP(S). Links de compra não são expostos neste MVP.

Esta é uma interface para desenvolvimento local, sem publicação hospedada.
Acesso pelo celular físico não é configurado: o layout móvel foi verificado
com viewport de celular no navegador. Autenticação de usuários e HTTPS ficam
para uma etapa de hospedagem futura.

## Validação e build

```powershell
npm test
npm run build
```

O build estático vai para `dist/` (ignorado pelo Git). `npm run preview` permite
revisar o build em localhost:5173; não inicia nem substitui o servidor Python.
Os testes do frontend usam o runner nativo do Node, sem chamar o Mercado Livre.

Nesta etapa: seis testes passaram, build gerado, instalação reportou zero
vulnerabilidades e revisão manual de navegador confirmou conexão, categorias,
busca vazia, detalhes e histórico. Layout verificado em desktop e celular,
sem overflow horizontal nos tamanhos inspecionados.

## Git

Comandos da etapa a partir da pasta raiz `MLIAGLAU/`:

```powershell
git fetch origin
git switch -c feature/frontend-catalog origin/main
git add .gitignore afiliados-ml/frontend
git commit -m "feat: build frontend catalog connected to products API" -m "Add responsive demo catalog, search, filters and product price history. Keep API credentials in memory and handle empty, loading and error states. Validation: six frontend tests passed, production build generated and desktop/mobile browser review completed."
git add afiliados-ml/README.md afiliados-ml/docs
git commit -m "docs: explain frontend setup and MVP review workflow" -m "Document two-terminal execution, API connection and scope of the local frontend. Update the roadmap and endpoint inventory without changing backend contracts. Validation: git diff origin/main --check."
git push -u origin feature/frontend-catalog
```

Os comandos registram o fluxo; não repeti-los se branches/commits já existem.
Abrir PR para `main` e aguardar aprovação explícita antes do merge.

Referências: [Vite](https://vite.dev/guide/),
[build](https://vite.dev/guide/build),
[cancelamento de fetch](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort).
