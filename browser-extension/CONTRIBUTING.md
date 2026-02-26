# Comment developer l'extension

## Installer l'environement de dev

- Installer pnpm
- `pnpm install` dans le repertoire browser-extension

## Installer l'extensien en mode dev dans chrome

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
- `pnpm test:e2e` lint le code et fix les issues qu'il peut corriger automatiquement

# Configurer l'extension pour pointer vers le backend de classification locale

Par défaut l'extension utilise le backend de classification déployé en stsaging.
Pour utiliser un backend déployé localement: copier .env.example vers .env et décommenter la ligne VITE_BACKEND_API_BASE_URL=http://localhost:8000

Voir dans (../backend/README.md) sur comment démarrer le backend.

# Ajouter de composants le la library ui shadcn

Explorer les composants ici: https://ui.shadcn.com/docs/components
Lancer la commande indiquer dans la doc du composant pour l'installer
e.g. `pnpm dlx shadcn@latest add accordion`

# Architecture

## Doc d'architectures

Voir (../docs/frontend)

## Stack de l'extension:

- [wxt](https://wxt.dev/) framework pour faciliter le dev de web-extension
- [React](https://fr.react.dev/)
- [shadcn/ui](https://ui.shadcn.com/docs) comme library de composants
- [tanstack query](https://tanstack.com/query/latest)
- [vitest](https://vitest.dev/) comme framework de test
- prettier comme formatter
- eslint comme linter
