# Procédure d'Évaluation des Modèles de Classification Binaire

Ce document décrit comment tester localement un modèle génératif en mode classification binaire (LLM) sur un jeu de données annoté (téléchargé depuis NocoDB), calculer ses performances (F1-score, Precision, Recall) et enregistrer ces résultats dans NocoDB.


## 1. Configuration de l'environnement

Assurez-vous d'avoir configuré les variables d'environnement nécessaires dans votre fichier `.env` ou dans votre terminal.

```bash
# Configuration NocoDB
export NOCODB_BASE_URL="https://noco.services.dataforgood.fr"
export NOCODB_TOKEN="votre_token_personnel"
export NOCODB_BASE_ID="id_de_la_base"
export NOCODB_ANNOTATION_TABLE_ID="id_de_la_table_d_annotations" # Table source des données annotées
```

## 2. Étape 1 : Génération des prédictions

Le script `experimentation_classification.py` récupère les commentaires annotés depuis la table "NOCODB_ANNOTATION_TABLE_ID", télécharge un modèle en local et les soumet à ce modèle pour prédictions avant d'enregistrer ces prédictions dans un fichier CSV.

### Exécution

Depuis le dossier `backend/` :

```bash
uv run python balanceteshaters/scripts/experimentation_classification.py --model "Qwen/Qwen3-1.7B"
```

*   **--model** : Le nom du modèle Hugging Face à utiliser, exemple "Qwen/Qwen3-1.7B", "mistralai/Ministral-3-3B-Instruct-2512"
*   Le script utilise par défaut le prompt défini dans `backend/balanceteshaters/scripts/binary_classification_prompt_naif.txt`.

### Résultat
Un fichier CSV est généré dans `backend/balanceteshaters/data/` avec un nom formaté comme suit :
`predictions_<TABLE_ID>_<MODEL_NAME>.csv`

## 3. Étape 2 : Évaluation et Log dans NocoDB

Une fois le fichier de prédictions généré, le script `evaluate_classification.py` compare les prédictions du modèle avec les annotations humaines pour calculer les métriques de performance.

Ce script va effectuer les étapes suivantes: 
* Ouvrir le fichier de prédictions écrit en local
* Ignorer tous les commentaires non-annotés 
* Calculer les métriques accuracy, precision, recall, f1-score
* Envoyer ces métriques, le nom du modèle, le prompt utilisé, le nom de la table NocoDB d'où proviennent les annotations et commentaires dans NocoDO


### Exécution

Toujours depuis le dossier `backend/` :
```bash
uv run python balanceteshaters/scripts/evaluate_classification.py \
    balanceteshaters/data/predictions_votre_fichier.csv \
    --prompt-file balanceteshaters/scripts/binary_classification_prompt_naif.txt
```

### Paramètres principaux :
*   **Chemin du CSV** (positionnel) : Le fichier généré à l'étape précédente.
*   **--prompt-file** : Le fichier de prompt utilisé (pour archive dans NocoDB).
*   **--eval-table-id** : (Optionnel) L'ID de la table NocoDB où enregistrer les résultats (par défaut `m0ww7qnx69u9r1a`).

### Métriques calculées :
*   **Precision** : Capacité du modèle à ne pas prédire de "faux positifs" (commentaires sains classés comme harcèlement).
*   **Recall** : Capacité du modèle à détecter tous les "vrais positifs" (tous les harcèlements réels).
*   **F1-Score** : Moyenne harmonique de la précision et du rappel.
*   **Accuracy** : Taux global de bonnes prédictions.

## 4. Visualisation des résultats

Les résultats sont automatiquement envoyés vers la table d'évaluation sur NocoDB si les variables d'environnement sont présentes. Chaque entrée contient :
*   Le nom du modèle testé.
*   Les métriques (F1, Precision, Recall, Accuracy).
*   Le nombre d'échantillons traités.
*   Le prompt utilisé pour l'expérimentation.
