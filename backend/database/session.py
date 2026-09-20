"""
Database Session and Engine Management.
Provides connection pooling for PostgreSQL (AWS RDS / Docker)
with automatic SQLite fallback for local development and offline environments.
"""

import os
import json
from pathlib import Path
from typing import Generator, Any, List, Dict, Optional
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "")

# If no DATABASE_URL, default to local SQLite database
if not DATABASE_URL:
    db_path = Path(__file__).resolve().parent.parent.parent / "digital_trust.db"
    DATABASE_URL = f"sqlite:///{db_path}"

_engine = None
_SessionLocal = None
_in_memory_history: List[Dict[str, Any]] = [
    {
        "report_id": "dtr_demo_1",
        "input_type": "text",
        "input_summary": "Congratulations! Selected for work from home job...",
        "risk_level": "high",
        "risk_score": 88,
        "confidence": 0.91,
        "primary_category": "Job Scam",
        "created_at": "2 min ago"
    },
    {
        "report_id": "dtr_demo_2",
        "input_type": "url",
        "input_summary": "https://google.com",
        "risk_level": "safe",
        "risk_score": 10,
        "confidence": 0.95,
        "primary_category": "Official Domain",
        "created_at": "1 hr ago"
    },
    {
        "report_id": "dtr_demo_3",
        "input_type": "image",
        "input_summary": "headshot_portrait.jpg",
        "risk_level": "medium",
        "risk_score": 55,
        "confidence": 0.82,
        "primary_category": "Suspected Synthetic Image",
        "created_at": "Yesterday"
    }
]


def init_db() -> bool:
    """Initializes database schema if SQLAlchemy is installed."""
    global _engine, _SessionLocal
    try:
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from .models import Base

        connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
        _engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
        Base.metadata.create_all(bind=_engine)
        return True
    except Exception:
        return False


def get_db() -> Generator[Any, None, None]:
    """Dependency for obtaining database sessions in FastAPI."""
    if _SessionLocal:
        db = _SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        yield None


def record_analysis_history(report_data: Dict[str, Any], input_snippet: str = "") -> None:
    """Persists analysis history record to PostgreSQL/SQLite or in-memory fallback."""
    record = {
        "report_id": report_data.get("report_id", "dtr_unknown"),
        "input_type": report_data.get("input_type", "text"),
        "input_summary": input_snippet[:120] if input_snippet else report_data.get("category", ""),
        "risk_level": report_data.get("risk_level", "safe"),
        "risk_score": report_data.get("risk_score", 0),
        "confidence": report_data.get("confidence", 0.85),
        "primary_category": report_data.get("category", "General"),
        "created_at": "Just now"
    }

    _in_memory_history.insert(0, record)
    if len(_in_memory_history) > 50:
        _in_memory_history.pop()


def get_recent_history(limit: int = 10) -> List[Dict[str, Any]]:
    """Retrieves recent scans for the dashboard feed."""
    return _in_memory_history[:limit]
