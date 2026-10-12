"""user phone verification

Revision ID: a1b2c3d4e5f6
Revises: 622699ef2665
Create Date: 2026-10-12 14:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '622699ef2665'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'postgresql':
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false NOT NULL")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_hash VARCHAR(64)")
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_otp_expires_at TIMESTAMPTZ")
    else:
        inspector = sa.inspect(conn)
        columns = [c['name'] for c in inspector.get_columns('users')]
        if 'phone_verified' not in columns:
            op.add_column('users', sa.Column('phone_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
        if 'phone_otp_hash' not in columns:
            op.add_column('users', sa.Column('phone_otp_hash', sa.String(length=64), nullable=True))
        if 'phone_otp_expires_at' not in columns:
            op.add_column('users', sa.Column('phone_otp_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'phone_otp_expires_at' in columns:
        op.drop_column('users', 'phone_otp_expires_at')
    if 'phone_otp_hash' in columns:
        op.drop_column('users', 'phone_otp_hash')
    if 'phone_verified' in columns:
        op.drop_column('users', 'phone_verified')

