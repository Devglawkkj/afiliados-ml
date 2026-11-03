"""Verifica configuração e garantias de transação sem APIs externas."""

import pytest
from pydantic import ValidationError
from sqlalchemy import text

from app.config import PROJECT_ROOT, Settings
from app.database import build_engine, build_session_factory, session_scope


def test_environment_overrides_dotenv(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("LOG_LEVEL=WARNING\n", encoding="utf-8")
    monkeypatch.setenv("LOG_LEVEL", "ERROR")
    assert Settings(_env_file=env).log_level == "ERROR"


def test_rejects_invalid_log_level(monkeypatch):
    monkeypatch.setenv("LOG_LEVEL", "INVALID")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_relative_database_path_is_stable():
    engine = build_engine("sqlite:///./example.db")
    try:
        assert engine.url.database == str(PROJECT_ROOT / "example.db")
    finally:
        engine.dispose()


def test_transaction_commit_rollback_and_foreign_keys(tmp_path):
    engine = build_engine(f"sqlite:///{tmp_path / 'test.db'}")
    factory = build_session_factory(engine)
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE samples (id INTEGER PRIMARY KEY)"))
        with session_scope(factory) as session:
            assert session.scalar(text("PRAGMA foreign_keys")) == 1
            session.execute(text("INSERT INTO samples VALUES (1)"))
        with pytest.raises(RuntimeError):
            with session_scope(factory) as session:
                session.execute(text("INSERT INTO samples VALUES (2)"))
                raise RuntimeError("falha simulada")
        with session_scope(factory) as session:
            assert session.scalars(text("SELECT id FROM samples")).all() == [1]
    finally:
        engine.dispose()
