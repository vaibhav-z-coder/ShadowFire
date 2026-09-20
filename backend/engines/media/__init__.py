"""
Media Analysis Engines package (Image, Video, Audio).
"""

from .image.detector import detect_image
from .video.detector import detect_video
from .audio.detector import detect_audio

__all__ = ["detect_image", "detect_video", "detect_audio"]
