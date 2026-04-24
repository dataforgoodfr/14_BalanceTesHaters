# ruff: noqa: E402
"""
Generate synthetic French social media comments for minority harassment categories.
Produces synthetic.parquet and train_augmented.parquet (train_real + synthetic).

Improvements over v1:
  - Bigger model (Sonnet by default) for higher-quality, more nuanced output
  - Harder examples: subtle language, indirect threats, edge cases near category boundaries
  - Few-shot grounding: real examples from train set included in each prompt
"""
import argparse
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

from balanceteshaters.scripts.ml.config import DATA_DIR

# Pricing per million tokens (as of 2025)
MODEL_PRICING = {
    "claude-haiku-4-5-20251001":  {"input": 0.80,  "output": 4.00,  "cache_write": 1.00,  "cache_read": 0.08},
    "claude-sonnet-4-6":          {"input": 3.00,  "output": 15.00, "cache_write": 3.75,  "cache_read": 0.30},
    "claude-opus-4-7":            {"input": 15.00, "output": 75.00, "cache_write": 18.75, "cache_read": 1.50},
}

TOTAL_TARGET = 1000
BATCH_SIZE = 10
FEW_SHOT_PER_CATEGORY = 5  # real examples to include in each generation prompt

CATEGORY_DESCRIPTIONS = {
    "Doxxing": "publication ou menace de publication d'informations privées (adresse, lieu de travail, numéro de téléphone, photo personnelle, identité réelle)",
    "Incitation au suicide": "encouragement à se suicider ou à se blesser soi-même, messages du type 'tue-toi', 'va mourir', 'le monde irait mieux sans toi'",
    "Cyberharcèlement à caractère sexuel": "harcèlement de nature sexuelle, propositions non sollicitées, slut-shaming, menaces sexuelles, commentaires dégradants sur le corps ou la sexualité",
    "Menaces": "menaces directes ou voilées de violence physique, intimidation, messages impliquant des représailles",
    "Incitation à la haine": "appels à la haine envers un groupe (racisme, homophobie, islamophobie, antisémitisme, transphobie, etc.), déshumanisation",
    "Absence de cyberharcèlement": "commentaire anodin, critique constructive, expression d'une opinion sans agressivité, humour bienveillant, désaccord poli",
}

SYSTEM_PROMPT = """Tu es un expert en modération de contenu et en sécurité en ligne. Tu génères des exemples de commentaires de réseaux sociaux en français pour entraîner des modèles de détection de cyberharcèlement.

Les commentaires doivent être réalistes et variés :
- Style : argot, verlan, abréviations SMS, emojis, fautes d'orthographe intentionnelles, mélange français/anglais
- Longueur : courts à moyens (5-80 mots), comme on en trouve sur Instagram, TikTok ou Twitter
- Difficulté : inclure un mélange d'exemples évidents ET d'exemples subtils/ambigus qui nécessitent une lecture attentive pour être classifiés
- Pour les catégories de harcèlement : certains doivent utiliser un langage indirect, des métaphores, du sous-entendu, ou du codé plutôt que des insultes directes
- Pour l'absence de harcèlement : inclure des cas qui ressemblent superficiellement à du harcèlement mais n'en sont pas (critique légitime, humour, sarcasme bienveillant)

IMPORTANT : génère UNIQUEMENT des commentaires bruts, sans explication ni méta-commentaire. Chaque commentaire sur une ligne séparée. Numérote-les de 1 à N."""


def estimate_cost(model: str, allocation: dict[str, int], n_shots: int) -> float:
    pricing = MODEL_PRICING[model]
    n_categories = len(allocation)
    total_calls = sum(-(-v // BATCH_SIZE) for v in allocation.values())
    avg_system_tokens = 350
    avg_shots_tokens = n_shots * 20  # ~20 tokens per real example
    avg_user_tokens = 80 + avg_shots_tokens
    avg_output_tokens = BATCH_SIZE * 30

    # First call per category writes the system prompt to cache; subsequent calls hit cache
    cache_write_calls = n_categories
    cache_read_calls = max(0, total_calls - n_categories)

    cost = (
        (cache_write_calls * avg_system_tokens * pricing["cache_write"]
         + cache_read_calls * avg_system_tokens * pricing["cache_read"]
         + total_calls * avg_user_tokens * pricing["input"]
         + total_calls * avg_output_tokens * pricing["output"])
        / 1_000_000
    )
    return cost


def allocate_examples(train_df: pd.DataFrame) -> dict[str, int]:
    benign_count = TOTAL_TARGET // 5  # 200 benign
    harassment_count = TOTAL_TARGET - benign_count  # 800 harassment

    harassment_cats = [c for c in CATEGORY_DESCRIPTIONS if c != "Absence de cyberharcèlement"]
    per_cat = harassment_count // len(harassment_cats)
    remainder = harassment_count % len(harassment_cats)

    allocation = {cat: per_cat for cat in harassment_cats}
    for i, cat in enumerate(harassment_cats[:remainder]):
        allocation[cat] += 1
    allocation["Absence de cyberharcèlement"] = benign_count
    return allocation


def get_real_examples(train_df: pd.DataFrame, category: str, n: int) -> list[str]:
    """Sample up to n real training examples for a given category."""
    col = "annotated_category"
    if col not in train_df.columns:
        return []
    subset = train_df[train_df[col] == category]["comment"].dropna().tolist()
    if not subset:
        # fall back: for benign, use label=0; for harassment, label=1
        label = 0 if category == "Absence de cyberharcèlement" else 1
        subset = train_df[train_df["label"] == label]["comment"].dropna().tolist()
    return random.sample(subset, min(n, len(subset)))


def generate_batch(
    client: anthropic.Anthropic,
    category: str,
    n: int,
    real_examples: list[str],
    tokens_used: dict,
    model: str,
) -> list[str]:
    description = CATEGORY_DESCRIPTIONS[category]

    shots_block = ""
    if real_examples:
        formatted = "\n".join(f"  • {ex[:150]}" for ex in real_examples)
        shots_block = f"\nExemples RÉELS de cette catégorie (pour calibrer le style et la difficulté) :\n{formatted}\n\nGénère des commentaires DIFFÉRENTS de ces exemples mais de style et difficulté similaires.\n"

    user_msg = (
        f"Catégorie : **{category}**\n"
        f"Description : {description}\n"
        f"{shots_block}\n"
        f"Génère exactement {n} commentaires, numérotés de 1 à {n}."
    )

    response = client.messages.create(
        model=model,
        max_tokens=n * 80 + 150,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    tokens_used["input"] += response.usage.input_tokens
    tokens_used["output"] += response.usage.output_tokens
    if hasattr(response.usage, "cache_read_input_tokens"):
        tokens_used["cache_read"] += response.usage.cache_read_input_tokens
    if hasattr(response.usage, "cache_creation_input_tokens"):
        tokens_used["cache_write"] += response.usage.cache_creation_input_tokens

    lines = response.content[0].text.strip().split("\n")
    comments = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        cleaned = re.sub(r"^\d+[.)]\s*", "", line).strip()
        if cleaned:
            comments.append(cleaned)
    return comments[:n]


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic French harassment comments")
    parser.add_argument("--dry-run", action="store_true", help="Print allocation and cost estimate only")
    parser.add_argument(
        "--model",
        choices=list(MODEL_PRICING.keys()),
        default="claude-sonnet-4-6",
        help="Anthropic model to use for generation",
    )
    parser.add_argument("--total", type=int, default=TOTAL_TARGET, help="Total examples to generate")
    args = parser.parse_args()

    load_dotenv()

    train_path = DATA_DIR / "train_real.parquet"
    if not train_path.exists():
        print(f"ERROR: {train_path} not found. Run 00_prepare_dataset.py first.")
        sys.exit(1)

    train_df = pd.read_parquet(train_path)
    allocation = allocate_examples(train_df)
    # Rescale if --total was overridden
    if args.total != TOTAL_TARGET:
        scale = args.total / TOTAL_TARGET
        allocation = {k: max(1, round(v * scale)) for k, v in allocation.items()}

    cost_estimate = estimate_cost(args.model, allocation, FEW_SHOT_PER_CATEGORY)

    print(f"=== Synthetic data allocation ({sum(allocation.values())} total) ===")
    for cat, n in allocation.items():
        real_count = len(train_df[train_df["annotated_category"] == cat]) if "annotated_category" in train_df.columns else "?"
        print(f"  {cat}: {n} synthetic  (real in train: {real_count})")
    print(f"\nModel: {args.model}")
    print(f"Few-shot examples per prompt: {FEW_SHOT_PER_CATEGORY}")
    print(f"Estimated API cost: ~${cost_estimate:.3f}")

    if args.dry_run:
        print("\n[dry-run] No API calls made.")
        return

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set in environment.")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    tokens_used = {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}

    all_rows = []
    for category, total_needed in allocation.items():
        print(f"\nGenerating {total_needed} examples for: {category}")
        label = 0 if category == "Absence de cyberharcèlement" else 1
        real_examples = get_real_examples(train_df, category, FEW_SHOT_PER_CATEGORY)
        print(f"  Using {len(real_examples)} real few-shot examples")

        generated = []
        while len(generated) < total_needed:
            batch_n = min(BATCH_SIZE, total_needed - len(generated))
            # Resample real examples each batch to add variety
            shots = get_real_examples(train_df, category, FEW_SHOT_PER_CATEGORY)
            batch = generate_batch(client, category, batch_n, shots, tokens_used, args.model)
            generated.extend(batch)
            print(f"  {len(generated)}/{total_needed}", end="\r")

        for comment in generated[:total_needed]:
            all_rows.append({
                "id": None,
                "comment": comment,
                "label": label,
                "annotated_category": category,
                "binary_confidence": None,
                "source": "synthetic_v2",
            })

        samples = random.sample(generated[:total_needed], min(5, len(generated)))
        print(f"\n  Samples from '{category}':")
        for s in samples:
            print(f"    • {s[:120]}")

    synthetic_df = pd.DataFrame(all_rows)
    synthetic_df.to_parquet(DATA_DIR / "synthetic_v2.parquet", index=False)

    augmented_df = pd.concat([train_df, synthetic_df], ignore_index=True)
    augmented_df.to_parquet(DATA_DIR / "train_augmented_v2.parquet", index=False)

    pricing = MODEL_PRICING[args.model]
    actual_cost = (
        tokens_used["input"] * pricing["input"]
        + tokens_used["output"] * pricing["output"]
        + tokens_used.get("cache_write", 0) * pricing["cache_write"]
        + tokens_used.get("cache_read", 0) * pricing["cache_read"]
    ) / 1_000_000
    print("\n=== Done ===")
    print(f"  Synthetic examples: {len(synthetic_df)}")
    print(f"  train_augmented_v2 size: {len(augmented_df)}")
    print(f"  Tokens — input: {tokens_used['input']}, output: {tokens_used['output']}, cache_read: {tokens_used['cache_read']}, cache_write: {tokens_used['cache_write']}")
    print(f"  Actual API cost: ~${actual_cost:.4f}")
    print(f"  Files: {DATA_DIR}/synthetic_v2.parquet, train_augmented_v2.parquet")


if __name__ == "__main__":
    main()
