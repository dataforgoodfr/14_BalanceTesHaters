# Soak test du scraping

Teste plusieurs fois le scraping de publications YouTube et Instagram réelles.

## Lancer le test

- Fermez Chromium, puis lancez depuis `browser-extension` `pnpm test:soak:browser`
  - Cette commande utilise wxt en mode dev en incluant le "soak controller".
- Authentifier le profil dédié à YouTube et Instagram dans le navigateur qui vient de s'ouvrir.
- Laissez le navigateur ouvert, puis lancez dans un autre terminal : `pnpm test:soak:server`

## Résultats

Les fichiers sont écrits dans `soak-test-results/<timestamp>/` :

- `progress.md` : Permet un suivi en direct de la progerssion (mis à jour à chaque polling).
- `report.md` et `summary.json` : bilan final ;
- `attempts/<id>/` : résultat, publication extraite, événements et logs.

Un écart entre le nombre attendu et extrait produit un `warning`, pas un échec.

## Options de pnpm test:soak:server

`pnpm test:soak:server` accepte des optiosn sous la forme `pnpm test:soak:server -- <options>`
e.g. `pnpm test:soak:server -- --platform youtube`

### Liste de scenarios & filtres

- `--manifest`: La liste de scanario est défini dans browser-extension/soak-test/posts.json et peut être configurable avec `--manifest <path_to_posts.json>`
- `--scanrio-ids`: permet de restraindre a une liste de scenarios: e.g. `--scenario-ids youtube-small-1,youtube-large-1`
- `--min-expected-comments`: filtre sur la valeur de expectedComment défini dans posts.json
- `--max-expected-comments`: filtre sur la valeur de expectedComment défini dans posts.json

### Configurer les settings

Les settings sontsont réinitialisés à leurs valeurs par défaut au
démarrage de chaque exécution.

Pour les remplacer utiliser les options suivante:
`--skip-screenshoting true`
`--skip-submit-for-classification true`
`--scraping-max-comments 5000`

### Autres options

Conservation du stockage: les snapshots sont conservés par défaut.
Pour les supprimer avant chaque tentative ou une seule fois au démarrage :

```sh
pnpm test:soak:server -- --post-snapshot-cleanup before-each-attempt
pnpm test:soak:server -- --post-snapshot-cleanup on-start
```

## Pourquoi pas Playwright ?

Google peut refuser l'authentification ou déconnecter YouTube dans un navigateur piloté par Playwright. Le test utilise donc Chromium directement avec `--load-extension`.
