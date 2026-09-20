"""
Video & Deepfake Detection Engine package.
"""

from .detector import detect_video
from .preprocessing import preprocess_video
from .frames import extract_sample_frames
from .model import video_model

__all__ = ["detect_video", "preprocess_video", "extract_sample_frames", "video_model"]
