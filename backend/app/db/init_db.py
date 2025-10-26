from anyio import to_thread
from loguru import logger
from sqlmodel import SQLModel

from ..core.config import settings  # noqa: F401
from .. import models  # noqa: F401  # ensure models are imported for metadata
from .session import engine


async def init_db() -> None:
    """Create database tables and ensure baseline data exists."""
    logger.info("Initializing database (ensure tables exist)")
    await to_thread.run_sync(SQLModel.metadata.create_all, engine)
