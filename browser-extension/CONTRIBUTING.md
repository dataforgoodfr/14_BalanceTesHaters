# Comment développer l'extension

# Installer l'environnement de dev

- Installer pnpm
- `pnpm install` dans le répertoire browser-extension

## Installer l'extension en mode dev dans Chrome

- Lancer `pnpm dev` qui lance un serveur
- Charger le répertoire .output/chrome-mv3-dev comme extension non empaquetée (voir https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

A partir de là la plupart des changements sont propagés automatiquement dans l'extension navigateur sans besoin de rafraichir manuellement l'extension.

## Vérifier les changements

Verifier le formattage et le lint de code:

- `pnpm format` format le code avec prettier
- `pnpm lint` lint le code avec eslint
- `pnpm lint:fix` lint le code et fix les issues qu'il peut corriger automatiquement

Lancer les tests automatiques:

- `pnpm test` lance les tests unitaires basé sur vitest
- `pnpm test:e2e` lance les tests end-to-end avec Playwright

# Configurer l'extension pour pointer vers le backend de classification locale

Par défaut l'extension utilise le backend de classification déployé en staging.
Pour utiliser un backend déployé localement: copier `.env.example` vers `.env` et décommenter la ligne `VITE_BACKEND_API_BASE_URL=http://localhost:8000`

Voir dans [](../backend/README.md) pour comment démarrer le backend.

# Ajouter des composants de la library UI shadcn

Explorer les composants ici: https://ui.shadcn.com/docs/components
Lancer la commande indiquée dans la doc du composant pour l'installer
e.g. `pnpm dlx shadcn@latest add accordion`

# Architecture

## Documentation d'architecture

Voir [../docs/frontens](../docs/frontend)

## Stack de l'extension:

- [wxt](https://wxt.dev/) framework pour faciliter le dev de web-extension
- [React](https://fr.react.dev/)
- [shadcn/ui](https://ui.shadcn.com/docs) comme library de composants
- [tanstack query](https://tanstack.com/query/latest)
- [vitest](https://vitest.dev/) comme framework de test
- prettier comme formatter
- eslint comme linter
