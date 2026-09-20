"""
URL / Phishing Detection Engine Entry Point.
Coordinates rules, feature extraction, and ML assessment for links & websites.
"""

from typing import Dict, Any, List
from .rules import evaluate_url_rules
from .features import extract_url_features
from .model import url_model


def detect_url(url: str) -> Dict[str, Any]:
    """
    Main entry point for URL Engine.
    Produces standardized output format compatible with Evidence & Risk Engines.
    """
    features = extract_url_features(url)
    rules_triggered = evaluate_url_rules(url)
    ml_proba = url_model.predict_proba(features, url)

    # Calculate risk score
    score = 0
    evidence_tags = []
    categories = set()

    severity_map = {"critical": 45, "high": 25, "medium": 15, "low": 5}
    for rule in rules_triggered:
        score += severity_map.get(rule.get("severity", "low"), 10)
        evidence_tags.append(rule.get("evidence_label", rule.get("rule_id")))
        categories.add(rule.get("category", "phishing"))

    score += int(ml_proba * 30)
    risk_score = min(100, max(0, score))

    # Circuit breaker
    if any(r.get("severity") == "critical" for r in rules_triggered) and risk_score < 75:
        risk_score = 88

    if risk_score >= 70:
        risk_level = "high"
        rec = "Do not visit or enter credentials on this URL. It exhibits strong characteristics of a phishing attempt."
    elif risk_score >= 40:
        risk_level = "medium"
        rec = "Exercise caution. Confirm domain authenticity with official brand contacts before interacting."
    elif risk_score >= 15:
        risk_level = "low"
        rec = "Low risk detected, but always verify domain certificates and spelling."
    else:
        risk_level = "safe"
        rec = "URL appears standard and legitimate."

    return {
        "input_type": "url",
        "category": "phishing" if "phishing" in categories else "suspicious_url",
        "risk_level": risk_level,
        "risk_score": risk_score,
        "confidence": 0.90 if len(rules_triggered) >= 2 else 0.80,
        "detected_categories": list(categories) if categories else ["web_domain"],
        "evidence": evidence_tags,
        "recommendation": rec,
        "details": {
            "rules_triggered": rules_triggered,
            "features": features,
            "ml_probability": round(ml_proba, 3)
        }
    }
