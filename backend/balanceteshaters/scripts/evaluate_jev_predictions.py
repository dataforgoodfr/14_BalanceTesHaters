import argparse
from pathlib import Path

import pandas as pd
from sklearn.metrics import precision_recall_curve, average_precision_score


def evaluate_jev_predictions(csv_path: Path, score_column: str, label_column: str) -> None:
    df = pd.read_csv(csv_path)

    if score_column == "Malveillance (IA)":
        # FIXME: It would be better to treat this column in the source file directly instead
        df[score_column] = df[score_column].str.replace("%", "").str.replace(",", ".").astype(float)

    n_rows_without_label = df[label_column].isna().sum()
    print(f"Rows without label: {n_rows_without_label} / {len(df)}")

    scores = df[score_column]
    labels = df[label_column] == 1.0

    n_positives = sum(labels)
    print(f"Number of positive examples: {n_positives} / {len(labels)}\n")

    precision, recall, thresholds = precision_recall_curve(labels, scores)
    ap_score = average_precision_score(labels, scores)

    for r, p in zip(precision, recall):
        print(f"R = {r:.4f} | P = {p:.4f}")

    print(f"\nAP = {ap_score:.3f}")

    print("\n============================\n")

    print("Positive rows:\n")

    print(df[labels][["Texte", score_column]])

    print("\nNegative rows:\n")

    print(df[~labels].sort_values(score_column, ascending=False).head(10)[["Texte", score_column]])



if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Evaluate Jev predictions"
    )
    parser.add_argument(
        "csv_path",
        type=Path,
        help="Path to a CSV file with comments, labels and predictions",
    )
    parser.add_argument(
        "--score_column",
        type=str,
        help="Name of the column containing the scores",
    )
    parser.add_argument(
        "--label_column",
        type=str,
        help="Name of the column containing the labels",
    )
    args = parser.parse_args()

    evaluate_jev_predictions(
        csv_path=args.csv_path,
        score_column=args.score_column,
        label_column=args.label_column
    )
