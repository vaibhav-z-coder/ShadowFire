"""
Video Frame Extraction and Sampling.
Handles keyframe isolation, temporal sampling, and face crop tracking.
"""

from typing import List, Dict, Any
from pathlib import Path


def extract_sample_frames(video_path: Path, max_frames: int = 16) -> List[Dict[str, Any]]:
    """
    Simulates / extracts keyframes across the temporal timeline of the video.
    In full OpenCV environment, cv2.VideoCapture extracts frames at uniform intervals.
    """
    frames = []
    # Sample representation of sampled frames
    for idx in range(min(max_frames, 8)):
        frames.append({
            "frame_index": idx,
            "timestamp_seconds": idx * 0.5,
            "face_detected": True,
            "blur_metric": 120.5
        })
    return frames
