"""Verifica o contrato HTTP do MVP usando dados fictícios e banco isolado."""

from alembic import command
from alembic.config import Config
from dotenv import dotenv_values
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import func, select, text

from app.api.application import create_app
from app.config import PROJECT_ROOT, Settings
from app.database import build_engine, build_session_factory, session_scope
from app.models import PriceHistory, Product
from app.services.demo import seed_demo
from app.setup_local import setup_environment

TOKEN = "test-only-token-for-api-not-a-real-secret"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture
def api(tmp_path):
    """Migra e popula banco exclusivo, sem ler o .env do desenvolvedor."""
    url = f"sqlite:///{tmp_path / 'api.db'}"
    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "head")
    engine = build_engine(url)
    factory = build_session_factory(engine)
    try:
        with session_scope(factory) as session:
            assert seed_demo(session) == 6
        settings = Settings(_env_file=None, database_url=url, api_token=TOKEN,
                            cors_origins=["http://localhost:5173"])
        with TestClient(create_app(settings), raise_server_exceptions=False) as client:
            yield client, factory
    finally:
        engine.dispose()


def test_demo_seed_is_repeatable(api):
    _, factory = api
    with session_scope(factory) as session:
        assert seed_demo(session) == 0
        assert session.scalar(select(func.count()).select_from(Product)) == 6
        assert session.scalar(select(func.count()).select_from(PriceHistory)) == 42


def test_paginated_products_and_explicit_demo_origin(api):
    client, _ = api
    response = client.get("/api/v1/products?page=1&page_size=2", headers=HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["meta"] == {"page": 1, "page_size": 2, "total": 6}
    assert len(body["data"]) == 2
    first = body["data"][0]
    assert first["source"] == "demo"
    assert first["latest_price"]["price_cents"] == 15990
    assert first["latest_price"]["observed_at"].endswith("Z")
    assert client.get(first["image_url"]).headers["content-type"].startswith("image/svg+xml")
    other = client.get("/api/v1/products?page=2&page_size=2", headers=HEADERS).json()
    assert {x["id"] for x in body["data"]}.isdisjoint({x["id"] for x in other["data"]})


def test_search_category_literal_wildcard_and_empty_page(api):
    client, _ = api
    assert client.get("/api/v1/products?q=CAFETEIRA", headers=HEADERS).json()["meta"]["total"] == 1
    assert client.get("/api/v1/products?category_id=casa", headers=HEADERS).json()["meta"]["total"] == 2
    assert client.get("/api/v1/products?q=%25", headers=HEADERS).json()["data"] == []
    assert client.get("/api/v1/products?page=100", headers=HEADERS).json()["data"] == []


def test_detail_and_history_contract(api):
    client, _ = api
    product = client.get("/api/v1/products/1", headers=HEADERS).json()
    response = client.get("/api/v1/products/1/prices?page_size=3", headers=HEADERS)
    assert response.status_code == 200
    history = response.json()
    assert history["meta"]["total"] == 7
    assert len(history["data"]) == 3
    assert history["data"][0] == product["latest_price"]
    dates = [item["observed_at"] for item in history["data"]]
    assert dates == sorted(dates, reverse=True)


def test_products_without_price_remain_visible(api):
    client, factory = api
    with session_scope(factory) as session:
        product = Product(item_id="MANUAL1", title="Sem observações", permalink="https://example.invalid")
        session.add(product)
        session.flush()
        product_id = product.id
    body = client.get(f"/api/v1/products/{product_id}", headers=HEADERS).json()
    assert body["latest_price"] is None
    assert body["source"] == "manual"
    history = client.get(f"/api/v1/products/{product_id}/prices", headers=HEADERS).json()
    assert history["data"] == []
    assert client.get("/api/v1/products", headers=HEADERS).json()["meta"]["total"] == 7


@pytest.mark.parametrize("path", ["/api/v1/products/999", "/api/v1/products/999/prices"])
def test_missing_product(api, path):
    response = api[0].get(path, headers=HEADERS)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "product_not_found"


@pytest.mark.parametrize("path", ["/api/v1/products?page=0", "/api/v1/products?page_size=101",
                                 "/api/v1/products?q=", "/api/v1/products/nope", "/api/v1/products/0"])
def test_invalid_inputs_use_common_error_envelope(api, path):
    response = api[0].get(path, headers=HEADERS)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer invalid"}])
def test_requires_bearer_token(api, headers):
    response = api[0].get("/api/v1/products", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["error"]["code"] == "unauthorized"


def test_openapi_and_no_write_routes(api):
    client, _ = api
    schema = client.get("/openapi.json").json()
    assert schema["paths"]["/api/v1/products"]["get"]["security"] == [{"HTTPBearer": []}]
    assert schema["paths"]["/api/v1/products"]["get"]["responses"]["422"]["content"]["application/json"]["schema"]["$ref"].endswith("ErrorResponse")
    assert all(set(path) == {"get"} for path in schema["paths"].values())
    assert client.post("/api/v1/products", headers=HEADERS, json={}).status_code == 405


def test_cors_is_explicit(api):
    client, _ = api
    accepted = client.options("/api/v1/products", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
    })
    assert accepted.status_code == 200
    assert accepted.headers["access-control-allow-origin"] == "http://localhost:5173"
    rejected = client.get("/api/v1/products", headers={**HEADERS, "Origin": "https://untrusted.invalid"})
    assert "access-control-allow-origin" not in rejected.headers


def test_health_and_safe_database_failure(api):
    client, factory = api
    assert client.get("/api/v1/health", headers=HEADERS).json() == {"status": "ok"}
    with session_scope(factory) as session:
        session.execute(text("DROP TABLE offers"))
        session.execute(text("DROP TABLE price_history"))
    response = client.get("/api/v1/products", headers=HEADERS)
    assert response.status_code == 503
    assert response.json() == {"error": {"code": "database_unavailable", "message": "Banco temporariamente indisponível."}}
    assert "SELECT" not in response.text


def test_setup_preserves_existing_configuration_and_token(tmp_path):
    env = tmp_path / ".env"
    env.write_text("DATABASE_URL=sqlite:///custom.db\n", encoding="utf-8")
    setup_environment(env)
    first = dotenv_values(env)
    setup_environment(env)
    assert dotenv_values(env) == first
    assert first["DATABASE_URL"] == "sqlite:///custom.db"
    assert len(first["API_TOKEN"]) >= 32


def test_rejects_missing_api_token():
    settings = Settings(_env_file=None, api_token=None)
    with pytest.raises(RuntimeError, match="API_TOKEN"):
        with TestClient(create_app(settings)):
            pass


def test_migration_preserves_existing_referenced_rows(tmp_path):
    url = f"sqlite:///{tmp_path / 'upgrade.db'}"
    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.attributes["database_url"] = url
    command.upgrade(config, "9ba84470960b")
    engine = build_engine(url)
    try:
        with engine.begin() as connection:
            connection.execute(text("INSERT INTO products (id,item_id,title,permalink,created_at) VALUES (1,'OLD','Anterior','https://example.invalid','2026-01-01')"))
            connection.execute(text("INSERT INTO price_history (id,product_id,price_cents,observed_at) VALUES (1,1,1990,'2026-01-01')"))
            connection.execute(text("INSERT INTO offers (id,product_id,price_history_id,title,created_at) VALUES (1,1,1,'Anterior','2026-01-01')"))
        command.upgrade(config, "head")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT source FROM products WHERE id=1")) == "manual"
            assert connection.scalar(text("SELECT count(*) FROM offers")) == 1
        command.downgrade(config, "9ba84470960b")
        with engine.connect() as connection:
            assert connection.scalar(text("SELECT count(*) FROM offers")) == 1
    finally:
        engine.dispose()
