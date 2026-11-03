"""Verificação local da configuração e da conexão, sem regras de negócio."""

import logging

from sqlalchemy import text

from app.config import get_settings
from app.database import build_engine, build_session_factory, session_scope


def main() -> None:
    """Valida o ambiente e executa uma consulta simples no banco."""
    settings = get_settings()
    logging.basicConfig(level=settings.log_level, format="%(levelname)s %(name)s: %(message)s")
    engine = build_engine(settings.database_url)
    try:
        factory = build_session_factory(engine)
        with session_scope(factory) as session:
            session.execute(text("SELECT 1"))
        logging.getLogger(__name__).info("Configuração e conexão com o banco verificadas.")
    except Exception:
        logging.getLogger(__name__).error("Falha na conexão. Verifique a configuração e a disponibilidade do banco.")
        raise SystemExit(1) from None
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
