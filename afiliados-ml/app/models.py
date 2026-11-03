"""Modelos persistentes; dinheiro em centavos e datas normalizadas em UTC."""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import (
    BigInteger, CheckConstraint, DateTime, Enum as SAEnum, ForeignKey,
    ForeignKeyConstraint, Index, Integer, String, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates
from sqlalchemy.engine import Dialect
from sqlalchemy.types import TypeDecorator

from app.database import Base


class UTCDateTime(TypeDecorator[datetime]):
    """Exige datetime com fuso, armazena UTC e devolve datetime com fuso UTC."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Rejeita datas ambíguas e normaliza o valor antes da persistência."""
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Datas devem incluir um fuso horário.")
        return value.astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        """Restaura o fuso UTC após leitura, inclusive no SQLite."""
        return value.replace(tzinfo=timezone.utc) if value is not None else None


def utc_now() -> datetime:
    """Retorna o instante atual com fuso UTC explícito."""
    return datetime.now(timezone.utc)


class OfferStatus(str, Enum):
    """Estados persistidos de uma oferta, independentes dos futuros canais."""

    PENDING = "pending"
    APPROVED = "approved"
    PUBLISHED = "published"
    REJECTED = "rejected"


class Product(Base):
    """Identifica um anúncio e sua variante; variantes não compartilham histórico."""

    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("item_id", "variation_id", name="uq_product_listing_variation"),
        CheckConstraint("length(item_id) > 0", name="ck_product_item_id"),
        CheckConstraint("length(title) > 0", name="ck_product_title"),
        CheckConstraint("currency = 'BRL'", name="ck_product_currency_brl"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[str] = mapped_column(String(64))
    variation_id: Mapped[str] = mapped_column(String(64), default="", server_default="")
    title: Mapped[str] = mapped_column(String(512))
    permalink: Mapped[str] = mapped_column(String(2048))
    image_url: Mapped[str | None] = mapped_column(String(2048))
    category_id: Mapped[str | None] = mapped_column(String(64), index=True)
    currency: Mapped[str] = mapped_column(String(3), default="BRL", server_default="BRL")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)


class PriceHistory(Base):
    """Observação de preço em centavos; não representa o preço anunciado como 'de'."""

    __tablename__ = "price_history"
    __table_args__ = (
        CheckConstraint("price_cents > 0", name="ck_history_positive_price"),
        UniqueConstraint("product_id", "id", name="uq_history_product_id"),
        Index("ix_history_product_observed", "product_id", "observed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"))
    price_cents: Mapped[int] = mapped_column(BigInteger)
    observed_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    product: Mapped[Product] = relationship()

    @validates("price_cents")
    def validate_price(self, _key: str, value: int) -> int:
        """Exige centavos inteiros positivos, dentro do limite BIGINT."""
        if type(value) is not int or not 0 < value <= 9_223_372_036_854_775_807:
            raise ValueError("Preço deve ser inteiro positivo em centavos, dentro do limite BIGINT.")
        return value


class Offer(Base):
    """Conteúdo revisável ligado ao preço observado da mesma variante."""

    __tablename__ = "offers"
    __table_args__ = (
        ForeignKeyConstraint(
            ["product_id", "price_history_id"],
            ["price_history.product_id", "price_history.id"],
            name="fk_offer_product_history", ondelete="RESTRICT",
        ),
        CheckConstraint("length(title) > 0", name="ck_offer_title"),
        Index("ix_offers_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(Integer)
    price_history_id: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(512))
    image_url: Mapped[str | None] = mapped_column(String(2048))
    affiliate_url: Mapped[str | None] = mapped_column(String(2048))
    status: Mapped[OfferStatus] = mapped_column(
        SAEnum(
            OfferStatus, values_callable=lambda values: [value.value for value in values],
            native_enum=False, create_constraint=True, validate_strings=True,
            name="offer_status",
        ), default=OfferStatus.PENDING, server_default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utc_now)
    price_history: Mapped[PriceHistory] = relationship()
