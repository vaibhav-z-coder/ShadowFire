"""
Fraud Detection Engine package.
Provides rule-based and feature-based detection of digital fraud signals.
"""

from .detector import detect_fraud
from .rules import evaluate_rules
from .features import extract_features

__all__ = ["detect_fraud", "evaluate_rules", "extract_features"]
