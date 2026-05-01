import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  SpreadsheetState,
  Sheet,
  CellPosition,
  CellRange,
  CellFormat,
  CellData,
  ValidationRule
} from '../types/spreadsheet'
import { generateId, deepClone, cellKey, iterateRange } from '../utils/helpers'
import { useHistory } from '../composables/useHistory'
import { useClipboard } from '../composables/useClipboard'
import { useFormula } from '../composables/useFormula'

// ============================================================================
// STORE PRINCIPAL - ÉTAT GLOBAL DU CLASSEUR
// ============================================================================

export interface SpreadsheetStore {
  // État réactif
  spreadsheet: Ref<SpreadsheetState>
  selectedCell: Ref<CellPosition | null>
  selectionRange: Ref<CellRange | null>
  editingCell: Ref<CellPosition | null>
  editValue: Ref<string>
  currentFormat: Ref<CellFormat>
  isFavorite: Ref<boolean>
  showFormulaHelp: Ref<boolean>
  showFormatModal: Ref<boolean>
  showValidationModal: Ref<boolean>
  autofilterRange: Ref<CellRange | null>
  activeFilters: Ref<Map<number, string[]>>
  hiddenRows: Ref<Set<number>>
  showBorderSelector: Ref<boolean>
  showPrintPreview: Ref<boolean>
  showDatePicker: Ref<boolean>
  showSortFilter: Ref<boolean>
  
  // Computed
  activeSheet: ComputedRef<Sheet>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  selectedCellData: ComputedRef<CellData | null>
  isMergeActive: ComputedRef<boolean>
  
  // Actions - Gestion des feuilles
  createDefaultSheet: (name?: string) => Sheet
  setActiveSheet: (sheetId: string) => void
  addSheet: () => void
  deleteSheet: (sheetId: string) => void
  renameSheet: (sheetId: string, newName: string) => void
  
  // Actions - Cellules
  selectCell: (position: CellPosition) => void
  selectRange: (range: CellRange) => void
  startEdit: (position: CellPosition) => void
  endEdit: () => void
  setEditValue: (value: string) => void
  updateCellValue: (position: CellPosition, value: string) => void
  updateCellFormat: (positions: CellPosition[], format: Partial<CellFormat>) => void
  
  // Actions - Historique
  saveState: (description: string) => void
  undo: () => void
  redo: () => void
  
  // Actions - Presse-papiers
  cut: () => void
  copy: () => void
  paste: () => void
  activatePaintFormat: () => void
  applyPaintFormat: (range: CellRange) => void
  isPaintFormatActive: () => boolean
  
  // Actions - Fusion de cellules
  mergeCells: () => void
  unmergeCells: () => void
  
  // Actions - Lignes/Colonnes
  insertRow: () => void
  insertCol: () => void
  deleteRow: () => void
  deleteCol: () => void
  hideRow: () => void
  hideCol: () => void
  showAllRows: () => void
  resizeRow: (row: number, height: number) => void
  resizeCol: (col: number, width: number) => void
  
  // Actions - Formatage
  clearFormat: () => void
  applyCurrencyFormat: () => void
  applyPercentageFormat: () => void
  applyNumberFormat: () => void
  toggleTextWrap: () => void
  
  // Actions - Zoom
  setZoom: (zoom: number) => void
  
  // Actions - Filtres
  toggleAutofilter: () => void
  applyFilter: (col: number, selectedValues: string[]) => void
  
  // Actions - Tri
  sortAscending: () => void
  sortDescending: () => void
  
  // Actions - Validation
  addValidation: (rule: ValidationRule) => void
  clearValidation: () => void
  
  // Actions - Bordures
  applyBorder: (borderStyle: any) => void
  
  // Actions - Figer volets
  freezePanes: () => void
  
  // Actions - Divers
  toggleFavorite: () => void
  setSpreadsheetName: (name: string) => void
}

export function useSpreadsheetStore(): SpreadsheetStore {
  // ============================================================================
  // INITIALISATION
  // ============================================================================
  
  const history = useHistory(50)
  const clipboard = useClipboard()
  const formulaEvaluator = useFormula()
  
  // ============================================================================
  // ÉTAT RÉACTIF
  // ============================================================================
  
  const spreadsheet = ref<SpreadsheetState>({
    id: generateId(),
    name: 'Classeur sans titre',
    sheets: [],
    activeSheetId: '',
    zoom: 100,
    showGrid: true,
    showToolbar: true,
    showFormulaBar: true,
    showContextMenu: true
  })
  
  const selectedCell = ref<CellPosition | null>({ row: 1, col: 1 })
  const selectionRange = ref<CellRange | null>(null)
  const editingCell = ref<CellPosition | null>(null)
  const editValue = ref('')
  const currentFormat = ref<CellFormat>({})
  const isFavorite = ref(false)
  const showFormulaHelp = ref(false)
  const showFormatModal = ref(false)
  const showValidationModal = ref(false)
  const autofilterRange = ref<CellRange | null>(null)
  const activeFilters = ref<Map<number, string[]>>(new Map())
  const hiddenRows = ref<Set<number>>(new Set())
  const showBorderSelector = ref(false)
  const showPrintPreview = ref(false)
  const showDatePicker = ref(false)
  const showSortFilter = ref(false)
  
  // Initialize with default sheet
  const defaultSheet = createDefaultSheet('Feuille 1')
  spreadsheet.value.sheets.push(defaultSheet)
  spreadsheet.value.activeSheetId = defaultSheet.id
  
  // Save initial state
  history.push(
    deepClone(spreadsheet.value.sheets),
    spreadsheet.value.activeSheetId,
    'Initial state'
  )
  
  // ============================================================================
  // COMPUTED
  // ============================================================================
  
  const activeSheet = computed<Sheet>(() => {
    const sheet = spreadsheet.value.sheets.find(s => s.id === spreadsheet.value.activeSheetId)
    return sheet || spreadsheet.value.sheets[0]
  })
  
  const canUndo = computed(() => history.canUndo.value)
  const canRedo = computed(() => history.canRedo.value)
  
  const selectedCellData = computed<CellData | null>(() => {
    if (!selectedCell.value) return null
    const key = cellKey(selectedCell.value.row, selectedCell.value.col)
    return activeSheet.value.cells.get(key) || null
  })
  
  const isMergeActive = computed(() => {
    if (!selectedCell.value) return false
    const key = cellKey(selectedCell.value.row, selectedCell.value.col)
    return activeSheet.value.merges.has(key)
  })
  
  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================
  
  function createDefaultSheet(name: string = 'Feuille 1'): Sheet {
    return {
      id: generateId(),
      name,
      position: 0,
      cells: new Map(),
      merges: new Map(),
      validations: [],
      rowHeights: new Map(),
      colWidths: new Map(),
      hiddenRows: new Set(),
      hiddenCols: new Set()
    }
  }
  
  function saveState(description: string = 'Action'): void {
    history.push(
      deepClone(spreadsheet.value.sheets),
      spreadsheet.value.activeSheetId,
      description
    )
  }
  
  // ============================================================================
  // ACTIONS - GESTION DES FEUILLES
  // ============================================================================
  
  function setActiveSheet(sheetId: string): void {
    spreadsheet.value.activeSheetId = sheetId
    selectedCell.value = { row: 1, col: 1 }
    selectionRange.value = null
    editingCell.value = null
  }
  
  function addSheet(): void {
    saveState('Add sheet')
    
    const newSheet = createDefaultSheet(`Feuille ${spreadsheet.value.sheets.length + 1}`)
    newSheet.position = spreadsheet.value.sheets.length
    spreadsheet.value.sheets.push(newSheet)
    spreadsheet.value.activeSheetId = newSheet.id
    
    selectedCell.value = { row: 1, col: 1 }
    selectionRange.value = null
  }
  
  function deleteSheet(sheetId: string): void {
    if (spreadsheet.value.sheets.length <= 1) {
      alert('Vous devez conserver au moins une feuille.')
      return
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette feuille ?')) return
    
    saveState('Delete sheet')
    
    const index = spreadsheet.value.sheets.findIndex(s => s.id === sheetId)
    spreadsheet.value.sheets.splice(index, 1)
    
    if (spreadsheet.value.activeSheetId === sheetId) {
      spreadsheet.value.activeSheetId = spreadsheet.value.sheets[0].id
    }
  }
  
  function renameSheet(sheetId: string, newName: string): void {
    const sheet = spreadsheet.value.sheets.find(s => s.id === sheetId)
    if (sheet) {
      sheet.name = newName
    }
  }
  
  // ============================================================================
  // ACTIONS - CELLULES
  // ============================================================================
  
  function selectCell(position: CellPosition): void {
    selectedCell.value = position
    selectionRange.value = null
    editingCell.value = null
    
    // Update current format
    const key = cellKey(position.row, position.col)
    const cell = activeSheet.value.cells.get(key)
    currentFormat.value = cell?.format || {}
  }
  
  function selectRange(range: CellRange): void {
    selectionRange.value = range
    selectedCell.value = { row: range.sri, col: range.sci }
    editingCell.value = null
  }
  
  function startEdit(position: CellPosition): void {
    editingCell.value = position
    const key = cellKey(position.row, position.col)
    const cell = activeSheet.value.cells.get(key)
    editValue.value = cell?.formula || cell?.value || ''
  }
  
  function endEdit(): void {
    editingCell.value = null
  }
  
  function setEditValue(value: string): void {
    editValue.value = value
  }
  
  function updateCellValue(position: CellPosition, value: string): void {
    saveState('Edit cell')
    
    const key = cellKey(position.row, position.col)
    const existingCell = activeSheet.value.cells.get(key)
    
    const formula = formulaEvaluator.isFormula(value) ? value : undefined
    const computedValue = formula 
      ? formulaEvaluator.evaluate(formula, activeSheet.value.cells) 
      : value
    
    const cellData: CellData = {
      row: position.row,
      col: position.col,
      value: computedValue,
      formula,
      format: existingCell?.format || currentFormat.value || {}
    }
    
    if (value === '' && !existingCell?.format) {
      activeSheet.value.cells.delete(key)
    } else {
      activeSheet.value.cells.set(key, cellData)
    }
    
    editingCell.value = null
  }
  
  function updateCellFormat(positions: CellPosition[], format: Partial<CellFormat>): void {
    saveState('Format cells')
    
    for (const pos of positions) {
      const key = cellKey(pos.row, pos.col)
      const cell = activeSheet.value.cells.get(key)
      
      if (cell) {
        cell.format = { ...cell.format, ...format }
      } else if (Object.keys(format).length > 0) {
        activeSheet.value.cells.set(key, {
          row: pos.row,
          col: pos.col,
          value: '',
          format
        })
      }
    }
    
    currentFormat.value = { ...currentFormat.value, ...format }
  }
  
  // ============================================================================
  // ACTIONS - HISTORIQUE
  // ============================================================================
  
  function undo(): void {
    const state = history.undo()
    if (state) {
      spreadsheet.value.sheets = state.sheets
      spreadsheet.value.activeSheetId = state.activeSheetId
    }
  }
  
  function redo(): void {
    const state = history.redo()
    if (state) {
      spreadsheet.value.sheets = state.sheets
      spreadsheet.value.activeSheetId = state.activeSheetId
    }
  }
  
  // ============================================================================
  // ACTIONS - PRESSE-PAPIERS
  // ============================================================================
  
  function cut(): void {
    if (!selectionRange.value) return
    clipboard.cut(activeSheet.value.cells, selectionRange.value, activeSheet.value.id)
  }
  
  function copy(): void {
    if (!selectionRange.value) return
    clipboard.copy(activeSheet.value.cells, selectionRange.value, activeSheet.value.id)
  }
  
  function paste(): void {
    if (!selectedCell.value || !clipboard.hasClipboard()) return
    
    saveState('Paste')
    clipboard.paste(
      activeSheet.value.cells,
      selectedCell.value,
      activeSheet.value.id
    )
  }
  
  function activatePaintFormat(): void {
    if (!selectionRange.value) return
    clipboard.activatePaintFormat(activeSheet.value.cells, selectionRange.value)
  }
  
  function applyPaintFormat(range: CellRange): void {
    saveState('Paint format')
    clipboard.applyPaintFormat(activeSheet.value.cells, range)
  }
  
  function isPaintFormatActive(): boolean {
    return clipboard.isPaintFormatActive()
  }
  
  // ============================================================================
  // ACTIONS - FUSION DE CELLULES
  // ============================================================================
  
  function mergeCells(): void {
    if (!selectionRange.value) return
    
    saveState('Merge cells')
    
    const { sri, sci, eri, eci } = selectionRange.value
    const key = cellKey(sri, sci)
    
    activeSheet.value.merges.set(key, {
      row: sri,
      col: sci,
      rowspan: eri - sri + 1,
      colspan: eci - sci + 1
    })
  }
  
  function unmergeCells(): void {
    if (!selectedCell.value) return
    
    saveState('Unmerge cells')
    
    const key = cellKey(selectedCell.value.row, selectedCell.value.col)
    activeSheet.value.merges.delete(key)
  }
  
  // ============================================================================
  // ACTIONS - LIGNES/COLONNES
  // ============================================================================
  
  function shiftCellsAndData(
    rowShift: number,
    colShift: number,
    insertRow?: number,
    insertCol?: number
  ): void {
    const newCells = new Map<string, CellData>()
    const newMerges = new Map<string, any>()
    const newRowHeights = new Map<number, number>()
    const newColWidths = new Map<number, number>()
    
    // Shift cells
    for (const [, cell] of activeSheet.value.cells) {
      let newRow = cell.row
      let newCol = cell.col
      
      if (insertRow !== undefined) {
        if (cell.row >= insertRow) newRow += rowShift
      }
      if (insertCol !== undefined) {
        if (cell.col >= insertCol) newCol += colShift
      }
      
      const newKey = cellKey(newRow, newCol)
      newCells.set(newKey, { ...cell, row: newRow, col: newCol })
    }
    
    // Shift merges
    for (const [key, merge] of activeSheet.value.merges) {
      let newRow = merge.row
      let newCol = merge.col
      
      if (insertRow !== undefined) {
        if (merge.row >= insertRow) newRow += rowShift
      }
      if (insertCol !== undefined) {
        if (merge.col >= insertCol) newCol += colShift
      }
      
      newMerges.set(key, { ...merge, row: newRow, col: newCol })
    }
    
    // Shift row heights
    for (const [row, height] of activeSheet.value.rowHeights) {
      if (insertRow !== undefined) {
        if (row >= insertRow) {
          newRowHeights.set(row + rowShift, height)
        } else {
          newRowHeights.set(row, height)
        }
      } else {
        newRowHeights.set(row, height)
      }
    }
    
    // Shift col widths
    for (const [col, width] of activeSheet.value.colWidths) {
      if (insertCol !== undefined) {
        if (col >= insertCol) {
          newColWidths.set(col + colShift, width)
        } else {
          newColWidths.set(col, width)
        }
      } else {
        newColWidths.set(col, width)
      }
    }
    
    activeSheet.value.cells = newCells
    activeSheet.value.merges = newMerges
    activeSheet.value.rowHeights = newRowHeights
    activeSheet.value.colWidths = newColWidths
  }
  
  function insertRow(): void {
    if (!selectedCell.value) return
    saveState('Insert row')
    shiftCellsAndData(1, 0, selectedCell.value.row, undefined)
  }
  
  function insertCol(): void {
    if (!selectedCell.value) return
    saveState('Insert column')
    shiftCellsAndData(0, 1, undefined, selectedCell.value.col)
  }
  
  function deleteRow(): void {
    if (!selectedCell.value) return
    saveState('Delete row')
    
    const deleteRow = selectedCell.value.row
    const newCells = new Map<string, CellData>()
    
    for (const [key, cell] of activeSheet.value.cells) {
      if (cell.row === deleteRow) continue
      if (cell.row > deleteRow) {
        const newKey = cellKey(cell.row - 1, cell.col)
        newCells.set(newKey, { ...cell, row: cell.row - 1 })
      } else {
        newCells.set(key, cell)
      }
    }
    
    activeSheet.value.cells = newCells
    
    // Update merges
    const newMerges = new Map<string, any>()
    for (const [key, merge] of activeSheet.value.merges) {
      if (merge.row > deleteRow) {
        newMerges.set(key, { ...merge, row: merge.row - 1 })
      } else if (merge.row < deleteRow) {
        newMerges.set(key, merge)
      }
    }
    activeSheet.value.merges = newMerges
  }
  
  function deleteCol(): void {
    if (!selectedCell.value) return
    saveState('Delete column')
    
    const deleteCol = selectedCell.value.col
    const newCells = new Map<string, CellData>()
    
    for (const [key, cell] of activeSheet.value.cells) {
      if (cell.col === deleteCol) continue
      if (cell.col > deleteCol) {
        const newKey = cellKey(cell.row, cell.col - 1)
        newCells.set(newKey, { ...cell, col: cell.col - 1 })
      } else {
        newCells.set(key, cell)
      }
    }
    
    activeSheet.value.cells = newCells
    
    // Update merges
    const newMerges = new Map<string, any>()
    for (const [key, merge] of activeSheet.value.merges) {
      if (merge.col > deleteCol) {
        newMerges.set(key, { ...merge, col: merge.col - 1 })
      } else if (merge.col < deleteCol) {
        newMerges.set(key, merge)
      }
    }
    activeSheet.value.merges = newMerges
  }
  
  function hideRow(): void {
    if (!selectedCell.value) return
    saveState('Hide row')
    activeSheet.value.hiddenRows.add(selectedCell.value.row)
  }
  
  function hideCol(): void {
    if (!selectedCell.value) return
    saveState('Hide column')
    activeSheet.value.hiddenCols.add(selectedCell.value.col)
  }
  
  function showAllRows(): void {
    saveState('Show all')
    activeSheet.value.hiddenRows.clear()
    activeSheet.value.hiddenCols.clear()
    hiddenRows.value.clear()
  }
  
  function resizeRow(row: number, height: number): void {
    activeSheet.value.rowHeights.set(row, height)
  }
  
  function resizeCol(col: number, width: number): void {
    activeSheet.value.colWidths.set(col, width)
  }
  
  // ============================================================================
  // ACTIONS - FORMATAGE
  // ============================================================================
  
  function clearFormat(): void {
    if (!selectionRange.value && !selectedCell.value) return
    
    const positions: CellPosition[] = []
    if (selectionRange.value) {
      for (const pos of iterateRange(selectionRange.value)) {
        positions.push(pos)
      }
    } else if (selectedCell.value) {
      positions.push(selectedCell.value)
    }
    
    updateCellFormat(positions, {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      color: '#000000',
      backgroundColor: '#ffffff',
      align: 'left',
      border: undefined
    })
  }
  
  function applyCurrencyFormat(): void {
    updateCellFormat(getSelectedPositions(), { format: 'currency', prefix: '€', decimals: 2 })
  }
  
  function applyPercentageFormat(): void {
    updateCellFormat(getSelectedPositions(), { format: 'percentage', suffix: '%', decimals: 1 })
  }
  
  function applyNumberFormat(): void {
    updateCellFormat(getSelectedPositions(), { format: 'number', decimals: 0 })
  }
  
  function toggleTextWrap(): void {
    updateCellFormat(getSelectedPositions(), { textwrap: !currentFormat.value.textwrap })
  }
  
  function getSelectedPositions(): CellPosition[] {
    const positions: CellPosition[] = []
    if (selectionRange.value) {
      for (const pos of iterateRange(selectionRange.value)) {
        positions.push(pos)
      }
    } else if (selectedCell.value) {
      positions.push(selectedCell.value)
    }
    return positions
  }
  
  // ============================================================================
  // ACTIONS - ZOOM
  // ============================================================================
  
  function setZoom(zoom: number): void {
    spreadsheet.value.zoom = zoom
  }
  
  // ============================================================================
  // ACTIONS - FILTRES
  // ============================================================================
  
  function toggleAutofilter(): void {
    if (!autofilterRange.value && selectionRange.value) {
      autofilterRange.value = selectionRange.value
      activeFilters.value = new Map()
      hiddenRows.value = new Set()
    } else {
      autofilterRange.value = null
      activeFilters.value = new Map()
      hiddenRows.value = new Set()
    }
  }
  
  function applyFilter(col: number, selectedValues: string[]): void {
    if (!autofilterRange.value) return
    
    activeFilters.value.set(col, selectedValues)
    
    // Recalculate hidden rows
    hiddenRows.value = new Set()
    const { sri, eri } = autofilterRange.value
    
    for (let row = sri; row <= eri; row++) {
      let shouldHide = false
      
      for (const [filterCol, filterValues] of activeFilters.value) {
        const key = cellKey(row, filterCol)
        const cell = activeSheet.value.cells.get(key)
        const cellValue = cell?.value || ''
        
        if (!filterValues.includes(cellValue)) {
          shouldHide = true
          break
        }
      }
      
      if (shouldHide) {
        hiddenRows.value.add(row)
      }
    }
  }
  
  // ============================================================================
  // ACTIONS - TRI
  // ============================================================================
  
  function sortData(ascending: boolean): void {
    if (!selectionRange.value) return
    
    saveState(ascending ? 'Sort ascending' : 'Sort descending')
    
    const { sci, eri, eci } = selectionRange.value
    const sortCol = sci
    
    // Collect all rows in the range with their sort key value
    const rowData: { row: number; sortValue: string | number }[] = []
    
    for (let row = selectionRange.value.sri; row <= eri; row++) {
      const key = cellKey(row, sortCol)
      const cell = activeSheet.value.cells.get(key)
      const value = cell?.value || ''
      const numValue = parseFloat(String(value))
      const sortValue = isNaN(numValue) ? value : numValue
      rowData.push({ row, sortValue })
    }
    
    // Sort
    rowData.sort((a, b) => {
      if (typeof a.sortValue === 'number' && typeof b.sortValue === 'number') {
        return ascending 
          ? a.sortValue - b.sortValue 
          : b.sortValue - a.sortValue
      }
      return ascending
        ? String(a.sortValue).localeCompare(String(b.sortValue))
        : String(b.sortValue).localeCompare(String(a.sortValue))
    })
    
    // Reorder rows
    const sortedCells = new Map<string, CellData>()
    
    for (let i = 0; i < rowData.length; i++) {
      const targetRow = rowData[i].row
      const sourceRow = selectionRange.value.sri + i
      
      for (let col = sci; col <= eci; col++) {
        const sourceKey = cellKey(sourceRow, col)
        const targetKey = cellKey(targetRow, col)
        
        const sourceCell = activeSheet.value.cells.get(sourceKey)
        if (sourceCell) {
          sortedCells.set(targetKey, { ...sourceCell, row: targetRow })
        }
      }
    }
    
    // Update the cells in the sheet
    for (const [key, cell] of sortedCells) {
      activeSheet.value.cells.set(key, cell)
    }
  }
  
  function sortAscending(): void {
    sortData(true)
  }
  
  function sortDescending(): void {
    sortData(false)
  }
  
  // ============================================================================
  // ACTIONS - VALIDATION
  // ============================================================================
  
  function addValidation(rule: ValidationRule): void {
    if (!selectionRange.value && !selectedCell.value) return
    
    saveState('Add validation')
    
    const range = selectionRange.value || {
      sri: selectedCell.value!.row,
      sci: selectedCell.value!.col,
      eri: selectedCell.value!.row,
      eci: selectedCell.value!.col
    }
    
    activeSheet.value.validations.push({
      range,
      rule: {
        type: rule.type as any,
        min: rule.min,
        max: rule.max,
        values: rule.values,
        allowBlank: rule.allowBlank
      }
    })
  }
  
  function clearValidation(): void {
    if (selectedCell.value) {
      // Remove validations that include this cell
      activeSheet.value.validations = activeSheet.value.validations.filter(v => {
        return !(selectedCell.value!.row >= v.range.sri && 
                 selectedCell.value!.row <= v.range.eri && 
                 selectedCell.value!.col >= v.range.sci && 
                 selectedCell.value!.col <= v.range.eci)
      })
    }
  }
  
  // ============================================================================
  // ACTIONS - BORDURES
  // ============================================================================
  
  function applyBorder(borderStyle: any): void {
    if (!selectionRange.value && !selectedCell.value) return
    
    saveState('Apply borders')
    updateCellFormat(getSelectedPositions(), { border: borderStyle })
  }
  
  // ============================================================================
  // ACTIONS - FIGER VOLETS
  // ============================================================================
  
  function freezePanes(): void {
    if (!selectedCell.value) return
    saveState('Freeze panes')
    activeSheet.value.freeze = {
      row: selectedCell.value.row,
      col: selectedCell.value.col
    }
  }
  
  // ============================================================================
  // ACTIONS - DIVERS
  // ============================================================================
  
  function toggleFavorite(): void {
    isFavorite.value = !isFavorite.value
  }
  
  function setSpreadsheetName(name: string): void {
    spreadsheet.value.name = name
  }
  
  // ============================================================================
  // RETOUR DU STORE
  // ============================================================================
  
  return {
    // État
    spreadsheet,
    selectedCell,
    selectionRange,
    editingCell,
    editValue,
    currentFormat,
    isFavorite,
    showFormulaHelp,
    showFormatModal,
    showValidationModal,
    autofilterRange,
    activeFilters,
    hiddenRows,
    showBorderSelector,
    showPrintPreview,
    showDatePicker,
    showSortFilter,
    
    // Computed
    activeSheet,
    canUndo,
    canRedo,
    selectedCellData,
    isMergeActive,
    
    // Actions
    createDefaultSheet,
    setActiveSheet,
    addSheet,
    deleteSheet,
    renameSheet,
    selectCell,
    selectRange,
    startEdit,
    endEdit,
    setEditValue,
    updateCellValue,
    updateCellFormat,
    saveState,
    undo,
    redo,
    cut,
    copy,
    paste,
    activatePaintFormat,
    applyPaintFormat,
    isPaintFormatActive,
    mergeCells,
    unmergeCells,
    insertRow,
    insertCol,
    deleteRow,
    deleteCol,
    hideRow,
    hideCol,
    showAllRows,
    resizeRow,
    resizeCol,
    clearFormat,
    applyCurrencyFormat,
    applyPercentageFormat,
    applyNumberFormat,
    toggleTextWrap,
    setZoom,
    toggleAutofilter,
    applyFilter,
    sortAscending,
    sortDescending,
    addValidation,
    clearValidation,
    applyBorder,
    freezePanes,
    toggleFavorite,
    setSpreadsheetName
  }
}
