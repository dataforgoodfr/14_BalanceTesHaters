# Chargement des commentaires d'un Job de classification vers NocoDB

Le script `backend/upload_classification_job_to_noco.py` permet d'envoyer dans la table
`export_backend` de la base de données NodoDB 14_BalanceTesHaters, les commentaires 
d'un job de classification. Cette fonctionnalité est utile en phase de saison pour récupérer
des commentaires à classifier manuellement.

## Pré-requis

Positionner les variables d'environnement suivantes:
```
NOCODB_BASE_URL=https://noco.services.dataforgood.fr
NOCODB_TOKEN=xxx...
BTH_BACKEND_URL=https://balanceteshaters-app.services.d4g.fr/
```

## Exécution

### Lister les job de classification

La première étape consiste à lancer le script sans argument pour récupérer la liste des job
 de classification sur le backend:

 ```
$ python upload_classification_job_to_noco.py    
Available jobs:
0699c553-b852-75ed-8000-2951382f6ac9 @ 2026-02-23T13:25:15.416548+00:00: Pourquoi Brigitte Macron a dû fuir Marseille en urgence? (COMPLETED)
0699c55e-60da-7250-8000-b880c3c5a9f3 @ 2026-02-23T13:28:06.051140+00:00: Florence Porcel, la première accusatrice de PPDA - C à Vous - 09/01/2023 (COMPLETED)
0699c556-c1dd-79e4-8000-3153302455d3 @ 2026-02-23T13:26:04.114514+00:00: Cérémonie d'ouverture : la déception de Thomas Jolly en apprenant la météo - Au cœur des Jeux (COMPLETED)
0699c559-84cb-7d01-8000-804b9db38130 @ 2026-02-23T13:26:48.297666+00:00: Boxe : Imane Khelif révèle avoir pris un traitement hormonal avant les JO-2024 • FRANCE 24 (COMPLETED)
 ```

### Charger les commentaires d'un job

Lancer ensuite le script en indiquant l'identifiant du job à traiter:

```
python upload_classification_job_to_noco.py --job-id 0699c553-b852-75ed-8000-2951382f6ac9
```

Les données sont automatiquement chargées dans la table [export_backend](https://noco.services.dataforgood.fr/dashboard/#/nc/ppi0re931qn0gqh/m352wosvedsw45k/vwnrqg7m0nwgz2t8/export_backend).