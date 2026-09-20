"""
Image Preprocessing and Forensic Metadata Analysis.
Extracts EXIF metadata, software tags, Error Level Analysis (ELA),
color distributions, and structural metrics.
"""

import io
from typing import Dict, Any
from pathlib import Path

try:
    from PIL import Image, ImageChops
    import numpy as np
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def preprocess_image(image_path: Path) -> Dict[str, Any]:
    """
    Analyzes raw image headers, EXIF tags, dimensions, ELA, and color distributions.
    """
    features = {
        "file_size": 0,
        "format": "unknown",
        "has_exif": False,
        "software_tag": None,
        "is_ai_metadata_found": False,
        "ai_generator_signature": None,
        "dimensions": (0, 0),
        "aspect_ratio": 1.0,
        "ela_mean": 0.0,
        "ela_std": 0.0,
        "ela_max": 0.0,
        "channel_variance": 0.0,
        "is_document_like": False
    }

    if not image_path.exists():
        return features

    features["file_size"] = image_path.stat().st_size

    # Quick raw header scan for AI generator keywords
    try:
        with open(image_path, "rb") as f:
            header = f.read(8192)
            lower_header = header.lower()
            ai_keywords = [
                b"midjourney", b"stable diffusion", b"dall-e", b"dalle",
                b"comfyui", b"novelai", b"adobe firefly", b"civitai",
                b"bing image creator", b"flux.1", b"deepfacelab"
            ]
            for kw in ai_keywords:
                if kw in lower_header:
                    features["is_ai_metadata_found"] = True
                    features["ai_generator_signature"] = kw.decode("utf-8", errors="ignore")
                    break
    except Exception:
        pass

    if not HAS_PIL:
        return features

    try:
        with Image.open(image_path) as im:
            features["format"] = im.format or "UNKNOWN"
            features["dimensions"] = im.size
            w, h = im.size
            if h > 0:
                features["aspect_ratio"] = round(w / h, 2)

            # Check EXIF
            exif = im.getexif()
            if exif:
                features["has_exif"] = True
                # Tag 305 = Software, 271 = Make, 272 = Model
                software = str(exif.get(305, ""))
                if software:
                    features["software_tag"] = software
                    sw_lower = software.lower()
                    if any(k in sw_lower for k in ["midjourney", "diffusion", "dall-e", "photoshop", "canva"]):
                        features["is_ai_metadata_found"] = True
                        features["ai_generator_signature"] = software

            # Compute Error Level Analysis (ELA)
            rgb_im = im.convert("RGB")
            buf = io.BytesIO()
            rgb_im.save(buf, "JPEG", quality=90)
            buf.seek(0)
            resaved = Image.open(buf)
            diff = ImageChops.difference(rgb_im, resaved)
            arr = np.array(diff, dtype=np.float32)

            features["ela_mean"] = round(float(np.mean(arr)), 3)
            features["ela_std"] = round(float(np.std(arr)), 3)
            features["ela_max"] = round(float(np.max(arr)), 3)

            # Check if document-like (high white/black background ratio)
            grayscale = np.array(rgb_im.convert("L"))
            bright_pixels = np.sum(grayscale > 230) / (w * h)
            features["is_document_like"] = bool(bright_pixels > 0.45 and (w / h < 0.9 or w / h > 1.1))

            # Color channel variance
            features["channel_variance"] = round(float(np.var([arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]])), 3)

    except Exception:
        pass

    return features
