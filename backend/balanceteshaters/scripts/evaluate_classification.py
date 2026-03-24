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


def get_predictions(filepath: Path):
    """
    Read predictions from CSV and return true and predicted labels.
    Uses pandas instead of polars.
    """
    df = pd.read_csv(filepath)

    # Filter out un-annotated lines
    if "annotated_category" not in df.columns:
        raise ValueError(f"Column 'annotated_category' not found in {filepath}")

    df = df[df["annotated_category"].notna()]

    # Filter out rows with a predicted value other than 0 or 1
    if "predicted_category" not in df.columns:
        raise ValueError(f"Column 'predicted_category' not found in {filepath}")

    # Ensure predicted_category is string for filtering then int
    df["predicted_category"] = df["predicted_category"].astype(str).str.strip()
    df = df[df["predicted_category"].isin(["0", "1"])]

    if df.empty:
        logging.warning(f"No valid annotated/predicted rows found in {filepath}")
        return [], []

    # True labels: 1 if harassment, 0 if absence
    # (Absence de cyberharcèlement -> 0, anything else -> 1)
    true_values = (
        (~df["annotated_category"].str.contains("Absence de cyberharcèlement"))
        .astype(int)
        .tolist()
    )
    predicted_values = df["predicted_category"].astype(int).tolist()

    return true_values, predicted_values


def evaluate_classification(filepath: Path):
    """Compute classification metrics."""
    true_values, predicted_values = get_predictions(filepath)

    if not true_values:
        return 0.0, 0.0, 0.0, 0.0, 0, 0, 0

    precision = sklearn.metrics.precision_score(
        true_values, predicted_values, zero_division=0
    )
    recall = sklearn.metrics.recall_score(
        true_values, predicted_values, zero_division=0
    )
    f1 = sklearn.metrics.f1_score(true_values, predicted_values, zero_division=0)
    accuracy = sklearn.metrics.accuracy_score(true_values, predicted_values)

    total = len(true_values)
    positives = sum(true_values)
    negatives = total - positives

    return f1, recall, precision, accuracy, total, positives, negatives


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser(
        description="Evaluate classification and log results to NocoDB"
    )
    parser.add_argument(
        "path_to_input_csv",
        type=Path,
        help="Path to csv file containing both annotations and predictions",
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
        default="m0ww7qnx69u9r1a",
        help="NocoDB table ID for evaluations",
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

    # Inferred values from filename if missing
    # Pattern: predictions_{table_id}_{model_name}.csv
    filename = input_csv_path.name
    match = re.match(r"predictions_(?P<tid>[^_]+)_(?P<mname>.+)\.csv", filename)

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

    # Log to NocoDB Setup
    nocodb_url = os.environ.get("NOCODB_BASE_URL")
    nocodb_token = os.environ.get("NOCODB_TOKEN")
    nocodb_base_id = os.environ.get("NOCODB_BASE_ID")
    nocodb = None

    if all([nocodb_url, nocodb_token, nocodb_base_id]):
        nocodb = NocoDBService(
            nocodb_url=nocodb_url, token=nocodb_token, base_id=nocodb_base_id
        )

    # Fetch table name if still missing
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
    f1, recall, precision, accuracy, total, pos, neg = evaluate_classification(
        input_csv_path
    )

    logging.info(f"Results for {model_name} on {table_name}:")
    logging.info(
        f"F1: {f1:.4f}, Recall: {recall:.4f}, Precision: {precision:.4f}, Accuracy: {accuracy:.4f}"
    )
    logging.info(f"Samples: {total} (Pos: {pos}, Neg: {neg})")

    if nocodb:
        try:
            data = {
                "model_name": model_name,
                "table_id": table_id,
                "table_name": table_name,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "accuracy": accuracy,
                "total_samples": total,
                "positive_samples": pos,
                "negative_samples": neg,
                "prompt": prompt_text,
            }

            nocodb.create_record(args.eval_table_id, data)
            logging.info("Successfully logged evaluation to NocoDB.")
        except Exception as e:
            logging.error(f"Failed to log to NocoDB: {e}")
    else:
        logging.warning("NocoDB environment variables not set. Skipping logging.")
