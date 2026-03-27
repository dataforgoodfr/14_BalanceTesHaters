# Comment développer l'extension

# Installer l'environnement de dev

- Installer pnpm
- `pnpm install` dans le répertoire browser-extension

## Installer l'extension en mode dev dans Chrome

- Lancer `pnpm dev` qui lance un serveur
- Charger le répertoire .output/chrome-mv3-dev comme extension non empaquetée (voir https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

A partir de là la plupart des changements sont propagés automatiquement dans l'extension navigateur sans besoin de rafraichir manuellement l'extension.

## Vérifier les changements

Vérifier le formatage et le lint de code:

- `pnpm format` format le code avec prettier
- `pnpm lint` lint le code avec eslint
- `pnpm lint:fix` lint le code et fix les issues qu'il peut corriger automatiquement

- Lancer les tests unitaires (vitest): `pnpm test`
- Lancer les tests end 2 end (playwright):
  - **Necessite que `pnpm dev` soit lancé à coté**
  - `pnpm test:e2e` execute les tests et affiche le rapport.
  - `pnpm test:e2e:ui` lance les tests end-to-end avec Playwright UI.

# Configurer l'extension pour pointer vers le backend de classification locale

Par défaut l'extension utilise le backend de classification déployé en staging.
Pour utiliser un backend déployé localement: copier `.env.example` vers `.env` et décommenter la ligne `VITE_BACKEND_API_BASE_URL=http://localhost:8000`

Voir dans [](../backend/README.md) pour comment démarrer le backend.

# Configurer l'extension pour pointer vers le backend en staging

Le serveur backend en staging à besoin d'un token pour contacter l'api.
Copier `.env.example` vers `.env` et décommenter la ligne `VITE_BACKEND_API_TOKEN=...` puis remplacer par le token dont la valeur retrouvable sur Mattermost. 


# Ajouter des composants de la library UI shadcn

Explorer les composants ici: https://ui.shadcn.com/docs/components
Lancer la commande indiquée dans la doc du composant pour l'installer
e.g. `pnpm dlx shadcn@latest add accordion`

# Architecture

## Documentation d'architecture

[Voir la doc d'architecture frontend](../docs/frontend)

## Stack de l'extension:

- [wxt](https://wxt.dev/) framework pour faciliter le dev de web-extension
- [React](https://fr.react.dev/)
- [shadcn/ui](https://ui.shadcn.com/docs) comme library de composants
- [tanstack query](https://tanstack.com/query/latest)
- [vitest](https://vitest.dev/) comme framework de test
- prettier comme formatter
- eslint comme linter
