"""CLI to test classify_comment on a single text for debugging the prompt."""

import argparse
import logging

from dotenv import load_dotenv
from typesafe_sdk import TypeSafeClient

from balanceteshaters.scripts.classify_comments_cyberbullying import (
    CyberbullyingScores,
    classify_comment,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def format_scores(scores: CyberbullyingScores | None) -> str:
    if scores is None:
        return "  No scores returned"

    lines = [
        f"  is_sarcastic:     {scores.is_sarcastic}",
        f"  is_insulting:     {scores.is_insulting}",
        f"  is_mocking:       {scores.is_mocking}",
        f"  is_discriminatory: {scores.is_discriminatory}",
    ]

    if scores.average is not None:
        lines.append(f"  average:          {scores.average:.2f}")
    else:
        lines.append("  average:          N/A")

    return "\n".join(lines)


def main(comment: str):
    load_dotenv()

    client = TypeSafeClient()

    print("========================================")
    print("Comment to classify:")
    print(f"  '{comment}'")
    print("========================================")
    print("Results:")

    scores = classify_comment(client, comment)
    print(format_scores(scores))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="CLI to debug Jev classification"
    )
    parser.add_argument(
        "--comment",
        type=str,
        help="A comment to classify",
    )
    args = parser.parse_args()
    
    
    main(comment=args.comment)
