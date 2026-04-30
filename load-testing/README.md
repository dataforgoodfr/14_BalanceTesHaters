# Load testing

Les tests de charge utilise k6 (https://grafana.com/docs/k6/latest/set-up/install-k6/) 


## Stress test

Le test simule un nombre important 

* Démarrer la stack backend stack (voir [../README.MD])
* Lancer docker stats ou un outil de monitoring pour surveiller le comportement du backend
* Lancer la commande 
```bash
 # Rempalcer <BTH_PUBLIC_API_TOKEN> par le token définit par le backend
k6 -e BTH_PUBLIC_API_TOKEN=<BTH_PUBLIC_API_TOKEN> -e BTH_API_BASE_URL=http://localhost:8001 run stress-test.js
```
