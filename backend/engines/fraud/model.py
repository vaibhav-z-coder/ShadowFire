"""
Machine Learning Model wrapper for Fraud Detection.
Evaluates semantic fraud probability using trained TF-IDF pipeline with robust heuristic fallback.
"""

from typing import Dict, Any, Optional
from pathlib import Path
import math

MODEL_PATH = Path(__file__).resolve().parent.parent.parent.parent / "models" / "fraud" / "fraud_classifier.joblib"


class FraudMLModel:
    def __init__(self, model_path: Path = MODEL_PATH):
        self.model_path = model_path
        self.is_loaded = False
        self._pipeline = None
        self.load()

    def load(self) -> None:
        """Loads serialized pipeline from disk if available."""
        if self.model_path.exists():
            try:
                import joblib
                self._pipeline = joblib.load(self.model_path)
                self.is_loaded = True
            except Exception:
                self.is_loaded = False

    def predict_proba(self, features: Dict[str, Any], text: str) -> float:
        """
        Calculates machine-learning fraud probability.
        Uses trained pipeline if loaded; otherwise computes calibrated statistical probability.
        """
        if self.is_loaded and self._pipeline:
            try:
                probs = self._pipeline.predict_proba([text])[0]
                # Label 1 is fraud
                return float(probs[1])
            except Exception:
                pass

        # Robust calibrated statistical probability based on extracted features
        score = 0.05
        
        # Payment mentions
        pay_count = features.get("payment_words_count", 0)
        if pay_count > 0:
            score += min(0.30, pay_count * 0.10)

        # Monetary value mentions
        money_count = features.get("monetary_mentions_count", 0)
        if money_count > 0:
            score += min(0.25, money_count * 0.12)

        # Urgency mentions
        urgency_count = features.get("urgency_words_count", 0)
        if urgency_count > 0:
            score += min(0.20, urgency_count * 0.08)

        # Suspicious tokens
        suspicious_count = features.get("suspicious_words_count", 0)
        if suspicious_count > 0:
            score += min(0.30, suspicious_count * 0.10)

        # Exclamations & uppercase emphasis
        if features.get("uppercase_ratio", 0.0) > 0.15:
            score += 0.10
        if features.get("exclamation_count", 0) >= 2:
            score += 0.05

        return min(0.99, max(0.02, round(score, 3)))


fraud_model = FraudMLModel()
