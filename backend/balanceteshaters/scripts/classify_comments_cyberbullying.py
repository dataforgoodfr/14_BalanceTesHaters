"""Classify Instagram comments from CSV files as cyberbullying or not using Jev."""

import argparse
import logging
import sys
from pathlib import Path

import pandas as pd
from tqdm import tqdm
from dotenv import load_dotenv
from typesafe_sdk import TypeSafeClient, Noul

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


PROMPT = """Tu vas recevoir un commentaire provenants des réseaux sociaux (commentaire de vidéos Youtube, par exemple). Le but est de classifier ce commentaire pour savoir s'il constitue ou non du cyberharcèlement.

A prendre en compte : si le commentaire semble ironique, sarcastique, cela peut être compté comme du cyberharcèlement si cela dénigre une personne. Les emojis péjoratifs sont aussi potentiellement du cyberharcèlement s'ils participent à dénigrer quelqu'un.

Par exemple (tu trouveras justement des exemples d'ironie ou d'emojis qui sont déjà du cyberharcèlement car ils semblent dénigrer la personne à qui ils s'adressent):
- 💩 : 1
- 🐒 : 1
- ❤️ : 0
- Tu es grosse : 1
- Belle vidéo ! : 0
- Qu'est-ce qu'il est intelligent… : 1
- J'adore cette vidéo… Merci : 0
- Va te f**** : 1
- Répugnant : 1
- Bravo : 0
- Que Dieu te guide… : 1
- Tu es incroyable ! 0
- On t'aime ! 0"""


def classify_comment(client: TypeSafeClient, comment: str | None) -> float | None:
    """Classify a single comment. Returns 0 (no cyberbullying), 1 (cyberbullying), or None on error."""

    if not comment:
        logger.warning("No comment to classify")
        return None

    try:
        response = client.system_one(
            state={"instructions": PROMPT, "comment": comment},
            questions={
                "is_cyberbullying": Noul(
                    instructions="Ce commentaire est-il du cyberharcèlement ?"
                )
            },
        )
    except Exception as e:
        logger.error(f"API error for comment '{comment[:50]}...': {e}")
        return None

    answer = response.answers.get("is_cyberbullying")
    if answer is None:
        logger.warning(f"No answer for comment '{comment[:50]}...'")
        return None

    # Extract the predicted score
    predicted = answer.noul
    return predicted


def read_comments_from_csv(filepath: Path) -> pd.DataFrame:
    """Read comments from a CSV file, returning only rows with valid 'Texte' values."""
    
    logger.info(f"Reading CSV file from '{filepath}'")
    df = pd.read_csv(filepath, encoding="utf-8")

    if "Texte" not in df.columns:
        logger.error(f"Column 'Texte' not found in {filepath}")
        sys.exit(1)

    df["Texte"] = df["Texte"].astype(str)
    return df


def classify_batch(df: pd.DataFrame, client: TypeSafeClient) -> pd.Series:
    """Classify all comments in a DataFrame, logging progress."""
    predictions = []

    for i, row in tqdm(df.iterrows()):
        comment = row["Texte"]

        if not comment or pd.isna(comment):
            prediction = None
        else:
            prediction = classify_comment(client, comment)
        predictions.append(prediction)
        logger.info(
            f"[{i + 1}/{len(df)}] '{comment[:60] if comment and not pd.isna(comment) else None}...' -> {prediction}"
        )

    return pd.Series(predictions, index=df.index)


def save_predictions(df: pd.DataFrame, output_path: Path):
    """Save the original comments with their predictions."""
    df.to_csv(output_path, index=False, encoding="utf-8")
    logger.info(f"Saved predictions to {output_path}")


if __name__ == "__main__":
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Classify Instagram comments as cyberbullying or not using Jev"
    )
    parser.add_argument(
        "csv_path",
        type=Path,
        help="Path to a CSV file with comments",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output CSV path",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of comments to classify (for testing)",
    )
    args = parser.parse_args()

    client = TypeSafeClient()

    df = read_comments_from_csv(args.csv_path)
    if args.limit:
        df = df.head(args.limit)
        logger.info(f"Limited to {args.limit} comments")

    predictions = classify_batch(df, client)

    result = pd.DataFrame(
        {"comment": df["Texte"].values, "prediction": predictions.values}
    )

    save_predictions(result, args.output)
