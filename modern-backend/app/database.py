"""
Database Configuration
=====================
Async SQLAlchemy setup with connection pooling and session management.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
import logging

from .config import settings

logger = logging.getLogger(__name__)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()


async def get_db_session() -> AsyncSession:
    """Get database session dependency."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"❌ Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_database():
    """Initialize database tables."""
    try:
        async with engine.begin() as conn:
            # Import all models to ensure they're registered
            from .models import User, Subscription, AlertPreferences, AuditLog

            # Create all tables
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Database tables created/verified")

    except Exception as e:
        logger.error(f"❌ Database initialization error: {e}")
        raise


async def check_database_connection():
    """Check database connection health."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            result.scalar()
            return True
    except Exception as e:
        logger.error(f"❌ Database connection check failed: {e}")
        return False
