"""
Gemini Explanation Layer.
Acts as an explanation and translation layer that converts structured technical evidence
and risk assessment metrics into a clear, natural-language Trust Report for human users.

Important architectural principle:
- Detection -> Specialized Engines
- Risk Assessment -> Risk Engine
- Explanation -> Gemini Layer
Gemini never invents evidence; it is strictly grounded in what the detection engines found.
"""

import json
from typing import Dict, Any, Optional, List
import urllib.request
import urllib.error
from ..config.settings import settings
from ..utils.logger import logger


class GeminiExplanationLayer:
    """
    Translates engine findings and risk assessment into an understandable explanation.
    Never invents evidence; strictly grounds explanation in detected signals.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL

    def explain(self, risk_data: Dict[str, Any], evidence_data: Dict[str, Any], raw_context: Optional[str] = None) -> str:
        """
        Generates explanation using Gemini API if key is available;
        otherwise provides an expert rule-grounded explanation.
        """
        evidence_payload = {
            "category": risk_data.get("primary_category"),
            "risk_level": risk_data.get("risk_level"),
            "risk_score": risk_data.get("risk_score"),
            "signals": evidence_data.get("evidence_items", [])
        }

        if self.api_key:
            try:
                return self._call_gemini_api(evidence_payload, raw_context)
            except Exception as e:
                logger.warning(f"Gemini API call failed, using grounded fallback explainer: {e}")

        return self._generate_grounded_fallback(evidence_payload)

    def _call_gemini_api(self, evidence_payload: Dict[str, Any], raw_context: Optional[str]) -> str:
        import ssl
        try:
            import certifi
            ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            ctx = ssl._create_unverified_context()

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        
        system_instruction = (
            "You are the explanation layer of a Digital Trust & Fraud Detection platform. "
            "Our specialized forensic engines have already detected the evidence and calculated the risk level. "
            "Your ONLY responsibility is to explain WHY this content is concerning or safe in plain, human-understandable terms "
            "based strictly on the detected signals provided. "
            "Do NOT invent new evidence. Keep the explanation to 2-3 clear, impactful sentences."
        )

        user_content = (
            f"{system_instruction}\n\n"
            f"Structured Evidence Received from Detection Engines:\n"
            f"{json.dumps(evidence_payload, indent=2)}\n"
        )
        if raw_context:
            user_content += f"\nAnalyzed Content Snippet: {raw_context[:300]}\n"

        body = json.dumps({
            "contents": [{"parts": [{"text": user_content}]}]
        }).encode("utf-8")

        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10, context=ctx) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            candidate_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            return candidate_text.strip()

    def _generate_grounded_fallback(self, evidence_payload: Dict[str, Any]) -> str:
        level = evidence_payload.get("risk_level", "safe")
        category = evidence_payload.get("category", "digital content")
        signals = evidence_payload.get("signals", [])

        # Formulate grounded explanation directly from detected signals
        if level == "high":
            signal_descriptions = []
            if "upfront_payment_request" in signals:
                signal_descriptions.append("it demands an upfront payment or deposit, which is a hallmark of recruitment and advance-fee scams")
            if "sensitive_credentials_request" in signals:
                signal_descriptions.append("it asks for sensitive credentials such as OTPs or passwords")
            if "urgency_language" in signals or "urgency_coercion_threat" in signals:
                signal_descriptions.append("it manufactures artificial urgency to rush your judgment")
            if "suspicious_domain" in signals or "suspicious_tld" in signals or "brand_impersonation" in signals:
                signal_descriptions.append("it directs users to an unverified or potentially impersonated domain")
            if "deepfake_video" in signals or "face_artifact" in signals:
                signal_descriptions.append("it contains visual artifacts consistent with synthetic face generation or video manipulation")
            if "cloned_audio" in signals or "synthetic_audio_signal" in signals:
                signal_descriptions.append("the audio exhibits acoustic patterns indicative of AI voice cloning")

            if signal_descriptions:
                reasons = ", and ".join(signal_descriptions)
                return (
                    f"This content exhibits strong indicators of {category.replace('_', ' ')} because {reasons}. "
                    f"Do not transfer funds, share credentials, or interact with provided links."
                )
            else:
                return (
                    f"This content was classified as high risk for {category.replace('_', ' ')} based on multiple forensic indicators. "
                    f"Independently verify all claims before taking any action."
                )

        elif level == "medium":
            signals_text = ", ".join([s.replace("_", " ") for s in signals]) if signals else "suspicious patterns"
            return (
                f"This content contains suspicious indicators ({signals_text}) that warrant caution. "
                f"Confirm the legitimacy of the sender through established official channels before proceeding."
            )
        else:
            return (
                "Our detection engines found no overt signals of deception or fraud. "
                "The content aligns with standard communication patterns, though normal digital safety awareness is always encouraged."
            )


gemini_explainer = GeminiExplanationLayer()
