"""
Evidence Engine for Digital Trust Platform.
Aggregates, normalizes, and correlates evidence signals emitted by specialized detection engines:
Fraud Engine (Text), URL Engine, Image Engine, Video Engine, and Audio Engine.
"""

from typing import List, Dict, Any, Optional

SIGNAL_DISPLAY_MAP = {
    "upfront_payment_request": "Upfront payment request",
    "payment_request": "Payment request",
    "urgency_language": "Urgency",
    "urgency_coercion_threat": "Urgent account suspension threat",
    "suspicious_domain": "Suspicious domain",
    "suspicious_tld": "High-risk domain extension",
    "brand_impersonation": "Brand impersonation",
    "ip_host_detected": "Direct IP address host",
    "credential_harvesting_path": "Credential harvesting form",
    "unencrypted_sensitive_url": "Insecure unencrypted connection",
    "sensitive_credentials_request": "Password / OTP harvesting",
    "unsolicited_job_offer": "Unsolicited job selection",
    "unrealistic_financial_claim": "Unrealistic income guarantee",
    "task_based_scam_pattern": "Prepaid task scam",
    "off_platform_redirect": "Off-platform redirect (Telegram/WhatsApp)",
    "fake_lottery_prize": "Fake lottery or sweepstakes prize",
    "courier_package_hold": "Fake parcel delivery fee",
    "face_artifact": "Face manipulation artifact",
    "facial_inconsistency_detected": "Facial boundary inconsistency",
    "temporal_flickering_detected": "Temporal deepfake flickering",
    "deepfake_video": "Deepfake video manipulation",
    "synthetic_audio_signal": "Synthetic audio signal",
    "synthetic_speech_cadence_detected": "Synthetic voice cadence",
    "cloned_audio": "Cloned AI voice signature",
    "ai_metadata_signature": "AI generator software signature",
    "ai_generated_image": "AI-generated image indicators",
    "excessive_subdomain_structure": "Obfuscated subdomain hierarchy",
    "hyphenated_domain_structure": "Hyphenated spoof domain",
    "document_upfront_fee_demand": "Upfront fee or security deposit demand in document",
    "free_email_hr_communication": "Official corporate document using public email (@gmail/@yahoo)",
    "chat_app_interview_routing": "Hiring or appointment routed through chat app",
    "unrealistic_compensation_rate": "Disproportionate income promise for unskilled work",
    "coercive_document_ultimatum": "Coercive signing deadline or legal threat",
    "generic_stamp_or_watermark": "Generic forged seal or template watermark",
    "unverified_corporate_entity": "Missing corporate registration (CIN/Tax ID) or address",
    "graphic_editor_metadata": "Document generated in consumer graphic editor (Canva/Photoshop)",
    "fake_offer_letter": "Forged employment offer letter",
    "fake_document": "Manipulated digital document"
}


class EvidenceEngine:
    """
    Combines individual engine detection outputs into a unified, structured evidence package.
    """

    def collect(self, engine_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        evidence_keys: List[str] = []
        formatted_signals: List[Dict[str, Any]] = []
        categories: set = set()
        highest_severity = "safe"
        severity_rank = {"safe": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}

        valid_results = [r for r in engine_results if r]
        total_risk_score = sum(r.get("risk_score", 0) for r in valid_results)

        for res in valid_results:
            engine_type = res.get("input_type", "unknown")

            # Collect categories
            for cat in res.get("detected_categories", []):
                categories.add(cat)

            # Collect evidence keys
            for ev in res.get("evidence", []):
                if ev not in evidence_keys:
                    evidence_keys.append(ev)

            # Detailed signals from rules or engine details
            details = res.get("details", {})
            rules_triggered = details.get("rules_triggered", [])

            if rules_triggered:
                for rule in rules_triggered:
                    rule_id = rule.get("rule_id")
                    ev_label = rule.get("evidence_label", rule_id)
                    title = SIGNAL_DISPLAY_MAP.get(ev_label, SIGNAL_DISPLAY_MAP.get(rule_id, rule.get("name", rule_id)))
                    sev = rule.get("severity", "low")

                    formatted_signals.append({
                        "id": ev_label,
                        "title": title,
                        "display": f"✓ {title}",
                        "severity": sev,
                        "engine": engine_type,
                        "description": rule.get("description", ""),
                        "matches": rule.get("matches", [])
                    })

                    if severity_rank.get(sev, 0) > severity_rank.get(highest_severity, 0):
                        highest_severity = sev
            else:
                # If engine produced direct evidence tags without rule list (e.g. Media/URL detectors)
                for ev in res.get("evidence", []):
                    title = SIGNAL_DISPLAY_MAP.get(ev, ev.replace("_", " ").capitalize())
                    sev = "high" if res.get("risk_level") == "high" else "medium"

                    formatted_signals.append({
                        "id": ev,
                        "title": title,
                        "display": f"✓ {title}",
                        "severity": sev,
                        "engine": engine_type,
                        "description": "",
                        "matches": []
                    })
                    if severity_rank.get(sev, 0) > severity_rank.get(highest_severity, 0):
                        highest_severity = sev

        # Deduplicate signals by title
        unique_signals = []
        seen_titles = set()
        for s in formatted_signals:
            if s["title"] not in seen_titles:
                seen_titles.add(s["title"])
                unique_signals.append(s)

        avg_score = int(total_risk_score / len(valid_results)) if valid_results else 0

        return {
            "evidence_count": len(evidence_keys),
            "evidence_items": evidence_keys,
            "detected_signals": unique_signals,
            "display_signals": [s["display"] for s in unique_signals],
            "detected_categories": sorted(list(categories)),
            "highest_severity": highest_severity,
            "average_engine_score": avg_score,
            "engines_evaluated": [r.get("input_type") for r in valid_results]
        }


evidence_engine = EvidenceEngine()
