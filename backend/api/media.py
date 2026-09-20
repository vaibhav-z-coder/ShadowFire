"""
Media Analysis API Router.
Handles image, video, and audio file scanning endpoints.
"""

from pathlib import Path
import tempfile
from typing import Dict, Any

try:
    from fastapi import APIRouter, UploadFile, File, HTTPException
except ImportError:
    class APIRouter:
        def __init__(self, *args, **kwargs): pass
        def post(self, *args, **kwargs): return lambda f: f
        def get(self, *args, **kwargs): return lambda f: f
    class HTTPException(Exception):
        def __init__(self, status_code: int, detail: str):
            self.status_code = status_code
            self.detail = detail
    class UploadFile:
        def __init__(self, filename="file"): self.filename = filename
        async def read(self): return b""
    def File(*args, **kwargs): return None

from ..engines.media.image.detector import detect_image
from ..engines.media.video.detector import detect_video
from ..engines.media.audio.detector import detect_audio
from ..utils.file_handler import save_upload_file, cleanup_file

router = APIRouter(prefix="/media", tags=["Media Analysis"])


@router.post("/image")
async def analyze_image_endpoint(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Inspects uploaded image for AI generation signatures and manipulation artifacts."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = save_upload_file(await file.read(), file.filename or "upload.jpg", Path(tmpdir))
        try:
            return detect_image(tmp_path)
        finally:
            cleanup_file(tmp_path)


@router.post("/video")
async def analyze_video_endpoint(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Inspects uploaded video for deepfake manipulation and temporal face anomalies."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = save_upload_file(await file.read(), file.filename or "upload.mp4", Path(tmpdir))
        try:
            return detect_video(tmp_path)
        finally:
            cleanup_file(tmp_path)


@router.post("/audio")
async def analyze_audio_endpoint(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Inspects uploaded audio for synthetic speech, AI cadence, and cloned voice signatures."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = save_upload_file(await file.read(), file.filename or "upload.wav", Path(tmpdir))
        try:
            return detect_audio(tmp_path)
        finally:
            cleanup_file(tmp_path)
