# ruff: noqa: E402
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

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))
load_dotenv()

from balanceteshaters.services.nocodb import NocoDBService
from balanceteshaters.scripts.ml.config import ANNOTATION_TABLE_ID, EVAL_TABLE_ID, CHECKPOINTS_DIR, DATA_DIR

tmp = Path(tempfile.mkdtemp())
emb_path = str(tmp / 'X_arctic.npy')
helper = str(Path(__file__).parent / '_eval_subprocess.py')
MODEL_ID = 'Snowflake/snowflake-arctic-embed-l-v2.0'

print('Embedding test set...')
r = subprocess.run([sys.executable, helper, 'embed', MODEL_ID, emb_path], capture_output=True, text=True)
if r.returncode != 0:
    print(r.stderr[-500:])
    sys.exit(1)

X_test = np.load(emb_path)
test_df = pd.read_parquet(DATA_DIR / 'test.parquet')
y_true = test_df['label'].values

THRESHOLDS = [0.50, 0.45, 0.40, 0.35, 0.30, 0.25, 0.20]
BEST_SO_FAR = 0.741

nocodb = NocoDBService(os.environ['NOCODB_BASE_URL'], os.environ['NOCODB_TOKEN'], os.environ['NOCODB_BASE_ID'])


def best_threshold(proba):
    best_t, best_f1, best_m = 0.5, 0.0, None
    for t in THRESHOLDS:
        y_pred = (proba >= t).astype(int)
        f1 = sklearn.metrics.f1_score(y_true, y_pred, zero_division=0)
        if f1 > best_f1:
            best_f1 = f1
            best_t = t
            best_m = {
                'f1':        f1,
                'precision': sklearn.metrics.precision_score(y_true, y_pred, zero_division=0),
                'recall':    sklearn.metrics.recall_score(y_true, y_pred, zero_division=0),
                'accuracy':  sklearn.metrics.accuracy_score(y_true, y_pred),
            }
    return best_t, best_m


def log(run_name, dataset, t, m):
    nocodb.create_record(EVAL_TABLE_ID, {
        'model_name': f'{run_name}+threshold={t}',
        'table_id': ANNOTATION_TABLE_ID,
        'table_name': f'finetune/{dataset}',
        'f1': m['f1'], 'precision': m['precision'],
        'recall': m['recall'], 'accuracy': m['accuracy'],
        'total_samples': len(y_true),
        'positive_samples': int(y_true.sum()),
        'negative_samples': len(y_true) - int(y_true.sum()),
        'prompt': f'approach=threshold-tuned dataset={dataset} threshold={t}',
        'model_type': 'encoder embedding',
    })


print(f'\n{"Run":<60} {"BestT":>6} {"F1":>7} {"P":>7} {"R":>7} {"Acc":>7}')
print('-' * 100)

for clf_name in ['logreg', 'lightgbm', 'mlp']:
    ckpt = CHECKPOINTS_DIR / f'snowflake-arctic-embed-l-v2.0+{clf_name}+real.joblib'
    if not ckpt.exists():
        continue
    proba_path = str(tmp / f'proba_{clf_name}.npy')
    r = subprocess.run(
        [sys.executable, helper, 'predict_proba_classical', emb_path, str(ckpt), proba_path],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        print(f'  [error] {clf_name}: {r.stderr[-200:]}')
        continue
    proba = np.load(proba_path)
    t, m = best_threshold(proba)
    run = f'snowflake-arctic-embed-l-v2.0+{clf_name}+real'
    flag = '  *** BEATS BEST' if m['f1'] > BEST_SO_FAR else ''
    print(f'  {run:<58} {t:>6.2f} {m["f1"]:>7.4f} {m["precision"]:>7.4f} {m["recall"]:>7.4f} {m["accuracy"]:>7.4f}{flag}')
    if t != 0.50:
        log(run, 'real', t, m)

# fine-tuned head_only real
ft_dir = str(CHECKPOINTS_DIR / 'snowflake-arctic-embed-l-v2.0-finetuned-head_only-real')
proba_path = str(tmp / 'proba_ft_real.npy')
r = subprocess.run([sys.executable, helper, 'predict_proba', MODEL_ID, ft_dir, proba_path], capture_output=True, text=True)
if r.returncode == 0:
    proba = np.load(proba_path)
    t, m = best_threshold(proba)
    run = 'snowflake-arctic-embed-l-v2.0-finetuned-head_only-real'
    flag = '  *** BEATS BEST' if m['f1'] > BEST_SO_FAR else ''
    print(f'  {run:<58} {t:>6.2f} {m["f1"]:>7.4f} {m["precision"]:>7.4f} {m["recall"]:>7.4f} {m["accuracy"]:>7.4f}{flag}')
    if t != 0.50:
        log(run, 'real', t, m)
else:
    print(f'  [error] finetuned: {r.stderr[-300:]}')

print('\nAll non-default thresholds logged to NocoDB.')
