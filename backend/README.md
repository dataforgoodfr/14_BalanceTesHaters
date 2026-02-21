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
```

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