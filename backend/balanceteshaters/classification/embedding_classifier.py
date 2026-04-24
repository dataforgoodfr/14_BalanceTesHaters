import logging

import joblib
from huggingface_hub import hf_hub_download
from sentence_transformers import SentenceTransformer

from balanceteshaters.classification.category import BinaryLabel

logger = logging.getLogger(__name__)

# SentenceTransformer truncates at 512 tokens internally; set n_ctx high so
# BatchClassifier's token-budget guard never fires (comments are short anyway).
_N_CTX = 32768


class EmbeddingClassifier:
    n_ctx = _N_CTX

    def __init__(self, repo_id: str):
        logger.info("Loading embedding classifier from HuggingFace repo %s", repo_id)
        clf_path = hf_hub_download(repo_id=repo_id, filename="harassment_arctic_mlp.joblib")
        self.clf = joblib.load(clf_path)
        self.encoder = SentenceTransformer("Snowflake/snowflake-arctic-embed-l-v2.0")
        logger.info("Embedding classifier loaded")

    def count_tokens(self, text: str) -> int:
        # Rough approximation (1 token ≈ 4 chars); only used for BatchClassifier budget.
        return max(1, len(text) // 4)

    def truncate(self, text: str, max_tokens: int) -> str:
        # SentenceTransformer handles hard truncation internally; this is a safety net.
        return text[: max_tokens * 4]

    def classify(self, text: str) -> list[str]:
        return self.classify_batch([text])[0]

    def classify_batch(self, texts: list[str]) -> list[list[str]]:
        if not texts:
            return []
        embeddings = self.encoder.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        predictions = self.clf.predict(embeddings)
        return [
            [BinaryLabel.CYBERHARCELEMENT_DEFINITION_GENERALE.value]
            if pred == 1
            else [BinaryLabel.ABSENCE_DE_CYBERHARCELEMENT.value]
            for pred in predictions
        ]
