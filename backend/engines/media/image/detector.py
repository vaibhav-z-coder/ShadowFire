"""
Image Detection Engine Entry Point.
Detects AI-generated images, manipulation artifacts, and synthetic visual signals.
"""

from typing import Dict, Any, List
from pathlib import Path
from .preprocessing import preprocess_image
from .model import image_model


def detect_image(image_path: Path) -> Dict[str, Any]:
    """
    Main entry point for Image Engine.
    Conforms to the platform's common result structure.
    """
    features = preprocess_image(image_path)
    prediction = image_model.predict_ai_generated(features, image_path)

    ai_prob = prediction["ai_probability"]
    signals = prediction["signals"]
    evidence = []

    if features.get("is_ai_metadata_found"):
        sig = features.get("ai_generator_signature", "AI generation")
        evidence.append(f"metadata_tagged_by_{sig}")

    if ai_prob >= 0.85:
        risk_level = "high"
        category = "ai_generated_image"
        risk_score = int(ai_prob * 100)
        recommendation = "High probability of AI generation detected. Do not rely on this image for legal, identity, or proof-of-work verification."
    elif ai_prob >= 0.50:
        risk_level = "medium"
        category = "suspected_synthetic_media"
        risk_score = int(ai_prob * 100)
        recommendation = "Image exhibits possible synthetic generation artifacts. Corroborate with original source files."
    else:
        risk_level = "safe"
        category = "authentic_media"
        risk_score = int(ai_prob * 100)
        recommendation = "No overt AI generation indicators found in primary analysis."

    return {
        "input_type": "image",
        "category": category,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "confidence": prediction["confidence"],
        "detected_categories": [category],
        "evidence": evidence,
        "recommendation": recommendation,
        "details": {
            "metadata": features,
            "prediction": prediction
        }
    }
