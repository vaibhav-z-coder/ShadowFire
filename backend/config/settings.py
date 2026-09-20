"""
Configuration and settings management for Digital Trust Platform.
Works with or without pydantic_settings installed.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Automatically load .env from BASE_DIR if present
env_path = BASE_DIR / ".env"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v
    except Exception:
        pass


class Settings:
    PROJECT_NAME: str = "Digital Trust & Fraud Detection Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Gemini Explanation API Key (checks GEMINI_API_KEY or VITE_GEMINI_API_KEY)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Models directory
    MODELS_DIR: Path = BASE_DIR / "models"
    DATASETS_DIR: Path = BASE_DIR / "datasets"


settings = Settings()

