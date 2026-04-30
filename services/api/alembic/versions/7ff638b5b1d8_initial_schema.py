"""initial_schema

Revision ID: 7ff638b5b1d8
Revises: 
Create Date: 2026-04-27 22:52:07.003426

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7ff638b5b1d8'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create Businesses table
    op.create_table(
        'businesses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('sector', sa.Enum('supermarket', 'pharmacy', 'pos', 'food_vendor', 'fashion', 'logistics', 'real_estate', 'tech_repairs', 'education', 'agriculture', 'other', name='sectortype'), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('city', sa.String(length=80), nullable=True),
        sa.Column('state', sa.String(length=80), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id')
    )

    # Create Products table
    op.create_table(
        'products',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('sku', sa.String(length=80), nullable=True),
        sa.Column('category', sa.String(length=80), nullable=True),
        sa.Column('selling_price_kobo', sa.Integer(), nullable=False),
        sa.Column('cost_price_kobo', sa.Integer(), nullable=False),
        sa.Column('stock_quantity', sa.Integer(), nullable=False),
        sa.Column('low_stock_threshold', sa.Integer(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_business_id'), 'products', ['business_id'], unique=False)

    # Create Sales table
    op.create_table(
        'sales',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('payment_method', sa.Enum('cash', 'transfer', 'pos', 'ussd', name='paymentmethod'), nullable=False),
        sa.Column('status', sa.Enum('completed', 'refunded', 'partial_refund', name='salestatus'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('sale_date', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_business_id'), 'sales', ['business_id'], unique=False)
    op.create_index(op.f('ix_sales_sale_date'), 'sales', ['sale_date'], unique=False)

    # Create Sale Items table
    op.create_table(
        'sale_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('sale_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price_kobo', sa.Integer(), nullable=False),
        sa.Column('total_kobo', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sale_items_sale_id'), 'sale_items', ['sale_id'], unique=False)

    # Create Expenses table
    op.create_table(
        'expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(length=80), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('amount_kobo', sa.Integer(), nullable=False),
        sa.Column('expense_date', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_expenses_business_id'), 'expenses', ['business_id'], unique=False)
    op.create_index(op.f('ix_expenses_expense_date'), 'expenses', ['expense_date'], unique=False)

    # Create Refunds table
    op.create_table(
        'refunds',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sale_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reason', sa.String(length=255), nullable=True),
        sa.Column('amount_kobo', sa.Integer(), nullable=False),
        sa.Column('restock', sa.String(length=10), nullable=False),
        sa.Column('refund_date', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
        sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refunds_business_id'), 'refunds', ['business_id'], unique=False)

    # Create Staff table
    op.create_table(
        'staff',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('business_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('full_name', sa.String(length=120), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('role', sa.Enum('owner', 'manager', 'cashier', 'worker', name='staffrole'), nullable=False),
        sa.Column('salary_kobo', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_business_id'), 'staff', ['business_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_staff_business_id'), table_name='staff')
    op.drop_table('staff')
    op.drop_index(op.f('ix_refunds_business_id'), table_name='refunds')
    op.drop_table('refunds')
    op.drop_index(op.f('ix_expenses_expense_date'), table_name='expenses')
    op.drop_index(op.f('ix_expenses_business_id'), table_name='expenses')
    op.drop_table('expenses')
    op.drop_index(op.f('ix_sale_items_sale_id'), table_name='sale_items')
    op.drop_table('sale_items')
    op.drop_index(op.f('ix_sales_sale_date'), table_name='sales')
    op.drop_index(op.f('ix_sales_business_id'), table_name='sales')
    op.drop_table('sales')
    op.drop_index(op.f('ix_products_business_id'), table_name='products')
    op.drop_table('products')
    op.drop_table('businesses')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    # Drop enums
    op.execute('DROP TYPE sectortype')
    op.execute('DROP TYPE paymentmethod')
    op.execute('DROP TYPE salestatus')
    op.execute('DROP TYPE staffrole')
