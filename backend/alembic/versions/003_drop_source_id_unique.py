"""Drop unique on source_id, add regular index.

Revision ID: 003
Revises: 002
Create Date: 2026-05-07

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003"
down_revision: str | Sequence[str] | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("uq_source_id", "stock_daily_data", type_="unique")
    op.create_index("idx_daily_source_id", "stock_daily_data", ["source_id"])


def downgrade() -> None:
    op.drop_index("idx_daily_source_id", table_name="stock_daily_data")
    op.create_unique_constraint("uq_source_id", "stock_daily_data", ["source_id"])
