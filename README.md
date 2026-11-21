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

La compilation génère le dossier `dist`. Sur Render, créez un **Static Site** à partir de ce dépôt et sélectionnez la branche `main`. Laissez **Root Directory** vide, indiquez `npm run build` comme **Build Command** et `dist` comme **Publish Directory**.

Le fichier `.node-version` fixe la version de Node du build (24.21.0, compatible avec `engines`) : Render l'utilise automatiquement, ce qui rend le build reproductible. Les variables `VITE_API_*` sont intégrées au build : déclarez-les dans **Environment** avant de déployer.

## Où sont les classeurs ?

Le bouton **Enregistrer** conserve le classeur courant dans le navigateur, pour l’adresse du site utilisée. Pour le transférer vers un autre navigateur ou appareil, exportez-le en XLSX. Effacer les données du site peut supprimer la sauvegarde locale.
