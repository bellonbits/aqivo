"""user email nullable and phone signup

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-10-22 21:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'

    if is_pg:
        op.execute("ALTER TABLE users ALTER COLUMN email DROP NOT NULL")
        op.execute("CREATE INDEX IF NOT EXISTS ix_users_phone ON users (phone)")
    else:
        try:
            with op.batch_alter_table('users') as batch_op:
                batch_op.alter_column('email', existing_type=sa.String(255), nullable=True)
                batch_op.create_index('ix_users_phone', ['phone'], unique=False)
        except Exception:
            pass


def downgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'

    if is_pg:
        op.execute("DROP INDEX IF EXISTS ix_users_phone")
        op.execute("ALTER TABLE users ALTER COLUMN email SET NOT NULL")
    else:
        try:
            with op.batch_alter_table('users') as batch_op:
                batch_op.drop_index('ix_users_phone')
                batch_op.alter_column('email', existing_type=sa.String(255), nullable=False)
        except Exception:
            pass
