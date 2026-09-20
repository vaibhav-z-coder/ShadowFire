"""
Unified Digital Trust Analysis API Router.
Exposes the core analysis endpoints:
- POST /analyze/text       (1. Scam & Fraud Checker)
- POST /analyze/url        (2. Link & Website Checker)
- POST /analyze/image      (3. AI Image & Manipulation Checker)
- POST /analyze/video      (4. Deepfake & Video Checker)
- POST /analyze/audio      (5. AI Voice & Audio Checker)
- POST /analyze/multi      (6. Combined / Multi-Check Mode)
- GET /analyze/history     (Dashboard Recent Analysis Feed)

Pipeline Architecture:
Specialized Engines -> Evidence Engine -> Risk Engine -> Gemini -> Trust Report
"""

from typing import Dict, Any, Optional, List
from pathlib import Path
import tempfile
import uuid

try:
    from fastapi import APIRouter, UploadFile, File, Form, HTTPException
    from pydantic import BaseModel, Field
except ImportError:
    class APIRouter:
        def __init__(self, *args, **kwargs): pass
        def post(self, *args, **kwargs): return lambda f: f
        def get(self, *args, **kwargs): return lambda f: f
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            self.status_code = status_code
            self.detail = detail
    class UploadFile:
        def __init__(self, filename="file"): self.filename = filename
        async def read(self): return b""
    def File(default=None, *args, **kwargs): return default
    def Form(default=None, *args, **kwargs): return default
    class BaseModel:
        def __init__(self, **data):
            for k, v in data.items(): setattr(self, k, v)
    def Field(default=None, **kwargs): return default

from ..engines.fraud.detector import detect_fraud
from ..engines.url.detector import detect_url
from ..engines.media.image.detector import detect_image
from ..engines.media.video.detector import detect_video
from ..engines.media.audio.detector import detect_audio
from ..evidence.engine import evidence_engine
from ..risk.engine import risk_engine
from ..explanation.gemini import gemini_explainer
from ..utils.file_handler import save_upload_file, cleanup_file
from ..database.session import record_analysis_history, get_recent_history

router = APIRouter(prefix="/analyze", tags=["Digital Trust Analysis"])


# Request Schemas
class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text message, job posting, or communication to inspect")


class URLAnalysisRequest(BaseModel):
    url: str = Field(..., min_length=1, description="URL or domain name to inspect")


class MultiModalScanRequest(BaseModel):
    text: Optional[str] = Field(None, description="Text message or job description")
    url: Optional[str] = Field(None, description="URL or link")


def _build_trust_report(engine_results: List[Dict[str, Any]], raw_context: Optional[str] = None) -> Dict[str, Any]:
    """
    Coordinates the common pipeline:
    Evidence Engine -> Risk Engine -> Gemini Explanation Layer -> Trust Report
    """
    evidence_data = evidence_engine.collect(engine_results)
    risk_data = risk_engine.assess_risk(engine_results, evidence_data)

    explanation_text = gemini_explainer.explain(
        risk_data,
        evidence_data,
        raw_context=raw_context
    )

    report_id = f"dtr_{uuid.uuid4().hex[:10]}"

    report = {
        "report_id": report_id,
        "input_type": engine_results[0].get("input_type") if len(engine_results) == 1 else "multimodal",
        "category": risk_data["primary_category"],
        "risk_level": risk_data["risk_level"],
        "risk_level_display": risk_data["risk_level_display"],
        "risk_score": risk_data["risk_score"],
        "confidence": risk_data["confidence"],
        "signals": risk_data["signals"],
        "evidence": evidence_data["evidence_items"],
        "detailed_signals": risk_data.get("detailed_signals", []),
        "explanation": explanation_text,
        "recommendation": risk_data["recommendation"],
        "summary": risk_data["formatted_summary"],
        "engine_results": engine_results
    }

    # Persist to database history
    record_analysis_history(report, input_snippet=raw_context or "")
    return report


@router.post("/text")
async def analyze_text(request: TextAnalysisRequest) -> Dict[str, Any]:
    """1. Scam & Fraud Checker - Messages / Emails / Job Offers"""
    try:
        fraud_result = detect_fraud(request.text)
        return _build_trust_report([fraud_result], raw_context=request.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/url")
async def analyze_url(request: URLAnalysisRequest) -> Dict[str, Any]:
    """2. Link & Website Checker - Phishing / Suspicious URLs / Fake Websites"""
    try:
        url_result = detect_url(request.url)
        return _build_trust_report([url_result], raw_context=request.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image")
async def analyze_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    """3. AI Image & Manipulation Checker - AI-Generated / Manipulated Images"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = save_upload_file(await file.read(), file.filename or "upload.jpg", Path(tmpdir))
        try:
            image_result = detect_image(tmp_path)
            return _build_trust_report([image_result], raw_context=file.filename)
        finally:
            cleanup_file(tmp_path)


@router.post("/video")
async def analyze_video(file: UploadFile = File(...)) -> Dict[str, Any]:
    """4. Deepfake & Video Checker - AI-Generated / Manipulated Videos"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = save_upload_file(await file.read(), file.filename or "upload.mp4", Path(tmpdir))
        try:
            video_result = detect_video(tmp_path)
            return _build_trust_report([video_result], raw_context=file.filename)
        finally:
            cleanup_file(tmp_path)


@router.post("/audio")
async def analyze_audio(file: UploadFile = File(...)) -> Dict[str, Any]:
    """5. AI Voice & Audio Checker - AI-Generated / Cloned / Synthetic Voice"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = save_upload_file(await file.read(), file.filename or "upload.wav", Path(tmpdir))
        try:
            audio_result = detect_audio(tmp_path)
            return _build_trust_report([audio_result], raw_context=file.filename)
        finally:
            cleanup_file(tmp_path)


@router.post("/multi")
async def analyze_multi_combined(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
) -> Dict[str, Any]:
    """
    6. Combined / Multi-Check Mode (Section 8 of PDF Specification)
    Simultaneously verifies Message + Embedded Link + Image/Media attachment.
    """
    if not text and not url and not file:
        raise HTTPException(status_code=400, detail="At least one input (text, url, or file) must be provided.")

    engine_results = []
    context_parts = []

    if text and text.strip():
        engine_results.append(detect_fraud(text))
        context_parts.append(text)

    if url and url.strip():
        engine_results.append(detect_url(url))
        context_parts.append(url)

    if file:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = save_upload_file(await file.read(), file.filename or "attachment.jpg", Path(tmpdir))
            try:
                fn = (file.filename or "").lower()
                if fn.endswith((".mp4", ".mov", ".webm")):
                    engine_results.append(detect_video(tmp_path))
                elif fn.endswith((".mp3", ".wav", ".m4a", ".ogg")):
                    engine_results.append(detect_audio(tmp_path))
                else:
                    engine_results.append(detect_image(tmp_path))
                context_parts.append(file.filename)
            finally:
                cleanup_file(tmp_path)

    raw_context = " | ".join([p for p in context_parts if p])
    return _build_trust_report(engine_results, raw_context=raw_context)


@router.get("/history")
async def fetch_history() -> List[Dict[str, Any]]:
    """Dashboard Recent Analysis Feed (Section 11 & 12 of PDF)."""
    return get_recent_history(limit=10)
