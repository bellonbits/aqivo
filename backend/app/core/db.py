from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

connect_args = {}
if settings.database_url.startswith("postgresql"):
    connect_args = {
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 3,
        "options": "-c idle_in_transaction_session_timeout=15000 -c statement_timeout=30000",
    }

if settings.db_pool_size <= 0:
    engine = create_engine(
        settings.database_url,
        poolclass=NullPool,
        pool_pre_ping=settings.db_pool_pre_ping,
        connect_args=connect_args,
    )
else:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=settings.db_pool_pre_ping,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
        connect_args=connect_args,
    )
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
