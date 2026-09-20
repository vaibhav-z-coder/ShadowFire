"""
Audio Preprocessing and Acoustic Feature Extraction.
Extracts container headers, sample rate, bit depth, and spectral metrics.
"""

from typing import Dict, Any
from pathlib import Path
import wave

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def preprocess_audio(audio_path: Path) -> Dict[str, Any]:
    """
    Extracts acoustic container info, sample rate, silence distribution, and neural TTS markers.
    """
    features = {
        "file_size": 0,
        "format": "unknown",
        "sample_rate": 0,
        "channels": 0,
        "duration_seconds": 0.0,
        "is_ai_voice_signature_found": False,
        "ai_voice_signature": None,
        "energy_std": 0.0,
        "zero_crossing_rate": 0.0,
        "silence_ratio": 0.0
    }

    if not audio_path.exists():
        return features

    features["file_size"] = audio_path.stat().st_size
    features["format"] = audio_path.suffix.lower().replace(".", "")

    # Check raw header for AI voice engine tags
    try:
        with open(audio_path, "rb") as f:
            header = f.read(16384)
            lower_header = header.lower()
            tts_signatures = [
                b"elevenlabs", b"eleven labs", b"tortoise", b"rvc",
                b"so-vits", b"xtts", b"bark", b"speechify", b"coqui",
                b"play.ht", b"murf", b"lovo", b"voice clone"
            ]
            for sig in tts_signatures:
                if sig in lower_header:
                    features["is_ai_voice_signature_found"] = True
                    features["ai_voice_signature"] = sig.decode("utf-8", errors="ignore")
                    break
    except Exception:
        pass

    # Inspect WAV files specifically using standard wave module
    if features["format"] == "wav":
        try:
            with wave.open(str(audio_path), "rb") as wf:
                features["channels"] = wf.getnchannels()
                features["sample_rate"] = wf.getframerate()
                n_frames = wf.getnframes()
                if features["sample_rate"] > 0:
                    features["duration_seconds"] = round(n_frames / features["sample_rate"], 2)

                if HAS_NUMPY and n_frames > 0:
                    read_frames = min(n_frames, 48000)
                    raw_data = wf.readframes(read_frames)
                    if wf.getsampwidth() == 2:
                        samples = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)
                        if len(samples) > 1:
                            # Zero crossing rate
                            zcr = np.mean(samples[:-1] * samples[1:] < 0)
                            features["zero_crossing_rate"] = round(float(zcr), 4)

                            # RMS energy & silence ratio
                            energy = np.abs(samples)
                            features["energy_std"] = round(float(np.std(energy)), 2)
                            silence = np.sum(energy < 50) / len(samples)
                            features["silence_ratio"] = round(float(silence), 3)
        except Exception:
            pass

    return features
