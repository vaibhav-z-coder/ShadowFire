"""
Digital Trust & Fraud Detection Platform - Backend Application.
FastAPI service orchestrating detection engines, risk calculation, database persistence,
and Gemini explanations.
"""

from contextlib import asynccontextmanager

try:
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:
    class FastAPI:
        def __init__(self, *args, **kwargs): pass
        def add_middleware(self, *args, **kwargs): pass
        def include_router(self, *args, **kwargs): pass
        def get(self, *args, **kwargs): return lambda f: f
    class CORSMiddleware: pass

from .config.settings import settings
from .api import fraud_router, url_router, media_router, analysis_router
from .database.session import init_db


@asynccontextmanager
async def lifespan(app: Any = None):
    # Initialize database tables on startup
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Modular AI-powered Digital Trust Platform for fraud, phishing, and media deepfake detection.",
    lifespan=lifespan
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Unified Analysis Endpoints:
# POST /analyze/text       (Scam & Fraud Checker)
# POST /analyze/url        (Link & Website Checker)
# POST /analyze/image      (AI Image Checker)
# POST /analyze/video      (Deepfake Video Checker)
# POST /analyze/audio      (AI Voice & Audio Checker)
# POST /analyze/multi      (Combined / Multi-Check Mode)
# GET  /analyze/history    (Recent Analysis Feed)
app.include_router(analysis_router)
app.include_router(analysis_router, prefix=settings.API_V1_STR)

# Engine-specific endpoints
app.include_router(fraud_router, prefix=settings.API_V1_STR)
app.include_router(url_router, prefix=settings.API_V1_STR)
app.include_router(media_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
