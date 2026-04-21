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

# Conditional imports for backends
def get_transformers_model(model_id):
    from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
    import torch
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        llm_int8_enable_fp32_cpu_offload=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        offload_folder="offload",
    )
    return tokenizer, model

def classify_transformers(tokenizer, model, prompt_instructions, comment):
    messages = [{'role': 'user', 'content': f"{prompt_instructions} Prompt à classifier : {comment}"}]
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
        # Some versions of transformers might not support enable_thinking
    ).to(model.device)
    
    # Check if enable_thinking is supported in apply_chat_template for this version
    # If it fails, we fall back to manual stripping which is already implemented below
    
    outputs = model.generate(
        **inputs,
        max_new_tokens=200,
        do_sample=False,
        pad_token_id=tokenizer.pad_token_id,
    )
    decoded = tokenizer.decode(outputs[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True)
    return decoded

def classify_ollama(model_id, prompt_instructions, comment):
    import ollama
    prompt_content = f"{prompt_instructions} Prompt à classifier : {comment}"
    response = ollama.chat(
        model=model_id,
        messages=[{'role': 'user', 'content': prompt_content}],
        options={'temperature': 0.0},
        think=False,
    )
    return response['message']['content']

def get_mlx_model(model_id):
    from mlx_lm import load
    model, tokenizer = load(model_id)
    return model, tokenizer

def classify_mlx(model, tokenizer, prompt_instructions, comment):
    from mlx_lm import generate
    messages = [{'role': 'user', 'content': f"{prompt_instructions} Prompt à classifier : {comment}"}]
    if hasattr(tokenizer, "apply_chat_template"):
        prompt = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
    else:
        prompt = f"{prompt_instructions} Prompt à classifier : {comment}"
    return generate(model, tokenizer, prompt=prompt, max_tokens=512, verbose=False)

def extract_binary_output(raw_output):
    # Remove complete <think>...</think> blocks
    output = re.sub(r"<think>.*?</think>", "", raw_output, flags=re.DOTALL).strip()
    # Remove unclosed <think> blocks (model truncated mid-thought)
    output = re.sub(r"<think>.*", "", output, flags=re.DOTALL).strip()
    # Extract first digit found if model is talkative
    digits = [ch for ch in output if ch in ("0", "1")]
    return digits[0] if digits else "0"

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
        default="Qwen/Qwen3-1.7B",
        help="model name to use for classification",
    )
    parser.add_argument(
        "--backend",
        choices=["transformers", "ollama", "mlx"],
        default="transformers",
        help="Backend to use for inference",
    )
    parser.add_argument(
        "--truncate",
        type=int,
        default=None,
        help="Truncate comments to this many characters before inference",
    )
    parser.add_argument(
        "--prompt-file",
        type=str,
        default="balanceteshaters/scripts/binary_classification_prompt_naif.txt",
        help="Path to the prompt instructions file",
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

    data = service.fetch_records_paginated()

    # Keep only records which are annotated
    data = [annotation for annotation in data if annotation.annotated_category]

    total = len(data)
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    model_name_for_file = re.sub(r"[^A-Za-z0-9._-]+", "_", args.model)
    prompt_file = Path(args.prompt_file)
    if not prompt_file.is_absolute():
        prompt_file = PROJECT_BACKEND_DIR / args.prompt_file
    
    if not prompt_file.exists():
        # Try relative to the script
        prompt_file = Path(__file__).resolve().parent / Path(args.prompt_file).name
        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt file not found: {args.prompt_file}")
            
    prompt_name = prompt_file.stem
    output_file_path = data_dir / f"predictions_{nocodb_annotation_table_id}_{model_name_for_file}_{prompt_name}.csv"
    fieldnames = list(Annotation.model_fields.keys()) + ["predicted_category"]
    prompt_instructions = prompt_file.read_text(encoding="utf-8").strip()


    tokenizer = None
    model = None
    if args.backend == "transformers":
        tokenizer, model = get_transformers_model(args.model)
    elif args.backend == "mlx":
        model, tokenizer = get_mlx_model(args.model)

    with output_file_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        iterator = enumerate(tqdm(data, desc=f"Classifying ({args.backend})", unit="rec", total=total))
        for idx, record in iterator:
            try:
                comment = record.comment[:args.truncate] if args.truncate else record.comment
                if args.backend == "transformers":
                    raw_output = classify_transformers(tokenizer, model, prompt_instructions, comment)
                elif args.backend == "mlx":
                    raw_output = classify_mlx(model, tokenizer, prompt_instructions, comment)
                else:
                    raw_output = classify_ollama(args.model, prompt_instructions, comment)
                
                final_output = extract_binary_output(raw_output)
            except Exception as e:
                print(f"Error classifying record {record.id}: {e}")
                final_output = "0"

            row = record.model_dump(mode="json")
            row["annotated_category"] = ",".join(row["annotated_category"]) if row["annotated_category"] else None
            row["predicted_category"] = final_output
            writer.writerow(row)
            csv_file.flush()

