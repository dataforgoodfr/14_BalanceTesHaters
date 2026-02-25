# -*- coding: utf-8 -*-
"""
Created on Wed Feb 18 18:20:41 2026

@author: cindy
"""
import os
import argparse
from dotenv import load_dotenv
import re
from ollama import chat
from compute_annotation_stats import AnnotatedCategory, AnnotationConfidence, Annotation, NocoDBService

if __name__ == "__main__":
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

    total_count = service.count_annotations()
    
    data=service.get_annotations()
    for record in data:
        response = chat(
            model=args.model,
            messages=[{'role': 'user', 'content': "Classifie le prompt dans une des catégories et ne répond qu'avec la catégorie choisie, aucun texte autre que le nom de catégorie : 'ABSENCE_DE_CYBERHARCELEMENT', 'CYBERHARCELEMENT_DEFINITION_GENERALE', 'CYBERHARCELEMENT_A_CARACTERE_SEXUEL, 'MENACES', ''INCITATION_AU_SUICIDE', 'INJURE_ET_DIFFAMATION_PUBLIQUE', 'DOXXING', ''INCITATION_A_LA_HAINE'. Prompt à classifier :"+str(record.comment)}],
        )
        content=response.message.content
        output = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
        print(record.comment,output)
    



