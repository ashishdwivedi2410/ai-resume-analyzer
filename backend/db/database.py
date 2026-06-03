from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings
from utils.logger import app_logger

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=settings.debug,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        app_logger.error(f"DB session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Create all tables."""
    from models import user, resume  # noqa: F401 - import to register models
    try:
        Base.metadata.create_all(bind=engine)
        app_logger.info("Database tables created successfully")
    except Exception as e:
        app_logger.error(f"DB init failed: {e}")
        raise