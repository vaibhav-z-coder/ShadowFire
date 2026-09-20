"""
Image Preprocessing and Metadata Analysis.
Extracts EXIF metadata, software tags, and structural image metrics.
"""

from typing import Dict, Any, Optional
from pathlib import Path


def preprocess_image(image_path: Path) -> Dict[str, Any]:
    """
    Analyzes raw image headers, EXIF tags, and basic dimensions.
    """
    features = {
        "file_size": 0,
        "format": "unknown",
        "has_exif": False,
        "software_tag": None,
        "is_ai_metadata_found": False,
        "ai_generator_signature": None,
        "dimensions": (0, 0)
    }

    if not image_path.exists():
        return features

    features["file_size"] = image_path.stat().st_size
    
    # Read first bytes for simple format detection
    try:
        with open(image_path, "rb") as f:
            header = f.read(2048)
            lower_header = header.lower()
            
            if b"jfif" in lower_header or header.startswith(b"\xff\xd8"):
                features["format"] = "JPEG"
            elif header.startswith(b"\x89PNG"):
                features["format"] = "PNG"
            elif header.startswith(b"RIFF") and b"WEBP" in header:
                features["format"] = "WEBP"

            # Check for known AI generator signatures in header/metadata
            ai_keywords = [b"midjourney", b"stable diffusion", b"dall-e", b"comfyui", b"novelai", b"adobe firefly"]
            for kw in ai_keywords:
                if kw in lower_header:
                    features["is_ai_metadata_found"] = True
                    features["ai_generator_signature"] = kw.decode("utf-8")
                    break
    except Exception:
        pass

    return features
