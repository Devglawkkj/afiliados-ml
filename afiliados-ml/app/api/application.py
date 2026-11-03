"""Composição do MVP HTTP somente de leitura para o futuro front-end."""

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager
import logging
from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import PROJECT_ROOT, Settings, get_settings
from app.database import build_engine, build_session_factory
from app.models import PriceHistory, Product
from app.schemas import ErrorResponse, PricePage, ProductPage, ProductRead
from app.services import products

logger = logging.getLogger(__name__)


def error_response(status: int, code: str, message: str, headers: dict | None = None) -> JSONResponse:
    """Produz o envelope de erro sem incluir entrada, credenciais ou SQL."""
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}}, headers=headers)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Cria aplicação isolada; engine e conexões pertencem ao lifespan."""
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        token = settings.api_token.get_secret_value() if settings.api_token else ""
        if len(token) < 32:
            raise RuntimeError("Defina API_TOKEN no .env com pelo menos 32 caracteres.")
        engine = build_engine(settings.database_url)
        try:
            # Falha cedo se as migrações ainda não foram aplicadas.
            with engine.connect() as connection:
                connection.execute(select(Product.source).limit(0))
                connection.execute(select(PriceHistory.id).limit(0))
            app.state.session_factory = build_session_factory(engine)
            yield
        finally:
            engine.dispose()

    app = FastAPI(
        title="Afiliados ML — API de produtos", version="1.0.0", lifespan=lifespan,
        description="MVP de leitura. Produtos com source=demo são fictícios; nenhuma integração externa está ativa.",
    )
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=False,
        allow_methods=["GET"], allow_headers=["Authorization"],
    )
    bearer = HTTPBearer(auto_error=False)

    def authenticate(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> None:
        expected = settings.api_token.get_secret_value() if settings.api_token else ""
        if credentials is None or not compare_digest(credentials.credentials.encode(), expected.encode()):
            raise HTTPException(status_code=401, detail="Autenticação necessária.", headers={"WWW-Authenticate": "Bearer"})

    def get_session(request: Request) -> Iterator[Session]:
        # API somente de leitura: fecha a sessão sem confirmar alterações.
        with request.app.state.session_factory() as session:
            yield session

    @app.exception_handler(StarletteHTTPException)
    async def http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        messages = {401: ("unauthorized", "Token ausente ou inválido."),
                    404: ("not_found", "Recurso não encontrado."),
                    405: ("method_not_allowed", "Método não permitido.")}
        code, message = messages.get(exc.status_code, ("http_error", "Não foi possível atender a solicitação."))
        return error_response(exc.status_code, code, message, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _exc: RequestValidationError) -> JSONResponse:
        return error_response(422, "validation_error", "Parâmetros inválidos. Consulte o contrato OpenAPI.")

    @app.exception_handler(products.ProductNotFound)
    async def missing_product(_request: Request, _exc: products.ProductNotFound) -> JSONResponse:
        return error_response(404, "product_not_found", "Produto não encontrado.")

    @app.exception_handler(SQLAlchemyError)
    async def database_error(_request: Request, _exc: SQLAlchemyError) -> JSONResponse:
        logger.error("Falha de acesso ao banco na API de produtos.")
        return error_response(503, "database_unavailable", "Banco temporariamente indisponível.")

    @app.exception_handler(Exception)
    async def unexpected_error(_request: Request, _exc: Exception) -> JSONResponse:
        logger.error("Falha interna na API de produtos.")
        return error_response(500, "internal_error", "Erro interno.")

    session_dep = Annotated[Session, Depends(get_session, scope="function")]
    page_dep = Annotated[int, Query(ge=1)]
    size_dep = Annotated[int, Query(ge=1, le=100)]
    errors = {status: {"model": ErrorResponse} for status in (401, 404, 422, 500, 503)}
    protected = [Depends(authenticate)]

    @app.get("/api/v1/health", tags=["health"], dependencies=protected, responses=errors)
    def health(session: session_dep) -> dict[str, str]:
        """Verifica a disponibilidade da conexão sem expor configuração."""
        session.execute(text("SELECT 1"))
        return {"status": "ok"}

    @app.get("/api/v1/products", response_model=ProductPage, tags=["products"], dependencies=protected, responses=errors)
    def list_products(
        session: session_dep, page: page_dep = 1, page_size: size_dep = 20,
        q: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
        category_id: Annotated[str | None, Query(min_length=1, max_length=64)] = None,
    ) -> ProductPage:
        """Lista produtos com busca local por título, categoria e paginação."""
        return products.list_products(session, page=page, page_size=page_size, q=q, category_id=category_id)

    @app.get("/api/v1/products/{product_id}", response_model=ProductRead, tags=["products"], dependencies=protected, responses=errors)
    def get_product(product_id: Annotated[int, Path(ge=1)], session: session_dep) -> ProductRead:
        """Consulta um produto e seu último preço observado."""
        return products.get_product(session, product_id)

    @app.get("/api/v1/products/{product_id}/prices", response_model=PricePage, tags=["products"], dependencies=protected, responses=errors)
    def list_prices(product_id: Annotated[int, Path(ge=1)], session: session_dep, page: page_dep = 1, page_size: size_dep = 20) -> PricePage:
        """Retorna histórico paginado em ordem decrescente de observação."""
        return products.list_prices(session, product_id, page=page, page_size=page_size)

    app.mount("/demo-images", StaticFiles(directory=PROJECT_ROOT / "static" / "demo-images"), name="demo-images")
    return app
