"""Create initial tables.

Revision ID: 001
Revises:
Create Date: 2026-05-06

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )

    op.create_table(
        "dbot_token",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "stocks",
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("is_index", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("symbol"),
    )

    op.create_table(
        "stock_daily_data",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("close_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("volume", sa.BigInteger(), nullable=True),
        sa.Column("prev_price", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("signal", sa.String(length=4), nullable=True),
        sa.Column("source_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol", "record_date", name="uq_stock_date"),
        sa.UniqueConstraint("source_id", name="uq_source_id"),
        sa.ForeignKeyConstraint(["symbol"], ["stocks.symbol"]),
    )
    op.create_index("idx_daily_date_signal", "stock_daily_data", ["record_date", "signal"])
    op.create_index("idx_daily_symbol_date", "stock_daily_data", ["symbol", "record_date"])


def downgrade() -> None:
    op.drop_index("idx_daily_symbol_date", table_name="stock_daily_data")
    op.drop_index("idx_daily_date_signal", table_name="stock_daily_data")
    op.drop_table("stock_daily_data")
    op.drop_table("stocks")
    op.drop_table("dbot_token")
    op.drop_table("users")
