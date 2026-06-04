import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from config import get_settings
from db.database import init_db
from routers import auth, resume, analyze
from utils.logger import app_logger

settings = get_settings()

# ── Create logs and uploads directories ────────────────────────────────────
os.makedirs("logs", exist_ok=True)
os.makedirs(settings.upload_dir, exist_ok=True)


# ── Lifespan (startup / shutdown) ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    app_logger.info("=" * 50)
    app_logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    app_logger.info("=" * 50)

    # Initialize database tables
    try:
        init_db()
    except Exception as e:
        app_logger.error(f"DB initialization failed: {e}")

    # Warm up embedding model (lazy loads on first request otherwise)
    try:
        app_logger.info("Warming up embedding model...")
        from services.embedder import get_embedding_model
        get_embedding_model()
    except Exception as e:
        app_logger.warning(f"Embedding model warmup failed: {e}")

    app_logger.info("Application ready ✓")
    yield

    app_logger.info("Shutting down application...")


# ── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
## AI Resume Analyzer API

A full-stack AI-powered resume analysis system that:
- 📄 Parses PDF/DOCX resumes
- 🧠 Extracts structured data (Claude AI)
- 📊 Scores section-by-section (Skills, Experience, Education)
- 🏆 Ranks multiple candidates
- 💡 Generates actionable feedback
- 🔐 JWT authentication
- ⚡ Redis caching
- 🔍 ChromaDB RAG (bonus)
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handlers ───────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    app_logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    app_logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please try again."},
    )


# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(analyze.router)


# ── Health & Root ────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Check health of all backend services."""
    health = {
        "api": "healthy",
        "database": "unknown",
        "redis": "unknown",
        "embedding_model": "unknown",
    }

    # Check DB
    try:
        from db.database import SessionLocal
        db = SessionLocal()
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db.close()
        health["database"] = "healthy"
    except Exception as e:
        health["database"] = f"unhealthy: {str(e)}"

    # Check Redis
    try:
        from utils.cache import get_redis_client
        client = get_redis_client()
        if client:
            client.ping()
            health["redis"] = "healthy"
        else:
            health["redis"] = "unavailable (caching disabled)"
    except Exception as e:
        health["redis"] = f"unhealthy: {str(e)}"

    # Check embedding model
    try:
        from services.embedder import _model
        health["embedding_model"] = "loaded" if _model else "not loaded (lazy)"
    except Exception:
        health["embedding_model"] = "unknown"

    return health
