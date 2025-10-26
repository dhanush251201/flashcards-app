from collections.abc import Generator

from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, create_engine

from ..core.config import settings


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    with SessionLocal() as session:
        yield session

