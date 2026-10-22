"""customer token version for session revocation

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-10-22 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'

    if is_pg:
        op.execute("ALTER TABLE customers ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0")
    else:
        try:
            with op.batch_alter_table('customers') as batch_op:
                batch_op.add_column(sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'))
        except Exception:
            pass


def downgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'

    if is_pg:
        op.execute("ALTER TABLE customers DROP COLUMN IF EXISTS token_version")
    else:
        try:
            with op.batch_alter_table('customers') as batch_op:
                batch_op.drop_column('token_version')
        except Exception:
            pass
