# Backend Balance tes haters

## Installation

Ce projet utilise [uv](https://docs.astral.sh/uv/) pour la gestion des dépendances Python. Il est préréquis pour l'installation de ce projet.

Une fois installé, il suffit de lancer la commande suivante pour installer la version de Python adéquate, créer un environnement virtuel et installer les dépendances du projet.

```bash
uv sync
```

A l'usage, si vous utilisez VSCode, l'environnement virtuel sera automatiquement activé lorsque vous ouvrirez le projet. Sinon, il suffit de l'activer manuellement avec la commande suivante :

```bash
source .venv/bin/activate
```

## Configuration de l'environnement

Exporter la configuration, comme dans l'exemple suivant:
```
export BTH_ENGINE_ECHO=0
export BTH_LOGGING_CONFIGURATION_FILE=logging.ini
export BTH_PG_DSN=postgresql+asyncpg://postgres:postgres@db/postgres
export BTH_PRIVATE_API_TOKEN="xxxxx"
export BTH_PUBLIC_API_TOKEN="xxxxx"
```

`BTH_API_TOKEN` correspond au token d'accès aux API protégées. Ce paramètres doit être fourni par l'administrateur qui déploie le backend.

## Création de la base de données

Nécessite un serveur de base de données PostgreSQL

- lancer la commande: 
```
alembic upgrade head
```

### Lancer la base de données localement

Il est possible d'utiliser Docker pour lancer une instance locale de la base. Pour cela:
- lancer la commande `docker compose up` dans un terminal (ajouter le paramètre `-d` pour un lancement en arrière-plan) afin de lancer l'instance Postgres
- lancer la commande `POSTGRES_DB=bth POSTGRES_USER=bth POSTGRES_PASSWORD=bth alembic upgrade head` afin de créer toutes les tables nécessaires

Une fois la base lancée en locale, il est possible d'en inspecter le contenu comme ceci (par exemple) :
- Lancer la commande `docker exec -it backend-db-1 psql -U bth bth`
- Entrer `\dt` -> une liste de tables devrait s'afficher

## Lancement du backend

```
fastapi dev server.py
```

Les API sont exposées à l'URL: http://localhost:8000/

## Déployer en container local (stack complète)

Cette section explique comment lancer la stack complète (base de données PostgreSQL + API de classification) via Docker Compose, en reproduisant fidèlement l'environnement de staging.

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré
- Le fichier `docker/.env` présent et rempli (voir `docker/.env.example` ou demander les valeurs sur Mattermost)

### 1. Créer le réseau externe

La stack attend un réseau Docker `d4g-internal` (utilisé en production par Traefik). À créer une seule fois :

```bash
docker network create d4g-internal
```

### 2. Construire et démarrer la stack

Depuis la racine du dépôt :

```bash
docker compose -f docker/compose-staging.yml up --build
```

- `--build` recompile l'image si le code a changé ; omettre lors des relances suivantes pour aller plus vite.
- Ajouter `-d` pour lancer en arrière-plan.

La première construction prend plusieurs minutes (téléchargement du modèle Snowflake ~2 Go). Les relances suivantes sont instantanées grâce au cache Docker.

### 3. Vérifier que tout fonctionne

L'API est exposée sur le port défini par `BTH_API_PORT` dans `docker/.env` (par défaut `8001`) :

```bash
# Health check
curl http://localhost:8001/

# Lister les jobs de classification (token privé)
curl -H "X-Token: <BTH_PRIVATE_API_TOKEN>" http://localhost:8001/classification/
```

### 4. Variables d'environnement

Toutes les variables sont dans `docker/.env`. Les principales :

| Variable | Description |
|----------|-------------|
| `BTH_PG_DSN` | DSN PostgreSQL (pointe vers le service `db` en interne) |
| `BTH_PUBLIC_API_TOKEN` | Token pour les routes publiques (POST classification) |
| `BTH_PRIVATE_API_TOKEN` | Token pour les routes privées (GET liste des jobs) |
| `BTH_EMBEDDING_HF_REPO_ID` | Repo HuggingFace du classifier (défaut : `gregco/balance-tes-haters-classifier`) |
| `BTH_API_PORT` | Port exposé sur la machine hôte (défaut : `8001`) |

### 5. Inspecter la base de données

```bash
docker exec -it balanceteshaters-db-1 psql -U bth balanceteshaters
# Puis dans psql :
\dt        -- liste des tables
```

### 6. Arrêter la stack

```bash
docker compose -f docker/compose-staging.yml down        # arrêt sans supprimer les données
docker compose -f docker/compose-staging.yml down -v     # arrêt + suppression du volume PostgreSQL
```

---

## Lancer les precommit-hook localement

[Installer les precommit](https://pre-commit.com/)

    pre-commit run --all-files

## Utiliser Tox pour tester votre code

    tox -vv

## Scripts

### Calculer des statistiques sur l'annotation des commentaires

Il faut définir trois variables d'environnements (contactez nous sur Mattermost pour qu'on vous donne les bonnes valeurs) :
- NOCODB_BASE_URL : il s'agit de l'URL de base de notre instance NocoDB (format "https://<domain_name>")
- NOCODB_ANNOTATION_TABLE_ID : il s'agit de l'id de la table "Annotations" (peut se trouver sur la page swagger de notre base NocoDB)
- NOCODB_TOKEN : c'est un token personnel que vous devez définir via votre espace personnel sur NocoDB


```
NOCODB_BASE_URL="<...>" NOCODB_ANNOTATION_TABLE_ID="<...>" NOCODB_TOKEN="<...>" uv run python compute_annotation_stats.py
```

### Évaluation des modèles de classification

Pour évaluer la performance d'un modèle LLM localement et enregistrer les résultats dans NocoDB :

1.  Générer les prédictions : `uv run python balanceteshaters/scripts/experimentation_classification.py --model "nom_du_modèle"`
2.  Calculer les métriques : `uv run python balanceteshaters/scripts/evaluate_classification.py <chemin_vers_csv>`

Pour plus de détails, consultez la [procédure d'évaluation](../docs/backend/evaluation.md).