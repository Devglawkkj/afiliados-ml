"""Dados inventados para esboço visual; nenhuma chamada externa é realizada."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PriceHistory, Product

DEMO_PRODUCTS = (
    ("Fone sem fio Aurora", "audio", 15990, "audio"),
    ("Cafeteira Brisa", "casa", 24990, "coffee"),
    ("Teclado mecânico Nuvem", "informatica", 19990, "keyboard"),
    ("Mochila Horizonte", "acessorios", 11990, "bag"),
    ("Monitor Estrela 24 polegadas", "informatica", 89990, "monitor"),
    ("Luminária de mesa Sol", "casa", 7990, "lamp"),
)


def seed_demo(session: Session) -> int:
    """Insere exemplos uma única vez; preserva dados existentes e usa a transação do chamador."""
    added = 0
    for index, (title, category, cents, image) in enumerate(DEMO_PRODUCTS, start=1):
        item_id = f"DEMO{index:03d}"
        if session.scalar(select(Product.id).where(Product.item_id == item_id, Product.variation_id == "")):
            continue
        product = Product(
            item_id=item_id, title=title, category_id=category, currency="BRL", source="demo",
            permalink=f"https://example.invalid/demo/{item_id}", image_url=f"/demo-images/{image}.svg",
        )
        session.add(product)
        session.flush()
        for day in range(7):
            session.add(PriceHistory(
                product_id=product.id, price_cents=cents + (6 - day) * 500,
                observed_at=datetime(2026, 1, 1, 12, tzinfo=timezone.utc) + timedelta(days=day),
            ))
        added += 1
    session.flush()
    return added
