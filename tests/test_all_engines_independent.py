"""
Comprehensive Independent Test Suite for All Detection Engines and Pipelines.
Verifies:
1. Fraud Engine (Text) independently
2. URL Engine (Phishing) independently
3. Image Engine (AI Generation & Manipulation) independently
4. Video Engine (Deepfakes & Frame Consistency) independently
5. Audio Engine (Voice Cloning & Synthetic Speech) independently
6. Multi-Check Combined Pipeline (Simultaneous cross-modal verification)
7. Database persistence and recent history feed
"""

import unittest
from pathlib import Path
import tempfile

from backend.engines.fraud.detector import detect_fraud
from backend.engines.url.detector import detect_url
from backend.engines.media.image.detector import detect_image
from backend.engines.media.video.detector import detect_video
from backend.engines.media.audio.detector import detect_audio
from backend.evidence.engine import evidence_engine
from backend.risk.engine import risk_engine
from backend.explanation.gemini import gemini_explainer
from backend.database.session import record_analysis_history, get_recent_history


class TestAllEnginesIndependent(unittest.TestCase):
    # 1. Fraud Engine Independent Verification
    def test_fraud_engine_independent(self):
        sample = "You won $1,000,000 lottery! Send registration fee ₹1,999 immediately."
        res = detect_fraud(sample)
        self.assertEqual(res["input_type"], "text")
        self.assertEqual(res["risk_level"], "high")
        self.assertGreaterEqual(res["risk_score"], 85)
        self.assertIn("upfront_payment_request", res["evidence"])

    # 2. URL Engine Independent Verification
    def test_url_engine_independent(self):
        sample = "http://secure-paypal-login.xyz/update-account"
        res = detect_url(sample)
        self.assertEqual(res["input_type"], "url")
        self.assertEqual(res["risk_level"], "high")
        self.assertIn("brand_impersonation_paypal", res["evidence"])

    # 3. Image Engine Independent Verification
    def test_image_engine_independent(self):
        with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
            tmp.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00")
            tmp.flush()
            res = detect_image(Path(tmp.name))
            self.assertEqual(res["input_type"], "image")
            self.assertIn("confidence", res)
            self.assertIn("recommendation", res)

    # 4. Video Engine Independent Verification
    def test_video_engine_independent(self):
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
            tmp.write(b"\x00\x00\x00 ftypisom\x00\x00\x02\x00isomiso2avc1mp41")
            tmp.flush()
            res = detect_video(Path(tmp.name))
            self.assertEqual(res["input_type"], "video")
            self.assertIn("confidence", res)
            self.assertIn("frames_analyzed", res["details"])

    # 5. Audio Engine Independent Verification
    def test_audio_engine_independent(self):
        with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
            tmp.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x02\x00D\xac\x00\x00")
            tmp.flush()
            res = detect_audio(Path(tmp.name))
            self.assertEqual(res["input_type"], "audio")
            self.assertIn("confidence", res)

    # 6. Combined / Multi-Check Mode Verification (PDF Section 8)
    def test_multi_check_combined_pipeline(self):
        text_sample = "Urgent: You are hired for a work-from-home job! Pay deposit of ₹2,500."
        url_sample = "http://job-verification-gateway.top/login"

        fraud_res = detect_fraud(text_sample)
        url_res = detect_url(url_sample)

        # Aggregation
        evidence = evidence_engine.collect([fraud_res, url_res])
        self.assertGreaterEqual(evidence["evidence_count"], 2)
        self.assertIn("upfront_payment_request", evidence["evidence_items"])

        # Risk assessment
        risk = risk_engine.assess_risk([fraud_res, url_res], evidence)
        self.assertEqual(risk["risk_level"], "high")
        self.assertEqual(risk["risk_level_display"], "HIGH")
        self.assertGreaterEqual(risk["risk_score"], 88)

        # Gemini Explanation
        explanation = gemini_explainer.explain(risk, evidence, raw_context=text_sample)
        self.assertTrue(len(explanation) > 20)

    # 7. Database Persistence & History Retrieval
    def test_database_persistence_and_history(self):
        sample_report = {
            "report_id": "dtr_unit_test_99",
            "input_type": "text",
            "category": "Job Scam",
            "risk_level": "high",
            "risk_score": 92,
            "confidence": 0.94
        }
        record_analysis_history(sample_report, input_snippet="Work from home deposit")
        history = get_recent_history(limit=5)
        self.assertTrue(any(item["report_id"] == "dtr_unit_test_99" for item in history))


if __name__ == "__main__":
    unittest.main()
