import unittest
from backend.engines.url.detector import detect_url


class TestURLDetector(unittest.TestCase):
    def test_phishing_brand_spoof(self):
        sample = "http://google-security-update-verify.xyz/login"
        result = detect_url(sample)
        self.assertEqual(result["input_type"], "url")
        self.assertEqual(result["risk_level"], "high")
        self.assertGreaterEqual(result["risk_score"], 60)

    def test_safe_domain(self):
        sample = "https://www.google.com/search?q=weather"
        result = detect_url(sample)
        self.assertEqual(result["risk_level"], "safe")


if __name__ == "__main__":
    unittest.main()
