import argparse
import logging
import os
import re
from pathlib import Path

import pandas as pd
import sklearn.metrics
from dotenv import load_dotenv

from balanceteshaters.services.nocodb import NocoDBService

load_dotenv()

# Mapping from annotated_category string values to integer class labels.
# CYBERHARCELEMENT_AUTRE and DEFINITION_GENERALE both map to 1 (general).
# SUSPECT is unmappable → None (rows are skipped during evaluation).
ANNOTATION_TO_INT: dict[str, int | None] = {
    "Absence de cyberharcèlement": 0,
    "Cyberharcèlement (définition générale)": 1,
    "Cyberharcèlement (autre)": 1,
    "Cyberharcèlement à caractère sexuel": 2,
    "Menaces": 3,
    "Incitation au suicide": 4,
    "Injure": 5,
    "Diffamation": 6,
    "Injure et diffamation publique": 7,
    "Doxxing": 8,
    "Incitation à la haine": 9,
    "Suspect": None,
}

CATEGORY_NAMES = [
    "Absence",
    "Cyberharc. général",
    "Cyberharc. sexuel",
    "Menaces",
    "Incit. suicide",
    "Injure",
    "Diffamation",
    "Injure+Diffam.",
    "Doxxing",
    "Incit. haine",
]

VALID_PREDICTED = set(str(i) for i in range(10))


def to_binary(label: int) -> int:
    """Collapse multi-class label to binary: 0 = absence, 1 = any harassment."""
    return 0 if label == 0 else 1


def annotation_to_int(annotated_category_str: str) -> int | None:
    """
    Convert a comma-separated annotated_category string to an integer label.
    For multi-label records, uses the first non-absence category.
    Returns None if no mappable category is found (e.g. only SUSPECT).
    """
    if not annotated_category_str or pd.isna(annotated_category_str):
        return None

    categories = [c.strip() for c in str(annotated_category_str).split(",")]

    # Try non-absence categories first (prefer harassment label when mixed)
    for cat in categories:
        label = ANNOTATION_TO_INT.get(cat)
        if label is not None and label != 0:
            return label

    # Fall back to absence (0) if that's the only non-None category
    for cat in categories:
        label = ANNOTATION_TO_INT.get(cat)
        if label == 0:
            return 0

    return None  # all categories were SUSPECT or unknown


def get_predictions(filepath: Path):
    """
    Read category predictions CSV and return aligned true and predicted integer labels.
    Skips rows where the true label is unmappable (SUSPECT) or predicted digit is invalid.
    """
    df = pd.read_csv(filepath)

    if "annotated_category" not in df.columns:
        raise ValueError(f"Column 'annotated_category' not found in {filepath}")
    if "predicted_category" not in df.columns:
        raise ValueError(f"Column 'predicted_category' not found in {filepath}")

    df = df[df["annotated_category"].notna()]

    df["predicted_category"] = df["predicted_category"].astype(str).str.strip()
    df = df[df["predicted_category"].isin(VALID_PREDICTED)]

    if df.empty:
        logging.warning(f"No valid rows found in {filepath}")
        return [], []

    true_values = df["annotated_category"].map(annotation_to_int).tolist()
    predicted_values = df["predicted_category"].astype(int).tolist()

    # Drop rows where true label is None/NaN (unmappable, e.g. "Suspect")
    # pandas converts None returns from .map() to float NaN, so use pd.notna()
    pairs = [(t, p) for t, p in zip(true_values, predicted_values) if pd.notna(t)]
    if not pairs:
        return [], []

    true_values, predicted_values = zip(*pairs)
    return [int(t) for t in true_values], [int(p) for p in predicted_values]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(
        description="Evaluate multi-class category classification and optionally log to NocoDB."
    )
    parser.add_argument(
        "path_to_input_csv",
        type=Path,
        help="Path to CSV file containing both annotations and predictions",
    )
    parser.add_argument(
        "--model-name",
        type=str,
        help="Model name (optional, inferred from filename if omitted)",
    )
    parser.add_argument(
        "--table-id",
        type=str,
        help="Source table ID (optional, inferred from filename if omitted)",
    )
    parser.add_argument(
        "--table-name",
        type=str,
        help="Source table name (optional, fetched from NocoDB if omitted)",
    )
    parser.add_argument(
        "--eval-table-id",
        type=str,
        default="m314zf8a56j64dl",
        help="NocoDB table ID for multiclass evaluations",
    )
    parser.add_argument("--prompt", type=str, help="Prompt text used for predictions")
    parser.add_argument(
        "--prompt-file", type=Path, help="Path to prompt file used for predictions"
    )

    args = parser.parse_args()

    input_csv_path = args.path_to_input_csv
    model_name = args.model_name
    table_id = args.table_id
    table_name = args.table_name
    prompt_text = args.prompt

    if args.prompt_file and args.prompt_file.exists():
        try:
            prompt_text = args.prompt_file.read_text(encoding="utf-8").strip()
            logging.info(f"Read prompt from {args.prompt_file}")
        except Exception as e:
            logging.error(f"Failed to read prompt file: {e}")

    # Infer table_id and model_name from filename if not provided
    # Pattern: category_predictions_{table_id}_{model_name}_{prompt_name}.csv
    filename = input_csv_path.name
    match = re.match(r"category_predictions_(?P<tid>[^_]+)_(?P<mname>.+)\.csv", filename)
    if match:
        if not table_id:
            table_id = match.group("tid")
            logging.info(f"Inferred table_id: {table_id}")
        if not model_name:
            model_name = match.group("mname")
            logging.info(f"Inferred model_name: {model_name}")

    if not model_name:
        model_name = "Unknown Model"
    if not table_id:
        table_id = "Unknown Table ID"

    # NocoDB setup (optional)
    nocodb_url = os.environ.get("NOCODB_BASE_URL")
    nocodb_token = os.environ.get("NOCODB_TOKEN")
    nocodb_base_id = os.environ.get("NOCODB_BASE_ID")
    nocodb = None
    if all([nocodb_url, nocodb_token, nocodb_base_id]):
        nocodb = NocoDBService(
            nocodb_url=nocodb_url, token=nocodb_token, base_id=nocodb_base_id
        )

    if not table_name and nocodb and table_id != "Unknown Table ID":
        try:
            info = nocodb.get_table_info(table_id)
            table_name = info.get("title", table_id)
            logging.info(f"Fetched table_name from NocoDB: {table_name}")
        except Exception:
            table_name = table_id
    elif not table_name:
        table_name = table_id

    # Compute metrics
    true_values, predicted_values = get_predictions(input_csv_path)

    if not true_values:
        logging.warning("No valid predictions to evaluate.")
    else:
        total = len(true_values)
        positives = sum(1 for t in true_values if t != 0)
        negatives = total - positives

        # --- Multi-class metrics ---
        present_labels = sorted(set(true_values) | set(predicted_values))
        present_names = [CATEGORY_NAMES[i] for i in present_labels]

        report = sklearn.metrics.classification_report(
            true_values,
            predicted_values,
            labels=present_labels,
            target_names=present_names,
            zero_division=0,
        )
        accuracy = sklearn.metrics.accuracy_score(true_values, predicted_values)
        macro_p, macro_r, macro_f1, _ = sklearn.metrics.precision_recall_fscore_support(
            true_values, predicted_values, average="macro", zero_division=0
        )

        # --- Binary metrics (collapse 0 vs ≥1) ---
        true_binary = [to_binary(t) for t in true_values]
        pred_binary = [to_binary(p) for p in predicted_values]
        binary_accuracy = sklearn.metrics.accuracy_score(true_binary, pred_binary)
        binary_precision = sklearn.metrics.precision_score(true_binary, pred_binary, zero_division=0)
        binary_recall = sklearn.metrics.recall_score(true_binary, pred_binary, zero_division=0)
        binary_f1 = sklearn.metrics.f1_score(true_binary, pred_binary, zero_division=0)

        # --- Boundary error rate: predictions that cross the 0/≥1 line ---
        boundary_errors = sum(
            1 for t, p in zip(true_binary, pred_binary) if t != p
        )
        boundary_error_rate = boundary_errors / total

        logging.info(f"\nResults for {model_name} on {table_name} ({total} samples):")
        logging.info(f"\n{report}")
        logging.info(f"Multi-class accuracy: {accuracy:.4f}  |  macro P: {macro_p:.4f}  R: {macro_r:.4f}  F1: {macro_f1:.4f}")
        logging.info(f"Binary  (0 vs ≥1)   accuracy: {binary_accuracy:.4f}  P: {binary_precision:.4f}  R: {binary_recall:.4f}  F1: {binary_f1:.4f}")
        logging.info(f"Boundary error rate : {boundary_error_rate:.4f}  ({boundary_errors}/{total} samples crossed 0/≥1 line)")

        if nocodb:
            try:
                data = {
                    "model_name": model_name,
                    "table_id": table_id,
                    "table_name": table_name,
                    "prompt": prompt_text,
                    "total_samples": total,
                    "positive_samples": positives,
                    "negative_samples": negatives,
                    # Binary (0 vs ≥1) — same field names as Binary_evaluations table
                    "precision": binary_precision,
                    "recall": binary_recall,
                    "f1": binary_f1,
                    "accuracy": binary_accuracy,
                    # Multi-class macro avg
                    "macro_precision": macro_p,
                    "macro_recall": macro_r,
                    "macro_f1": macro_f1,
                    "multiclass_accuracy": accuracy,
                    # Boundary penalty
                    "boundary_error_rate": boundary_error_rate,
                }
                nocodb.create_record(args.eval_table_id, data)
                logging.info("Successfully logged evaluation to NocoDB.")
            except Exception as e:
                logging.error(f"Failed to log to NocoDB: {e}")
        else:
            logging.warning("NocoDB environment variables not set. Skipping logging.")
