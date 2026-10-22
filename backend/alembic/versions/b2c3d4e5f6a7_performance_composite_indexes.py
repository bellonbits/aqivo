"""performance composite indexes

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-22 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES = [
    ("ix_products_biz_status_deleted", "products", ["business_id", "status", "deleted_at"]),
    ("ix_services_biz_active_deleted_pos", "services", ["business_id", "is_active", "deleted_at", "position"]),
    ("ix_reviews_biz_published_deleted", "reviews", ["business_id", "is_published", "deleted_at"]),
    ("ix_business_members_user_active", "business_members", ["user_id", "is_active"]),
    ("ix_website_pages_site_home", "website_pages", ["website_id", "is_home"]),
    ("ix_website_pages_site_pos", "website_pages", ["website_id", "position"]),
    ("ix_website_sections_page_pos", "website_sections", ["page_id", "position"]),
    ("ix_website_sections_site_page", "website_sections", ["website_id", "page_id"]),
    ("ix_gallery_images_biz_pos", "gallery_images", ["business_id", "position"]),
]


def upgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'
    
    for idx_name, table_name, cols in INDEXES:
        col_list = ", ".join(cols)
        if is_pg:
            op.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ({col_list})")
        else:
            try:
                op.create_index(idx_name, table_name, cols, unique=False)
            except Exception:
                pass


def downgrade() -> None:
    conn = op.get_bind()
    is_pg = conn.dialect.name == 'postgresql'
    
    for idx_name, table_name, _ in reversed(INDEXES):
        if is_pg:
            op.execute(f"DROP INDEX IF EXISTS {idx_name}")
        else:
            try:
                op.drop_index(idx_name, table_name=table_name)
            except Exception:
                pass
