"""
Audio Detection Engine Entry Point.
Detects AI-generated voices, deepfake audio, and synthetic speech cloning.
"""

from typing import Dict, Any
from pathlib import Path
from .preprocessing import preprocess_audio
from .model import audio_model


def detect_audio(audio_path: Path) -> Dict[str, Any]:
    """
    Main entry point for Audio Engine.
    Conforms to the platform's common result structure.
    """
    metadata = preprocess_audio(audio_path)
    prediction = audio_model.predict_voice_clone(metadata, audio_path)

    synth_prob = prediction["synthetic_audio_probability"]
    evidence = []
    if synth_prob >= 0.70:
        evidence.append("synthetic_speech_cadence_detected")

    if synth_prob >= 0.75:
        risk_level = "high"
        category = "cloned_audio"
        rec = "Audio exhibits high likelihood of AI voice synthesis. Do not approve financial transactions or share info based on voice alone."
    elif synth_prob >= 0.45:
        risk_level = "medium"
        category = "suspected_synthetic_audio"
        rec = "Acoustic patterns exhibit slight synthetic characteristics. Verify caller identity via alternative trusted channel."
    else:
        risk_level = "safe"
        category = "authentic_audio"
        rec = "No synthetic voice markers detected."

    return {
        "input_type": "audio",
        "category": category,
        "risk_level": risk_level,
        "risk_score": int(synth_prob * 100),
        "confidence": prediction["confidence"],
        "detected_categories": [category],
        "evidence": evidence,
        "recommendation": rec,
        "details": {
            "metadata": metadata,
            "prediction": prediction
        }
    }
