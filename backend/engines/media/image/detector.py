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
    manip_prob = prediction.get("manipulation_probability", 0.0)
    signals = prediction["signals"]
    evidence = []

    if features.get("is_ai_metadata_found"):
        sig = features.get("ai_generator_signature", "AI generation")
        evidence.append(f"metadata_tagged_by_{sig}")

    if features.get("c2pa_manifest_found"):
        evidence.append("c2pa_provenance_detected")

    if features.get("png_metadata_found"):
        evidence.append("png_diffusion_chunks_detected")

    if features.get("fft_peak_to_mean", 1.0) > 35.0 and not features.get("is_document_like"):
        evidence.append("fft_grid_artifacts_detected")

    if features.get("flat_region_noise_std", 0.0) < 0.60 and not features.get("has_camera_hardware_exif") and not features.get("is_document_like"):
        evidence.append("diffusion_oversmoothing_detected")

    if features.get("ela_discrepancy_ratio", 1.0) > 10.0 and features.get("ela_max", 0.0) > 60.0:
        evidence.append("localized_splicing_detected")

    if features.get("has_camera_hardware_exif"):
        evidence.append("camera_hardware_verified")

    # Determine risk category
    if manip_prob >= 0.75:
        risk_level = "high"
        category = "manipulated_image"
        risk_score = int(manip_prob * 100)
        recommendation = "High probability of digital tampering or splicing detected. Verify original cryptographic hash."
    elif ai_prob >= 0.85:
        risk_level = "high"
        category = "ai_generated_image"
        risk_score = int(ai_prob * 100)
        recommendation = "High probability of AI generation detected. Do not rely on this image for legal, identity, or proof-of-work verification."
    elif ai_prob >= 0.50 or manip_prob >= 0.50:
        risk_level = "medium"
        category = "suspected_synthetic_media"
        risk_score = int(max(ai_prob, manip_prob) * 100)
        recommendation = "Image exhibits synthetic or modified visual artifacts. Corroborate with original source files."
    else:
        risk_level = "safe"
        category = "authentic_media"
        risk_score = int(max(ai_prob, manip_prob) * 100)
        recommendation = "Verified authentic media. Optical sensor noise and natural frequency spectrum confirmed."

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
