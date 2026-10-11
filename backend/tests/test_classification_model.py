import unittest

from balanceteshaters.routers.classification_model import CommentClassificationResult


class CommentClassificationResultTest(unittest.TestCase):
    def setUp(self):
        self.common_data = {
            "classification": ["Absence de cyberharcèlement"],
            "classified_at": "2026-09-18T07:53:34.986615Z",
        }

    def test_accepts_legacy_score_field(self):
        result = CommentClassificationResult.model_validate(
            {**self.common_data, "score": 0.0375}
        )

        self.assertEqual(result.hate_score, 0.0375)
        self.assertNotIn("score", result.model_dump())

    def test_accepts_hate_score_field(self):
        result = CommentClassificationResult.model_validate(
            {**self.common_data, "hate_score": 0.8125}
        )

        self.assertEqual(result.hate_score, 0.8125)

if __name__ == "__main__":
    unittest.main()
