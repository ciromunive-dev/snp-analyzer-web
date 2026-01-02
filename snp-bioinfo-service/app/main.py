"""FastAPI application para health checks y monitoreo."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifecycle manager para la aplicación."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    description="Microservicio de procesamiento bioinformático para SNP Analyzer",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """Endpoint raíz."""
    return {
        "service": settings.app_name,
        "status": "running",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Health check endpoint para monitoreo.

    Usado por Railway/Docker para verificar que el servicio está activo.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": settings.app_name,
        "version": "1.0.0",
    }


@app.get("/ready")
async def readiness_check() -> dict[str, str | bool]:
    """
    Readiness check - verifica que las dependencias estén listas.
    """
    checks: dict[str, bool] = {
        "redis_configured": bool(settings.upstash_redis_rest_url),
        "supabase_configured": bool(settings.supabase_url),
        "ncbi_configured": bool(settings.ncbi_email),
    }

    all_ready = all(checks.values())

    return {
        "status": "ready" if all_ready else "not_ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **checks,
    }
