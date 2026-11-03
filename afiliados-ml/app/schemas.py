"""Contrato HTTP explícito, independente da representação dos modelos ORM."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Erro estável para o front-end, sem parâmetros ou mensagens do banco."""

    code: str
    message: str


class ErrorResponse(BaseModel):
    """Envelope comum de erros HTTP."""

    error: ErrorDetail


class PriceRead(BaseModel):
    """Preço em centavos e instante UTC; nunca utiliza float monetário."""

    id: int
    price_cents: int
    observed_at: datetime


class ProductRead(BaseModel):
    """Produto para cards e detalhes, com origem explícita e preço opcional."""

    id: int
    item_id: str
    variation_id: str
    title: str
    permalink: str
    image_url: str | None
    category_id: str | None
    currency: Literal["BRL"]
    source: Literal["demo", "manual", "mercadolivre"]
    created_at: datetime
    latest_price: PriceRead | None


class PageMeta(BaseModel):
    """Paginação com ordem estável e limite máximo validado na entrada."""

    page: int
    page_size: int
    total: int


class ProductPage(BaseModel):
    """Página de produtos."""

    data: list[ProductRead]
    meta: PageMeta


class PricePage(BaseModel):
    """Página do histórico de preços, do mais recente para o mais antigo."""

    data: list[PriceRead]
    meta: PageMeta
