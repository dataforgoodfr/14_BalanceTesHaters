# ruff: noqa: E402
"""
Fine-tune embedding models for binary harassment classification.

Usage:
  python 03_finetune_embedding.py --model bidir --strategy full --dataset real
  python 03_finetune_embedding.py --model jina  --strategy head_only --dataset augmented
"""
import os
os.environ.setdefault("PYTORCH_MPS_HIGH_WATERMARK_RATIO", "0.0")

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
import sklearn.metrics
import torch
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from torch.utils.data import DataLoader, Dataset

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
from balanceteshaters.scripts.ml.models import EmbeddingClassifier
from balanceteshaters.services.nocodb import NocoDBService


class TextDataset(Dataset):
    def __init__(self, df: pd.DataFrame):
        self.texts = df["comment"].tolist()
        self.labels = torch.tensor(df["label"].values, dtype=torch.long)

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        return self.texts[idx], self.labels[idx]


def log_to_nocodb(nocodb, run_name: str, dataset: str, strategy: str, metrics: dict, n_total: int, n_pos: int):
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
        "prompt": f"strategy={strategy} dataset={dataset}",
        "model_type": "encoder embedding",
    }
    try:
        nocodb.create_record(EVAL_TABLE_ID, data)
    except Exception as e:
        print(f"  [warn] NocoDB logging failed: {e}")


def run_finetune(model_id: str, is_jina: bool, strategy: str, dataset: str, nocodb, device: str):
    slug = model_slug(model_id)
    run_name = f"{slug}-finetuned-{strategy}-{dataset}"
    ckpt_dir = CHECKPOINTS_DIR / run_name
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"Fine-tuning {model_id}  strategy={strategy}  dataset={dataset}")

    load_kwargs = {"device": device}
    if is_jina:
        load_kwargs["trust_remote_code"] = True
    encoder = SentenceTransformer(model_id, **load_kwargs)

    probe_kwargs = {"convert_to_numpy": True, "show_progress_bar": False}
    if is_jina:
        probe_kwargs["task"] = "classification"
    embed_dim = encoder.encode(["probe"], **probe_kwargs).shape[1]

    task = "classification" if is_jina else None
    clf_model = EmbeddingClassifier(encoder, embed_dim, task=task, trainable_encoder=(strategy == "full")).to(device)

    if strategy == "head_only":
        for param in clf_model.encoder.parameters():
            param.requires_grad = False
        lr = 1e-3
        batch_size = 32
        max_epochs = 50
        patience = 15
    else:
        lr = 2e-5
        batch_size = 16
        max_epochs = 15
        patience = 5

    train_df = pd.read_parquet(DATA_DIR / f"train_{dataset}.parquet")
    val_df = pd.read_parquet(DATA_DIR / "val.parquet")
    test_df = pd.read_parquet(DATA_DIR / "test.parquet")

    train_loader = DataLoader(TextDataset(train_df), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(TextDataset(val_df), batch_size=32, shuffle=False)

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, clf_model.parameters()), lr=lr, weight_decay=0.01
    )

    best_f1 = 0.0
    no_improve = 0
    best_state = None
    t0 = time.time()

    for epoch in range(1, max_epochs + 1):
        clf_model.train()
        total_loss = 0.0
        for texts, labels in train_loader:
            labels = labels.to(device)
            optimizer.zero_grad()
            loss, _ = clf_model(texts, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        clf_model.eval()
        all_preds, all_labels = [], []
        with torch.no_grad():
            for texts, labels in val_loader:
                logits = clf_model(texts)
                preds = torch.argmax(logits, dim=-1).cpu().numpy()
                all_preds.extend(preds)
                all_labels.extend(labels.numpy())

        val_f1 = sklearn.metrics.f1_score(all_labels, all_preds, zero_division=0)
        avg_loss = total_loss / len(train_loader)

        if val_f1 > best_f1:
            best_f1 = val_f1
            best_state = {k: v.cpu().clone() for k, v in clf_model.state_dict().items()}
            torch.save(best_state, ckpt_dir / "best_model.pt")
            no_improve = 0
            print(f"  Epoch {epoch}  loss={avg_loss:.4f}  val_f1={val_f1:.4f}  ← best")
        else:
            no_improve += 1
            print(f"  Epoch {epoch}  loss={avg_loss:.4f}  val_f1={val_f1:.4f}  (no improve {no_improve}/{patience})")
            if no_improve >= patience:
                print(f"  Early stopping at epoch {epoch}")
                break

    elapsed = time.time() - t0

    if best_state:
        clf_model.load_state_dict(best_state)

    clf_model.eval()
    test_loader = DataLoader(TextDataset(test_df), batch_size=32, shuffle=False)
    all_preds, all_labels = [], []
    with torch.no_grad():
        for texts, labels in test_loader:
            logits = clf_model(texts)
            preds = torch.argmax(logits, dim=-1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.numpy())

    metrics = {
        "f1": sklearn.metrics.f1_score(all_labels, all_preds, zero_division=0),
        "precision": sklearn.metrics.precision_score(all_labels, all_preds, zero_division=0),
        "recall": sklearn.metrics.recall_score(all_labels, all_preds, zero_division=0),
        "accuracy": sklearn.metrics.accuracy_score(all_labels, all_preds),
    }
    y_test = test_df["label"].values

    print(f"Test  F1={metrics['f1']:.4f}  P={metrics['precision']:.4f}  R={metrics['recall']:.4f}  Acc={metrics['accuracy']:.4f}  ({elapsed:.0f}s)")
    print(f"  Saved to {ckpt_dir}")
    log_to_nocodb(nocodb, run_name, dataset, strategy, metrics, len(y_test), int(y_test.sum()))


def main():
    parser = argparse.ArgumentParser(description="Fine-tune embedding model for binary classification")
    parser.add_argument("--model", choices=["jina", "jina-small", "bidir", "arctic"], required=True)
    parser.add_argument("--strategy", choices=["head_only", "full"], default="full")
    parser.add_argument("--dataset", choices=["real", "augmented", "augmented_v2"], default="real")
    args = parser.parse_args()

    load_dotenv()
    nocodb = None
    if all(os.environ.get(k) for k in ["NOCODB_BASE_URL", "NOCODB_TOKEN", "NOCODB_BASE_ID"]):
        nocodb = NocoDBService(
            nocodb_url=os.environ["NOCODB_BASE_URL"],
            token=os.environ["NOCODB_TOKEN"],
            base_id=os.environ["NOCODB_BASE_ID"],
        )

    model_map = {
        "jina": JINA_MODEL_ID,
        "jina-small": JINA_SMALL_MODEL_ID,
        "bidir": BIDIR_MODEL_ID,
        "arctic": ARCTIC_EMBED_MODEL_ID,
    }
    model_id = model_map[args.model]
    is_jina = args.model in ("jina", "jina-small")

    if is_jina and args.strategy == "full":
        print("Note: jina models use encode() which blocks gradient flow — 'full' is equivalent to 'head_only'. Running head_only.")
        args.strategy = "head_only"

    device = get_device_for_model(model_id)
    print(f"Device: {device}")

    CHECKPOINTS_DIR.mkdir(parents=True, exist_ok=True)
    run_finetune(model_id, is_jina, args.strategy, args.dataset, nocodb, device)


if __name__ == "__main__":
    main()
