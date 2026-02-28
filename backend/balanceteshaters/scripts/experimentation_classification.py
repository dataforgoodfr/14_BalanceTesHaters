# -*- coding: utf-8 -*-
"""
Created on Wed Feb 18 18:20:41 2026

@author: cindy
"""
import os
import argparse
import csv
from pathlib import Path
import sys
from dotenv import load_dotenv
import re
from ollama import chat

# Allow running this file directly while keeping package imports working.
PROJECT_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_BACKEND_DIR))

if __name__ == "__main__":
    from compute_annotation_stats import Annotation, NocoDBService
    from tqdm import tqdm
    
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        default="qwen3:1.7b",
        help="ollama model name to use for classification",
    )

    args = parser.parse_args()

    load_dotenv()
    nocodb_base_url: str = os.environ["NOCODB_BASE_URL"]
    nocodb_annotation_table_id: str = os.environ["NOCODB_ANNOTATION_TABLE_ID"]
    nocodb_token: str = os.environ["NOCODB_TOKEN"]
    service = NocoDBService(
        base_url=nocodb_base_url,
        annotation_table_id=nocodb_annotation_table_id,
        token=nocodb_token
    )

    data = service.get_annotations()
    total = len(data)

    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    model_name_for_file = re.sub(r"[^A-Za-z0-9._-]+", "_", args.model)
    output_file_path = data_dir / f"predictions_{nocodb_annotation_table_id}_{model_name_for_file}.csv"
    fieldnames = list(Annotation.model_fields.keys()) + ["predicted_category"]

    # Load prompt instructions from external file
    prompt_file = Path(__file__).resolve().parent / "binary_classification_prompt.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
    prompt_instructions = prompt_file.read_text(encoding="utf-8").strip()

    with output_file_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()

        iterator = enumerate(tqdm(data, desc="Classifying", unit="rec", total=total))

        for idx, record in iterator:
            response = chat(
                model=args.model,
                messages=[{'role': 'user', 'content': f"{prompt_instructions} Prompt à classifier : {record.comment}"}],
            )
            content = response.message.content
            output = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
            row = record.model_dump(mode="json")
            row["annotated_category"] = ",".join(row["annotated_category"]) if row["annotated_category"] else None
            row["predicted_category"] = output
            writer.writerow(row)
            csv_file.flush()
