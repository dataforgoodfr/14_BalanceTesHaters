import os
import argparse
import csv
import re
import sys
import json
import logging
from pathlib import Path

import numpy as np
import torch
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    accuracy_score,
)
from sklearn.preprocessing import MultiLabelBinarizer
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
)

PROJECT_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_BACKEND_DIR))

from balanceteshaters.services.annotation import Annotation, AnnotationService
from balanceteshaters.services.nocodb import NocoDBService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


DEFAULT_BASE_MODEL = "camembert-base"  # Best choice for French text
MAX_LENGTH = 256
BATCH_SIZE = 16
NUM_EPOCHS = 10
LEARNING_RATE = 2e-5
WEIGHT_DECAY = 0.01
EVAL_SPLIT = 0.15
TEST_SPLIT = 0.15
SEED = 42


class CyberHarassmentDataset(Dataset):
    """PyTorch dataset for multi-label cyberbullying classification."""

    def __init__(self, texts: list[str], labels: np.ndarray, tokenizer, max_length: int = MAX_LENGTH):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        item = {key: val.squeeze(0) for key, val in encoding.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.float)
        return item


class MultiLabelTrainer(Trainer):
    """Override compute_loss for multi-label BCE loss."""

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.logits
        loss_fn = torch.nn.BCEWithLogitsLoss()
        loss = loss_fn(logits, labels)
        return (loss, outputs) if return_outputs else loss



def compute_metrics(eval_pred):
    """Compute multi-label metrics for the Trainer."""
    logits, labels = eval_pred
    probs = torch.sigmoid(torch.tensor(logits)).numpy()
    preds = (probs >= 0.5).astype(int)
    labels = labels.astype(int)

    return {
        "f1_micro": f1_score(labels, preds, average="micro", zero_division=0),
        "f1_macro": f1_score(labels, preds, average="macro", zero_division=0),
        "f1_weighted": f1_score(labels, preds, average="weighted", zero_division=0),
        "precision_micro": precision_score(labels, preds, average="micro", zero_division=0),
        "recall_micro": recall_score(labels, preds, average="micro", zero_division=0),
        "subset_accuracy": accuracy_score(labels, preds),  # exact match
    }


def fetch_annotated_data() -> list[Annotation]:
    """Fetch annotated records from NocoDB (same logic as original script)."""
    load_dotenv()
    nocodb_base_id: str = os.environ["NOCODB_BASE_ID"]
    nocodb_base_url: str = os.environ["NOCODB_BASE_URL"]
    nocodb_annotation_table_id: str = os.environ["NOCODB_ANNOTATION_TABLE_ID"]
    nocodb_token: str = os.environ["NOCODB_TOKEN"]

    nocodb = NocoDBService(
        nocodb_url=nocodb_base_url, token=nocodb_token, base_id=nocodb_base_id
    )
    service = AnnotationService(
        nocodb=nocodb, annotation_table_id=nocodb_annotation_table_id
    )

    data = service.fetch_records_paginated()
    # Keep only records which are annotated (same filter as original)
    data = [annotation for annotation in data if annotation.annotated_category]
    logger.info(f"Fetched {len(data)} annotated records from NocoDB")
    return data



def prepare_labels(data: list[Annotation]):
    """
    Build multi-label binarised labels from annotated_category lists.
    Returns texts, binarised labels array, and the fitted MultiLabelBinarizer.
    """
    texts = [record.comment for record in data]
    raw_labels = [record.annotated_category for record in data]

    mlb = MultiLabelBinarizer()
    labels = mlb.fit_transform(raw_labels)

    logger.info(f"Found {len(mlb.classes_)} unique categories: {list(mlb.classes_)}")
    return texts, labels, mlb


#Fine-tuning
def finetune(
    texts: list[str],
    labels: np.ndarray,
    mlb: MultiLabelBinarizer,
    base_model: str,
    output_dir: Path,
):
    """Fine-tune the model and return the Trainer + tokenizer."""

    num_labels = len(mlb.classes_)

    # --- Split: train / eval / test ---
    texts_train, texts_temp, labels_train, labels_temp = train_test_split(
        texts, labels, test_size=EVAL_SPLIT + TEST_SPLIT, random_state=SEED, shuffle=True
    )
    relative_test = TEST_SPLIT / (EVAL_SPLIT + TEST_SPLIT)
    texts_eval, texts_test, labels_eval, labels_test = train_test_split(
        texts_temp, labels_temp, test_size=relative_test, random_state=SEED
    )
    logger.info(
        f"Split: {len(texts_train)} train / {len(texts_eval)} eval / {len(texts_test)} test"
    )

    # --- Tokenizer & Model ---
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    model = AutoModelForSequenceClassification.from_pretrained(
        base_model,
        num_labels=num_labels,
        problem_type="multi_label_classification",
    )

    # --- Datasets ---
    train_ds = CyberHarassmentDataset(texts_train, labels_train, tokenizer)
    eval_ds = CyberHarassmentDataset(texts_eval, labels_eval, tokenizer)
    test_ds = CyberHarassmentDataset(texts_test, labels_test, tokenizer)

    # --- Training arguments ---
    training_args = TrainingArguments(
        output_dir=str(output_dir / "checkpoints"),
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=LEARNING_RATE,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        num_train_epochs=NUM_EPOCHS,
        weight_decay=WEIGHT_DECAY,
        load_best_model_at_end=True,
        metric_for_best_model="f1_macro",
        greater_is_better=True,
        save_total_limit=2,
        logging_steps=50,
        seed=SEED,
        fp16=torch.cuda.is_available(),
        report_to="none",
    )

    trainer = MultiLabelTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        compute_metrics=compute_metrics,
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )

    logger.info(f"Starting fine-tuning with base model: {base_model}")
    trainer.train()

    # --- Save best model ---
    save_dir = output_dir / "best_model"
    trainer.save_model(str(save_dir))
    tokenizer.save_pretrained(str(save_dir))

    # Save label mapping
    label_mapping = {"classes": list(mlb.classes_)}
    with open(save_dir / "label_mapping.json", "w", encoding="utf-8") as f:
        json.dump(label_mapping, f, ensure_ascii=False, indent=2)

    logger.info(f"Best model saved to {save_dir}")

    return trainer, tokenizer, test_ds, texts_test, labels_test


# Evaluation
def evaluate(trainer, test_ds, labels_test, mlb, output_dir: Path):
    """Evaluate the model on the test set and print detailed metrics."""
    logger.info("Evaluating on test set...")

    predictions = trainer.predict(test_ds)
    logits = predictions.predictions
    probs = torch.sigmoid(torch.tensor(logits)).numpy()
    preds = (probs >= 0.5).astype(int)

    # Per-class report
    report = classification_report(
        labels_test, preds, target_names=list(mlb.classes_), zero_division=0
    )
    logger.info(f"\n=== Classification Report (Test Set) ===\n{report}")

    # Save report
    report_path = output_dir / "classification_report.txt"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)
    logger.info(f"Classification report saved to {report_path}")

    # Global metrics
    metrics = {
        "f1_micro": f1_score(labels_test, preds, average="micro", zero_division=0),
        "f1_macro": f1_score(labels_test, preds, average="macro", zero_division=0),
        "f1_weighted": f1_score(labels_test, preds, average="weighted", zero_division=0),
        "precision_micro": precision_score(labels_test, preds, average="micro", zero_division=0),
        "recall_micro": recall_score(labels_test, preds, average="micro", zero_division=0),
        "subset_accuracy": accuracy_score(labels_test, preds),
    }
    metrics_path = output_dir / "test_metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Test metrics: {metrics}")

    return metrics


#Inference
def predict_all(
    data: list[Annotation],
    model_dir: Path,
    output_dir: Path,
):
    """
    Run inference on all annotated records and write predictions to CSV.
    Mirrors the output format of the original Qwen-based script.
    """
    load_dotenv()
    nocodb_annotation_table_id: str = os.environ["NOCODB_ANNOTATION_TABLE_ID"]

    # Load model + tokenizer + label mapping
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
    model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    with open(model_dir / "label_mapping.json", "r", encoding="utf-8") as f:
        label_mapping = json.load(f)
    classes = label_mapping["classes"]

    # Output CSV (same structure as original script)
    model_name_for_file = re.sub(r"[^A-Za-z0-9._-]+", "_", str(model_dir.name))
    output_file_path = (
        output_dir / f"predictions_{nocodb_annotation_table_id}_{model_name_for_file}.csv"
    )
    fieldnames = list(Annotation.model_fields.keys()) + ["predicted_category"]

    logger.info(f"Running inference on {len(data)} records...")

    from tqdm import tqdm

    with output_file_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        for record in tqdm(data, desc="Predicting", unit="rec"):
            # Tokenize
            encoding = tokenizer(
                record.comment,
                truncation=True,
                padding="max_length",
                max_length=MAX_LENGTH,
                return_tensors="pt",
            ).to(device)

            # Predict
            with torch.no_grad():
                logits = model(**encoding).logits
            probs = torch.sigmoid(logits).cpu().numpy()[0]
            predicted_labels = [classes[i] for i, p in enumerate(probs) if p >= 0.5]

            # Write row (same format as original)
            row = record.model_dump(mode="json")
            row["annotated_category"] = (
                ",".join(row["annotated_category"]) if row["annotated_category"] else None
            )
            row["predicted_category"] = ",".join(predicted_labels) if predicted_labels else None
            writer.writerow(row)
            csv_file.flush()

    logger.info(f"Predictions saved to {output_file_path}")
    return output_file_path


def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune BERT for multi-label cyberbullying classification"
    )
    parser.add_argument(
        "--base-model",
        default=DEFAULT_BASE_MODEL,
        help=f"HuggingFace model name (default: {DEFAULT_BASE_MODEL})",
    )
    parser.add_argument(
        "--predict-only",
        action="store_true",
        help="Skip training, run inference only (requires --model-dir)",
    )
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=None,
        help="Path to a previously fine-tuned model directory",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory for model and predictions",
    )
    args = parser.parse_args()

    # Directories (same data dir convention as original script)
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    if args.output_dir:
        output_dir = args.output_dir
    else:
        model_slug = re.sub(r"[^A-Za-z0-9._-]+", "_", args.base_model)
        output_dir = data_dir / f"bert_{model_slug}"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Fetch data from NocoDB (reused from original)
    data = fetch_annotated_data()

    if args.predict_only:
        # Inference only
        model_dir = args.model_dir or (output_dir / "best_model")
        if not model_dir.exists():
            raise FileNotFoundError(
                f"Model directory not found: {model_dir}. Train first or specify --model-dir."
            )
        predict_all(data, model_dir, data_dir)
    else:
        # Full pipeline: fine-tune + evaluate + predict
        texts, labels, mlb = prepare_labels(data)

        trainer, tokenizer, test_ds, texts_test, labels_test = finetune(
            texts, labels, mlb, args.base_model, output_dir
        )

        evaluate(trainer, test_ds, labels_test, mlb, output_dir)

        model_dir = output_dir / "best_model"
        predict_all(data, model_dir, data_dir)

    logger.info("Done!")


if __name__ == "__main__":
    main()
        
        
    
        
            


        
