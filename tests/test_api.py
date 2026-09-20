import unittest
import io

try:
    from fastapi.testclient import TestClient
    from backend.main import app
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

from backend.api.analysis import _build_trust_report
from backend.engines.fraud.detector import detect_fraud
from backend.engines.url.detector import detect_url


class TestFastAPIPipeline(unittest.TestCase):
    def test_pipeline_build_trust_report(self):
        text = "Congratulations! You have been selected for a work-from-home job. Pay ₹2,999 registration fee immediately."
        fraud_result = detect_fraud(text)
        report = _build_trust_report([fraud_result], raw_context=text)

        self.assertEqual(report["input_type"], "text")
        self.assertEqual(report["risk_level"], "high")
        self.assertEqual(report["risk_level_display"], "HIGH")
        self.assertGreaterEqual(report["risk_score"], 85)
        self.assertIn("upfront_payment_request", report["evidence"])
        self.assertTrue(any("Upfront payment request" in s for s in report["signals"]))
        self.assertIn("explanation", report)
        self.assertIn("recommendation", report)
        self.assertIn("Risk: HIGH", report["summary"])

    def test_pipeline_multi_modal_report(self):
        text = "Urgent! Pay ₹1,500 security deposit."
        url = "http://fake-job-portal.xyz/verify"
        fraud_res = detect_fraud(text)
        url_res = detect_url(url)

        report = _build_trust_report([fraud_res, url_res], raw_context=text)
        self.assertEqual(report["input_type"], "multimodal")
        self.assertEqual(report["risk_level"], "high")
        self.assertGreaterEqual(report["risk_score"], 88)
        self.assertIn("explanation", report)


@unittest.skipUnless(HAS_FASTAPI, "FastAPI not installed in Python environment")
class TestFastAPIServerEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_analyze_text_endpoint(self):
        payload = {"text": "Pay registration fee ₹2,999 immediately to confirm job."}
        response = self.client.post("/analyze/text", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["risk_level"], "high")
        self.assertIn("explanation", data)

    def test_analyze_url_endpoint(self):
        payload = {"url": "http://google-verify.xyz/login"}
        response = self.client.post("/analyze/url", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["risk_level"], "high")
        self.assertIn("explanation", data)


if __name__ == "__main__":
    unittest.main()
