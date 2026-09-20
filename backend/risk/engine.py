"""
Risk Engine for Digital Trust Platform.
Computes overall risk assessment by synthesizing evidence, engine severities, and cross-modal indicators.
Transforms raw forensics into structured risk assessments and human-readable trust summaries.
"""

from typing import List, Dict, Any, Optional


class RiskEngine:
    """
    Evaluates multi-source evidence and assigns unified risk score and trust level.
    """

    def assess_risk(self, engine_results: List[Dict[str, Any]], structured_evidence: Dict[str, Any]) -> Dict[str, Any]:
        valid_results = [r for r in engine_results if r]
        if not valid_results:
            return {
                "risk_score": 0,
                "risk_level": "safe",
                "risk_level_display": "SAFE",
                "confidence": 1.0,
                "recommendation": "No content evaluated.",
                "summary": "No digital inputs analyzed.",
                "signals": []
            }

        scores = [r.get("risk_score", 0) for r in valid_results]
        confidences = [r.get("confidence", 0.70) for r in valid_results]

        max_engine_score = max(scores) if scores else 0
        avg_engine_score = sum(scores) / len(scores) if scores else 0
        overall_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.85

        # Base composite score gives 70% weight to peak danger signal, 30% to average
        composite_score = (0.70 * max_engine_score) + (0.30 * avg_engine_score)

        # Cross-engine amplification:
        # If multiple different engines find red flags, risk multiplies
        engines_with_risk = [r for r in valid_results if r.get("risk_score", 0) >= 45]
        if len(engines_with_risk) >= 2:
            composite_score += 15
            overall_confidence = min(0.98, overall_confidence + 0.05)

        # Evidence volume amplification
        ev_items = structured_evidence.get("evidence_items", [])
        if len(ev_items) >= 4:
            composite_score += 12
        elif len(ev_items) >= 2:
            composite_score += 6

        # Circuit breaker: any critical severity enforces High Risk
        highest_sev = structured_evidence.get("highest_severity", "safe")
        if highest_sev == "critical":
            composite_score = max(composite_score, 88)
            overall_confidence = max(overall_confidence, 0.92)
        elif highest_sev == "high":
            composite_score = max(composite_score, 72)

        final_risk_score = min(100, max(0, int(round(composite_score))))

        # Clean zero-evidence safeguard
        if len(ev_items) == 0 and final_risk_score < 35:
            final_risk_score = min(final_risk_score, 10)
            risk_level = "safe"
        elif final_risk_score >= 70:
            risk_level = "high"
        elif final_risk_score >= 40:
            risk_level = "medium"
        elif final_risk_score >= 15:
            risk_level = "low"
        else:
            risk_level = "safe"

        # Categorical recommendation synthesis
        recommendation = self._synthesize_recommendation(risk_level, structured_evidence, valid_results)

        # Format trust summary string
        display_signals = structured_evidence.get("display_signals", [])
        formatted_summary = self.format_trust_summary(risk_level.upper(), display_signals, recommendation)

        categories = structured_evidence.get("detected_categories", [])
        primary_category = categories[0] if categories else "general_digital_content"

        return {
            "risk_score": final_risk_score,
            "risk_level": risk_level,
            "risk_level_display": risk_level.upper(),
            "confidence": overall_confidence,
            "primary_category": primary_category,
            "evidence_count": len(ev_items),
            "evidence": ev_items,
            "signals": display_signals,
            "detailed_signals": structured_evidence.get("detected_signals", []),
            "highest_severity": highest_sev,
            "recommendation": recommendation,
            "formatted_summary": formatted_summary
        }

    def _synthesize_recommendation(self, risk_level: str, evidence: Dict[str, Any], engine_results: List[Dict[str, Any]]) -> str:
        ev_items = set(evidence.get("evidence_items", []))

        # Check specific high-priority threat categories
        if "upfront_payment_request" in ev_items:
            return "Do not send money, deposits, or registration fees. Verify the employer or organization independently through official channels."
        
        if "sensitive_credentials_request" in ev_items:
            return "Do not enter or share passwords, OTPs, or financial details. This is an active credential theft attempt."

        if "suspicious_domain" in ev_items or "brand_impersonation" in ev_items or "ip_host_detected" in ev_items:
            return "Do not enter sensitive data or login credentials on this website. It is an unverified or impersonated domain."

        if "cloned_audio" in ev_items or "synthetic_audio_signal" in ev_items or "deepfake_video" in ev_items:
            return "Media exhibits synthetic generation or deepfake manipulation. Verify caller or speaker authenticity via a separate trusted channel."

        if "localized_splicing_detected" in ev_items or "face_artifact" in ev_items:
            return "Visual forensics detected localized image splicing or digital tampering. Do not accept this file as authentic photographic proof."

        if "fft_grid_artifacts_detected" in ev_items or "c2pa_provenance_detected" in ev_items or "png_diffusion_chunks_detected" in ev_items:
            return "Image exhibits synthetic generative AI artifacts. Do not rely on this media for identity or proof-of-work verification."

        if "document_upfront_fee_demand" in ev_items or "free_email_hr_communication" in ev_items or "fake_offer_letter" in ev_items:
            return "Do not pay any onboarding or verification fees. Legitimate employers never charge candidates for offer letters or background verification. Confirm authenticity directly with corporate HR."

        # Fallback based on risk level
        if risk_level == "high":
            return "Verify the source through official channels before sending money or personal information."
        elif risk_level == "medium":
            return "Exercise caution. Confirm identity and domain validity before interacting or downloading attachments."
        else:
            return "No critical deception signals detected. Standard digital awareness is recommended."

    def format_trust_summary(self, risk_display: str, signals: List[str], recommendation: str) -> str:
        """
        Produces the clean, human-readable summary:
        Risk: HIGH

        Signals:
        ✓ Upfront payment request
        ✓ Urgency
        ✓ Suspicious domain

        Recommendation:
        Verify the source before sending money or personal information.
        """
        lines = [f"Risk: {risk_display}", ""]

        if signals:
            lines.append("Signals:")
            for sig in signals:
                lines.append(sig if sig.startswith("✓") else f"✓ {sig}")
            lines.append("")
        else:
            lines.append("Signals: None detected")
            lines.append("")

        lines.append("Recommendation:")
        lines.append(recommendation)

        return "\n".join(lines)


risk_engine = RiskEngine()
