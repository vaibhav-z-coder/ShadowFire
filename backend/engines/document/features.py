"""
Feature extraction for Document Authenticity and Offer Letter Analysis.
"""

import re
from typing import Dict, Any, List


def extract_document_features(text: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Extracts structural, lexical, and entity features from document text.
    """
    if not text:
        text = ""

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    word_count = len(text.split())

    # Detect presence of official components
    has_date = bool(re.search(r"\b(?:\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4})\b", text, re.IGNORECASE))
    has_compensation = bool(re.search(r"(?:ctc|salary|stipend|compensation|inr|usd|\$|\u20b9|lpa)\s*[:=]?\s*[\d,]+", text, re.IGNORECASE))
    has_signatures = bool(re.search(r"(?:signature|authorized\s*signatory|hr\s*manager|director|talent\s*acquisition|warm\s*regards)", text, re.IGNORECASE))
    has_corporate_id = bool(re.search(r"\b(?:cin|gstin|gst|ein|llpin|reg\s*no|registration\s*number)\s*[:#]?\s*[a-z0-9-]+", text, re.IGNORECASE))
    has_terms_clause = bool(re.search(r"(?:terms\s*and\s*conditions|confidentiality|probation|notice\s*period|code\s*of\s*conduct)", text, re.IGNORECASE))

    # Contact indicators
    emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", text)
    has_public_email = any(re.search(r"@(gmail|yahoo|hotmail|outlook|proton)\.com", em, re.IGNORECASE) for em in emails)

    # Document type estimation
    doc_type = "general_document"
    text_lower = text.lower()
    if any(k in text_lower for k in ["offer of employment", "appointment letter", "employment agreement", "internship offer", "joining letter"]):
        doc_type = "employment_offer"
    elif any(k in text_lower for k in ["salary slip", "payslip", "pay stub", "earnings statement"]):
        doc_type = "salary_slip"
    elif any(k in text_lower for k in ["invoice", "tax invoice", "bill of supply", "receipt"]):
        doc_type = "financial_invoice"
    elif any(k in text_lower for k in ["certificate of completion", "experience certificate", "degree certificate"]):
        doc_type = "credentials_certificate"
    elif any(k in text_lower for k in ["identity card", "aadhar", "pan card", "driving license", "passport"]):
        doc_type = "identity_document"

    return {
        "doc_type": doc_type,
        "word_count": word_count,
        "line_count": len(lines),
        "has_date": has_date,
        "has_compensation": has_compensation,
        "has_signatures": has_signatures,
        "has_corporate_id": has_corporate_id,
        "has_terms_clause": has_terms_clause,
        "emails_found": emails,
        "has_public_email": has_public_email,
        "metadata": metadata or {}
    }
