# Excel-Vue - Spreadsheet Application

Une application spreadsheet complète en **Vue 3 + TypeScript**, fusionnant les meilleures fonctionnalités de `excel/project` (Harena Grid) et `x-spreadsheet`.

## Architecture du Projet

```
excel-vue/
├── src/
│   ├── components/          # Composants Vue
│   │   ├── Toolbar.vue      # Barre d'outils complète
│   │   ├── FormulaBar.vue   # Barre de formule
│   │   ├── SheetTabs.vue    # Onglets de feuilles
│   │   ├── SpreadsheetGrid.vue  # Grille principale (DOM-based)
│   │   ├── ContextMenu.vue  # Menu contextuel
│   │   ├── ModalValidation.vue  # Modal de validation
│   │   └── Calendar.vue     # Sélecteur de date
│   ├── composables/         # Logique métier réutilisable
│   │   ├── useFormula.ts    # Moteur de formules
│   │   ├── useHistory.ts    # Undo/Redo
│   │   ├── useClipboard.ts  # Copier/Couper/Coller
│   │   ├── useImportExport.ts  # Import/Export CSV/XLSX
│   │   ├── useValidation.ts # Validation de données
│   │   └── useAutofill.ts   # Remplissage automatique
│   ├── types/               # Types TypeScript
│   │   └── spreadsheet.ts   # Interfaces de données
│   ├── utils/               # Utilitaires
│   │   └── helpers.ts       # Fonctions auxiliaires
│   └── styles/              # Styles CSS
│       └── spreadsheet.css  # Styles principaux
└── package.json
```

## Fonctionnalités Implémentées

### 1. Structure de Données
- [ ] **Cell** : Données de cellule (valeur, formule, format)
- [ ] **CellFormat** : Formatage (gras, italique, souligné, barré, couleur, alignement, etc.)
- [ ] **Sheet** : Feuille de calcul avec cellules, merges, validations
- [ ] **Spreadsheet** : Document multi-feuilles
- [ ] **Merge Cells** : Fusion de cellules avec références [row, col]
- [ ] **Borders** : Bordures personnalisables (top, right, bottom, left)
- [ ] **Data Validation** : Règles de validation (type, liste, min/max)
- [ ] **Freeze Panes** : Figer les volets
- [ ] **Hidden Rows/Cols** : Masquage de lignes/colonnes
- [ ] **Row Heights / Col Widths** : Dimensions personnalisables

### 2. Logique Métier (Composables)

#### useFormula.ts
- [ ] Parser d'expressions infix vers suffix
- [ ] Évaluation des formules
- [ ] Fonctions supportées :
  - [ ] **Mathématiques** : SUM, AVERAGE, COUNT, MAX, MIN
  - [ ] **Trigonométrie** : SQRT, POWER, ABS, ROUND, CEIL, FLOOR
  - [ ] **Logiques** : IF, AND, OR, NOT
  - [ ] **Texte** : CONCAT, LEN, UPPER, LOWER, PROPER
  - [ ] **Date** : TODAY, NOW, YEAR, MONTH, DAY
- [ ] Références de cellules (A1, B2, etc.)
- [ ] Plages de cellules (A1:B5)
- [ ] Opérateurs : +, -, *, /, =, >, <, >=, <=

#### useHistory.ts
- [ ] Undo (Ctrl+Z)
- [ ] Redo (Ctrl+Y)
- [ ] Snapshots du state
- [ ] Limitation historique (configurable)

#### useClipboard.ts
- [ ] Copy (Ctrl+C)
- [ ] Cut (Ctrl+X)
- [ ] Paste (Ctrl+V)
- [ ] Paint Format (repliquer le format)
- [ ] Gestion multi-cellules

#### useImportExport.ts
- [ ] Export CSV
- [ ] Export XLSX (via xlsx library)
- [ ] Import CSV
- [ ] Import XLSX
- [ ] File dialog integration

#### useValidation.ts
- [ ] Règles de validation
- [ ] Types : number, text, date, list
- [ ] Messages d'erreur personnalisés
- [ ] Validation en temps réel

#### useAutofill.ts
- [ ] Détection de pattern
- [ ] Séries numériques
- [ ] Séries temporelles
- [ ] Remplissage intelligent

### 3. Composants UI

#### Toolbar.vue
- [ ] **Undo/Redo** : Annuler/Refaire
- [ ] **Print** : Impression
- [ ] **Paint Format** : Repliquer le format
- [ ] **Clear Format** : Effacer le format
- [ ] **Format** : Général, Nombre, Pourcentage, Date, etc.
- [ ] **Font** : Police (famille, taille)
- [ ] **Style** : Gras, Italique, Souligné, Barré
- [ ] **Colors** : Couleur texte, Couleur fond
- [ ] **Borders** : Sélecteur de bordures
- [ ] **Merge/Unmerge** : Fusionner cellules
- [ ] **Align** : Alignement horizontal/vertical
- [ ] **Text Wrap** : Retour à la ligne
- [ ] **Freeze** : Figer volets
- [ ] **Autofilter** : Filtre automatique
- [ ] **Formula** : Aide formules
- [ ] **Zoom** : 50%, 75%, 100%, 125%, 150%
- [ ] **Import/Export** : CSV, XLSX
- [ ] **Share** : Partager
- [ ] **Favorite** : Marquer favori

#### FormulaBar.vue
- [ ] Référence cellule (ex: A1)
- [ ] Icône ƒx
- [ ] Input édition
- [ ] Validation entrée
- [ ] Auto-focus

#### SheetTabs.vue
- [ ] Liste des feuilles
- [ ] Feuille active
- [ ] Ajouter feuille
- [ ] Supprimer feuille
- [ ] Renommer feuille
- [ ] Navigation clavier

#### SpreadsheetGrid.vue (Composant Principal)
- [ ] **Grille DOM** : Rendu HTML/CSS
- [ ] **Headers** : En-têtes de lignes/colonnes (sticky)
- [ ] **Sélection** :
  - [ ] Cellule unique
  - [ ] Plage de cellules
  - [ ] Ligne entière
  - [ ] Colonne entière
  - [ ] Toutes les cellules
- [ ] **Édition** :
  - [ ] Double-clic pour éditer
  - [ ] F2 pour éditer
  - [ ] Saisie directe
  - [ ] Validation formulaire
- [ ] **Navigation** :
  - [ ] Flèches directionnelles
  - [ ] Tab / Shift+Tab
  - [ ] Enter / Shift+Enter
  - [ ] Page Up/Down
  - [ ] Ctrl+Home/End
- [ ] **Merge Cells** :
  - [ ] Détection des fusions
  - [ ] Affichage fusionné
  - [ ] Unmerge
- [ ] **Borders** :
  - [ ] Rendu CSS des bordures
  - [ ] Styles (solid, dashed, dotted)
  - [ ] Couleurs personnalisables
- [ ] **Freeze Panes** :
  - [ ] Division en 4 zones
  - [ ] Scroll synchronisé
  - [ ] Headers figés
- [ ] **Resize** :
  - [ ] Redimensionner lignes
  - [ ] Redimensionner colonnes
  - [ ] Auto-fit
- [ ] **Autofill** :
  - [ ] Poignée de remplissage
  - [ ] Drag pour étendre
  - [ ] Pattern recognition
- [ ] **Context Menu** :
  - [ ] Copier/Couper/Coller
  - [ ] Insert row/col
  - [ ] Delete row/col
  - [ ] Hide/Unhide
  - [ ] Merge/Unmerge
  - [ ] Format cells
  - [ ] Validation
- [ ] **Zoom** :
  - [ ] Transform scale
  - [ ] Ajustement dimensions
- [ ] **Print** :
  - [ ] Styles print CSS
  - [ ] Aperçu avant impression

#### ContextMenu.vue
- [ ] Positionnement au clic droit
- [ ] Items dynamiques selon contexte
- [ ] Sous-menus
- [ ] Raccourcis clavier

#### ModalValidation.vue
- [ ] Configuration règles
- [ ] Type de validation
- [ ] Valeurs min/max
- [ ] Listes déroulantes
- [ ] Messages personnalisés

#### Calendar.vue
- [ ] Sélecteur de date
- [ ] Navigation mois/année
- [ ] Format date configurable

### 4. Styles CSS

#### Layout
- [ ] Header fixe
- [ ] Toolbar responsive
- [ ] FormulaBar sticky
- [ ] Grid scrollable
- [ ] Footer tabs fixe
- [ ] Full viewport coverage

#### Cellules
- [ ] Bordures par défaut
- [ ] Sélection visuelle
- [ ] État édition
- [ ] Hover effects
- [ ] Format numérique
- [ ] Alignement contenu

#### Toolbars
- [ ] Boutons icones
- [ ] Dropdowns
- [ ] Color pickers
- [ ] Responsive (More button)

#### Thème
- [ ] Couleurs professionnelles
- [ ] Typographie lisible
- [ ] Espacement cohérent
- [ ] Shadows subtiles

### 5. Gestion d'État Global (App.vue)
- [ ] Feuilles actives
- [ ] Feuille courante
- [ ] Cellule sélectionnée
- [ ] Plage sélectionnée
- [ ] Format courant
- [ ] Clipboard
- [ ] History (undo/redo)
- [ ] Zoom level
- [ ] Mode édition
- [ ] Événements globaux

### 6. Fonctionnalités Avancées (de x-spreadsheet)
- [ ] **Auto-filter** : Filtres sur colonnes
- [ ] **Sort** : Tri des données
- [ ] **Search** : Recherche dans la grille
- [ ] **Print** : Optimisation impression
- [ ] **Multiple sheets** : Gestion multi-feuilles
- [ ] **Data validation** : Validation avancée
- [ ] **Context menu** : Menu contextuel riche
- [ ] **Keyboard shortcuts** : Raccourcis complets
- [ ] **Text wrap** : Retour à la ligne automatique
- [ ] **Styled cells** : Styles personnalisés
- [ ] **Merged cells** : Fusion avancée
- [ ] **Frozen cells** : Volets figés
- [ ] **Resizable rows/cols** : Redimensionnement
- [ ] **Hide rows/cols** : Masquage

### 7. Fonctionnalités Harena Grid conservées
- [ ] **Formules étendues** : Toutes les fonctions listées
- [ ] **Import/Export** : CSV et XLSX
- [ ] **Modern UI** : Interface moderne et propre
- [ ] **Responsive** : Adaptation écran
- [ ] **Share** : Partage facile
- [ ] **Favorite** : Système de favoris
- [ ] **Formula help** : Aide intégrée
- [ ] **Zoom** : Contrôle zoom

## Stack Technique

- **Vue 3** : Framework frontend (Composition API)
- **TypeScript** : Typage statique
- **Vite** : Build tool et dev server
- **xlsx** : Bibliothèque XLSX (SheetJS)
- **file-saver** : Téléchargement de fichiers

## Commandes

```bash
# Installation
npm install

# Développement
npm run dev

# Build production
npm run build

# Preview production
npm run preview
```

## Spécifications des Données

### CellData
```typescript
interface CellData {
  row: number
  col: number
  value: string
  formula?: string
  format: CellFormat
}
```

### CellFormat
```typescript
interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontSize?: number
  fontFamily?: string
  color?: string
  backgroundColor?: string
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  textwrap?: boolean
  format?: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'text'
  prefix?: string
  suffix?: string
  decimals?: number
  border?: {
    top?: { style: string; color: string }
    right?: { style: string; color: string }
    bottom?: { style: string; color: string }
    left?: { style: string; color: string }
  }
}
```

### Sheet
```typescript
interface Sheet {
  id: string
  name: string
  position: number
  cells: Map<string, CellData>
  merges: Map<string, [number, number]>
  validations: ValidationRule[]
  rowHeights: Map<number, number>
  colWidths: Map<number, number>
  hiddenRows: Set<number>
  hiddenCols: Set<number>
  freeze?: { row: number; col: number }
}
```

## Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+C | Copy |
| Ctrl+X | Cut |
| Ctrl+V | Paste |
| Ctrl+P | Print |
| Ctrl+F | Find |
| Ctrl+S | Save |
| F2 | Edit cell |
| Delete | Clear cell |
| Escape | Cancel edit |
| Enter | Confirm edit / Next cell |
| Tab | Next cell |
| Shift+Tab | Previous cell |
| Arrow Keys | Navigate |
| Ctrl+Home | Go to A1 |
| Ctrl+End | Go to last cell |
| Ctrl+A | Select all |
| Ctrl+Space | Select column |
| Shift+Space | Select row |

## Checklist de Développement

### Phase 1 : Setup
- [x] Créer projet Vue 3 + Vite
- [x] Installer dépendances (xlsx, file-saver)
- [x] Configurer TypeScript
- [x] Structurer dossiers

### Phase 2 : Types & Modèle
- [ ] Définir toutes les interfaces
- [ ] Implémenter DataProxy (store central)
- [ ] Gestion des références de cellules

### Phase 3 : Composables
- [ ] useFormula (moteur de formules)
- [ ] useHistory (undo/redo)
- [ ] useClipboard (copy/paste)
- [ ] useImportExport (CSV/XLSX)
- [ ] useValidation (validation données)
- [ ] useAutofill (remplissage auto)

### Phase 4 : Composants UI
- [ ] Toolbar.vue
- [ ] FormulaBar.vue
- [ ] SheetTabs.vue
- [ ] ContextMenu.vue
- [ ] ModalValidation.vue
- [ ] Calendar.vue

### Phase 5 : Grille Principale
- [ ] Structure DOM de base
- [ ] Rendu cellules
- [ ] Headers sticky
- [ ] Sélection simple
- [ ] Sélection multiple
- [ ] Édition cellule
- [ ] Navigation clavier
- [ ] Merge cells
- [ ] Borders CSS
- [ ] Freeze panes
- [ ] Resize row/col
- [ ] Hide row/col
- [ ] Autofill handle
- [ ] Context menu
- [ ] Zoom

### Phase 6 : Styles
- [ ] Layout global
- [ ] Toolbar styling
- [ ] Cell styling
- [ ] Selection styling
- [ ] Responsive design
- [ ] Print styles

### Phase 7 : Intégration
- [ ] App.vue
- [ ] Gestion état global
- [ ] Événements globaux
- [ ] i18n setup

### Phase 8 : Tests
- [ ] Test formules
- [ ] Test import/export
- [ ] Test merge/unmerge
- [ ] Test freeze
- [ ] Test autofill
- [ ] Test validation
- [ ] Test impression

## Notes de Développement

### Priorités
1. **Grille fonctionnelle** : Navigation, édition, formules basiques
2. **Formatage** : Styles, alignement, couleurs
3. **Fonctions avancées** : Merge, borders, freeze
4. **Import/Export** : CSV et XLSX
5. **Polish** : UI/UX, animations, responsive

### Défis Techniques
- **Performance** : Grille avec 10000+ cellules → virtualisation potentielle
- **Formules** : Parser et évaluer efficacement
- **Merge cells** : Gestion complexe du rendu et de la sélection
- **Freeze panes** : Synchronisation des scrolls
- **Undo/Redo** : Snapshots mémoire-optimisés

### Solutions Envisagées
- Virtual scrolling pour grandes grilles
- Web Workers pour calculs de formules lourds
- CSS Grid pour layout flexible
- Pinia pour state management (si complexité augmente)
