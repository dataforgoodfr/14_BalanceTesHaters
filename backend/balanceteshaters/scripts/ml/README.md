# Pipeline ML : détection de cyberharcèlement par embeddings

Pipeline complet pour entraîner et évaluer des modèles d'embeddings sur la classification binaire de commentaires français issus des réseaux sociaux (Instagram, TikTok, YouTube, Twitter).

## Vue d'ensemble

Le pipeline est organisé en scripts numérotés à exécuter dans l'ordre :

```
00_prepare_dataset.py            → construire les splits train/val/test depuis NocoDB
01_generate_synthetic.py         → augmenter les catégories minoritaires avec Claude
02_embed_and_train_classical.py  → classifieurs classiques sur embeddings gelés
03_finetune_embedding.py         → fine-tuning bout-en-bout encodeur + tête
04_compare_evaluate.py           → comparer tous les runs, logger dans NocoDB
05_claude_annotate.py            → annoter les données non étiquetées avec Claude
```

Tous les résultats sont enregistrés dans NocoDB pour le suivi et la comparaison.

---

## Installation (MacBook M4 Pro)

### Prérequis

- **macOS Sequoia** (ou supérieur recommandé)
- **Python 3.12+** — installez via [pyenv](https://github.com/pyenv/pyenv) ou [mise](https://mise.jdx.dev/)
- **uv** — gestionnaire de packages rapide

```bash
# Installer uv si pas déjà fait
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Cloner et installer les dépendances

```bash
git clone <repo-url>
cd 14_BalanceTesHaters/backend
uv sync
```

`uv sync` crée un environnement virtuel dans `.venv/` et installe toutes les dépendances définies dans `pyproject.toml`, y compris PyTorch, sentence-transformers et LightGBM.

### Variables d'environnement

Créez un fichier `.env` à la racine du dossier `backend/` :

```bash
NOCODB_BASE_URL=https://votre-nocodb.example.com
NOCODB_TOKEN=votre_token
NOCODB_BASE_ID=votre_base_id
ANTHROPIC_API_KEY=votre_clé   # facultatif — requis seulement pour 01_generate_synthetic.py et 05_claude_annotate.py
```

Les scripts `00`, `02`, `03` et `04` n'utilisent pas l'API Anthropic et fonctionnent sans cette clé. Les scripts appellent `load_dotenv()` automatiquement.

### Notes spécifiques Apple Silicon (M4 Pro)

Le chip M4 Pro dispose d'un GPU unifié (MPS) utilisé par PyTorch. Quelques points importants :

- **jina-v5-text-nano** (`jina`) provoque un **segfault sur MPS** à cause d'EuroBERT. Il est automatiquement forcé sur CPU — pas d'action requise.
- **jina-v5-text-small**, BidirLM et Arctic sont tous **compatibles MPS** et utiliseront le GPU automatiquement.
- La variable d'environnement `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0` est positionnée en tête de chaque script pour éviter les erreurs de mémoire unifiée.
- **LightGBM** utilise `libgomp` (OpenMP GNU) tandis que certains modèles HuggingFace utilisent `libomp` (OpenMP LLVM). Charger les deux dans le même processus provoque un crash. Les scripts gèrent cela via des sous-processus isolés — aucune configuration nécessaire de votre côté.

### Vérifier l'installation

```bash
cd backend
uv run python -c "import torch; print('MPS disponible:', torch.backends.mps.is_available())"
# → MPS disponible: True
```

---

## Démarrage rapide

```bash
# 1. Construire les splits
uv run python balanceteshaters/scripts/ml/00_prepare_dataset.py

# 2. Générer des données synthétiques (vérifier le coût d'abord)
uv run python balanceteshaters/scripts/ml/01_generate_synthetic.py --dry-run
uv run python balanceteshaters/scripts/ml/01_generate_synthetic.py

# 3. Entraîner les baselines sur embeddings gelés (tous modèles × classifieurs × datasets)
uv run python balanceteshaters/scripts/ml/02_embed_and_train_classical.py

# 4. Fine-tuner (un run à la fois)
uv run python balanceteshaters/scripts/ml/03_finetune_embedding.py --model arctic --strategy head_only --dataset real
uv run python balanceteshaters/scripts/ml/03_finetune_embedding.py --model arctic --strategy head_only --dataset augmented_v2

# 5. Comparer tout
uv run python balanceteshaters/scripts/ml/04_compare_evaluate.py
```

---

## Scripts

### 00_prepare_dataset.py — Construire les splits

Récupère les enregistrements annotés depuis NocoDB et crée des splits stratifiés 70/15/15.

```bash
uv run python balanceteshaters/scripts/ml/00_prepare_dataset.py [--high-confidence-only]
```

**Options :**
- `--high-confidence-only` — ne garder que les annotations marquées `HIGH_CONFIDENCE` (réduit la taille du dataset, améliore la qualité des labels)

**Sorties** (dans `data/finetune/`) :
- `train_real.parquet`
- `val.parquet`
- `test.parquet`

À ré-exécuter à chaque fois que les annotations changent.

---

### 01_generate_synthetic.py — Augmenter les catégories minoritaires

Utilise Claude pour générer des commentaires de cyberharcèlement synthétiques réalistes pour les catégories sous-représentées (doxxing, incitation au suicide, harcèlement sexuel, menaces, incitation à la haine). Chaque prompt inclut des exemples réels du training set comme ancrage few-shot.

```bash
# Voir l'allocation et estimer le coût
uv run python balanceteshaters/scripts/ml/01_generate_synthetic.py --dry-run

# Générer avec les paramètres par défaut (1000 exemples, Sonnet)
uv run python balanceteshaters/scripts/ml/01_generate_synthetic.py

# Modèle moins cher ou nombre d'exemples réduit
uv run python balanceteshaters/scripts/ml/01_generate_synthetic.py --model claude-haiku-4-5-20251001 --total 500
```

**Sorties :**
- `data/finetune/synthetic_v2.parquet` — exemples générés
- `data/finetune/train_augmented_v2.parquet` — `train_real` + synthétique (à utiliser avec `--dataset augmented_v2` dans les scripts suivants)

**Coût typique :** ~0,10 $ pour 1000 exemples avec Sonnet.

---

### 02_embed_and_train_classical.py — Baselines sur embeddings gelés

Encode le texte avec chaque modèle puis entraîne trois classifieurs sur les représentations gelées. Couvre toutes les combinaisons encodeur × classifieux × dataset.

```bash
# Tout (par défaut)
uv run python balanceteshaters/scripts/ml/02_embed_and_train_classical.py

# Sous-ensemble
uv run python balanceteshaters/scripts/ml/02_embed_and_train_classical.py \
    --models arctic jina-small \
    --datasets real augmented_v2
```

**Options :**
- `--models` — un ou plusieurs parmi `jina`, `jina-small`, `bidir`, `arctic`, `all` (défaut : `all`)
- `--datasets` — un ou plusieurs parmi `real`, `augmented`, `augmented_v2`, `all` (défaut : `all`)

**Classifieurs entraînés :**

| Nom | Architecture |
|---|---|
| `logreg` | Régression logistique (baseline linéaire) |
| `lightgbm` | LightGBM avec early stopping |
| `mlp` | MLP 512→128, ReLU, early stopping |

**Sorties :** `data/finetune/checkpoints/{slug}+{clf}+{dataset}.joblib`

---

### 03_finetune_embedding.py — Fine-tuning bout-en-bout

Attache une tête de classification linéaire à un encodeur et entraîne avec AdamW. Deux stratégies disponibles :

- `head_only` — encodeur gelé, seule la tête apprend (rapide, ~50 époques)
- `full` — encodeur + tête entraînés conjointement avec un faible LR (lent, ~15 époques)

```bash
# Arctic head-only sur données réelles
uv run python balanceteshaters/scripts/ml/03_finetune_embedding.py \
    --model arctic --strategy head_only --dataset real

# Head-only sur données augmentées
uv run python balanceteshaters/scripts/ml/03_finetune_embedding.py \
    --model arctic --strategy head_only --dataset augmented_v2
```

**Options :**
- `--model` — `jina`, `jina-small`, `bidir`, `arctic` (requis)
- `--strategy` — `head_only` ou `full` (défaut : `full`)
- `--dataset` — `real`, `augmented`, `augmented_v2` (défaut : `real`)

> Les modèles jina utilisent `encode()` qui bloque le flux de gradient, donc `full` bascule automatiquement en `head_only` pour eux.

**Sortie :** `data/finetune/checkpoints/{slug}-finetuned-{strategy}-{dataset}/best_model.pt`

L'entraînement sauvegarde le checkpoint avec le meilleur F1 de validation et applique l'early stopping.

---

### 04_compare_evaluate.py — Table de comparaison complète

Charge tous les checkpoints des scripts 02 et 03, évalue sur le test set, affiche une table de comparaison et logue tous les résultats dans NocoDB. Inclut également :
- Baseline zero-shot XLM-R toxicité
- Meilleure baseline LLM depuis les CSV de prédictions (si présents)
- Delta A/B montrant le gain F1 des données augmentées vs réelles

```bash
uv run python balanceteshaters/scripts/ml/04_compare_evaluate.py
```

Les embeddings et prédictions tournent dans des sous-processus isolés pour éviter le conflit OpenMP entre EuroBERT de jina-nano (libomp) et LightGBM (libgomp).

**Meilleurs résultats observés (frozen embeddings, test set) :**
```
Run                                                     F1      P      R    Acc
================================================================================
snowflake-arctic-embed-l-v2.0+mlp+real              0.6916 0.6852 0.6981 0.7130
snowflake-arctic-embed-l-v2.0+logreg+real           0.6903 0.6500 0.7358 0.6957
harrier-oss-v1-270m+lightgbm+real                   0.6729 0.6667 0.6792 0.6957
jina-embeddings-v5-text-nano+lightgbm+augmented     0.6573 0.5222 0.8868 0.5739
jina-embeddings-v5-text-small+mlp+real              0.6195 0.5833 0.6604 0.6261
```

---

### 05_claude_annotate.py — Annotation avec Claude

Deux modes :
- **evaluate** — fait tourner Claude sur un échantillon de lignes déjà annotées et mesure l'accord avec les labels humains (accuracy, F1, kappa de Cohen). À utiliser en premier pour valider la fiabilité.
- **annotate** — classe les lignes non annotées avec Claude et sauvegarde en parquet pour relecture.

```bash
# Mesurer l'accord Claude vs humain sur 100 exemples
uv run python balanceteshaters/scripts/ml/05_claude_annotate.py --mode evaluate --n 100

# Estimer le coût
uv run python balanceteshaters/scripts/ml/05_claude_annotate.py --mode annotate --limit 500 --dry-run

# Annoter
uv run python balanceteshaters/scripts/ml/05_claude_annotate.py --mode annotate --limit 500
```

**Options :**
- `--mode` — `evaluate` ou `annotate` (requis)
- `--n` — nombre de lignes annotées à échantillonner pour l'évaluation (défaut : 100)
- `--limit` — nombre max de lignes non annotées à traiter (défaut : 500)
- `--dry-run` — afficher uniquement l'estimation de coût, sans appels API
- `--seed` — graine aléatoire pour l'échantillonnage (défaut : 42)

**Sortie :** `data/finetune/claude_annotated.parquet`

Après relecture, ré-exécuter `00_prepare_dataset.py` pour inclure les lignes annotées par Claude dans les splits.

---

## Modèles

| Alias | ID HuggingFace | Params | Notes |
|---|---|---|---|
| `jina` | `jinaai/jina-embeddings-v5-text-nano` | 239M | Basé sur EuroBERT ; CPU uniquement sur Apple Silicon (segfault MPS) |
| `jina-small` | `jinaai/jina-embeddings-v5-text-small` | 677M | Basé sur Qwen3 ; compatible MPS |
| `bidir` | `microsoft/harrier-oss-v1-270m` | 270M | 94 langues, 640 dimensions |
| `arctic` | `Snowflake/snowflake-arctic-embed-l-v2.0` | 568M | 1024 dimensions, MRL, forte baseline retrieval |
| *(zero-shot)* | `textdetox/xlmr-large-toxicity-classifier-v2` | 600M | XLM-R fine-tuné sur la toxicité multilingue ; aucun entraînement requis |

---

## Scripts utilitaires

### _threshold_sweep.py

Balaye les seuils de décision [0.20 … 0.50] pour les modèles classiques et fine-tunés Arctic. Logue dans NocoDB tout run dont le meilleur seuil diffère de 0.50.

```bash
uv run python balanceteshaters/scripts/ml/_threshold_sweep.py
```

Nécessite que les checkpoints de `02_embed_and_train_classical.py` existent.

---

### _mlp_arch_search.py

Recherche de grille sur les configurations de couches cachées du MLP sur les embeddings Arctic gelés. Teste 8 architectures avec optimisation du seuil et logue la meilleure dans NocoDB.

```bash
uv run python balanceteshaters/scripts/ml/_mlp_arch_search.py
```

---

### dedup_eval_table.py

Supprime les entrées en doublon dans la table d'évaluation NocoDB, en gardant l'enregistrement le plus récent par `model_name`. Peut être exécuté plusieurs fois sans risque.

```bash
uv run python balanceteshaters/scripts/ml/dedup_eval_table.py
```

---

### _eval_subprocess.py

Helper interne utilisé par `04_compare_evaluate.py`, `_threshold_sweep.py` et `_mlp_arch_search.py`. Chaque commande tourne dans son propre sous-processus pour éviter les conflits OpenMP entre torch/sentence-transformers (libomp) et LightGBM (libgomp).

Commandes disponibles :
```
embed                    <model_id> <output_npy> [split]
predict_classical        <embedding_npy> <ckpt_path> <output_npy>
predict_proba_classical  <embedding_npy> <ckpt_path> <output_npy>
predict                  <model_id> <ckpt_dir> <output_npy>
predict_proba            <model_id> <ckpt_dir> <output_npy>
```

`split` vaut `"test"` par défaut. Passer `"train_real"` ou `"val"` pour les autres splits.

---

## Structure des données

```
backend/balanceteshaters/data/finetune/
├── train_real.parquet           # ~70 % des données annotées
├── train_augmented.parquet      # train_real + synthétique v1
├── train_augmented_v2.parquet   # train_real + synthétique v2 (recommandé)
├── val.parquet                  # ~15 %, utilisé pour l'early stopping
├── test.parquet                 # ~15 %, réservé à l'évaluation finale
├── synthetic_v2.parquet         # exemples générés par Claude
├── claude_annotated.parquet     # lignes annotées par Claude (après 05)
└── checkpoints/
    ├── {slug}+{clf}+{dataset}.joblib         # classifieurs sur embeddings gelés
    └── {slug}-finetuned-{strategy}-{dataset}/
        └── best_model.pt                     # meilleur checkpoint (val F1)
```

Tous les fichiers parquet partagent le même schéma :

| Colonne | Type | Description |
|---|---|---|
| `id` | str/None | Identifiant NocoDB |
| `comment` | str | Texte brut du commentaire |
| `label` | int | 0 = bénin, 1 = cyberharcèlement |
| `annotated_category` | str | Noms de catégories séparés par des virgules |
| `binary_confidence` | str/None | `HIGH_CONFIDENCE` ou None |
| `source` | str | `real`, `synthetic_v2` ou `claude_annotated` |

---

## Configuration (config.py)

Module central avec les identifiants de modèles, chemins et utilitaires.

| Symbole | Description |
|---|---|
| `JINA_MODEL_ID` / `JINA_SMALL_MODEL_ID` | IDs des modèles jina |
| `ARCTIC_EMBED_MODEL_ID` | ID du modèle Snowflake Arctic |
| `XLMR_TOXICITY_MODEL_ID` | Classifieurs XLM-R toxicité (zero-shot) |
| `DATA_DIR` | Chemin vers `data/finetune/` |
| `CHECKPOINTS_DIR` | Chemin vers `data/finetune/checkpoints/` |
| `ANNOTATION_TABLE_ID` | Table NocoDB des annotations brutes |
| `EVAL_TABLE_ID` | Table NocoDB des résultats d'évaluation |
| `get_device_for_model(model_id)` | Retourne `"cpu"` pour jina-nano (MPS non sûr), sinon le meilleur device disponible |
| `model_slug(model_id)` | Extrait le nom court d'un ID HuggingFace (ex. `"snowflake-arctic-embed-l-v2.0"`) |
| `compute_binary_label(categories)` | Convertit une liste de catégories en label binaire 0/1 |
