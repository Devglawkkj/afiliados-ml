"""Engine e transações independentes de CLI, agendador ou servidor web."""

from collections.abc import Iterator
from contextlib import contextmanager
import logging

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import PROJECT_ROOT

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base declarativa compartilhada pelos futuros modelos."""


def build_engine(database_url: str) -> Engine:
    """Cria engine; caminhos SQLite relativos usam a raiz do projeto."""
    url = make_url(database_url)
    if url.get_backend_name() == "sqlite" and url.database not in (None, "", ":memory:"):
        from pathlib import Path

        path = Path(url.database)
        if not path.is_absolute():
            url = url.set(database=str(PROJECT_ROOT / path))

    engine = create_engine(url, pool_pre_ping=True, hide_parameters=True)
    if url.get_backend_name() == "sqlite":
        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _record) -> None:
            cursor = connection.cursor()
            try:
                cursor.execute("PRAGMA foreign_keys=ON")
            finally:
                cursor.close()
    return engine


def build_session_factory(engine: Engine) -> sessionmaker[Session]:
    """Cria fábrica reutilizável; sessões nunca são compartilhadas entre tarefas."""
    return sessionmaker(bind=engine, expire_on_commit=False)


@contextmanager
def session_scope(factory: sessionmaker[Session]) -> Iterator[Session]:
    """Entrega sessão, confirma sucesso e reverte falhas antes de fechá-la."""
    with factory() as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            logger.warning("Transação revertida após falha.")
            raise
