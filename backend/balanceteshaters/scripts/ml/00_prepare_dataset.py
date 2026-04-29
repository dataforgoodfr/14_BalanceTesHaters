# ruff: noqa: E402
import argparse
import os
import sys
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from balanceteshaters.services.annotation import AnnotationService, BinaryConfidence
from balanceteshaters.services.nocodb import NocoDBService
from balanceteshaters.scripts.ml.config import ANNOTATION_TABLE_ID, DATA_DIR, compute_binary_label


def main():
    parser = argparse.ArgumentParser(description="Prepare train/val/test splits from NocoDB annotations")
    parser.add_argument("--high-confidence-only", action="store_true", help="Keep only HIGH_CONFIDENCE annotations")
    args = parser.parse_args()

    load_dotenv()
    nocodb = NocoDBService(
        nocodb_url=os.environ["NOCODB_BASE_URL"],
        token=os.environ["NOCODB_TOKEN"],
        base_id=os.environ["NOCODB_BASE_ID"],
    )
    service = AnnotationService(nocodb=nocodb, annotation_table_id=ANNOTATION_TABLE_ID)

    print("Fetching annotations from NocoDB...")
    annotations = service.fetch_records_paginated()
    print(f"  Total records fetched: {len(annotations)}")

    rows = []
    for ann in annotations:
        if not ann.annotated_category:
            continue
        if args.high_confidence_only and ann.binary_confidence != BinaryConfidence.HIGH_CONFIDENCE:
            continue
        cats = [c.value for c in ann.annotated_category]
        label = compute_binary_label(cats)
        if label is None:
            continue
        rows.append({
            "id": ann.id,
            "comment": ann.comment,
            "label": label,
            "annotated_category": ",".join(cats),
            "binary_confidence": ann.binary_confidence.value if ann.binary_confidence else None,
            "source": "real",
        })

    df = pd.DataFrame(rows)
    print(f"  Usable annotated records: {len(df)}")
    print(f"  Label distribution: {df['label'].value_counts().to_dict()}")

    train_val, test = train_test_split(df, test_size=0.15, stratify=df["label"], random_state=42)
    train, val = train_test_split(train_val, test_size=0.15 / 0.85, stratify=train_val["label"], random_state=42)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    train.to_parquet(DATA_DIR / "train_real.parquet", index=False)
    val.to_parquet(DATA_DIR / "val.parquet", index=False)
    test.to_parquet(DATA_DIR / "test.parquet", index=False)

    print(f"\nSplits saved to {DATA_DIR}")
    for name, split in [("train_real", train), ("val", val), ("test", test)]:
        dist = split["label"].value_counts().to_dict()
        print(f"  {name}: {len(split)} rows  label dist={dist}")


if __name__ == "__main__":
    main()
