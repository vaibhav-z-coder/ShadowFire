import unittest
from backend.engines.fraud.detector import detect_fraud


class TestFraudDetectorComprehensive(unittest.TestCase):
    def test_job_scam_upfront_fee_circuit_breaker(self):
        sample = "Congratulations! You have been selected for a work-from-home job. Pay ₹2,999 registration fee immediately to confirm your job."
        result = detect_fraud(sample)
        self.assertEqual(result["input_type"], "text")
        self.assertEqual(result["category"], "job_scam")
        self.assertEqual(result["risk_level"], "high")
        self.assertGreaterEqual(result["risk_score"], 85)
        self.assertIn("upfront_payment_request", result["evidence"])
        self.assertTrue(result["details"]["circuit_breaker_active"])
        self.assertIn("registration fee", result["recommendation"].lower())

    def test_phishing_otp_harvesting(self):
        sample = "URGENT: Your bank account is blocked due to KYC. Submit your PAN card and share OTP immediately."
        result = detect_fraud(sample)
        self.assertEqual(result["risk_level"], "high")
        self.assertGreaterEqual(result["risk_score"], 85)
        self.assertIn("sensitive_credentials_request", result["evidence"])
        self.assertTrue(result["details"]["circuit_breaker_active"])

    def test_lottery_advance_fee(self):
        sample = "You have won $500,000 in the Annual Lucky Draw! Pay $200 processing fee to release your prize."
        result = detect_fraud(sample)
        self.assertEqual(result["risk_level"], "high")
        self.assertIn("fake_lottery_prize", result["evidence"])

    def test_task_scam_youtube_likes(self):
        sample = "Earn ₹5,000 daily by liking YouTube videos. Contact our HR on Telegram @EarnFast now."
        result = detect_fraud(sample)
        self.assertEqual(result["risk_level"], "high")
        self.assertIn("task_based_scam_pattern", result["evidence"])

    def test_legitimate_work_invitation(self):
        sample = "Thank you for applying for the Software Engineer role. We would like to invite you for an interview on Google Meet."
        result = detect_fraud(sample)
        self.assertEqual(result["risk_level"], "safe")
        self.assertLess(result["risk_score"], 40)
        self.assertEqual(result["evidence"], [])

    def test_legitimate_bank_notification(self):
        sample = "Dear Customer, ₹1,200 has been debited from your account at Star Market. Available balance: ₹45,200."
        result = detect_fraud(sample)
        self.assertEqual(result["risk_level"], "safe")
        self.assertLess(result["risk_score"], 40)


if __name__ == "__main__":
    unittest.main()
