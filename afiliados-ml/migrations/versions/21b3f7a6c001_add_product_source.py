"""Identifica explicitamente dados de demonstração e sua futura origem real."""

from alembic import op
import sqlalchemy as sa

revision = "21b3f7a6c001"
down_revision = "9ba84470960b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Adiciona origem, preservando os registros existentes como manuais."""
    op.add_column("products", sa.Column(
        "source", sa.String(16),
        sa.CheckConstraint("source IN ('demo', 'manual', 'mercadolivre')", name="ck_product_source"),
        nullable=False, server_default="manual",
    ))


def downgrade() -> None:
    """Remove somente a identificação de origem."""
    op.drop_column("products", "source")
