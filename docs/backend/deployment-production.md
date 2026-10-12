# Déploiement de production

Production est hébergée sur Clever Cloud dans l'application `BTH`. Les informations de configuration ci-dessous ont été relevées avec Clever Tools le 12 octobre 2026. Les paramètres et le commit déployé peuvent évoluer ; `clever status`, `clever activity` et `clever instances` donnent l'état courant.

## Application Clever Cloud

| Élément | Valeur |
|---------|--------|
| Organisation | `orga_062fdfa3-d289-4e2f-8a55-b4ebe3a40fef` |
| Application | `BTH` (`app_dfa6f3a5-8b75-4da0-9aa6-851fe085bcb7`) |
| Type | Docker |
| Fichier Docker | `./docker/backend/Dockerfile` (`CC_DOCKERFILE`) |
| Port HTTP exposé | `8080` (`CC_EXPOSED_HTTP_PORT`) |
| Instances | 1 instance, taille `M` |
| Autoscaling | Désactivé |
| Instance de build dédiée | Désactivée |
| HTTPS forcé | Oui |
| Zero downtime | Activé |
| Sticky sessions | Désactivées |
| Annulation d'un déploiement lors d'un nouveau push | Activée |

Liens directs : 
* [application dans la Console Clever Cloud](https://console.clever-cloud.com/organisations/orga_062fdfa3-d289-4e2f-8a55-b4ebe3a40fef/applications/app_dfa6f3a5-8b75-4da0-9aa6-851fe085bcb7), 
* [logs dans la Console](https://console.clever-cloud.com/organisations/orga_062fdfa3-d289-4e2f-8a55-b4ebe3a40fef/applications/app_dfa6f3a5-8b75-4da0-9aa6-851fe085bcb7/logs)  
* [tableau Grafana Clever Cloud](https://grafana.services.clever-cloud.com/d/home/clever-cloud-metrics-home?orgId=29272).

## Flow de déploiement

A cahque push sur `main` le workflow GitHub Actions [`.github/workflows/clever-deployment.yaml`](../../.github/workflows/clever-deployment.yaml) déploie le backend.

Clever Cloud construit ensuite l'image avec `./docker/backend/Dockerfile` :

## Configuration et secrets

Les variables d'environnement sont gérées dans la Console Clever Cloud ou avec `clever env`. 

### Configuration capture des metrics prometheus
Clever Cloud collecte l'endpoint Prometheus `/metrics`exposé par FastAPI et rend les séries disponibles dans ses outils d'observabilité.

| Variable | Valeur |
|----------|--------|
| `CC_METRICS_PROMETHEUS_PORT` | Même valeur que `CC_EXPOSED_HTTP_PORT` |
| `CC_METRICS_PROMETHEUS_PATH` | `/metrics` |
| `BTH_METRICS_USERNAME` | Nom d'utilisateur Basic Auth |
| `BTH_METRICS_PASSWORD` | Mot de passe Basic Auth fort, unique et secret |
| `CC_METRICS_PROMETHEUS_USER` | Même valeur que `BTH_METRICS_USERNAME` pour que le collecteur CC puisse accéder aux métrics|
| `CC_METRICS_PROMETHEUS_PASSWORD` | Même valeur que `BTH_METRICS_PASSWORD` pour que le collecteur CC puisse accéder aux métrics|



## Logs avancés

Les logs applicatifs sont consultables dans la [Console Clever Cloud](https://console.clever-cloud.com/organisations/orga_062fdfa3-d289-4e2f-8a55-b4ebe3a40fef/applications/app_dfa6f3a5-8b75-4da0-9aa6-851fe085bcb7/logs) et avec `clever logs --since 1h`.
Cependant ces logs ne contiennent pas les logs system qui sont utile pour détecter les kill par l'orchestrator par exemple.

Pour avoir les logs system il faut utiliser [l'API de log](https://www.clever.cloud/developers/api/v4/#logs) de clever cloud directement avec service=all.

```
clever curl -sS --max-time 20 --get "https://api.clever-cloud.com/v4/logs/organisations/orga_062fdfa3-d289-4e2f-8a55-b4ebe3a40fef/applications/app_dfa6f3a5-8b75-4da0-9aa6-851fe085bcb7/logs" \
  --data-urlencode 'since=2026-10-10T19:28:45Z' \
  --data-urlencode 'until=2026-10-10T19:30:35Z' \
  --data-urlencode 'service=all' \
  --data-urlencode 'limit=1000'
```
