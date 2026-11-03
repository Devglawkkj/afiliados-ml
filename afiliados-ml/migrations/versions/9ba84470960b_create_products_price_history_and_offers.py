"""create products price history and offers

Revision ID: 9ba84470960b
Revises: 
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '9ba84470960b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Aplica a alteração de esquema desta revisão."""
    op.create_table('products',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.String(length=64), nullable=False),
    sa.Column('variation_id', sa.String(length=64), server_default='', nullable=False),
    sa.Column('title', sa.String(length=512), nullable=False),
    sa.Column('permalink', sa.String(length=2048), nullable=False),
    sa.Column('image_url', sa.String(length=2048), nullable=True),
    sa.Column('category_id', sa.String(length=64), nullable=True),
    sa.Column('currency', sa.String(length=3), server_default='BRL', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint("currency = 'BRL'", name='ck_product_currency_brl'),
    sa.CheckConstraint('length(item_id) > 0', name='ck_product_item_id'),
    sa.CheckConstraint('length(title) > 0', name='ck_product_title'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('item_id', 'variation_id', name='uq_product_listing_variation')
    )
    op.create_index(op.f('ix_products_category_id'), 'products', ['category_id'], unique=False)
    op.create_table('price_history',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('price_cents', sa.BigInteger(), nullable=False),
    sa.Column('observed_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('price_cents > 0', name='ck_history_positive_price'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('product_id', 'id', name='uq_history_product_id')
    )
    op.create_index('ix_history_product_observed', 'price_history', ['product_id', 'observed_at'], unique=False)
    op.create_table('offers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('price_history_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=512), nullable=False),
    sa.Column('image_url', sa.String(length=2048), nullable=True),
    sa.Column('affiliate_url', sa.String(length=2048), nullable=True),
    sa.Column('status', sa.Enum('pending', 'approved', 'published', 'rejected', name='offer_status', native_enum=False, create_constraint=True), server_default='pending', nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.CheckConstraint('length(title) > 0', name='ck_offer_title'),
    sa.ForeignKeyConstraint(['product_id', 'price_history_id'], ['price_history.product_id', 'price_history.id'], name='fk_offer_product_history', ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_offers_status_created', 'offers', ['status', 'created_at'], unique=False)


def downgrade() -> None:
    """Reverte a alteração de esquema desta revisão."""
    op.drop_index('ix_offers_status_created', table_name='offers')
    op.drop_table('offers')
    op.drop_index('ix_history_product_observed', table_name='price_history')
    op.drop_table('price_history')
    op.drop_index(op.f('ix_products_category_id'), table_name='products')
    op.drop_table('products')
