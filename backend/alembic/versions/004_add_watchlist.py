"""Add watchlist table.

Revision ID: 004
Revises: 003
Create Date: 2026-05-11

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004"
down_revision: str | Sequence[str] | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "watchlists",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("symbol", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "symbol", name="uq_user_symbol"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["symbol"], ["stocks.symbol"], ondelete="CASCADE"),
    )
    op.create_index("idx_watchlist_user", "watchlists", ["user_id"])
    op.create_index("idx_watchlist_symbol", "watchlists", ["symbol"])


def downgrade() -> None:
    op.drop_index("idx_watchlist_symbol", table_name="watchlists")
    op.drop_index("idx_watchlist_user", table_name="watchlists")
    op.drop_table("watchlists")
