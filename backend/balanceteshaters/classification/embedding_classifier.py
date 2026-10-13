import logging

import joblib
from huggingface_hub import hf_hub_download
from sentence_transformers import SentenceTransformer

from balanceteshaters.classification.category import BinaryLabel

logger = logging.getLogger(__name__)

# Explicitly cap max_seq_length to 512 tokens (default is 8192); set n_ctx high so
# BatchClassifier's token-budget guard never fires (comments are short anyway).
_N_CTX = 32768


ClassificationResult = tuple[list[str], float]


class EmbeddingClassifier:
    n_ctx = _N_CTX

    def __init__(self, repo_id: str, threshold: float = 0.5):
        logger.info(
            "Loading embedding classifier from HuggingFace repo %s (threshold=%.2f)",
            repo_id, threshold,
        )
        clf_path = hf_hub_download(repo_id=repo_id, filename="harassment_arctic_mlp.joblib")
        self.clf = joblib.load(clf_path)
        self.encoder = SentenceTransformer("Snowflake/snowflake-arctic-embed-l-v2.0")
        self.encoder.max_seq_length = 512
        self.threshold = threshold
        logger.info("Embedding classifier loaded")

    def count_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    def truncate(self, text: str, max_tokens: int) -> str:
        return text[: min(max_tokens, 512) * 4]

    def classify(self, text: str) -> ClassificationResult:
        return self.classify_batch([text])[0]

    def classify_batch(self, texts: list[str]) -> list[ClassificationResult]:
        if not texts:
            return []
        embeddings = self.encoder.encode(
            texts, batch_size=16, convert_to_numpy=True, show_progress_bar=False
        )
        probas = self.clf.predict_proba(embeddings)[:, 1]
        return [
            (
                [BinaryLabel.CYBERHARCELEMENT_DEFINITION_GENERALE.value]
                if score >= self.threshold
                else [BinaryLabel.ABSENCE_DE_CYBERHARCELEMENT.value],
                float(score),
            )
            for score in probas
        ]
