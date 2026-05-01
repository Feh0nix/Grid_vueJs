// ============================================================================
// TYPES DE BASE - CELLULES ET FORMATAGE
// ============================================================================

export interface CellFormat {
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
  border?: CellBorder
}

export interface CellBorder {
  top?: BorderStyle
  right?: BorderStyle
  bottom?: BorderStyle
  left?: BorderStyle
}

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted' | 'double'
  color: string
}

export interface CellData {
  row: number
  col: number
  value: string
  formula?: string
  format: CellFormat
  computed?: boolean
}

export type CellMap = Map<string, CellData>

// ============================================================================
// MERGE ET PLAGES
// ============================================================================

export interface CellRange {
  sri: number  // start row index
  sci: number  // start col index
  eri: number  // end row index
  eci: number  // end col index
}

export interface MergeCell {
  row: number
  col: number
  rowspan: number
  colspan: number
}

export type MergeMap = Map<string, MergeCell>

// ============================================================================
// FEUILLES ET VALIDATION
// ============================================================================

export interface ValidationRule {
  type: 'number' | 'text' | 'date' | 'list' | 'custom'
  required?: boolean
  min?: number | string
  max?: number | string
  values?: string[]  // for list type
  pattern?: string   // regex for text type
  message?: string
  allowBlank?: boolean
}

export interface ValidationData {
  range: CellRange
  rule: ValidationRule
}

export interface Sheet {
  id: string
  name: string
  position: number
  cells: CellMap
  merges: MergeMap
  validations: ValidationData[]
  rowHeights: Map<number, number>
  colWidths: Map<number, number>
  hiddenRows: Set<number>
  hiddenCols: Set<number>
  freeze?: { row: number; col: number }
  styles?: CellStyle[]
}

export interface CellStyle {
  id: number
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  font?: {
    bold?: boolean
    italic?: boolean
    name?: string
    size?: number
  }
  bgcolor?: string
  textwrap?: boolean
  color?: string
  border?: CellBorder
}

// ============================================================================
// SPREADSHEET (DOCUMENT)
// ============================================================================

export interface SpreadsheetState {
  id: string
  name: string
  sheets: Sheet[]
  activeSheetId: string
  zoom: number
  showGrid: boolean
  showToolbar: boolean
  showFormulaBar: boolean
  showContextMenu: boolean
}

// ============================================================================
// SÉLECTION ET ÉTAT UI
// ============================================================================

export interface CellPosition {
  row: number
  col: number
}

export interface Selection {
  start: CellPosition
  end: CellPosition
  active: CellPosition
}

export interface ClipboardData {
  cells: CellData[]
  range: CellRange
  isCut: boolean
  sourceSheetId?: string
}

export interface HistoryState {
  sheets: Sheet[]
  activeSheetId: string
}

// ============================================================================
// OPTIONS ET CONFIGURATION
// ============================================================================

export interface SpreadsheetOptions {
  mode?: 'edit' | 'read'
  showToolbar?: boolean
  showGrid?: boolean
  showContextmenu?: boolean
  showFormulaBar?: boolean
  showBottomBar?: boolean
  autoFocus?: boolean
  row?: {
    len: number
    height: number
    minHeight?: number
  }
  col?: {
    len: number
    width: number
    minWidth?: number
  }
  style?: CellFormat
}

// ============================================================================
// ÉVÉNEMENTS
// ============================================================================

export interface CellSelectedEvent {
  cell: CellData | null
  row: number
  col: number
}

export interface CellsSelectedEvent {
  cells: CellData[]
  range: CellRange
}

export interface CellEditedEvent {
  text: string
  row: number
  col: number
  oldValue?: string
}

export type SpreadsheetEvent = 
  | { type: 'cell-selected'; data: CellSelectedEvent }
  | { type: 'cells-selected'; data: CellsSelectedEvent }
  | { type: 'cell-edited'; data: CellEditedEvent }
  | { type: 'sheet-changed'; data: { sheetId: string } }
  | { type: 'data-changed'; data: { sheetId: string } }

// ============================================================================
// CONSTANTES
// ============================================================================

export const DEFAULT_ROW_HEIGHT = 25
export const DEFAULT_COL_WIDTH = 100
export const HEADER_ROW_HEIGHT = 25
export const HEADER_COL_WIDTH = 50
export const MAX_ROWS = 1000
export const MAX_COLS = 100
export const HISTORY_LIMIT = 50

// ============================================================================
// FORMULES
// ============================================================================

export interface FormulaDefinition {
  key: string
  title: string
  render: (args: any[]) => any
  minArgs?: number
  maxArgs?: number
}

export type FormulaMap = Record<string, FormulaDefinition>
