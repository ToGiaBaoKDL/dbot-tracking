"""Add is_admin to users.

Revision ID: 002
Revises: 001
Create Date: 2026-05-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: str | Sequence[str] | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Promote the very first registered user to admin
    op.execute(
        "UPDATE users SET is_admin = true WHERE id = (SELECT id FROM users ORDER BY id LIMIT 1)"
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
