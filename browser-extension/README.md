# Extension Navigateur Balance Tes Haters

Cette extension permet de capturer les commentaires depuis des publications réseau sociaux.

# Contributing

Stack de l'extension:

- [wxt](https://wxt.dev/) framework pour faciliter le dev de web-extension
- [React](https://fr.react.dev/)
- [shadcn/ui](https://ui.shadcn.com/docs) comme library de composants
- [vitest](https://vitest.dev/) comme framework de test
- prettier comme formatter
- eslint comme linter

## Installation

- Installer pnpm
- `pnpm install` dans le repertoire extension

## Mode dev (avec chrome)

- Lancer `pnpm dev`
- Charger le répertoire .output/chrome-mv3-dev comme extension non empaqueté (see https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

A partir de là la plupart des changements sont propagé automatiquement dans l'extension navigateur sans besoin de rafraichir manuellement l'extension.

## Ajouter de composants le la library ui shadcn

Explorer les composants ici: https://ui.shadcn.com/docs/components
Lancer la commande indiquer dans la doc du composant pour l'installer
e.g. `pnpm dlx shadcn@latest add accordion`
