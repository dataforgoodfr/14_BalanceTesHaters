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

## Création de la base de données

Nécessite un serveur de base de données PostgreSQL

- configurer les paramètres d'accès à la base de données dans le fichier [configuration.yml](configuration.yml)
- lancer la commande: 
```
alembic upgrade head
```

### Lancer la base de données localement

Il est possible d'utiliser Docker pour lancer une instance locale de la base. Pour cela:
- lancer la commande `docker compose up` dans un terminal (ajouter le paramètre `-d` pour un lancement en arrière-plan) afin de lancer l'instance Postgres
- lancer la commande `POSTGRES_DB=bth POSTGRES_USER=bth POSTGRES_PASSWORD=bth alembic upgrade head` afin de créer toutes les tables nécessaires

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