"""
Database models for Digital Trust Platform.
Defines schemas for:
- User
- AnalysisHistory
- DetectionResult
- EvidenceRecord
- RiskReport
- FileMetadata
Compatible with PostgreSQL and SQLite.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
import json

try:
    from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean
    from sqlalchemy.orm import declarative_base, relationship
    Base = declarative_base()
except ImportError:
    # Lightweight stub when SQLAlchemy is uninstalled
    class Base:
        pass
    Column = String = Text = Integer = Float = DateTime = ForeignKey = Boolean = relationship = lambda *a, **kw: None


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    history = relationship("AnalysisHistory", back_populates="user", cascade="all, delete-orphan")


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    input_type = Column(String(32), nullable=False)  # text, url, image, video, audio, multimodal
    input_summary = Column(Text, nullable=True)
    risk_level = Column(String(32), nullable=False)  # safe, low, medium, high
    risk_score = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    primary_category = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="history")
    risk_report = relationship("RiskReport", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    detection_results = relationship("DetectionResult", back_populates="analysis", cascade="all, delete-orphan")


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey("analysis_history.id"), nullable=False)
    engine_name = Column(String(32), nullable=False)  # fraud, url, image, video, audio
    category = Column(String(64), nullable=False)
    risk_score = Column(Integer, nullable=False)
    risk_level = Column(String(32), nullable=False)
    raw_details = Column(Text, nullable=True)  # JSON serialized details

    analysis = relationship("AnalysisHistory", back_populates="detection_results")


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(String(64), index=True, nullable=False)
    evidence_key = Column(String(128), nullable=False)
    display_title = Column(String(255), nullable=False)
    severity = Column(String(32), nullable=False)
    engine_source = Column(String(32), nullable=False)
    raw_matches = Column(Text, nullable=True)  # JSON list


class RiskReport(Base):
    __tablename__ = "risk_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    analysis_id = Column(Integer, ForeignKey("analysis_history.id"), nullable=False)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    risk_level = Column(String(32), nullable=False)
    risk_score = Column(Integer, nullable=False)
    confidence = Column(Float, nullable=False)
    category = Column(String(64), nullable=False)
    explanation = Column(Text, nullable=False)
    recommendation = Column(Text, nullable=False)
    formatted_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("AnalysisHistory", back_populates="risk_report")


class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(String(64), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(32), nullable=False)  # image, video, audio
    mime_type = Column(String(64), nullable=True)
    file_size_bytes = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    s3_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
