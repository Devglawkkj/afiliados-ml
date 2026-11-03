"""Integra Alembic à mesma configuração e engine da aplicação."""

from alembic import context
from alembic.autogenerate.api import AutogenContext
from app.config import get_settings
from app.database import Base, build_engine
from app.models import UTCDateTime  # Também registra os modelos no metadata.


def render_item(type_: str, obj: object, _autogen_context: AutogenContext) -> str | bool:
    """Mantém revisões independentes das classes Python atuais da aplicação."""
    if type_ == "type" and isinstance(obj, UTCDateTime):
        return "sa.DateTime()"
    return False


def run_migrations() -> None:
    """Executa migrações online ou gera SQL offline sem gravar credenciais no ini."""
    config = context.config
    url = config.attributes.get("database_url") or get_settings().database_url
    engine = build_engine(url)
    options = dict(target_metadata=Base.metadata, compare_type=True, render_item=render_item)
    try:
        if context.is_offline_mode():
            context.configure(url=engine.url, literal_binds=True, **options)
            with context.begin_transaction():
                context.run_migrations()
        else:
            with engine.connect() as connection:
                context.configure(connection=connection, **options)
                with context.begin_transaction():
                    context.run_migrations()
    finally:
        engine.dispose()


run_migrations()
