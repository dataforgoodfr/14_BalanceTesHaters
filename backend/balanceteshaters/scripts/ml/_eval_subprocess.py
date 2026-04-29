"""
Subprocess helper for 04_compare_evaluate.py and threshold/arch sweep scripts.
Each command uses lazy imports so unrelated native libraries are never loaded together.

Usage:
  python _eval_subprocess.py embed             <model_id> <output_npy> [split]
  python _eval_subprocess.py predict_classical <embedding_npy> <ckpt_path> <output_npy>
  python _eval_subprocess.py predict_proba_classical <embedding_npy> <ckpt_path> <output_npy>
  python _eval_subprocess.py predict           <model_id> <ckpt_dir> <output_npy>
  python _eval_subprocess.py predict_proba     <model_id> <ckpt_dir> <output_npy>

[split] defaults to "test". Pass "train_real" or "val" to embed other splits.
"""
import os
os.environ["PYTORCH_MPS_HIGH_WATERMARK_RATIO"] = "0.0"

import sys
import numpy as np
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))


def cmd_embed(model_id: str, output_npy: str, split: str = "test"):
    import pandas as pd
    from sentence_transformers import SentenceTransformer
    from balanceteshaters.scripts.ml.config import DATA_DIR, get_device_for_model

    df = pd.read_parquet(DATA_DIR / f"{split}.parquet")
    is_jina = "jinaai/" in model_id
    load_kwargs = {"device": get_device_for_model(model_id)}
    if is_jina:
        load_kwargs["trust_remote_code"] = True

    encoder = SentenceTransformer(model_id, **load_kwargs)
    task = "classification" if is_jina else None
    encode_kwargs = {"batch_size": 32, "show_progress_bar": False, "convert_to_numpy": True}
    if task:
        encode_kwargs["task"] = task

    X = encoder.encode(df["comment"].tolist(), **encode_kwargs).astype(np.float32)
    np.save(output_npy, X)


def cmd_predict_classical(embedding_npy: str, ckpt_path: str, output_npy: str):
    import joblib  # imports LightGBM on first call — no torch/ST in this process
    X = np.load(embedding_npy)
    clf = joblib.load(ckpt_path)
    np.save(output_npy, clf.predict(X))


def cmd_predict_proba_classical(embedding_npy: str, ckpt_path: str, output_npy: str):
    import joblib
    X = np.load(embedding_npy)
    clf = joblib.load(ckpt_path)
    np.save(output_npy, clf.predict_proba(X)[:, 1])


def _load_finetuned_clf(model_id: str, ckpt_dir: str):
    """Load a fine-tuned EmbeddingClassifier. Returns (clf, device) or (None, None) if checkpoint missing."""
    import torch
    from sentence_transformers import SentenceTransformer
    from balanceteshaters.scripts.ml.config import get_device_for_model
    from balanceteshaters.scripts.ml.models import EmbeddingClassifier

    state_path = Path(ckpt_dir) / "best_model.pt"
    if not state_path.exists():
        return None, None

    device = get_device_for_model(model_id)
    is_jina = "jinaai/" in model_id
    load_kwargs = {"device": device}
    if is_jina:
        load_kwargs["trust_remote_code"] = True
    encoder = SentenceTransformer(model_id, **load_kwargs)

    task = "classification" if is_jina else None
    probe_kwargs = {"convert_to_numpy": True, "show_progress_bar": False}
    if task:
        probe_kwargs["task"] = task
    embed_dim = encoder.encode(["probe"], **probe_kwargs).shape[1]

    clf = EmbeddingClassifier(encoder, embed_dim, task=task)
    clf.load_state_dict(torch.load(state_path, map_location="cpu"))
    clf.eval().to(device)
    return clf, device


def cmd_predict(model_id: str, ckpt_dir: str, output_npy: str):
    import torch
    import pandas as pd
    from balanceteshaters.scripts.ml.config import DATA_DIR

    clf, _ = _load_finetuned_clf(model_id, ckpt_dir)
    if clf is None:
        np.save(output_npy, np.array([-1]))
        return

    texts = pd.read_parquet(DATA_DIR / "test.parquet")["comment"].tolist()
    all_preds = []
    with torch.no_grad():
        for i in range(0, len(texts), 32):
            all_preds.extend(torch.argmax(clf(texts[i:i + 32]), dim=-1).cpu().numpy())
    np.save(output_npy, np.array(all_preds))


def cmd_predict_proba(model_id: str, ckpt_dir: str, output_npy: str):
    import torch
    import torch.nn.functional as F
    import pandas as pd
    from balanceteshaters.scripts.ml.config import DATA_DIR

    clf, _ = _load_finetuned_clf(model_id, ckpt_dir)
    if clf is None:
        np.save(output_npy, np.array([-1.0]))
        return

    texts = pd.read_parquet(DATA_DIR / "test.parquet")["comment"].tolist()
    all_proba = []
    with torch.no_grad():
        for i in range(0, len(texts), 32):
            proba = F.softmax(clf(texts[i:i + 32]), dim=-1)[:, 1].cpu().numpy()
            all_proba.extend(proba)
    np.save(output_npy, np.array(all_proba))


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "embed":
        split = sys.argv[4] if len(sys.argv) > 4 else "test"
        cmd_embed(sys.argv[2], sys.argv[3], split)
    elif cmd == "predict_classical":
        cmd_predict_classical(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "predict_proba_classical":
        cmd_predict_proba_classical(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "predict_proba":
        cmd_predict_proba(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "predict":
        cmd_predict(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
