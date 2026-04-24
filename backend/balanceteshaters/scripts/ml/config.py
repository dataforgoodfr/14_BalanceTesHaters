from pathlib import Path
import torch

JINA_MODEL_ID = "jinaai/jina-embeddings-v5-text-nano"    # 239M, EuroBERT, CPU-only (MPS segfault)
JINA_SMALL_MODEL_ID = "jinaai/jina-embeddings-v5-text-small"  # 677M, Qwen3-based, MPS-safe
# Encoder-only, 270M, 640-dim, 94-language, no trust_remote_code needed
BIDIR_MODEL_ID = "microsoft/harrier-oss-v1-270m"
# Encoder-only, 568M, 1024-dim, bge-m3-retromae base, MRL, no trust_remote_code
ARCTIC_EMBED_MODEL_ID = "Snowflake/snowflake-arctic-embed-l-v2.0"
# 600M XLM-R fine-tuned on multilingual toxicity (15 langs incl. French); labels: 0=neutral, 1=toxic
XLMR_TOXICITY_MODEL_ID = "textdetox/xlmr-large-toxicity-classifier-v2"
MODELS = [JINA_MODEL_ID, JINA_SMALL_MODEL_ID, BIDIR_MODEL_ID, ARCTIC_EMBED_MODEL_ID, XLMR_TOXICITY_MODEL_ID]

MODEL_TYPE = {
    JINA_MODEL_ID:          "encoder embedding",
    JINA_SMALL_MODEL_ID:    "encoder embedding",
    BIDIR_MODEL_ID:         "encoder embedding",
    ARCTIC_EMBED_MODEL_ID:  "encoder embedding",
    XLMR_TOXICITY_MODEL_ID: "encoder classifier",
}

SCRIPTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPTS_DIR.parent.parent.parent
DATA_DIR = BACKEND_DIR / "balanceteshaters" / "data" / "finetune"
CHECKPOINTS_DIR = DATA_DIR / "checkpoints"

ANNOTATION_TABLE_ID = "m5t7qqaer2oa441"
EVAL_TABLE_ID = "m0ww7qnx69u9r1a"

LABEL_MAP = {
    "Absence de cyberharcèlement": 0,
}

MINORITY_CATEGORIES = [
    "Doxxing",
    "Incitation au suicide",
    "Cyberharcèlement à caractère sexuel",
    "Menaces",
    "Incitation à la haine",
]


def get_device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def get_device_for_model(model_id: str) -> str:
    # jina-v5-text-nano uses EuroBERT which segfaults on MPS — force CPU
    # jina-v5-text-small uses Qwen3 and is MPS-safe
    if model_id == JINA_MODEL_ID:
        return "cpu"
    return get_device()


def compute_binary_label(annotated_categories: list[str] | None) -> int | None:
    if not annotated_categories:
        return None
    for cat in annotated_categories:
        if "Absence de cyberharcèlement" in cat:
            return 0
    return 1


def model_slug(model_id: str) -> str:
    return model_id.split("/")[-1]
