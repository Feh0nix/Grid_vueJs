# Feuille de route : tableur web

L'objectif est de rapprocher progressivement le tableur d'Excel pour le web. Chaque étape doit être accompagnée de tests de comportement et de vérifications dans le navigateur ; la parité complète n'est pas encore atteinte.

## 1. Protection des données — en cours

- [x] Sauvegarde locale automatique et raccourci Ctrl+S.
- [x] CSV : conserver la première ligne, les lignes vides et les champs multilignes.
- [x] XLSX : ne plus ajouter de ligne ou de colonne artificielle ; conserver les formules de la première feuille.
- [x] Import/export des feuilles et de leurs fusions ; test de l'import multifeuille.
- [x] Préserver les types de cellules, formats numériques, polices, couleurs RVB, alignements, bordures simples, volets figés, dimensions et masquages pris en charge, avec test aller-retour.
- [x] Importer et exporter les validations simples de nombres, longueurs, dates et listes compatibles.
- [ ] Préserver les styles avancés, validations complexes et autres fonctionnalités Excel non prises en charge.
- [ ] Gestion explicite des fichiers et des erreurs, sauvegardes de secours et tests de restauration.

## 2. Calculs et interactions

- [x] Lire les références absolues dans les formules simples.
- [x] Ajuster les références relatives lors d'une copie interne et propager les erreurs courantes de calcul.
- [x] Calculer les références et plages simples entre feuilles, détecter les cycles et conserver leurs résultats à l'export XLSX.
- [ ] Compléter la compatibilité du moteur : fonctions, syntaxe avancée, erreurs, recalcul et dépendances.
- [x] Historique : premier changement, annulation, rétablissement et branchement vérifiés.
- [x] Copie et déplacement internes d'une cellule ou plage, y compris les plages qui se chevauchent.
- [x] Copie et collage de texte tabulé via le presse-papiers système.
- [x] Tri des plages avec conservation des cellules de chaque ligne et des cellules vides.
- [x] Adapter les références simples et plages de la feuille courante à l'insertion et à la suppression de lignes ou colonnes.
- [x] Recopier des cellules et formules avec la poignée, avec annulation ; effacer une sélection en une action.
- [x] Étendre les séries numériques arithmétiques à partir de plusieurs cellules, horizontalement ou verticalement.
- [x] Choisir les valeurs d'une validation de liste dans la cellule, y compris avec Alt+Flèche bas.
- [x] Validation locale des nombres, dates ISO, longueurs et listes, y compris les collages et recopies ; adapter les règles aux insertions et suppressions simples.
- [x] Valider la barre de formule sur la cellule d'origine et synchroniser son contenu avec la sélection.
- [ ] Presse-papiers riche, insertion et suppression, recopie et navigation clavier fiables ; vérifier les formules lors du tri.
- [x] Adapter les références simples entre feuilles lors des changements de structure, renommages et suppressions.
- [ ] Gérer les références avancées et les séries de dates ou motifs complexes lors de la recopie ; prendre en charge les validations complexes XLSX et leur déplacement lors des tris.
- [ ] Tests automatisés couvrant les cas limites et la compatibilité.

## 3. Interface

- [x] Premier bandeau de classeur, nom modifiable, onglets renommables et recherche dans la feuille.
- [x] Barre d'état avec nombre, moyenne et somme de la sélection.
- [x] Corriger le dimensionnement de la grille et aligner les en-têtes pendant le défilement virtualisé.
- [x] Figer ou libérer les lignes et colonnes situées avant la cellule sélectionnée ; maintenir leur contenu visible pendant le défilement.
- [ ] Compléter l'organisation visuelle d'Excel web : ruban, barre de formule, grille, onglets et barre d'état.
- [ ] Accessibilité clavier, adaptation aux petits écrans et cohérence des menus.

## 4. Fonctionnalités avancées

- [x] Premiers graphiques en colonnes et courbes à partir d'une plage, avec plusieurs séries et mise à jour des données.
- [x] Mise en forme conditionnelle locale par seuil, intervalle ou texte, avec édition des règles et adaptation aux changements simples de structure.
- [ ] Types et personnalisation de graphiques supplémentaires, objets déplaçables dans la feuille et prise en charge XLSX.
- [ ] Tableaux, mise en forme conditionnelle avancée et export XLSX, validation et filtres avancés.
- [ ] Grandes feuilles : performance, limites et rendu.

## 5. Services full-stack

- [ ] Comptes, stockage durable, gestion des classeurs et autorisations.
- [ ] Collaboration temps réel, partage, historique des versions et résolution des conflits.
- [ ] Sécurité, sauvegardes, observabilité et déploiement.

Les fonctions d'Excel web sont nombreuses et évoluent ; les éléments ci-dessus sont des lots de travail, pas une garantie de compatibilité complète.
