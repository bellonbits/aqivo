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
    op.add_column('users', sa.Column('phone_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('users', sa.Column('phone_otp_hash', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('phone_otp_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'phone_otp_expires_at')
    op.drop_column('users', 'phone_otp_hash')
    op.drop_column('users', 'phone_verified')
