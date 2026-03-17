import random
import sklearn
from pathlib import Path
import polars as pl
import argparse
import logging

def get_predictions(filepath: Path):
    full_df = pl.read_csv(filepath)
    
    # filter out un-annotated lines
    filtered_df = full_df.filter(pl.col("annotated_category").is_not_null())

    # df debug preview
    # filtered_df.glimpse()

    # Safe values means True if "Absence de cyberharcèlement" (no harrassment)
    safe_values = tuple(filtered_df["annotated_category"].str.contains("Absence de cyberharcèlement").to_list())

    # True must mean abusive comment, so
    true_values = tuple(not value for value in safe_values)
    predicted_values = tuple(filtered_df["predicted_category"])
    
    return true_values, predicted_values

def get_random_true_values():
    true_values = tuple(random.choice([True, False]) for _ in range(30))
    return true_values

def get_random_predicted_values():
    predicted_values = tuple(random.choice([0, 1]) for _ in range(30))
    return predicted_values

def evaluate_classification(true_values, predicted_values):
    f1_score = sklearn.metrics.f1_score(true_values, predicted_values)
    recall_score = sklearn.metrics.recall_score(true_values, predicted_values)
    precision_score = sklearn.metrics.precision_score(true_values, predicted_values)
    
    return f1_score, recall_score, precision_score



if __name__ == "__main__":

    logging.basicConfig(level=logging.INFO)


    parser = argparse.ArgumentParser(description="""
    This script computes statistical indicators on two array-like objects containing boolean values.
    Projected application is to evaluate the accuracy of binary classification of abusive messages.
    Path to csv file containing both annotations and predictions can be supplied as an optional argument.
    Otherwise, default csv path value will be deducted from environment variables. 
    In that case, user may need to execute the prediction script for the csv file to exist in the default location.
    """)
    parser.add_argument("path_to_input_csv", type=Path, help="Path to csv file containing both annotations and predictions (optional)")
    args = parser.parse_args()

    # Determine input csv path
    input_csv_path = args.path_to_input_csv
    logging.info(f"provided input csv path : {args.path_to_input_csv}")
    
    # get test classification data
    # true_values = get_random_true_values()
    # predicted_values = get_random_predicted_values()
    
    # get data from csv file
    true_values, predicted_values = get_predictions(input_csv_path)
    
    logging.debug(f"{true_values=}")
    logging.debug(f"{len(true_values)=}")
    logging.debug(f"{predicted_values=}")
    logging.debug(f"{len(predicted_values)=}")
    
    # compute metrics
    f1_score, recall_score, precision_score = \
        evaluate_classification(true_values, predicted_values)
    
    # display metrics
    print(f"{f1_score=}")
    print(f"{recall_score=}")
    print(f"{precision_score=}")


# TODO: submit evaluation results in db ?