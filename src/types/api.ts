// ============================================================================
// CONTRAT D'ECHANGE AVEC L'API
// Le format { title, sheets } de x-data-spreadsheet fait foi : les feuilles
// sont transmises sans transformation pour ne perdre aucune propriete.
// ============================================================================

/** Cellule telle que serialisee par x-data-spreadsheet. */
export interface GridCell {
  text?: string
  merge?: [number, number]
  editable?: boolean
  style?: number
}

/**
 * Feuille au format x-data-spreadsheet.
 * L'index signature conserve `freeze`, `validations`, `styles`... sans perte.
 */
export interface GridSheet {
  name: string
  rows: { len: number } & Record<number, { cells: Record<number, GridCell> }>
  cols: { len: number }
  merges: string[]
  [key: string]: unknown
}

/** Element de liste renvoye par GET /workbooks. */
export interface WorkbookSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

/** Classeur complet renvoye par GET /workbooks/:id, POST et PUT. */
export interface WorkbookDetail extends WorkbookSummary {
  sheets: GridSheet[]
}

/** Corps de POST / PUT /workbooks. L'id est genere par le serveur. */
export interface WorkbookPayload {
  title: string
  sheets: GridSheet[]
}

/** Forme d'erreur normalisee de l'API : { "message": "..." }. */
export interface ApiErrorBody {
  message?: string
  code?: string
  details?: unknown
}

/** Forme de travail d'un classeur, partagee par le cache local et l'interface. */
export interface WorkbookData {
  title: string
  sheets: Record<string, unknown>[]
}
