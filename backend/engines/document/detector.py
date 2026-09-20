"""
Document Authenticity & Offer Letter Detection Engine.
Calculates risk scores, authenticity confidence, and granular forensic indicators
for digital documents, offer letters, contracts, and certificates.
"""

from typing import Dict, Any, Optional, List
from pathlib import Path

from .rules import evaluate_document_rules
from .features import extract_document_features


def detect_document(text: str, metadata: Optional[Dict[str, Any]] = None, file_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Main entry point for Document Authenticity Engine.
    Conforms to the platform's standard engine contract.
    """
    if not text and file_path and file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read(50000)
        except Exception:
            text = ""

    features = extract_document_features(text, metadata)
    rules_triggered = evaluate_document_rules(text, metadata)

    # Calculate dynamic risk score based on triggered rules
    severity_weights = {
        "critical": 45,
        "high": 30,
        "medium": 15,
        "low": 5
    }

    raw_score = 0
    categories = set()
    evidence = []
    has_critical = False

    for rule in rules_triggered:
        sev = rule.get("severity", "low")
        if sev == "critical":
            has_critical = True
        raw_score += severity_weights.get(sev, 10)
        categories.add(rule.get("category", "document_fraud"))
        evidence.append(rule.get("evidence_label", rule.get("rule_id")))

    # Synergy modifiers
    if features.get("has_public_email") and features.get("doc_type") == "employment_offer":
        raw_score += 15
        if "free_email_hr_communication" not in evidence:
            evidence.append("free_email_hr_communication")

    # Circuit breakers
    if has_critical:
        raw_score = max(raw_score, 88)
    elif len(rules_triggered) >= 2:
        raw_score = max(raw_score, 68)

    risk_score = min(100, max(0, raw_score))

    # Determine risk level
    if risk_score >= 70:
        risk_level = "high"
        rec = "High probability of document forgery or recruitment fraud. Do not transfer any money, sign waivers, or submit personal identity credentials without independent corporate verification."
    elif risk_score >= 40:
        risk_level = "medium"
        rec = "Document contains suspicious elements or missing corporate credentials. Corroborate with the employer's official website and HR directory before proceeding."
    elif risk_score >= 15:
        risk_level = "low"
        rec = "Minor non-standard phrasing detected, but no overt fraud signals found. Standard corporate verification advised."
    else:
        risk_level = "safe"
        rec = "Document exhibits typical verified enterprise formatting, authentic structure, and no deceptive clauses."

    # Dynamic confidence calculation (never static!)
    # Stronger corroboration gives higher confidence
    signal_count = len(rules_triggered) + (1 if features.get("has_corporate_id") else 0)
    if has_critical or signal_count >= 3:
        confidence = 0.96
    elif signal_count == 2:
        confidence = 0.89
    elif signal_count == 1:
        confidence = 0.82
    elif features.get("word_count", 0) > 100:
        confidence = 0.91
    else:
        confidence = 0.84

    primary_category = list(categories)[0] if categories else features.get("doc_type", "document_verification")

    return {
        "input_type": "document",
        "category": primary_category,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "confidence": confidence,
        "detected_categories": sorted(list(categories)) if categories else [primary_category],
        "evidence": evidence,
        "recommendation": rec,
        "details": {
            "doc_type": features.get("doc_type"),
            "word_count": features.get("word_count"),
            "rules_triggered": rules_triggered,
            "features": features
        }
    }
