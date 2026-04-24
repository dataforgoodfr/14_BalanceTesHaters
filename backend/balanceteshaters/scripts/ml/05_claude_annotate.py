# ruff: noqa: E402
"""
Auto-annotate unannotated comments using Claude API, with agreement evaluation.

Modes:
  evaluate  — Run Claude on a subsample of manually-annotated rows, measure agreement
              against human labels to build confidence before using for training.
  annotate  — Fetch unannotated rows, classify with Claude, save to parquet.

Usage:
  python 05_claude_annotate.py --mode evaluate --n 100
  python 05_claude_annotate.py --mode annotate --limit 500 --dry-run
  python 05_claude_annotate.py --mode annotate --limit 500
"""
import argparse
import json
import os
import random
import re
import sys
from pathlib import Path

import anthropic
import pandas as pd
from dotenv import load_dotenv

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from balanceteshaters.scripts.ml.config import ANNOTATION_TABLE_ID, DATA_DIR
from balanceteshaters.services.annotation import AnnotatedCategory, AnnotationService
from balanceteshaters.services.nocodb import NocoDBService

# Sonnet pricing per million tokens
SONNET_INPUT_PRICE = 3.00
SONNET_OUTPUT_PRICE = 15.00
SONNET_CACHE_WRITE_PRICE = 3.75
SONNET_CACHE_READ_PRICE = 0.30

CATEGORIES = [c.value for c in AnnotatedCategory]
HARASSMENT_CATEGORIES = [c for c in CATEGORIES if c != "Absence de cyberharcèlement"]

SYSTEM_PROMPT = f"""Tu es un expert en modération de contenu et en sécurité en ligne. Tu analyses des commentaires de réseaux sociaux français (Instagram, TikTok, YouTube, Twitter) pour détecter le cyberharcèlement.

Pour chaque commentaire, tu dois choisir la catégorie la plus appropriée parmi :
{chr(10).join(f'- {c}' for c in CATEGORIES)}

Définitions :
- Absence de cyberharcèlement : commentaire anodin, critique constructive, humour bienveillant, opinion sans agressivité
- Cyberharcèlement (définition générale) : harcèlement en ligne ne rentrant pas dans une catégorie spécifique
- Cyberharcèlement (autre) : forme de harcèlement non couverte par les autres catégories
- Cyberharcèlement à caractère sexuel : harcèlement sexuel, slut-shaming, commentaires dégradants sur le corps/sexualité
- Menaces : menaces directes ou voilées de violence physique, intimidation
- Incitation au suicide : encouragement à se suicider ou se blesser
- Injure : insulte directe, terme offensant, dénigrement
- Diffamation : fausses accusations destinées à nuire à la réputation
- Injure et diffamation publique : combinaison d'injure et diffamation
- Doxxing : publication ou menace de publication d'informations privées
- Incitation à la haine : appel à la haine envers un groupe (racisme, homophobie, etc.)
- Suspect : commentaire ambigu nécessitant une vérification humaine

Points importants :
- L'ironie, le sarcasme et les emojis péjoratifs peuvent constituer du cyberharcèlement même sans insulte directe
- Un commentaire qui semble superficiellement bénin peut être du harcèlement selon le contexte
- Si tu n'es pas certain, utilise "Suspect"

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après :
{{"category": "<catégorie exacte>", "binary_label": <0 ou 1>, "confidence": "<high ou low>", "reasoning": "<explication courte en français>"}}

binary_label : 0 = Absence de cyberharcèlement, 1 = toute forme de cyberharcèlement"""


def classify_comment(client: anthropic.Anthropic, comment: str, tokens_used: dict) -> dict | None:
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"Commentaire : {comment}"}],
        )
        tokens_used["input"] += response.usage.input_tokens
        tokens_used["output"] += response.usage.output_tokens
        if hasattr(response.usage, "cache_read_input_tokens"):
            tokens_used["cache_read"] += response.usage.cache_read_input_tokens
        if hasattr(response.usage, "cache_creation_input_tokens"):
            tokens_used["cache_write"] += response.usage.cache_creation_input_tokens

        text = response.content[0].text.strip()
        # Strip markdown code blocks if present
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
        result = json.loads(text)

        # Validate category
        if result.get("category") not in CATEGORIES:
            result["category"] = "Suspect"
            result["binary_label"] = 1
        return result

    except Exception as e:
        print(f"  [warn] Classification failed: {e}")
        return None


def compute_cost(tokens_used: dict) -> float:
    return (
        tokens_used["input"] * SONNET_INPUT_PRICE
        + tokens_used["output"] * SONNET_OUTPUT_PRICE
        + tokens_used.get("cache_write", 0) * SONNET_CACHE_WRITE_PRICE
        + tokens_used.get("cache_read", 0) * SONNET_CACHE_READ_PRICE
    ) / 1_000_000


def mode_evaluate(service: AnnotationService, client: anthropic.Anthropic, n: int):
    """Sample n manually-annotated rows, run Claude blind, measure agreement."""
    import sklearn.metrics

    print("Fetching annotated records...")
    all_annotated = service.fetch_records_paginated()
    all_annotated = [a for a in all_annotated if a.annotated_category]
    print(f"  Found {len(all_annotated)} annotated records")

    sample = random.sample(all_annotated, min(n, len(all_annotated)))
    print(f"  Evaluating on {len(sample)} randomly sampled records\n")

    tokens_used = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}
    rows = []

    for i, ann in enumerate(sample):
        result = classify_comment(client, ann.comment, tokens_used)
        if result is None:
            continue

        # Human binary label
        cats = [c.value for c in ann.annotated_category]
        human_binary = 0 if any("Absence de cyberharcèlement" in c for c in cats) else 1
        claude_binary = result.get("binary_label", 1)

        rows.append({
            "id": ann.id,
            "comment": ann.comment[:120],
            "human_category": cats[0] if cats else "?",
            "human_binary": human_binary,
            "claude_category": result.get("category"),
            "claude_binary": claude_binary,
            "claude_confidence": result.get("confidence"),
            "claude_reasoning": result.get("reasoning", ""),
            "agree": human_binary == claude_binary,
        })

        if (i + 1) % 10 == 0:
            cost_so_far = compute_cost(tokens_used)
            print(f"  {i+1}/{len(sample)}  cost so far: ${cost_so_far:.3f}")

    df = pd.DataFrame(rows)
    y_true = df["human_binary"].values
    y_pred = df["claude_binary"].values

    acc = sklearn.metrics.accuracy_score(y_true, y_pred)
    f1 = sklearn.metrics.f1_score(y_true, y_pred, zero_division=0)
    prec = sklearn.metrics.precision_score(y_true, y_pred, zero_division=0)
    rec = sklearn.metrics.recall_score(y_true, y_pred, zero_division=0)
    kappa = sklearn.metrics.cohen_kappa_score(y_true, y_pred)

    print(f"\n{'='*60}")
    print(f"Agreement metrics (Claude vs human, n={len(df)})")
    print(f"{'='*60}")
    print(f"  Accuracy : {acc:.4f}")
    print(f"  F1       : {f1:.4f}  (P={prec:.4f}  R={rec:.4f})")
    print(f"  Kappa    : {kappa:.4f}  {'(substantial)' if kappa > 0.6 else '(moderate)' if kappa > 0.4 else '(fair)'}")

    print("\nConfusion matrix (rows=human, cols=claude):")
    cm = sklearn.metrics.confusion_matrix(y_true, y_pred)
    print("              Claude=0  Claude=1")
    print(f"  Human=0       {cm[0,0]:5}     {cm[0,1]:5}")
    print(f"  Human=1       {cm[1,0]:5}     {cm[1,1]:5}")

    disagree_df = df[~df["agree"]].head(20)
    if not disagree_df.empty:
        print(f"\nDisagreements (first {len(disagree_df)}):")
        print(f"{'Comment':<60} {'Human':>6} {'Claude':>6} {'Conf':<6} Reasoning")
        print("-" * 120)
        for _, row in disagree_df.iterrows():
            print(f"{row['comment'][:58]:<60} {row['human_binary']:>6} {row['claude_binary']:>6} {row['claude_confidence']:<6} {row['claude_reasoning'][:60]}")

    total_cost = compute_cost(tokens_used)
    print(f"\nAPI cost: ${total_cost:.4f}  (tokens in={tokens_used['input']}, out={tokens_used['output']}, cache_read={tokens_used['cache_read']})")

    out_path = DATA_DIR / "claude_evaluate_agreement.parquet"
    df.to_parquet(out_path, index=False)
    print(f"Full results saved to {out_path}")


def mode_annotate(service: AnnotationService, client: anthropic.Anthropic, limit: int, dry_run: bool):
    """Fetch unannotated rows, classify with Claude, save to parquet."""
    print("Fetching all records...")
    all_records = service.fetch_records_paginated()
    unannotated = [a for a in all_records if not a.annotated_category]
    print(f"  Total records: {len(all_records)}")
    print(f"  Unannotated: {len(unannotated)}")

    to_annotate = unannotated[:limit]
    print(f"  Will annotate: {len(to_annotate)}")

    # Cost estimate: ~400 tokens system (cached after first) + ~20 tokens per comment
    n_calls = len(to_annotate)
    est_input = 400 + 20 * n_calls  # first call full, rest cache hits
    est_output = 60 * n_calls
    est_cost = (est_input * SONNET_INPUT_PRICE + est_output * SONNET_OUTPUT_PRICE + 400 * SONNET_CACHE_WRITE_PRICE) / 1_000_000
    print(f"  Estimated cost: ~${est_cost:.3f}")

    if dry_run:
        print("\n[dry-run] No API calls made.")
        return

    tokens_used = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}
    rows = []

    for i, ann in enumerate(to_annotate):
        result = classify_comment(client, ann.comment, tokens_used)
        if result is None:
            continue

        rows.append({
            "id": ann.id,
            "comment": ann.comment,
            "claude_category": result.get("category"),
            "claude_binary_label": result.get("binary_label", 1),
            "claude_confidence": result.get("confidence"),
            "claude_reasoning": result.get("reasoning", ""),
            "label": result.get("binary_label", 1),
            "annotated_category": result.get("category"),
            "binary_confidence": None,
            "source": "claude_annotated",
        })

        if (i + 1) % 25 == 0:
            print(f"  {i+1}/{len(to_annotate)}  cost: ${compute_cost(tokens_used):.3f}")

    df = pd.DataFrame(rows)
    out_path = DATA_DIR / "claude_annotated.parquet"
    df.to_parquet(out_path, index=False)

    total_cost = compute_cost(tokens_used)
    label_dist = df["label"].value_counts().to_dict()
    print("\n=== Done ===")
    print(f"  Annotated: {len(df)} comments")
    print(f"  Label distribution: {label_dist}")
    print(f"  API cost: ${total_cost:.4f}")
    print(f"  Saved to {out_path}")
    print(f"\nNext: review {out_path.name}, then run 00_prepare_dataset.py to rebuild train splits.")


def main():
    parser = argparse.ArgumentParser(description="Claude-based annotation and agreement evaluation")
    parser.add_argument("--mode", choices=["evaluate", "annotate"], required=True)
    parser.add_argument("--n", type=int, default=100, help="[evaluate] Number of annotated rows to sample")
    parser.add_argument("--limit", type=int, default=500, help="[annotate] Max unannotated rows to process")
    parser.add_argument("--dry-run", action="store_true", help="[annotate] Show cost estimate only")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    load_dotenv()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set.")
        sys.exit(1)

    nocodb = NocoDBService(
        nocodb_url=os.environ["NOCODB_BASE_URL"],
        token=os.environ["NOCODB_TOKEN"],
        base_id=os.environ["NOCODB_BASE_ID"],
    )
    service = AnnotationService(nocodb=nocodb, annotation_table_id=ANNOTATION_TABLE_ID)
    client = anthropic.Anthropic(api_key=api_key)

    if args.mode == "evaluate":
        mode_evaluate(service, client, args.n)
    else:
        mode_annotate(service, client, args.limit, args.dry_run)


if __name__ == "__main__":
    main()
