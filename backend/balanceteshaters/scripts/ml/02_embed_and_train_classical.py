# ruff: noqa: E402
"""
Train three classifiers on frozen embeddings:
  - Logistic Regression  (linear baseline)
  - LightGBM             (tree ensemble)
  - MLP (512→128)        (neural head, best at dense vectors)

Loops over 2 embedding models × 3 classifiers × 2 datasets = 12 runs.
Embeddings for val/test are shared per encoder to avoid recomputing.
"""
# Must be set before torch is imported: jina-v5 EuroBERT allocates MPS memory
# even when device="cpu", which segfaults on Apple Silicon.
import os
os.environ.setdefault("PYTORCH_MPS_HIGH_WATERMARK_RATIO", "0.0")

import argparse
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn.metrics
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from balanceteshaters.scripts.ml.config import (
    ANNOTATION_TABLE_ID,
    ARCTIC_EMBED_MODEL_ID,
    BIDIR_MODEL_ID,
    CHECKPOINTS_DIR,
    DATA_DIR,
    EVAL_TABLE_ID,
    JINA_MODEL_ID,
    JINA_SMALL_MODEL_ID,
    get_device_for_model,
    model_slug,
)
from balanceteshaters.services.nocodb import NocoDBService


def embed(model: SentenceTransformer, texts: list[str], task: str | None = None, batch_size: int = 32) -> np.ndarray:
    kwargs = {"batch_size": batch_size, "show_progress_bar": True, "convert_to_numpy": True}
    if task is not None:
        kwargs["task"] = task
    return model.encode(texts, **kwargs).astype(np.float32)


def evaluate(y_true, y_pred) -> dict:
    return {
        "f1": sklearn.metrics.f1_score(y_true, y_pred, zero_division=0),
        "precision": sklearn.metrics.precision_score(y_true, y_pred, zero_division=0),
        "recall": sklearn.metrics.recall_score(y_true, y_pred, zero_division=0),
        "accuracy": sklearn.metrics.accuracy_score(y_true, y_pred),
    }


def log_to_nocodb(nocodb, run_name: str, dataset: str, metrics: dict, n_total: int, n_pos: int, model_type: str = "encoder embedding"):
    if nocodb is None:
        return
    data = {
        "model_name": run_name,
        "table_id": ANNOTATION_TABLE_ID,
        "table_name": f"finetune/{dataset}",
        "f1": metrics["f1"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "accuracy": metrics["accuracy"],
        "total_samples": n_total,
        "positive_samples": n_pos,
        "negative_samples": n_total - n_pos,
        "prompt": f"frozen+{run_name.split('+')[1]} dataset={dataset}",
        "model_type": model_type,
    }
    try:
        nocodb.create_record(EVAL_TABLE_ID, data)
    except Exception as e:
        print(f"  [warn] NocoDB logging failed: {e}")


def make_classifiers():
    # Lazy imports so LightGBM's OpenMP doesn't initialize before jina loads
    from lightgbm import LGBMClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.neural_network import MLPClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    return [
        (
            "logreg",
            Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=1000, C=1.0)),
            ]),
            False,
        ),
        (
            "lightgbm",
            LGBMClassifier(n_estimators=500, learning_rate=0.05, max_depth=6, verbose=-1, n_jobs=1),
            True,  # uses early stopping on val set
        ),
        (
            "mlp",
            Pipeline([
                ("scaler", StandardScaler()),
                ("clf", MLPClassifier(
                    hidden_layer_sizes=(512, 128),
                    activation="relu",
                    max_iter=200,
                    early_stopping=True,
                    validation_fraction=0.1,
                    n_iter_no_change=10,
                    random_state=42,
                )),
            ]),
            False,
        ),
    ]


def run_for_encoder(model_id: str, is_jina: bool, datasets: list[str], nocodb):
    import gc
    device = get_device_for_model(model_id)
    print(f"\n{'='*60}")
    print(f"Encoder: {model_id}  device={device}")

    load_kwargs = {"device": device, "trust_remote_code": True}
    st_model = SentenceTransformer(model_id, **load_kwargs)
    task = "classification" if is_jina else None

    val_df = pd.read_parquet(DATA_DIR / "val.parquet")
    test_df = pd.read_parquet(DATA_DIR / "test.parquet")

    print("Embedding val set...")
    X_val = embed(st_model, val_df["comment"].tolist(), task=task)
    y_val = val_df["label"].values

    print("Embedding test set...")
    X_test = embed(st_model, test_df["comment"].tolist(), task=task)
    y_test = test_df["label"].values

    # Embed all training splits before freeing the encoder
    train_embeddings: dict[str, tuple[np.ndarray, np.ndarray]] = {}
    for dataset in datasets:
        train_file = DATA_DIR / f"train_{dataset}.parquet"
        if not train_file.exists():
            print(f"  [skip] {train_file.name} not found")
            continue
        train_df = pd.read_parquet(train_file)
        print(f"\nEmbedding train set ({dataset}, {len(train_df)} rows)...")
        train_embeddings[dataset] = (
            embed(st_model, train_df["comment"].tolist(), task=task),
            train_df["label"].values,
        )

    # Free encoder before initialising classifier threads (avoids OpenMP conflict)
    del st_model
    gc.collect()

    slug = model_slug(model_id)
    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)

    for dataset, (X_train, y_train) in train_embeddings.items():
        for clf_name, clf, needs_val in make_classifiers():
            run_name = f"{slug}+{clf_name}+{dataset}"
            print(f"\n  Training {run_name}...")
            t0 = time.time()

            if needs_val:
                from lightgbm import early_stopping, log_evaluation
                clf.fit(
                    X_train, y_train,
                    eval_set=[(X_val, y_val)],
                    callbacks=[early_stopping(50, verbose=False), log_evaluation(-1)],
                )
            else:
                clf.fit(X_train, y_train)

            elapsed = time.time() - t0
            y_pred = clf.predict(X_test)
            m = evaluate(y_test, y_pred)
            n_pos = int(y_test.sum())

            print(f"  F1={m['f1']:.4f}  P={m['precision']:.4f}  R={m['recall']:.4f}  Acc={m['accuracy']:.4f}  ({elapsed:.1f}s)")

            ckpt_path = CHECKPOINTS_DIR / f"{run_name}.joblib"
            joblib.dump(clf, ckpt_path)
            print(f"  Saved to {ckpt_path.name}")

            log_to_nocodb(nocodb, run_name, dataset, m, len(y_test), n_pos)


def main():
    parser = argparse.ArgumentParser(description="Embed + train classical ML classifiers")
    parser.add_argument("--models", nargs="+", choices=["jina", "jina-small", "bidir", "arctic", "all"], default=["all"])
    parser.add_argument("--datasets", nargs="+", choices=["real", "augmented", "augmented_v2", "all"], default=["all"])
    args = parser.parse_args()

    load_dotenv()
    nocodb = None
    if all(os.environ.get(k) for k in ["NOCODB_BASE_URL", "NOCODB_TOKEN", "NOCODB_BASE_ID"]):
        nocodb = NocoDBService(
            nocodb_url=os.environ["NOCODB_BASE_URL"],
            token=os.environ["NOCODB_TOKEN"],
            base_id=os.environ["NOCODB_BASE_ID"],
        )

    encoders = []
    if "all" in args.models or "jina" in args.models:
        encoders.append((JINA_MODEL_ID, True))
    if "all" in args.models or "jina-small" in args.models:
        encoders.append((JINA_SMALL_MODEL_ID, True))
    if "all" in args.models or "bidir" in args.models:
        encoders.append((BIDIR_MODEL_ID, False))
    if "all" in args.models or "arctic" in args.models:
        encoders.append((ARCTIC_EMBED_MODEL_ID, False))

    datasets = ["real", "augmented", "augmented_v2"] if "all" in args.datasets else args.datasets

    for model_id, is_jina in encoders:
        run_for_encoder(model_id, is_jina, datasets, nocodb)

    print("\nAll runs complete.")


if __name__ == "__main__":
    main()
