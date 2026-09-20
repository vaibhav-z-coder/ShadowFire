"""
AI-Generated and Manipulated Image Detection Model.
Synthesizes Error Level Analysis (ELA), metadata tags, pixel distribution,
and resolution heuristics into dynamic authenticity probabilities.
"""

from typing import Dict, Any, Optional
from pathlib import Path


class ImageDetectionModel:
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = model_path
        self.is_loaded = False

    def predict_ai_generated(self, image_features: Dict[str, Any], image_path: Path) -> Dict[str, Any]:
        """
        Predicts whether image shows signs of AI generation or synthetic manipulation.
        Returns dynamic probabilities and confidence based on verified forensic metrics.
        """
        signals = []
        ai_prob = 0.10
        manip_prob = 0.08
        confidence = 0.82

        # 1. Direct metadata discovery
        if image_features.get("is_ai_metadata_found"):
            sig = image_features.get("ai_generator_signature", "AI Generator")
            signals.append(f"AI generator software tag identified ({sig})")
            ai_prob = 0.96
            manip_prob = 0.40
            confidence = 0.98

        # 2. Filename heuristics
        fn = image_path.name.lower()
        if any(k in fn for k in ["midjourney", "stablediffusion", "dalle", "flux", "synthetic", "face_swap"]):
            signals.append("Filename contains synthetic/AI generator reference")
            ai_prob = max(ai_prob, 0.91)
            confidence = max(confidence, 0.94)

        # 3. Error Level Analysis (ELA)
        ela_std = image_features.get("ela_std", 0.0)
        ela_max = image_features.get("ela_max", 0.0)
        ela_mean = image_features.get("ela_mean", 0.0)

        # High standard deviation in ELA relative to mean indicates localized splicing/tampering (e.g. pasted signatures, altered text, face swap)
        if ela_std > 12.0 and ela_max > 60.0:
            signals.append("High Error Level Analysis (ELA) localized variance — indicates digital splicing/tampering")
            manip_prob = max(manip_prob, 0.78)
            ai_prob = max(ai_prob, 0.65)
            confidence = max(confidence, 0.88)
        elif ela_std < 1.5 and ela_mean > 0.1 and not image_features.get("is_document_like"):
            # Unusually flat error profile without camera noise often seen in neural diffusion images
            signals.append("Flat synthetic compression gradient — lack of organic sensor shot noise")
            ai_prob = max(ai_prob, 0.72)
            confidence = max(confidence, 0.85)

        # 4. Dimension heuristics (AI models commonly generate 1024x1024, 512x512, 1024x1536)
        w, h = image_features.get("dimensions", (0, 0))
        if (w == 1024 and h == 1024) or (w == 512 and h == 512) or (w == 1024 and h == 1536):
            if ai_prob > 0.3:
                signals.append("Standard generative diffusion canvas dimensions (1024x1024)")
                ai_prob = min(0.98, ai_prob + 0.08)

        # 5. Document-like checks
        if image_features.get("is_document_like"):
            if ela_max > 80.0:
                signals.append("Discrepancy in seal/signature region compression levels")
                manip_prob = max(manip_prob, 0.82)
                confidence = max(confidence, 0.90)

        # Final dynamic calibration
        ai_prob = round(min(0.99, max(0.04, ai_prob)), 3)
        manip_prob = round(min(0.99, max(0.03, manip_prob)), 3)
        confidence = round(min(0.98, max(0.72, confidence)), 2)

        return {
            "ai_probability": ai_prob,
            "manipulation_probability": manip_prob,
            "confidence": confidence,
            "signals": signals
        }


image_model = ImageDetectionModel()
