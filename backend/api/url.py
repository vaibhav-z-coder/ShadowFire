"""
URL / Phishing Detection API Router.
Handles URL and website security analysis.
"""

from typing import Dict, Any

try:
    from fastapi import APIRouter, HTTPException
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
    class BaseModel:
        def __init__(self, **data):
            for k, v in data.items(): setattr(self, k, v)
    def Field(default=None, **kwargs): return default

from ..engines.url.detector import detect_url

router = APIRouter(prefix="/url", tags=["URL & Phishing"])


class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=1, description="URL or domain string to inspect")


@router.post("/analyze")
async def analyze_url_endpoint(request: URLScanRequest) -> Dict[str, Any]:
    """
    Analyzes URL for phishing heuristics, brand impersonation, suspicious TLDs, and entropy.
    """
    try:
        return detect_url(request.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
