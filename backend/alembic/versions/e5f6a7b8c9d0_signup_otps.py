"""signup otps table for mandatory registration verification

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-22 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'

    if is_pg:
        op.execute("""
            CREATE TABLE IF NOT EXISTS signup_otps (
                id UUID PRIMARY KEY,
                identifier VARCHAR(255) NOT NULL,
                channel VARCHAR(10) NOT NULL,
                code_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                used BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS ix_signup_otps_identifier ON signup_otps (identifier);
        """)
    else:
        op.create_table(
            'signup_otps',
            sa.Column('id', sa.UUID(), primary_key=True),
            sa.Column('identifier', sa.String(255), nullable=False),
            sa.Column('channel', sa.String(10), nullable=False),
            sa.Column('code_hash', sa.String(64), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('used', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_signup_otps_identifier', 'signup_otps', ['identifier'])


def downgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'

    if is_pg:
        op.execute("DROP TABLE IF EXISTS signup_otps;")
    else:
        op.drop_table('signup_otps')
