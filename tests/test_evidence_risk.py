import unittest
from backend.engines.fraud.detector import detect_fraud
from backend.engines.url.detector import detect_url
from backend.evidence.engine import evidence_engine
from backend.risk.engine import risk_engine


class TestEvidenceAndRiskSystem(unittest.TestCase):
    def test_multi_engine_fraud_and_phishing_combination(self):
        text_sample = "Congratulations! You are selected for work from home job. Pay ₹2,999 registration fee immediately."
        url_sample = "http://google-security-update-verify.xyz/login"

        fraud_res = detect_fraud(text_sample)
        url_res = detect_url(url_sample)

        # 1. Evidence Engine Collection
        evidence = evidence_engine.collect([fraud_res, url_res])
        self.assertIn("upfront_payment_request", evidence["evidence_items"])
        self.assertIn("urgency_language", evidence["evidence_items"])
        self.assertIn("suspicious_tld", evidence["evidence_items"])
        self.assertEqual(evidence["highest_severity"], "critical")
        self.assertEqual(len(evidence["engines_evaluated"]), 2)

        # Check display signals have the checkmark prefix
        self.assertTrue(any(s.startswith("✓ Upfront payment request") for s in evidence["display_signals"]))
        self.assertTrue(any(s.startswith("✓ Urgency") for s in evidence["display_signals"]))

        # 2. Risk Engine Assessment
        risk = risk_engine.assess_risk([fraud_res, url_res], evidence)
        self.assertEqual(risk["risk_level"], "high")
        self.assertEqual(risk["risk_level_display"], "HIGH")
        self.assertGreaterEqual(risk["risk_score"], 85)
        self.assertGreaterEqual(risk["confidence"], 0.90)

        # 3. Formatted Trust Summary check
        summary = risk["formatted_summary"]
        self.assertIn("Risk: HIGH", summary)
        self.assertIn("Signals:", summary)
        self.assertIn("✓ Upfront payment request", summary)
        self.assertIn("Recommendation:", summary)
        self.assertIn("Do not send money", summary)

    def test_safe_content_aggregation(self):
        text_sample = "Hi Sarah, please find attached the meeting notes for our sprint review."
        url_sample = "https://www.google.com"

        fraud_res = detect_fraud(text_sample)
        url_res = detect_url(url_sample)

        evidence = evidence_engine.collect([fraud_res, url_res])
        risk = risk_engine.assess_risk([fraud_res, url_res], evidence)

        self.assertEqual(risk["risk_level"], "safe")
        self.assertEqual(risk["risk_level_display"], "SAFE")
        self.assertLess(risk["risk_score"], 35)

    def test_single_engine_signal_formatting(self):
        text_sample = "URGENT: Submit your bank password and share OTP immediately."
        fraud_res = detect_fraud(text_sample)

        evidence = evidence_engine.collect([fraud_res])
        risk = risk_engine.assess_risk([fraud_res], evidence)

        self.assertEqual(risk["risk_level"], "high")
        self.assertTrue(any("Password / OTP harvesting" in s for s in risk["signals"]))
        self.assertIn("Do not enter or share passwords, OTPs", risk["recommendation"])


if __name__ == "__main__":
    unittest.main()
