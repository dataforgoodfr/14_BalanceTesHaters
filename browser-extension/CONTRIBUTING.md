# Comment développer l'extension

# Installer l'environnement de dev

- Installer pnpm
- dans le répertoire browser-extension
  - `pnpm install` pour installer les dependances
  - `pnpm playwright install` pour installer les navigateurs necessaire pour les tests e2e

## Installer l'extension en mode dev dans Chrome ou chromium

- Lancer `pnpm dev`. WXT démarre automatiquement le navigateur avec l'extension
  chargée.
- Le profil Chromium est conservé dans `.wxt/chromium-data`.
- Sous WSL, `CHROMIUM_BIN` permet de choisir l'exécutable. Sinon, la commande
  utilise `/snap/bin/chromium`, puis `/usr/bin/chromium` s'ils existent sous WSL.
  Hors WSL, WXT choisit le navigateur automatiquement.

A partir de là la plupart des changements sont propagés automatiquement dans l'extension navigateur sans besoin de rafraichir manuellement l'extension.

## Vérifier les changements

Vérifier le formatage et le lint de code:

- `pnpm format` format le code avec prettier
- `pnpm lint` lint le code avec eslint
- `pnpm lint:fix` lint le code et fix les issues qu'il peut corriger automatiquement

- Lancer les tests unitaires (vitest): `pnpm test`
- Lancer les tests end 2 end (playwright):
  - **Nécessite que `pnpm dev` soit lancé à coté**
  - `pnpm test:e2e` execute les tests et affiche le rapport.
  - `pnpm test:e2e:ui` lance les tests end-to-end avec Playwright UI.
  - Optionnel: Lancer les tests en étant authentifié sur les plateformes de réseau
    - Démarrer chromium et s'authentifier à Instagram & Youtube
    - Définir la variable d'environnement `PATH_TO_BROWSER_CONTEXT` pour pointer vers le profile chrome existant
    - Lancer la commande de test e2e de sont choix: e.g. `PATH_TO_BROWSER_CONTEXT=~/.config/chromium/ pnpm test:e2e:ui`

# Configurer l'extension pour pointer vers le backend de classification locale

Depuis `browser-extension`, lancer `pnpm dev:fullstack` pour démarrer le backend et PostgreSQL avec Docker Compose, ainsi que l'extension et son navigateur avec WXT. Docker doit être démarré. Cette commande configure automatiquement l'URL locale et le token public, sans fichier `.env`.

Pour lancer l'extension séparément avec `pnpm dev`, copier `.env.example` vers `.env` et activer les deux variables locales :

```dotenv
VITE_BACKEND_API_BASE_URL=http://localhost:8000
VITE_BACKEND_API_TOKEN=local-development-public-token
```

Le token doit correspondre à `BTH_PUBLIC_API_TOKEN` du backend. Voir la [documentation backend](../backend/README.md) pour démarrer l'API en conteneur ou sur l'hôte.

# Configurer l'extension pour pointer vers le backend distant

Sans configuration, l'extension appelle `https://bth.cleverapps.io`. Pour utiliser le backend distant, définir son URL et son token public dans `.env`. Les valeurs d'accès sont disponibles sur Vaultwarden. Ne pas utiliser le token privé dans l'extension.

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

# Release process

Pour déclencher une release de l'extension il suffit de créer un tag git de la forme webext-v<x.y.z> et le publier sur github.

Cela declenchera la création de la release GITHUB ainsi que la publication vers le Chrome Web Store.

Exemple pour créé une version 0.0.3

```bash
# Sync with remote
VERSION=0.0.3
git fetch
# Create a webext-v0.0.3 tag from current origin/main
git tag -a webext-v$VERSION origin/main
# Push the tag
git push origin tag webext-v$VERSION
```

En une ligne:

```bash
VERSION=0.0.7 && git fetch && git tag -a webext-v$VERSION origin/main && git push origin tag webext-v$VERSION
```
