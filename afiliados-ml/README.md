# Afiliados Mercado Livre

Ferramenta em construção, por etapas. A etapa 1 configura o ambiente e o banco;
ainda não busca produtos, gera links ou publica mensagens.

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

O arquivo `.env.example` contém apenas configurações locais não secretas.
Variáveis do processo têm prioridade sobre `.env`. O arquivo é carregado a
partir da raiz do projeto. Nunca versionar `.env` ou credenciais; nenhuma
credencial de canal é necessária nesta etapa.

## Execução e testes

```powershell
.\.venv\Scripts\python.exe -m app.main
.\.venv\Scripts\python.exe -m pytest -q
```

A execução valida a conexão e pode criar o arquivo SQLite local. Nenhuma tabela
de negócio é criada. Caminhos SQLite relativos são resolvidos a partir da raiz
do projeto, independentemente do diretório de trabalho.

## Organização e decisões

- `app/config.py`: configuração tipada e validada com pydantic-settings.
- `app/database.py`: base ORM, engine, fábrica de sessões e transações.
- `app/main.py`: composição e diagnóstico local, sem regras de negócio.
- `tests/`: prioridade do ambiente, validação, caminhos, commit e rollback.
- `docs/endpoints.md`: inventário de integrações, ainda sem chamadas externas.

Serviços, modelos, jobs e publishers serão adicionados nas próximas etapas.
As regras de negócio ficarão em `app/services/`, reutilizáveis pelo futuro painel.
Cada tarefa ou requisição deve abrir sua própria sessão com `session_scope`.
O chamador controla o ciclo de vida da engine; importar os módulos não conecta
ao banco. A configuração de logging pertence ao ponto de entrada.

Para PostgreSQL, a camada usa as mesmas APIs do SQLAlchemy; será necessário
instalar um driver, configurar a conexão e validar com testes de integração.
Isso ainda não foi testado. Migrações serão introduzidas com os modelos.

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

Dependências das integrações (httpx, APScheduler e python-telegram-bot) serão
adicionadas quando utilizadas. Não há painel web no MVP.

## Referências

- [Sessões SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)
- [SQLite no SQLAlchemy](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)
- [pydantic-settings](https://github.com/pydantic/pydantic-settings/blob/main/docs/index.md)
