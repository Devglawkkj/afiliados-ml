# Afiliados Mercado Livre

## Front-end do MVP

O catálogo visual está em `frontend/`, conectado à API e aos produtos fictícios.
Veja [instruções completas do front-end](frontend/README.md).

Com a API em execução na porta 8000, abra outro terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Acesse **http://localhost:5173**, escolha **Entrar como vendedor**, clique em
**Conectar API** e informe o
endereço da API e o `API_TOKEN` do `.env` do backend. O token fica em memória
e não deve ser incluído no código do front-end. Node.js 22.12+ é necessário.

A entrada também oferece **Fornecedor**, com visão geral e estrutura da futura
área de estoque. Os acessos são demonstrações, sem autenticação real. Use
**Trocar perfil** para retornar à seleção; a conexão da API será encerrada.

Ferramenta em construção, por etapas. As etapas 1 e 2 incluem ambiente,
configuração, modelos de produtos, histórico de preços e ofertas, com migrações.
Ainda não busca produtos, gera links ou publica mensagens.

O MVP atual oferece uma API somente de leitura para desenvolver o front-end
com **seis produtos fictícios**, imagens locais e histórico inventado de preços.
Nenhuma consulta ao Mercado Livre é realizada. O campo `source` diferencia
dados `demo`, `manual` e os futuros dados `mercadolivre`.

## Preparação (PowerShell)

Python 3.11 ou superior; validado localmente com Python 3.13.3.
Execute a partir de `afiliados-ml/`:

```powershell
python -m venv .venv
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

`requirements.txt` declara as dependências diretas e suas faixas compatíveis.
Para reproduzir as versões exatas verificadas nesta etapa, instalar com
`-r requirements.lock.txt` em vez de `-r requirements.txt`.

O ambiente virtual já foi criado no desenvolvimento inicial. Não sobrescreva
um `.env` já configurado. O uso do executável completo dispensa ativação e
alterações na política de execução do PowerShell.

## Variáveis de ambiente

- `DATABASE_URL`
- `LOG_LEVEL`
- `API_TOKEN`
- `CORS_ORIGINS`

O arquivo `.env.example` contém apenas configurações locais não secretas.
Variáveis do processo têm prioridade sobre `.env`. O arquivo é carregado a
partir da raiz do projeto. Nunca versionar `.env` ou credenciais; nenhuma
credencial de canal é necessária nesta etapa.

## Execução e testes

Na primeira execução, `setup_local` gera um token aleatório no `.env` sem
imprimi-lo. Configurações e tokens existentes são preservados. Depois, aplicar
as migrações e cadastrar os exemplos fictícios; repetir o seed não duplica dados.

```powershell
.\.venv\Scripts\python.exe -m app.setup_local
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed_demo
.\.venv\Scripts\python.exe -m uvicorn app.api.application:create_app --factory --host 127.0.0.1 --port 8000 --reload
```

Abra [Swagger](http://127.0.0.1:8000/docs), clique em **Authorize** e informe
o valor de `API_TOKEN` do seu `.env`. A API exige token com ao menos 32 caracteres.
O contrato também está em `/openapi.json` e na cópia versionada `docs/openapi.json`.

Em outro terminal, ainda dentro de `afiliados-ml/`:

```powershell
.\.venv\Scripts\python.exe -m app.main
.\.venv\Scripts\python.exe -m pytest -q
```

As origens do front-end são uma lista JSON em `CORS_ORIGINS`; o setup local
inclui `http://localhost:5173`. `http://127.0.0.1:5173` é outra origem e precisa
ser incluída explicitamente se usada. CORS não substitui autenticação.
O token compartilhado serve a este desenvolvimento local: não incluí-lo no
código ou build público do front-end. Para hospedagem, planejar autenticação
de usuários e HTTPS antes de disponibilizar o painel.

Veja [contrato do front-end e exemplos de consumo](docs/api.md).

O Alembic cria ou atualiza as tabelas; `app.main` apenas valida a conexão.
Caminhos SQLite relativos são resolvidos a partir da raiz do projeto,
independentemente do diretório de trabalho.

## Organização e decisões

- `app/config.py`: configuração tipada e validada com pydantic-settings.
- `app/database.py`: base ORM, engine, fábrica de sessões e transações.
- `app/main.py`: composição e diagnóstico local, sem regras de negócio.
- `app/models.py`: produtos, observações em centavos, ofertas e status.
- `app/schemas.py`: respostas públicas e erros da API.
- `app/api/application.py`: composição FastAPI, autenticação, CORS e rotas finas.
- `app/services/products.py`: consultas reutilizáveis por API e futuros jobs.
- `app/services/demo.py`: exemplos fictícios, sem acesso externo.
- `app/setup_local.py` e `app/seed_demo.py`: configuração e seed explícitos.
- `migrations/`: revisões Alembic versionadas.
- `tests/`: configuração, transações, integridade, migrações e contrato HTTP.
- `docs/endpoints.md`: inventário de integrações, ainda sem chamadas externas.
- `docs/database.md`: relações, dinheiro, datas UTC, status e migrações.

Serviços de coleta real, jobs e publishers serão adicionados nas próximas etapas.
As regras de negócio ficarão em `app/services/`, reutilizáveis pelo futuro painel.
Cada tarefa ou requisição deve abrir sua própria sessão com `session_scope`.
O chamador controla o ciclo de vida da engine; importar os módulos não conecta
ao banco. A configuração de logging pertence ao ponto de entrada.

Para PostgreSQL, a camada usa as mesmas APIs do SQLAlchemy; será necessário
instalar um driver, configurar a conexão e validar com testes de integração.
Isso ainda não foi testado. As migrações atuais foram verificadas em SQLite.

## Git

O fluxo atual exige Pull Request e aprovação do usuário antes de todo merge.
Veja [etapas e fluxo de revisão](docs/roadmap.md) e
[contratos externos previstos](docs/endpoints.md).
Os comandos de merge abaixo registram a inicialização local anterior a esse
fluxo; nas próximas etapas, executar merge somente após aprovação do PR.

O repositório está na pasta pai, inicializado pelo workspace. Os comandos Git
abaixo são executados nessa pasta, fora de `afiliados-ml/`.
Trabalhar em `feature/<nome>`; nunca fazer commits diretamente em `main`.

```powershell
git switch -c feature/config-database main
git add .gitignore afiliados-ml
git commit -m "feat: add environment configuration and database foundation"
# Somente após os testes passarem:
git switch main
git merge --ff-only feature/config-database
```

Na primeira etapa, sem histórico anterior, a branch de feature é criada como
órfã, e `main` é apontada para o primeiro commit aprovado. Nas demais etapas,
usar o fluxo acima. A confirmação para a próxima etapa é dada pelo usuário.

Comandos específicos da inicialização (executados nesta etapa):

```powershell
git checkout --orphan feature/config-database
git add .gitignore afiliados-ml
git commit -m "feat: add environment configuration and database foundation"
git branch main
git switch main
git merge --ff-only feature/config-database
```

Como o repositório não tinha commits, `main` nasce no commit testado da feature;
o primeiro merge informa que já está atualizado. Não há commit feito em `main`.

Validação da etapa: quatro testes passaram, diagnóstico do banco executado e
`pip check` sem conflitos. Os testes exigiram execução fora do isolamento do
Codex por restrição de acesso à pasta temporária do Windows.

HTTPX já é usado nos testes HTTP; APScheduler e python-telegram-bot continuam
adiados. O MVP agora inclui catálogo visual, sem coleta real, descontos ou publicações.

## Referências

- [Sessões SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- [SQLite no SQLAlchemy](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)
- [pydantic-settings](https://github.com/pydantic/pydantic-settings/blob/main/docs/index.md)
