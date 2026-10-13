# Backend Balance tes haters

Voir aussi le [document de déploiement production sur Clever Cloud](../docs/backend/deployment-production.md).

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

## Configuration du backend

Depuis le répertoire `backend`, exporter ces variables avant d'appliquer les migrations ou de démarrer FastAPI :

```bash
export BTH_ENGINE_ECHO=0
export BTH_LOGGING_CONFIGURATION_FILE=logging.ini
export BTH_PG_DSN=postgresql+asyncpg://bth:bth@localhost:5432/bth
export BTH_PRIVATE_API_TOKEN=local-development-private-token
export BTH_PUBLIC_API_TOKEN=local-development-public-token
```

Ces valeurs sont réservées au développement local. `BTH_PUBLIC_API_TOKEN` protège les routes utilisées par l'extension et `BTH_PRIVATE_API_TOKEN` les routes d'administration.

## Création de la base de données

### Lancer la base de données seule localement

Pour développer le backend sur l'hôte, démarrer uniquement PostgreSQL avec le fichier Compose commun. Depuis la racine du dépôt :

```bash
docker compose -p bth-local -f backend/compose.dev.yml up -d --wait db
```

La base `bth` est accessible sur `localhost:5432`, avec l'utilisateur `bth` et le mot de passe `bth`. Depuis `backend`, exporter les variables ci-dessus puis créer les tables :

```bash
uv run alembic upgrade head
```

Pour inspecter la base, depuis la racine :

```bash
docker compose -p bth-local -f backend/compose.dev.yml exec db psql -U bth -d bth
# Dans psql, saisir \dt pour lister les tables.
```

## Lancement du backend

```
uv run fastapi dev server.py
```

Les API sont exposées à l'URL: http://localhost:8000/

Les métriques Prometheus sont exposées à `http://localhost:8000/metrics` et protégées par HTTP Basic Auth. Définissez `BTH_METRICS_USERNAME` et `BTH_METRICS_PASSWORD` dans la configuration de l'application (sur Clever Cloud, dans ses variables d'environnement). Sans ces deux variables, l'endpoint `/metrics` répond avec une erreur `503` et ne publie aucune métrique.

## Lancer le backend et la DB avec Docker Compose

Le même fichier `backend/compose.dev.yml` lance PostgreSQL, l'API, Prometheus et cAdvisor. Il est réservé au développement local et ne doit pas être utilisé pour un déploiement. Il ne nécessite ni fichier `.env` ni réseau externe Traefik. Docker doit être installé et démarré.

Depuis la racine du dépôt :

```bash
docker compose -p bth-local -f backend/compose.dev.yml up --build
```

Les migrations s'appliquent automatiquement avant le démarrage de l'API sur `http://localhost:8000`. Le token public vaut `local-development-public-token` et le token privé `local-development-private-token`. L'extension utilise le token public.

La première construction télécharge les modèles de classification depuis Hugging Face et peut prendre plusieurs minutes. Hugging Face peut afficher un avertissement concernant les téléchargements non authentifiés.

Le package `balanceteshaters`, `server.py`, les migrations Alembic et les fichiers de configuration sont montés en lecture seule dans `/workspace/backend`. FastAPI fonctionne en mode `dev` : les modifications Python déclenchent automatiquement le rechargement de l'API. L'environnement Python et le cache des modèles restent dans `/app`, séparés du code monté. Le dossier `.venv` de l'hôte n'est pas monté dans le conteneur, afin que ses liens symboliques ne déclenchent pas d'événements de surveillance.
Après une modification des dépendances ou du Dockerfile, relancer la commande avec `--build`. 
Les nouvelles migrations s'appliquent au redémarrage du conteneur. 
Ajouter `-d` pour démarrer les conteneurs en arrière-plan.

Pour vérifier l'API :

```bash
curl http://localhost:8000/openapi.json
curl -H "X-Token: local-development-private-token" http://localhost:8000/classification/
```

Les ports PostgreSQL et API sont publiés uniquement sur `127.0.0.1`. Les données PostgreSQL sont conservées dans le volume `bth-local_pgdata` et partagées entre les modes base seule et stack complète.

Le conteneur API est limité à 4 CPU et 3 Go de mémoire par défaut avec ke  swap désactivé pour suivre la prod. 

Les pools de calcul sont limités par `OMP_NUM_THREADS=3`, `MKL_NUM_THREADS=3` et `OPENBLAS_NUM_THREADS=1` dans Compose afin de garder la concurrence entre threads sous la limite CPU.

Les limites CPU et mémoire peuvent être ajustées avec `BTH_CPU_LIMIT` et `BTH_MEMORY_LIMIT`, par exemple :

```bash
BTH_CPU_LIMIT=2 BTH_MEMORY_LIMIT=4G docker compose -p bth-local -f backend/compose.dev.yml up --build
```

Pour arrêter la stack sans supprimer ses données :

```bash
docker compose -p bth-local -f backend/compose.dev.yml down
```

Pour supprimer aussi les données PostgreSQL, ajouter `-v` à cette commande.

Pour lancer également l'extension et son navigateur, depuis `browser-extension` :

```bash
pnpm dev:fullstack
```

---

### Consulter les métriques en développement

Prometheus et cAdvisor démarrent par défaut avec l'API et PostgreSQL, y compris avec `pnpm dev:fullstack`.

L'interface Prometheus est accessible sur `http://localhost:9090`.

Prometheuse collecte:
* le backend `/metrics` sur `api:8000`, avec les identifiants Basic Auth de développement définis dans `backend/compose.dev.yml`.
* les infos conainer avec cAdvisor

Examples de query prometheus utiles:

**Nombre de requete par handler**
```promql
sum by (handler) (rate(bth_backend_http_requests_total[5m]))
```

**Nombre de classification en cours**
```promql
bth_backend_classification_background_tasks_in_progress
```

**Monitoring mémoire du container backend et sa limite:**
```promql
{job="cadvisor",
 container_label_com_docker_compose_project="bth-local",
 container_label_com_docker_compose_service="api",
 __name__=~"container_memory_(usage_bytes|working_set_bytes)|container_spec_memory_limit_bytes"}
 ```

**Detection OOMKilled:**
```promql
increase(container_oom_events_total{name="bth-local-api-1"}[5m])
```

**Mémoire du processus python**
```promql
process_resident_memory_bytes{job="bth-backend"}
```


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
