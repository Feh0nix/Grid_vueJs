// ============================================================================
// LECTURE DE LA GRILLE
// Fonctions pures extraites d'App.vue : adressage A1, detection numerique et
// statistiques de selection. Aucune dependance a Vue ni a l'API.
// ============================================================================

const NUMERIC_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i

/** Libelle de colonne A1 pour un index 0-base ('A', 'Z', 'AA'...). */
export function columnLabel(col: number): string {
  if (col < 0) return ''
  let label = ''
  for (let index = col + 1; index > 0; index = Math.floor((index - 1) / 26)) {
    label = String.fromCharCode(65 + (index - 1) % 26) + label
  }
  return label
}

/** Adresse A1 d'une cellule, ou chaine vide si la selection est hors grille. */
export function cellAddress(row: number, col: number): string {
  const label = columnLabel(col)
  return label && row >= 0 ? label + (row + 1) : ''
}

/** Vrai si le texte represente un nombre exploitable. */
function isNumericText(value: string): boolean {
  return NUMERIC_PATTERN.test(value.trim()) && Number.isFinite(Number(value))
}

export interface SelectionStats {
  total: number
  count: number
}

/** Somme et nombre de valeurs numeriques, ou null si la selection n'en contient pas. */
export function numericStats(values: number[]): SelectionStats | null {
  if (!values.length) return null
  return { total: values.reduce((sum, value) => sum + value, 0), count: values.length }
}

export interface GridRange {
  sri: number
  sci: number
  eri: number
  eci: number
}

/** Vue minimale des donnees internes de x-data-spreadsheet. */
export interface GridDataView {
  selector: { ri: number; ci: number; range: GridRange }
  rows: { _: Record<number, { cells: Record<number, { text?: string }> }> }
  sortedRowMap: Map<number, number>
  exceptRowSet: Set<number>
}

/**
 * Valeurs numeriques de la selection courante, formules evaluees.
 * `evaluate` renvoie null quand une formule ne peut pas etre calculee.
 */
export function collectSelectionNumbers(data: GridDataView, evaluate: (formula: string) => string | null): number[] {
  const values: number[] = []
  const { range } = data.selector
  for (const row of Object.keys(data.rows._)) {
    const index = Number(row)
    if (index < range.sri || index > range.eri || data.exceptRowSet.has(index)) continue
    const source = data.sortedRowMap.get(index) ?? index
    const cells = data.rows._[source]?.cells ?? {}
    for (const [col, cell] of Object.entries(cells)) {
      const column = Number(col)
      if (column < range.sci || column > range.eci) continue
      const text = String(cell.text ?? '')
      const value = text.startsWith('=') ? evaluate(text) : text
      if (value !== null && isNumericText(value)) values.push(Number(value))
    }
  }
  return values
}
