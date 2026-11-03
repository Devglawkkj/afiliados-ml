"""Consultas de produtos reutilizáveis, sem dependências do FastAPI."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import PriceHistory, Product
from app.schemas import PageMeta, PricePage, PriceRead, ProductPage, ProductRead


class ProductNotFound(Exception):
    """Produto solicitado não existe."""


def require_product(session: Session, product_id: int) -> Product:
    """Localiza produto ou sinaliza ausência para qualquer ponto de entrada."""
    product = session.get(Product, product_id)
    if product is None:
        raise ProductNotFound
    return product


def serialize_price(price: PriceHistory) -> PriceRead:
    """Converte observação para o contrato de leitura."""
    return PriceRead(id=price.id, price_cents=price.price_cents, observed_at=price.observed_at)


def serialize_product(product: Product, price: PriceHistory | None) -> ProductRead:
    """Expõe apenas os campos públicos do cadastro e do último preço."""
    return ProductRead(
        id=product.id, item_id=product.item_id, variation_id=product.variation_id,
        title=product.title, permalink=product.permalink, image_url=product.image_url,
        category_id=product.category_id, currency=product.currency, source=product.source,
        created_at=product.created_at,
        latest_price=serialize_price(price) if price else None,
    )


def get_product(session: Session, product_id: int) -> ProductRead:
    """Retorna detalhes com o último preço, ordenado por data e id."""
    product = require_product(session, product_id)
    price = session.scalar(select(PriceHistory).where(PriceHistory.product_id == product_id)
                           .order_by(PriceHistory.observed_at.desc(), PriceHistory.id.desc()).limit(1))
    return serialize_product(product, price)


def list_products(session: Session, *, page: int, page_size: int,
                  q: str | None = None, category_id: str | None = None) -> ProductPage:
    """Filtra cadastros e busca seus últimos preços em uma única consulta de página."""
    filters = []
    if q:
        # Escape evita interpretar %, _ e / como padrões fornecidos pelo usuário.
        filters.append(Product.title.icontains(q, autoescape=True))
    if category_id:
        filters.append(Product.category_id == category_id)
    total = session.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    latest_id = (select(PriceHistory.id).where(PriceHistory.product_id == Product.id)
                 .order_by(PriceHistory.observed_at.desc(), PriceHistory.id.desc())
                 .limit(1).correlate(Product).scalar_subquery())
    rows = session.execute(select(Product, PriceHistory)
                           .outerjoin(PriceHistory, PriceHistory.id == latest_id)
                           .where(*filters).order_by(Product.id)
                           .offset((page - 1) * page_size).limit(page_size)).all()
    return ProductPage(data=[serialize_product(product, price) for product, price in rows],
                       meta=PageMeta(page=page, page_size=page_size, total=total))


def list_prices(session: Session, product_id: int, *, page: int, page_size: int) -> PricePage:
    """Consulta histórico paginado sem confundir produto ausente com histórico vazio."""
    require_product(session, product_id)
    condition = PriceHistory.product_id == product_id
    total = session.scalar(select(func.count()).select_from(PriceHistory).where(condition)) or 0
    prices = session.scalars(select(PriceHistory).where(condition)
                             .order_by(PriceHistory.observed_at.desc(), PriceHistory.id.desc())
                             .offset((page - 1) * page_size).limit(page_size)).all()
    return PricePage(data=[serialize_price(price) for price in prices],
                     meta=PageMeta(page=page, page_size=page_size, total=total))
