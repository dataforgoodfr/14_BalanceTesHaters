# ruff: noqa: E402
"""
Load all checkpoints and print a comparison table.
Also logs all results to NocoDB and highlights A/B delta (real vs augmented).

SentenceTransformer embedding and fine-tuned inference run in isolated subprocesses
to avoid the OpenMP conflict between jina-nano's EuroBERT (libomp) and LightGBM (libgomp).
"""
import os
os.environ.setdefault("PYTORCH_MPS_HIGH_WATERMARK_RATIO", "0.0")

import sys
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn.metrics
from dotenv import load_dotenv

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
    MODEL_TYPE,
    XLMR_TOXICITY_MODEL_ID,
    get_device_for_model,
    model_slug,
)
from balanceteshaters.services.nocodb import NocoDBService

_HELPER = Path(__file__).parent / "_eval_subprocess.py"


def metrics(y_true, y_pred) -> dict:
    return {
        "f1": sklearn.metrics.f1_score(y_true, y_pred, zero_division=0),
        "precision": sklearn.metrics.precision_score(y_true, y_pred, zero_division=0),
        "recall": sklearn.metrics.recall_score(y_true, y_pred, zero_division=0),
        "accuracy": sklearn.metrics.accuracy_score(y_true, y_pred),
    }


def load_llm_baseline(data_dir: Path) -> dict | None:
    csv_dir = data_dir.parent
    csvs = list(csv_dir.glob("predictions_m5t7qqaer2oa441_*.csv"))
    if not csvs:
        return None

    best = None
    best_f1 = -1.0
    for p in csvs:
        df = pd.read_csv(p)
        if "annotated_category" not in df.columns or "predicted_category" not in df.columns:
            continue
        df = df[df["annotated_category"].notna()]
        df["predicted_category"] = df["predicted_category"].astype(str).str.strip()
        df = df[df["predicted_category"].isin(["0", "1"])]
        if df.empty:
            continue
        y_true = (~df["annotated_category"].str.contains("Absence de cyberharcèlement")).astype(int)
        y_pred = df["predicted_category"].astype(int)
        f1 = sklearn.metrics.f1_score(y_true, y_pred, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best = {"run_name": f"LLM baseline ({p.stem})", "approach": "LLM prompt", "model": "best LLM", "dataset": "real", **metrics(y_true, y_pred)}
    return best


def _subprocess_run(args: list[str]):
    result = subprocess.run([sys.executable] + args, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Subprocess failed (exit {result.returncode}):\n{result.stderr[-2000:]}")


def embed_in_subprocess(model_id: str, output_npy: str):
    print(f"  Embedding {model_slug(model_id)}...")
    _subprocess_run([str(_HELPER), "embed", model_id, output_npy])


def predict_classical_in_subprocess(embedding_npy: str, ckpt_path: str, output_npy: str):
    _subprocess_run([str(_HELPER), "predict_classical", embedding_npy, ckpt_path, output_npy])


def predict_ft_in_subprocess(model_id: str, ckpt_dir: str, output_npy: str):
    _subprocess_run([str(_HELPER), "predict", model_id, ckpt_dir, output_npy])


def predict_xlmr_zero_shot(test_df: pd.DataFrame) -> np.ndarray:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    device = get_device_for_model(XLMR_TOXICITY_MODEL_ID)
    tokenizer = AutoTokenizer.from_pretrained(XLMR_TOXICITY_MODEL_ID)
    model = AutoModelForSequenceClassification.from_pretrained(XLMR_TOXICITY_MODEL_ID)
    model.eval().to(device)
    texts = test_df["comment"].tolist()
    all_preds = []
    for i in range(0, len(texts), 32):
        batch = texts[i:i + 32]
        enc = tokenizer(batch, truncation=True, padding=True, max_length=512, return_tensors="pt").to(device)
        with torch.no_grad():
            logits = model(**enc).logits
        all_preds.extend(torch.argmax(logits, dim=-1).cpu().numpy())
    return np.array(all_preds)


def main():
    load_dotenv()

    test_df = pd.read_parquet(DATA_DIR / "test.parquet")
    y_test = test_df["label"].values

    nocodb = None
    if all(os.environ.get(k) for k in ["NOCODB_BASE_URL", "NOCODB_TOKEN", "NOCODB_BASE_ID"]):
        nocodb = NocoDBService(
            nocodb_url=os.environ["NOCODB_BASE_URL"],
            token=os.environ["NOCODB_TOKEN"],
            base_id=os.environ["NOCODB_BASE_ID"],
        )

    results = []
    tmp = Path(tempfile.mkdtemp())

    encoder_configs = [
        (JINA_MODEL_ID, True),
        (JINA_SMALL_MODEL_ID, True),
        (BIDIR_MODEL_ID, False),
        (ARCTIC_EMBED_MODEL_ID, False),
    ]

    # ── Phase 1: embed test set — each model in isolated subprocess ────────
    # Prevents OpenMP conflict: jina-nano (EuroBERT/libomp) vs LightGBM (libgomp)
    print("── Phase 1: computing test embeddings ──")
    embedding_cache: dict[str, np.ndarray] = {}
    for model_id, _ in encoder_configs:
        npy_path = str(tmp / f"X_{model_slug(model_id)}.npy")
        embed_in_subprocess(model_id, npy_path)
        embedding_cache[model_id] = np.load(npy_path)

    # ── Phase 2: classical ML predictions — each in isolated subprocess ──────
    # LightGBM (libgomp) conflicts with leaked OpenMP state from Phase 1 subprocesses
    print("\n── Phase 2: classical ML predictions ──")
    for model_id, _ in encoder_configs:
        slug = model_slug(model_id)
        embedding_npy = str(tmp / f"X_{slug}.npy")

        for clf_name in ["logreg", "lightgbm", "mlp"]:
            for dataset in ["real", "augmented", "augmented_v2"]:
                run_name = f"{slug}+{clf_name}+{dataset}"
                ckpt = CHECKPOINTS_DIR / f"{run_name}.joblib"
                if not ckpt.exists():
                    print(f"  [skip] {ckpt.name}")
                    continue
                pred_npy = str(tmp / f"pred_{run_name}.npy")
                predict_classical_in_subprocess(embedding_npy, str(ckpt), pred_npy)
                y_pred = np.load(pred_npy)
                m = metrics(y_test, y_pred)
                results.append({"run": run_name, "approach": f"frozen+{clf_name}", "model": slug, "dataset": dataset, "model_type": MODEL_TYPE.get(model_id, "encoder embedding"), **m})
                print(f"  {run_name:<55} F1={m['f1']:.4f}")

    # ── Phase 3: fine-tuned model predictions (each in isolated subprocess) ──
    print("\n── Phase 3: fine-tuned predictions ──")
    for model_id, _ in encoder_configs:
        slug = model_slug(model_id)
        for strategy in ["head_only", "full"]:
            for dataset in ["real", "augmented", "augmented_v2"]:
                run_name = f"{slug}-finetuned-{strategy}-{dataset}"
                ckpt_dir = CHECKPOINTS_DIR / run_name
                if not ckpt_dir.exists():
                    print(f"  [skip] {run_name}")
                    continue
                npy_path = str(tmp / f"pred_{run_name}.npy")
                print(f"  Predicting {run_name}...")
                predict_ft_in_subprocess(model_id, str(ckpt_dir), npy_path)
                y_pred = np.load(npy_path)
                if len(y_pred) == 1 and y_pred[0] == -1:
                    print(f"  [skip] no best_model.pt in {run_name}")
                    continue
                m = metrics(y_test, y_pred)
                results.append({"run": run_name, "approach": f"finetune-{strategy}", "model": slug, "dataset": dataset, "model_type": MODEL_TYPE.get(model_id, "encoder embedding"), **m})
                print(f"  {run_name:<55} F1={m['f1']:.4f}")

    # ── XLM-R zero-shot (no LightGBM conflict — transformers only) ────────
    print("\nRunning XLM-R toxicity zero-shot...")
    xlmr_slug = model_slug(XLMR_TOXICITY_MODEL_ID)
    y_pred = predict_xlmr_zero_shot(test_df)
    m = metrics(y_test, y_pred)
    results.append({"run": f"{xlmr_slug}-zero-shot", "approach": "zero-shot", "model": xlmr_slug, "dataset": "real", "model_type": "encoder classifier", **m})
    print(f"  XLM-R zero-shot  F1={m['f1']:.4f}")

    # ── LLM baseline ──────────────────────────────────────────────────────
    baseline = load_llm_baseline(DATA_DIR)
    if baseline:
        run_name = baseline.pop("run_name")
        results.append({"run": run_name, "model_type": "generative", **baseline})

    if not results:
        print("No results found. Run the training scripts first.")
        return

    df = pd.DataFrame(results)
    df = df.sort_values(["approach", "model", "dataset"])

    print("\n" + "="*90)
    print(f"{'Run':<55} {'Dataset':<12} {'F1':>6} {'P':>6} {'R':>6} {'Acc':>6}")
    print("="*90)
    for _, row in df.iterrows():
        print(f"{row['run']:<55} {row['dataset']:<12} {row['f1']:>6.4f} {row['precision']:>6.4f} {row['recall']:>6.4f} {row['accuracy']:>6.4f}")

    print("\n── A/B delta (augmented − real F1) ─────────────")
    for (approach, model), group in df.groupby(["approach", "model"]):
        real_row = group[group["dataset"] == "real"]
        aug_row = group[group["dataset"] == "augmented"]
        if real_row.empty or aug_row.empty:
            continue
        delta = aug_row["f1"].values[0] - real_row["f1"].values[0]
        print(f"  {approach:<25} {model:<35} {delta:+.4f}")

    if nocodb:
        for _, row in df.iterrows():
            data = {
                "model_name": row["run"],
                "table_id": ANNOTATION_TABLE_ID,
                "table_name": f"finetune/{row.get('dataset','?')}",
                "f1": row["f1"],
                "precision": row["precision"],
                "recall": row["recall"],
                "accuracy": row["accuracy"],
                "total_samples": len(y_test),
                "positive_samples": int(y_test.sum()),
                "negative_samples": len(y_test) - int(y_test.sum()),
                "prompt": f"approach={row.get('approach','?')} dataset={row.get('dataset','?')}",
                "model_type": row.get("model_type", "encoder embedding"),
            }
            try:
                nocodb.create_record(EVAL_TABLE_ID, data)
            except Exception as e:
                print(f"  [warn] NocoDB: {e}")
        print("\nAll results logged to NocoDB.")


if __name__ == "__main__":
    main()
