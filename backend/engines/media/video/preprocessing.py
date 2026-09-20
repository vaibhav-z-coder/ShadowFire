"""
Video Preprocessing and Container Analysis.
Inspects MP4/MOV/WEBM box headers, encoder tags, and stream metadata.
"""

from typing import Dict, Any
from pathlib import Path


def preprocess_video(video_path: Path) -> Dict[str, Any]:
    """
    Extracts video file headers, container info, encoder signatures, and stream markers.
    """
    features = {
        "file_size": 0,
        "format": "unknown",
        "has_streams": False,
        "is_valid_container": False,
        "encoder_tag": None,
        "is_deepfake_tool_found": False,
        "deepfake_tool_signature": None
    }

    if not video_path.exists():
        return features

    features["file_size"] = video_path.stat().st_size
    features["format"] = video_path.suffix.lower().replace(".", "")

    try:
        with open(video_path, "rb") as f:
            header = f.read(32768)
            lower_header = header.lower()

            if b"ftyp" in header or b"moov" in header or b"webm" in lower_header or b"matroska" in lower_header:
                features["is_valid_container"] = True
                features["has_streams"] = True

            # Detect known deepfake tool signatures in metadata atoms
            tool_signatures = [
                b"deepfacelab", b"faceswap", b"roop", b"sadtalker",
                b"wav2lip", b"liveportrait", b"first-order-motion",
                b"ebsynth", b"resemble", b"d-id", b"heygen", b"synthesia"
            ]
            for sig in tool_signatures:
                if sig in lower_header:
                    features["is_deepfake_tool_found"] = True
                    features["deepfake_tool_signature"] = sig.decode("utf-8", errors="ignore")
                    break

            # Check general encoder
            for enc in [b"lavf", b"handbrake", b"x264", b"x265", b"quicktime", b"adobe"]:
                if enc in lower_header:
                    features["encoder_tag"] = enc.decode("utf-8", errors="ignore")
                    break
    except Exception:
        pass

    return features
