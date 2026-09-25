# Soak test du scraping

Teste plusieurs fois le scraping de publications YouTube et Instagram réelles.

## Lancer le test

Fermez Chromium, puis lancez depuis `browser-extension` :

```sh
pnpm test:soak:browser
```

Cette commande construit l'extension une fois, puis lance Chromium sans serveur de développement ni rechargement automatique.

Connectez le profil dédié à YouTube et Instagram. Laissez le navigateur ouvert, puis lancez dans un autre terminal :

```sh
pnpm test:soak:server -- --manifest soak-test/posts.json
```

Filtres combinables :

```sh
pnpm test:soak:server -- --scenario-ids youtube-small-1,youtube-large-1
pnpm test:soak:server -- --min-expected-comments 100 --max-expected-comments 2000
pnpm test:soak:server -- --platform youtube
```

Les snapshots sont conservés par défaut. Pour les supprimer avant chaque tentative ou une seule fois au démarrage :

```sh
pnpm test:soak:server -- --post-snapshot-cleanup before-each-attempt
pnpm test:soak:server -- --post-snapshot-cleanup on-start
```

Le profil est stocké dans `.wxt/chromium-data`. Pour choisir Chromium :

```sh
CHROMIUM_BIN=/chemin/vers/chromium pnpm test:soak:browser
```

## Résultats

Les fichiers sont écrits dans `soak-test-results/<timestamp>/` :

- `progress.md` : Permet un suivi en direct de la progerssion (mis à jour à chaque polling).
- `report.md` et `summary.json` : bilan final ;
- `attempts/<id>/` : résultat, publication extraite, événements et logs.

Un écart entre le nombre attendu et extrait produit un `warning`, pas un échec.

## Pourquoi pas Playwright ?

Google peut refuser l'authentification ou déconnecter YouTube dans un navigateur piloté par Playwright. Le test utilise donc Chromium directement avec `--load-extension`.
