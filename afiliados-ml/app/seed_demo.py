"""Ponto de entrada para cadastrar os exemplos fictícios no banco configurado."""

from app.config import get_settings
from app.database import build_engine, build_session_factory, session_scope
from app.services.demo import seed_demo


def main() -> None:
    """Insere exemplos após as migrações; nunca remove dados existentes."""
    engine = build_engine(get_settings().database_url)
    try:
        with session_scope(build_session_factory(engine)) as session:
            count = seed_demo(session)
        print(f"{count} produtos fictícios adicionados. Nenhum produto real foi consultado.")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
