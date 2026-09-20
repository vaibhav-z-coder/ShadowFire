"""
Image Preprocessing and Forensic Analysis.
Extracts camera EXIF telemetry, PNG generation chunks, C2PA manifests,
2D FFT spectral grid anomalies, Laplacian noise residuals, and Error Level Analysis (ELA).
"""

import io
from typing import Dict, Any, Optional
from pathlib import Path

try:
    from PIL import Image, ImageChops
    import numpy as np
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def preprocess_image(image_path: Path) -> Dict[str, Any]:
    """
    Analyzes raw image headers, EXIF tags, dimensions, 2D FFT, Laplacian noise,
    and Error Level Analysis (ELA).
    """
    features = {
        "file_size": 0,
        "format": "unknown",
        "has_exif": False,
        "has_camera_hardware_exif": False,
        "camera_make": None,
        "camera_model": None,
        "camera_software": None,
        "is_ai_metadata_found": False,
        "ai_generator_signature": None,
        "c2pa_manifest_found": False,
        "png_metadata_found": False,
        "dimensions": (0, 0),
        "aspect_ratio": 1.0,
        "is_canonical_ai_dimension": False,
        "fft_peak_to_mean": 1.0,
        "laplacian_var": 0.0,
        "laplacian_std": 0.0,
        "flat_region_noise_std": 0.0,
        "noise_flatness_ratio": 1.0,
        "ela_mean": 0.0,
        "ela_std": 0.0,
        "ela_max": 0.0,
        "ela_discrepancy_ratio": 1.0,
        "channel_variance": 0.0,
        "is_document_like": False
    }

    if not image_path.exists():
        return features

    file_bytes_len = image_path.stat().st_size
    features["file_size"] = file_bytes_len

    # 1. Byte-level search for AI signatures and C2PA manifests
    try:
        with open(image_path, "rb") as f:
            # Read first 64KB and last 64KB where metadata headers/trailers live
            prefix = f.read(65536)
            f.seek(max(0, file_bytes_len - 65536))
            suffix = f.read(65536)
            combined_bytes = (prefix + suffix).lower()

            ai_keywords = [
                b"midjourney", b"stable diffusion", b"dall-e", b"dalle",
                b"comfyui", b"novelai", b"adobe firefly", b"civitai",
                b"bing image creator", b"flux.1", b"deepfacelab",
                b"invokeai", b"fooocus", b"automatic1111", b"leonardo.ai"
            ]
            for kw in ai_keywords:
                if kw in combined_bytes:
                    features["is_ai_metadata_found"] = True
                    features["ai_generator_signature"] = kw.decode("utf-8", errors="ignore")
                    break

            c2pa_keywords = [b"c2pa", b"urn:c2pa", b"adobe:cai", b"claim_generator", b"jumbf"]
            for c2pa_kw in c2pa_keywords:
                if c2pa_kw in combined_bytes:
                    features["c2pa_manifest_found"] = True
                    break
    except Exception:
        pass

    if not HAS_PIL:
        return features

    try:
        with Image.open(image_path) as im:
            features["format"] = im.format or "UNKNOWN"
            w, h = im.size
            features["dimensions"] = (w, h)
            if h > 0:
                features["aspect_ratio"] = round(w / h, 2)

            # 2. Canonical AI generative dimension footprints
            canonical_ai_sizes = {
                (512, 512), (768, 768), (1024, 1024), (2048, 2048),
                (1152, 896), (896, 1152), (1216, 832), (832, 1216),
                (1344, 768), (768, 1344), (1536, 1024), (1024, 1536)
            }
            if (w, h) in canonical_ai_sizes:
                features["is_canonical_ai_dimension"] = True
            elif (w % 64 == 0 and h % 64 == 0) and (w == h or abs(w / h - 1.0) < 0.05):
                features["is_canonical_ai_dimension"] = True

            # 3. PNG metadata chunks (tEXt / iTXt) inspection (e.g. ComfyUI, Automatic1111)
            if hasattr(im, "info") and isinstance(im.info, dict):
                info_keys = [str(k).lower() for k in im.info.keys()]
                ai_info_keys = {"parameters", "prompt", "workflow", "generation_data", "sd-metadata", "civitai"}
                if any(k in info_keys for k in ai_info_keys):
                    features["png_metadata_found"] = True
                    features["is_ai_metadata_found"] = True
                    features["ai_generator_signature"] = "PNG Diffusion Metadata Chunk"

                for val in im.info.values():
                    val_str = str(val).lower()
                    if any(kw in val_str for kw in ["steps:", "sampler:", "cfg scale:", "model hash:", "negative prompt:", "lora:"]):
                        features["png_metadata_found"] = True
                        features["is_ai_metadata_found"] = True
                        features["ai_generator_signature"] = "Diffusion Prompt & Sampler Metadata"
                        break

            # 4. EXIF Camera Telemetry Check
            exif = im.getexif()
            if exif:
                features["has_exif"] = True
                # Standard tags: 271=Make, 272=Model, 305=Software
                make = str(exif.get(271, "")).strip()
                model = str(exif.get(272, "")).strip()
                software = str(exif.get(305, "")).strip()

                if make or model:
                    features["camera_make"] = make
                    features["camera_model"] = model
                    features["has_camera_hardware_exif"] = True

                # Exposure settings: 33434=ExposureTime, 33437=FNumber, 34855=ISO, 37386=FocalLength
                if 33434 in exif or 33437 in exif or 34855 in exif or 37386 in exif:
                    features["has_camera_hardware_exif"] = True

                if software:
                    features["camera_software"] = software
                    sw_lower = software.lower()
                    if any(k in sw_lower for k in ["midjourney", "diffusion", "dall-e", "civitai", "photoshop generative", "canva"]):
                        features["is_ai_metadata_found"] = True
                        features["ai_generator_signature"] = software

            rgb_im = im.convert("RGB")
            gray_arr = np.array(rgb_im.convert("L"), dtype=np.float32)

            # 5. 2D FFT Spectral Grid Peak Analysis
            # Latent diffusion upsamplers leave periodic grid spikes in frequency space
            if h >= 64 and w >= 64:
                crop_h = min(256, h)
                crop_w = min(256, w)
                cy, cx = h // 2, w // 2
                patch = gray_arr[cy - crop_h // 2: cy + crop_h // 2, cx - crop_w // 2: cx + crop_w // 2]
                f = np.fft.fftshift(np.fft.fft2(patch - np.mean(patch)))
                mag = np.abs(f)
                mag[crop_h // 2, crop_w // 2] = 0.0  # Zero DC component
                mean_mag = float(np.mean(mag))
                if mean_mag > 1e-4:
                    features["fft_peak_to_mean"] = round(float(np.max(mag) / mean_mag), 2)

            # 6. Laplacian Noise Residual & Texture Smoothness
            # Real camera sensors have Poisson-Gaussian shot noise across all surfaces.
            # Diffusion models over-smooth flat areas, creating unnaturally low noise residuals.
            if h > 16 and w > 16:
                lap = (gray_arr[:-2, 1:-1] + gray_arr[2:, 1:-1] + gray_arr[1:-1, :-2] + gray_arr[1:-1, 2:] - 4 * gray_arr[1:-1, 1:-1])
                features["laplacian_var"] = round(float(np.var(lap)), 2)
                features["laplacian_std"] = round(float(np.std(lap)), 2)

                # Divide into 32x32 tiles and find flat regions (lowest 15% variance)
                tile_size = 32
                tile_stds = []
                for ty in range(0, h - tile_size, tile_size):
                    for tx in range(0, w - tile_size, tile_size):
                        sub_lap = lap[ty:ty + tile_size, tx:tx + tile_size]
                        if sub_lap.size > 0:
                            tile_stds.append(float(np.std(sub_lap)))

                if tile_stds:
                    tile_stds.sort()
                    # Average of bottom 15% tiles represents flat background / skin noise floor
                    bottom_k = max(1, int(len(tile_stds) * 0.15))
                    flat_noise = sum(tile_stds[:bottom_k]) / bottom_k
                    features["flat_region_noise_std"] = round(flat_noise, 3)
                    overall_noise = sum(tile_stds) / len(tile_stds)
                    if overall_noise > 0.01:
                        features["noise_flatness_ratio"] = round(flat_noise / overall_noise, 3)

            # 7. Error Level Analysis (ELA)
            buf = io.BytesIO()
            rgb_im.save(buf, "JPEG", quality=90)
            buf.seek(0)
            resaved = Image.open(buf)
            diff = ImageChops.difference(rgb_im, resaved)
            diff_arr = np.array(diff, dtype=np.float32)

            features["ela_mean"] = round(float(np.mean(diff_arr)), 3)
            features["ela_std"] = round(float(np.std(diff_arr)), 3)
            features["ela_max"] = round(float(np.max(diff_arr)), 3)
            if features["ela_mean"] > 0.05:
                features["ela_discrepancy_ratio"] = round(features["ela_max"] / features["ela_mean"], 2)

            # 8. Document-like checks
            bright_pixels = np.sum(gray_arr > 225) / max(1, (w * h))
            features["is_document_like"] = bool(bright_pixels > 0.45 and (w / h < 0.9 or w / h > 1.1))

            # 9. Channel variance
            features["channel_variance"] = round(float(np.var([diff_arr[:, :, 0], diff_arr[:, :, 1], diff_arr[:, :, 2]])), 3)

    except Exception:
        pass

    return features

