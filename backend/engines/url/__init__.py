"""
URL & Phishing Detection Engine package.
"""

from .detector import detect_url
from .rules import evaluate_url_rules
from .features import extract_url_features
from .model import url_model

__all__ = ["detect_url", "evaluate_url_rules", "extract_url_features", "url_model"]
