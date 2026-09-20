"""
Fraud Detection API Router.
Handles text, job offer, and message fraud analysis.
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

from ..engines.fraud.detector import detect_fraud

router = APIRouter(prefix="/fraud", tags=["Fraud Detection"])


class FraudScanRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text message, job offer, or email content to analyze")


@router.post("/analyze")
async def analyze_fraud_text(request: FraudScanRequest) -> Dict[str, Any]:
    """
    Analyzes input text for job scams, advance fee fraud, urgency coercion, and credentials harvesting.
    """
    try:
        result = detect_fraud(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
