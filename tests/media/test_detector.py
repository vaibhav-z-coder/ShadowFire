import unittest
from pathlib import Path
from backend.engines.media.image.detector import detect_image
from backend.engines.media.video.detector import detect_video
from backend.engines.media.audio.detector import detect_audio


class TestMediaDetectors(unittest.TestCase):
    def test_image_detector_safe(self):
        dummy_path = Path("/tmp/test_image.jpg")
        dummy_path.touch()
        try:
            res = detect_image(dummy_path)
            self.assertEqual(res["input_type"], "image")
            self.assertIn("category", res)
        finally:
            dummy_path.unlink(missing_ok=True)

    def test_video_detector(self):
        dummy_path = Path("/tmp/test_video.mp4")
        dummy_path.touch()
        try:
            res = detect_video(dummy_path)
            self.assertEqual(res["input_type"], "video")
            self.assertIn("risk_level", res)
        finally:
            dummy_path.unlink(missing_ok=True)

    def test_audio_detector(self):
        dummy_path = Path("/tmp/test_audio.wav")
        dummy_path.touch()
        try:
            res = detect_audio(dummy_path)
            self.assertEqual(res["input_type"], "audio")
            self.assertIn("confidence", res)
        finally:
            dummy_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
