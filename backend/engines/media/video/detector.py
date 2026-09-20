"""
Video / Deepfake Detection Engine Entry Point.
Analyzes temporal frames for synthetic faces, lip-sync anomalies, and deepfakes.
"""

from typing import Dict, Any
from pathlib import Path
from .preprocessing import preprocess_video
from .frames import extract_sample_frames
from .model import video_model


def detect_video(video_path: Path) -> Dict[str, Any]:
    """
    Main entry point for Video Engine.
    Conforms to the platform's common result structure.
    """
    metadata = preprocess_video(video_path)
    frames = extract_sample_frames(video_path)
    prediction = video_model.predict_deepfake(frames, video_path, metadata)

    df_prob = prediction["deepfake_probability"]
    evidence = []
    if prediction.get("facial_manipulation_detected"):
        evidence.append("facial_inconsistency_detected")
    if prediction.get("temporal_consistency_score", 1.0) < 0.5:
        evidence.append("temporal_flickering_detected")

    for sig in prediction.get("signals", []):
        if "deepfake" in sig.lower() and "deepfake_video" not in evidence:
            evidence.append("deepfake_video")

    if df_prob >= 0.75:
        risk_level = "high"
        category = "deepfake_video"
        rec = "Strong indications of deepfake manipulation or voice cloning found. Verify video authenticity via official channels."
    elif df_prob >= 0.45:
        risk_level = "medium"
        category = "suspected_manipulated_video"
        rec = "Video exhibits temporal or facial inconsistencies. Proceed with skepticism."
    elif df_prob >= 0.20:
        risk_level = "low"
        category = "minor_anomaly_video"
        rec = "Minor compression artifacts found, but no overt synthetic deepfake signals detected."
    else:
        risk_level = "safe"
        category = "authentic_video"
        rec = "No overt deepfake patterns identified in temporal frames."

    return {
        "input_type": "video",
        "category": category,
        "risk_level": risk_level,
        "risk_score": int(round(df_prob * 100)),
        "confidence": prediction["confidence"],
        "detected_categories": [category],
        "evidence": evidence,
        "recommendation": rec,
        "details": {
            "metadata": metadata,
            "prediction": prediction,
            "frames_analyzed": len(frames)
        }
    }
