"""
This script computes statistical indicators on two array-like objects containing boolean values.
Projected application is to evaluate the accuracy of binary classification of abusive messages.
"""
import random
import sklearn

def get_true_values():
    true_values = tuple(random.choice([True, False]) for _ in range(30))
    return true_values

def get_predicted_values():
    predicted_values = tuple(random.choice([0, 1]) for _ in range(30))
    return predicted_values

def evaluate_classification(true_values, predicted_values):
    f1_score = sklearn.metrics.f1_score(true_values, predicted_values)
    recall_score = sklearn.metrics.recall_score(true_values, predicted_values)
    precision_score = sklearn.metrics.precision_score(true_values, predicted_values)
    
    return f1_score, recall_score, precision_score



if __name__ == "__main__":
    
    # get classification data
    true_values = get_true_values()
    predicted_values = get_predicted_values()
    
    # compute metrics
    f1_score, recall_score, precision_score = \
        evaluate_classification(true_values, predicted_values)
    
    # display metrics
    print(f"{f1_score=}")
    print(f"{recall_score=}")
    print(f"{precision_score=}")


# TODO: submit evaluation results in db ?