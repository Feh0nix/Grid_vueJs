# Noovy Grid

Noovy Grid est un tableur web en français, accessible sans compte. Il repose sur Vue 3, Vite et [x-spreadsheet](https://github.com/myliang/x-spreadsheet).

- Édition de cellules, formules, mise en forme, filtres et plusieurs feuilles.
- Barre de formule synchronisée et statistiques numériques de la sélection.
- Import et export Excel au format XLSX. Les valeurs, formules et fusions sont transférées. La mise en forme avancée et les filtres Excel ne sont pas transférés.
- Sauvegarde manuelle dans le navigateur avec IndexedDB.

## Démarrer en local

Avec Node.js 24 et npm, depuis la racine du dépôt :

```sh
npm ci
npm run dev
```

## Compiler et déployer

```sh
npm run build
npm run preview
```

La compilation génère le dossier `dist`. Sur Render, créez un **Static Site** à partir de ce dépôt et sélectionnez la branche `main`. Laissez **Root Directory** vide, indiquez `npm install && npm run build` comme **Build Command** et `dist` comme **Publish Directory**.

Le fichier `render.yaml` décrit cette configuration (branche, commande de build, dossier publié, en-têtes de cache, version de Node) : il permet de recréer le service à l'identique via **New → Blueprint** et de vérifier dans le dépôt ce que Render exécute réellement.

Points à ne pas rater, ce sont les causes habituelles d'un site qui ne se met pas à jour :

- **Build Command** doit contenir l'installation (`npm install && npm run build`). Une commande réduite à `npm run build` échoue sur un clone propre : `vite: not found`.
- Le site doit être créé **en connectant GitHub**, pas depuis l'URL publique du dépôt : dans ce dernier cas Render ne déclenche aucun déploiement au push et reste sur la version initiale.
- Le fichier `.node-version` (et `NODE_VERSION` dans `render.yaml`) fixe Node 24.21.0, compatible avec `engines` : le build est reproductible.
- `index.html` est servi en `no-store` et `/assets/*` en `immutable` : un déploiement réussi est visible immédiatement, sans purge de cache.

Les variables `VITE_*` sont intégrées au build par Vite : elles doivent être déclarées dans **Environment** avant le déploiement, pas après.

## Où sont les classeurs ?

Le bouton **Enregistrer** conserve le classeur courant dans le navigateur, pour l’adresse du site utilisée. Pour le transférer vers un autre navigateur ou appareil, exportez-le en XLSX. Effacer les données du site peut supprimer la sauvegarde locale.
