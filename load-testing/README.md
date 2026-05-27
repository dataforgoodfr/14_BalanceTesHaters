# Load testing

Les tests de charge utilise k6 (https://grafana.com/docs/k6/latest/set-up/install-k6/) 


## Stress test

Le test simule un nombre important 

* Démarrer la stack backend stack (voir [../README.MD])
* Lancer `docker stats` ou un outil de monitoring pour surveiller le comportement du backend (mémoire/CPU)
* Lancer la commande 

```bash
 # Remplacer bth-token par le token définit par le backend
k6 -e BTH_PUBLIC_API_TOKEN=bth-token -e BTH_API_BASE_URL=http://localhost:8001 run --summary-mode full --summary-export k6-summary.json --out "web-dashboard=export=k6-report.html" stress-test.js
```

TODO
* Evaluer pourquoi le précalcul ne foncitonne pas &tag=group&tag=stage&tag=url

TODO add metrics:
* Submit counter
* Submit failed counter
* Submit success counter
* Classification Completed counter (Submit - Completion date)
* Classification Completed Duration => Trend
* Classification failed counter