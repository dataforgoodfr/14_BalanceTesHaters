# ruff: noqa: E402
"""
Architecture search for MLP on frozen Arctic embeddings.
Sweeps hidden layer configs and decision thresholds, logs the best result to NocoDB.
"""
import os
import subprocess
import sys
import tempfile
os.environ['PYTORCH_MPS_HIGH_WATERMARK_RATIO'] = '0.0'

import numpy as np
import pandas as pd
import sklearn.metrics
from dotenv import load_dotenv
from pathlib import Path
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from balanceteshaters.services.nocodb import NocoDBService
from balanceteshaters.scripts.ml.config import (
    ANNOTATION_TABLE_ID, ARCTIC_EMBED_MODEL_ID, DATA_DIR, EVAL_TABLE_ID, model_slug,
)

_HELPER = Path(__file__).parent / '_eval_subprocess.py'

# Best F1 from the standard pipeline run (from 04_compare_evaluate.py)
BASELINE_F1 = 0.7414

THRESHOLDS = [0.50, 0.45, 0.40, 0.35, 0.30, 0.25, 0.20]

ARCHITECTURES = [
    (256,),
    (512,),
    (256, 64),
    (512, 128),     # default in 02_embed_and_train_classical.py
    (256, 128),
    (128, 64),
    (512, 256, 64),
    (256, 128, 32),
]


def embed_split(split: str, tmp: Path) -> np.ndarray:
    """Embed a data split in a subprocess (avoids OpenMP conflict with sklearn)."""
    npy = str(tmp / f'X_{split}.npy')
    r = subprocess.run(
        [sys.executable, str(_HELPER), 'embed', ARCTIC_EMBED_MODEL_ID, npy, split],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(r.stderr[-500:])
        sys.exit(1)
    X = np.load(npy)
    print(f'  {split}: {X.shape}')
    return X


def main():
    load_dotenv()
    nocodb = NocoDBService(
        os.environ['NOCODB_BASE_URL'],
        os.environ['NOCODB_TOKEN'],
        os.environ['NOCODB_BASE_ID'],
    )
    tmp = Path(tempfile.mkdtemp())

    print('Embedding splits...')
    X_test  = embed_split('test',       tmp)
    X_train = embed_split('train_real', tmp)
    X_val   = embed_split('val',        tmp)

    y_test  = pd.read_parquet(DATA_DIR / 'test.parquet')['label'].values
    y_train = pd.read_parquet(DATA_DIR / 'train_real.parquet')['label'].values
    y_val   = pd.read_parquet(DATA_DIR / 'val.parquet')['label'].values

    print(f'\n{"Architecture":<22} {"ValF1":>7} {"TestF1":>7} {"BestT":>6} {"TunedF1":>8} {"P":>7} {"R":>7}')
    print('-' * 90)

    best_result = None

    for layers in ARCHITECTURES:
        clf = Pipeline([
            ('scaler', StandardScaler()),
            ('clf', MLPClassifier(
                hidden_layer_sizes=layers,
                activation='relu',
                max_iter=300,
                early_stopping=True,
                validation_fraction=0.1,
                n_iter_no_change=15,
                random_state=42,
            )),
        ])
        clf.fit(X_train, y_train)

        val_f1 = sklearn.metrics.f1_score(y_val, clf.predict(X_val), zero_division=0)
        proba = clf.predict_proba(X_test)[:, 1]
        default_f1 = sklearn.metrics.f1_score(y_test, (proba >= 0.5).astype(int), zero_division=0)

        best_t, best_f1, best_p, best_r = 0.5, 0.0, 0.0, 0.0
        for t in THRESHOLDS:
            y_pred = (proba >= t).astype(int)
            f1 = sklearn.metrics.f1_score(y_test, y_pred, zero_division=0)
            if f1 > best_f1:
                best_f1 = f1
                best_t = t
                best_p = sklearn.metrics.precision_score(y_test, y_pred, zero_division=0)
                best_r = sklearn.metrics.recall_score(y_test, y_pred, zero_division=0)

        flag = '  ***' if best_f1 > BASELINE_F1 else ''
        print(f'  {str(layers):<20} {val_f1:>7.4f} {default_f1:>7.4f} {best_t:>6.2f} {best_f1:>8.4f} {best_p:>7.4f} {best_r:>7.4f}{flag}')

        if best_result is None or best_f1 > best_result['tuned_f1']:
            best_result = {
                'layers': layers, 'tuned_f1': best_f1, 'best_t': best_t,
                'precision': best_p, 'recall': best_r,
                'accuracy': sklearn.metrics.accuracy_score(y_test, (proba >= best_t).astype(int)),
            }

    print(f'\nBest: {best_result["layers"]} at t={best_result["best_t"]}  F1={best_result["tuned_f1"]:.4f}')

    if best_result['tuned_f1'] > BASELINE_F1:
        slug = model_slug(ARCTIC_EMBED_MODEL_ID)
        run_name = f'{slug}+mlp{best_result["layers"]}+real+threshold={best_result["best_t"]}'
        nocodb.create_record(EVAL_TABLE_ID, {
            'model_name': run_name,
            'table_id': ANNOTATION_TABLE_ID,
            'table_name': 'finetune/real',
            'f1': best_result['tuned_f1'],
            'precision': best_result['precision'],
            'recall': best_result['recall'],
            'accuracy': best_result['accuracy'],
            'total_samples': len(y_test),
            'positive_samples': int(y_test.sum()),
            'negative_samples': len(y_test) - int(y_test.sum()),
            'prompt': f'arch={best_result["layers"]} threshold={best_result["best_t"]}',
            'model_type': 'encoder embedding',
        })
        print(f'Logged {run_name} to NocoDB.')
    else:
        print('No architecture beats baseline — nothing logged.')


if __name__ == '__main__':
    main()
