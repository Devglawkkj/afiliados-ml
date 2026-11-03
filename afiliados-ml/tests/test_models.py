"""Exercita o esquema real criado pelas migrações, sem APIs externas."""

from datetime import datetime, timedelta, timezone

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import delete, inspect, select, text
from sqlalchemy.exc import IntegrityError, StatementError

from app.config import PROJECT_ROOT
from app.database import Base, build_engine, build_session_factory, session_scope
from app.models import Offer, OfferStatus, PriceHistory, Product


@pytest.fixture
def database(tmp_path):
    """Cria um banco isolado via Alembic, não via create_all."""
    config = Config(str(PROJECT_ROOT / "alembic.ini"))
    config.attributes["database_url"] = f"sqlite:///{tmp_path / 'models.db'}"
    command.upgrade(config, "head")
    engine = build_engine(config.attributes["database_url"])
    try:
        yield engine, build_session_factory(engine), config
    finally:
        engine.dispose()


def add_product(session, item_id="MLB123", variation_id=""):
    product = Product(item_id=item_id, variation_id=variation_id, title="Cafeteira", permalink="https://example.com/product")
    session.add(product)
    session.flush()
    return product


def add_history(session, product_id, cents=19990):
    history = PriceHistory(product_id=product_id, price_cents=cents)
    session.add(history)
    session.flush()
    return history


def test_round_trip_money_timestamp_and_pending_offer(database):
    _, factory, _ = database
    original = datetime(2026, 11, 3, 9, 0, tzinfo=timezone(timedelta(hours=-3)))
    with session_scope(factory) as session:
        product = add_product(session)
        history = add_history(session, product.id, 9_007_199_254_740_993)
        history.observed_at = original
        offer = Offer(product_id=product.id, price_history_id=history.id, title=product.title)
        session.add(offer)
    with session_scope(factory) as session:
        offer = session.scalar(select(Offer))
        assert offer.status is OfferStatus.PENDING
        assert offer.affiliate_url is None
        assert offer.price_history.price_cents == 9_007_199_254_740_993
        assert offer.price_history.observed_at == original.astimezone(timezone.utc)
        assert offer.price_history.observed_at.tzinfo is timezone.utc
        assert offer.created_at.tzinfo is timezone.utc
        assert offer.price_history.product.currency == "BRL"


def test_listing_variation_uniqueness(database):
    _, factory, _ = database
    with session_scope(factory) as session:
        add_product(session)
        add_product(session, variation_id="blue")
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        add_product(session)


def test_offer_cannot_reference_another_product_price(database):
    _, factory, _ = database
    with session_scope(factory) as session:
        first = add_product(session)
        second = add_product(session, item_id="MLB456")
        history = add_history(session, first.id)
        second_id, history_id = second.id, history.id
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        session.add(Offer(product_id=second_id, price_history_id=history_id, title="Inválida"))


@pytest.mark.parametrize("status", list(OfferStatus))
def test_all_offer_statuses_round_trip(database, status):
    _, factory, _ = database
    with session_scope(factory) as session:
        product = add_product(session)
        history = add_history(session, product.id)
        session.add(Offer(product_id=product.id, price_history_id=history.id, title="Oferta", status=status))
    with session_scope(factory) as session:
        assert session.scalar(select(Offer.status)) is status


def test_database_rejects_unknown_status(database):
    _, factory, _ = database
    with session_scope(factory) as session:
        product = add_product(session)
        history = add_history(session, product.id)
        session.add(Offer(product_id=product.id, price_history_id=history.id, title="Oferta"))
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        session.execute(text("UPDATE offers SET status = 'invalid'"))


@pytest.mark.parametrize("price", [0, -1, 19.99, True, "1999", 2**63])
def test_rejects_invalid_cent_values(price):
    with pytest.raises(ValueError):
        PriceHistory(product_id=1, price_cents=price)


def test_database_rejects_nonpositive_price_and_orphan_history(database):
    _, factory, _ = database
    with session_scope(factory) as session:
        product_id = add_product(session).id
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        session.execute(text("INSERT INTO price_history (product_id, price_cents, observed_at) VALUES (:id, 0, '2026-11-03 12:00:00')"), {"id": product_id})
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        add_history(session, product_id + 1)


def test_rejects_naive_timestamp(database):
    _, factory, _ = database
    with pytest.raises(StatementError), session_scope(factory) as session:
        product = add_product(session)
        session.add(PriceHistory(product_id=product.id, price_cents=1999, observed_at=datetime(2026, 11, 3)))


def test_database_preserves_referenced_history(database):
    _, factory, _ = database
    with session_scope(factory) as session:
        product = add_product(session)
        history = add_history(session, product.id)
        session.add(Offer(product_id=product.id, price_history_id=history.id, title="Oferta"))
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        session.execute(delete(PriceHistory))
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        session.execute(delete(Product))


def test_migration_matches_metadata_and_upgrades_preserve_data(database):
    engine, factory, config = database
    with engine.connect() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
    with session_scope(factory) as session:
        add_product(session)
    command.upgrade(config, "head")
    with session_scope(factory) as session:
        assert len(session.scalars(select(Product)).all()) == 1


def test_migration_downgrade_and_upgrade(database):
    engine, _, config = database
    command.downgrade(config, "base")
    assert set(inspect(engine).get_table_names()) == {"alembic_version"}
    command.upgrade(config, "head")
    assert {"products", "price_history", "offers"} <= set(inspect(engine).get_table_names())


def test_database_rejects_unsupported_currency(database):
    _, factory, _ = database
    with pytest.raises(IntegrityError), session_scope(factory) as session:
        product = add_product(session)
        product.currency = "USD"
