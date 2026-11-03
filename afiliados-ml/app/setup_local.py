"""Prepara configuração de desenvolvimento sem imprimir segredos."""

from pathlib import Path
import secrets

from dotenv import dotenv_values, set_key

from app.config import PROJECT_ROOT


def setup_environment(path: Path) -> None:
    """Gera token somente se ausente e preserva configurações locais existentes."""
    path.touch(exist_ok=True)
    values = dotenv_values(path)
    if not values.get("API_TOKEN"):
        set_key(str(path), "API_TOKEN", secrets.token_urlsafe(32))
    for name, value in {
        "DATABASE_URL": "sqlite:///./afiliados.db", "LOG_LEVEL": "INFO",
        "CORS_ORIGINS": '["http://localhost:5173"]',
    }.items():
        if name not in values:
            set_key(str(path), name, value)


def main() -> None:
    """Prepara o .env ignorado pelo Git, sem conectar ao banco."""
    setup_environment(PROJECT_ROOT / ".env")
    print("Ambiente local preparado. Consulte API_TOKEN no .env para autorizar o Swagger.")


if __name__ == "__main__":
    main()
