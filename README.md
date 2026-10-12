# Balance tes haters

**Balance tes Haters** est un compagnon de protection et d'action contre le cyberharcèlement, créé à l'initiative de **[Féministes contre le cyberharcèlement](https://www.vscyberh.org/)** et par **[Data for Good](https://dataforgood.fr/)**.

▶️ **[Installer l'extension](https://chromewebstore.google.com/detail/bjmmakmdjbdlhghmjobpcnmeefhfajfe)** depuis le Chrome Web Store

# Pour Contribuer

- [Contribuer à l'extension navigateur](./browser-extension/README.md)
- [Contribuer au backend](./backend/README.md)


## Lancer l'environnement de développement (backend + extension)

Depuis le répertoire `browser-extension`, avec pnpm installé et Docker Compose disponible. Docker doit être démarré :

```bash
pnpm install --frozen-lockfile
pnpm dev:fullstack
```

La commande lance deux processus en parallèle :

* Docker Compose: 
   * construit et démarre PostgreSQL, 
   * applique les migrations et démarre le backend (voir [documentation backend](./backend/README.md) pour plus d'info).
* `pnpm dev` construit l'extension et ouvre le navigateur, avec l'extension configurée pour appeler `http://localhost:8000` avec le token public local.

A noter:
* La première construction télécharge le modèle deppuis hugging face (~3Go) ce qui peut prendre plusieurs minutes.
* L'extension peut s'ouvrir avant que l'API soit prête.
* Les changements sont recharger automatiquement (par WXT et FastAPI qui sont lancé en mode dev). 
* Les changements de dépendances ou du Dockerfile nécessitent de relancer la commande afin de reconstruire l'image.
* `Ctrl+C` arrête les deux processus et les conteneurs, sans supprimer les données PostgreSQL. Le navigateur et son profil suivent la configuration de `browser-extension/wxt.config.ts`.
