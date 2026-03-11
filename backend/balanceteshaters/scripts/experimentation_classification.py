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
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    llm_int8_enable_fp32_cpu_offload=True,
)


PROJECT_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_BACKEND_DIR))

if __name__ == "__main__":
    from balanceteshaters.services.annotation import Annotation, AnnotationService
    from balanceteshaters.services.nocodb import NocoDBService
    from tqdm import tqdm
    
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model",
        default="Qwen/Qwen3-8B",
        help="ollama model name to use for classification",
    )
    args = parser.parse_args()
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

    data = service.get_annotations()
    total = len(data)
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    model_name_for_file = re.sub(r"[^A-Za-z0-9._-]+", "_", args.model)
    output_file_path = data_dir / f"predictions_{nocodb_annotation_table_id}_{model_name_for_file}.csv"
    fieldnames = list(Annotation.model_fields.keys()) + ["predicted_category"]
    prompt_file = Path(__file__).resolve().parent / "binary_classification_prompt_naif.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
    prompt_instructions = prompt_file.read_text(encoding="utf-8").strip()

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=bnb_config,
        device_map="auto",
        offload_folder="offload",
    )

    with output_file_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        iterator = enumerate(tqdm(data, desc="Classifying", unit="rec", total=total))
        for idx, record in iterator:
            messages = [{'role': 'user', 'content': f"{prompt_instructions} Prompt à classifier : {record.comment}"}]
            inputs = tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=True,
                return_dict=True,
                return_tensors="pt",
                enable_thinking=False,
            ).to(model.device)
            outputs = model.generate(
                **inputs,
                max_new_tokens=200,
                do_sample=False,
                pad_token_id=tokenizer.pad_token_id,
            )
            decoded = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
            output = re.sub(r"<think>.*?</think>", "", decoded, flags=re.DOTALL).strip()
            row = record.model_dump(mode="json")
            row["annotated_category"] = ",".join(row["annotated_category"]) if row["annotated_category"] else None
            row["predicted_category"] = output
            writer.writerow(row)
            csv_file.flush()
