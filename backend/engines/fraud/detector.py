"""
Fraud Detection Engine - Main Coordinator.
Combines rule analysis, feature extraction, and ML probability into a standardized output.
Enforces strict Circuit Breaker overrides for critical fraud indicators.
"""

from typing import Dict, Any, List
from .rules import evaluate_rules
from .features import extract_features
from .model import fraud_model


def calculate_risk(rules: List[Dict[str, Any]], features: Dict[str, Any], ml_probability: float) -> Dict[str, Any]:
    """
    Computes numerical risk score, risk level, confidence, and primary category.
    Applies strict Circuit Breakers for high-danger fraud patterns.
    """
    severity_weights = {
        "critical": 45,
        "high": 30,
        "medium": 15,
        "low": 5
    }

    raw_rule_score = 0
    categories = set()
    evidence_tags = []

    has_critical = False
    has_high = False

    for rule in rules:
        sev = rule.get("severity", "low")
        if sev == "critical":
            has_critical = True
        elif sev == "high":
            has_high = True

        raw_rule_score += severity_weights.get(sev, 10)
        categories.add(rule.get("category", "fraud"))
        evidence_tags.append(rule.get("evidence_label", rule.get("rule_id")))

    # Blend Rule Score (60% weight) and ML probability (40% weight)
    ml_scaled = int(ml_probability * 100)
    composite_score = int((0.60 * raw_rule_score) + (0.40 * ml_scaled))

    # Feature synergies: monetary demand + urgency multiplier
    if features.get("monetary_mentions_count", 0) > 0 and features.get("urgency_words_count", 0) > 0:
        composite_score += 12

    # CIRCUIT BREAKER ENFORCEMENT:
    # 1. Critical signals (upfront payment demand, OTP/password harvest) immediately enforce High Risk
    if has_critical:
        composite_score = max(composite_score, 88)
    elif has_high and len(rules) >= 2:
        composite_score = max(composite_score, 75)

    risk_score = min(100, max(0, composite_score))

    # Calibrated risk level mapping
    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 45:
        risk_level = "medium"
    elif risk_score >= 25:
        risk_level = "low"
    else:
        risk_level = "safe"

    # Clean zero-rule baseline safeguard
    if len(rules) == 0 and risk_score < 35:
        risk_level = "safe"

    # Confidence calculation: increases with corroborating signals
    signal_count = len(rules) + (1 if features.get("monetary_mentions_count", 0) > 0 else 0)
    if has_critical or signal_count >= 3:
        confidence = 0.95
    elif signal_count >= 2:
        confidence = 0.88
    elif signal_count == 1:
        confidence = 0.78
    else:
        confidence = 0.85

    # Determine primary category
    priority_order = ["job_scam", "financial_fraud", "phishing", "lottery_scam", "courier_scam", "social_engineering"]
    primary_category = "general_communication"
    for cat in priority_order:
        if cat in categories:
            primary_category = cat
            break
    if primary_category == "general_communication" and categories:
        primary_category = list(categories)[0]

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "primary_category": primary_category,
        "detected_categories": sorted(list(categories)) if categories else ["general_communication"],
        "evidence": evidence_tags,
        "has_critical_override": has_critical
    }


def generate_recommendation(risk_level: str, rules: List[Dict[str, Any]]) -> str:
    """
    Generates actionable, prescriptive safety instructions grounded in triggered rules.
    """
    rule_ids = {r.get("rule_id") for r in rules}

    if "upfront_payment_request" in rule_ids:
        return "Do not send money, security deposits, or registration fees. Legitimate organizations and employers never charge candidates for employment or equipment."
    
    if "sensitive_credentials_request" in rule_ids:
        return "Do not share passwords, OTPs, PINs, or PAN details. Authentic institutions will never demand authentication codes via unverified messages."

    if "threat_account_suspension" in rule_ids:
        return "Do not panic or click provided links. Contact your bank or service provider directly through their official, verified website or telephone helpline."

    if "lottery_prize_claim" in rule_ids:
        return "You cannot win a lottery you did not enter. Never pay advance fees or taxes to release purported winnings."

    if "task_and_video_scam" in rule_ids:
        return "Beware of prepaid task scams paying for video likes or reviews. They invariably demand prepaid recharge amounts before withholding your funds."

    if risk_level == "high":
        return "High danger of fraud detected. Cease communication immediately and do not transfer funds or sensitive credentials."
    elif risk_level == "medium":
        return "Suspicious patterns detected. Exercise caution and verify the sender's identity through official corporate or institution channels."
    else:
        return "No immediate fraud patterns detected. Always exercise standard digital awareness."


def detect_fraud(text: str) -> Dict[str, Any]:
    """
    Main entry point for Fraud Detection Engine.
    Coordinates rules, features, and ML probability into the common engine schema.
    """
    clean_text = text.strip() if text else ""
    features = extract_features(clean_text)
    rules_triggered = evaluate_rules(clean_text)
    ml_probability = fraud_model.predict_proba(features, clean_text)
    
    risk_assessment = calculate_risk(rules_triggered, features, ml_probability)
    recommendation = generate_recommendation(risk_assessment["risk_level"], rules_triggered)

    return {
        "input_type": "text",
        "category": risk_assessment["primary_category"],
        "risk_level": risk_assessment["risk_level"],
        "risk_score": risk_assessment["risk_score"],
        "confidence": risk_assessment["confidence"],
        "detected_categories": risk_assessment["detected_categories"],
        "evidence": risk_assessment["evidence"],
        "recommendation": recommendation,
        "details": {
            "rules_triggered": rules_triggered,
            "features": features,
            "ml_probability": round(ml_probability, 3),
            "circuit_breaker_active": risk_assessment["has_critical_override"]
        }
    }
