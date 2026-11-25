import argparse
import logging
import sys
from dataclasses import dataclass
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


PROMPT = """You are part of a cyberbullying classification system. You will receive a comment from social media (typically Youtube or Instagram) and score various properties which relate to cyberbullying.

Most comments are in expressed in french. Pay attention to the use of emojis (e.g. 💩 is considered insulting) and sarcasm."""


@dataclass
class CyberbullyingScores:
    is_insulting: float | None
    is_discriminatory: float | None
    is_threatening: float | None
    is_incitement_to_hatred_or_crime: float | None

    @property
    def average(self) -> float | None:
        scores = [
            self.is_insulting,
            self.is_discriminatory,
            self.is_threatening,
            self.is_incitement_to_hatred_or_crime,
        ]
        valid = [s for s in scores if s is not None]
        return sum(valid) / len(valid) if valid else None

    @property
    def max(self) -> float | None:
        scores = [
            self.is_insulting,
            self.is_discriminatory,
            self.is_threatening,
            self.is_incitement_to_hatred_or_crime,
        ]
        valid = [s for s in scores if s is not None]
        return max(valid) if valid else None


def classify_comment(client: TypeSafeClient, comment: str | None) -> CyberbullyingScores | None:
    """Classify a single comment across multiple dimensions."""

    if not comment:
        logger.warning("No comment to classify")
        return None

    try:
        response = client.system_one(
            state={"instructions": PROMPT, "comment": comment.strip()},
            questions={
                "is_insulting": Noul(
                    instructions="Is this comment insulting a person or a community?"
                ),
                "is_discriminatory": Noul(
                    instructions="Is this comment expressing discriminatory claims (e.g. towards minorities)?"
                ),
                "is_threatening": Noul(
                    instructions="Does this comment contain explicit or implicit threats of violence, harm, or negative consequences?"
                ),
                "is_incitement_to_hatred_or_crime": Noul(
                    instructions="Does this comment incite its readers to commit hate crimes against a person or community? Could it be considered as incitement to hatred?"
                ),
            },
        )
    except Exception as e:
        logger.error(f"API error for comment '{comment[:50]}...': {e}")
        return None

    scores = {}
    for key in ["is_insulting", "is_discriminatory", "is_threatening", "is_incitement_to_hatred_or_crime"]:
        answer = response.answers.get(key)
        if answer is None:
            logger.warning(f"No answer for '{key}' on comment '{comment[:50]}...'")
            scores[key] = None
        else:
            scores[key] = answer.noul

    return CyberbullyingScores(
        is_insulting=scores["is_insulting"],
        is_discriminatory=scores["is_discriminatory"],
        is_threatening=scores["is_threatening"],
        is_incitement_to_hatred_or_crime=scores["is_incitement_to_hatred_or_crime"],
    )


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
        avg = prediction.average if prediction else None
        logger.info(
            f"[{i + 1}/{len(df)}] '{comment[:60] if comment and not pd.isna(comment) else None}...' -> {avg}"
        )

    return pd.Series(predictions, index=df.index)


def build_result_df(df: pd.DataFrame, predictions: pd.Series) -> pd.DataFrame:
    """Build output DataFrame with original columns + all scores."""
    result = df.copy()

    # Extract individual scores and average
    scores_list = predictions.tolist()
    result["avg_cyberbullying"] = [p.average if p else None for p in scores_list]
    result["max_cyberbullying"] = [p.max if p else None for p in scores_list]

    for key in ["is_insulting", "is_discriminatory", "is_threatening", "is_incitement_to_hatred_or_crime"]:
        result[key] = [getattr(p, key) if p else None for p in scores_list]

    return result


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

    result = build_result_df(df, predictions)

    save_predictions(result, args.output)
