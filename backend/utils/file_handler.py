"""
File handling utilities for temporary media storage and content validation.
"""

import os
import shutil
from pathlib import Path
from typing import Optional


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_upload_file(file_bytes: bytes, filename: str, target_dir: Path) -> Path:
    ensure_directory(target_dir)
    target_path = target_dir / filename
    with open(target_path, "wb") as f:
        f.write(file_bytes)
    return target_path


def cleanup_file(path: Path) -> None:
    try:
        if path.is_file() or path.is_symlink():
            path.unlink(missing_ok=True)
        elif path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
    except Exception:
        pass
