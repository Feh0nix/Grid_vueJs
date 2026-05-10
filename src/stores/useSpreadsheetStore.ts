import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
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

export const useSpreadsheetStore = defineStore('spreadsheet', () => {
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
    {},
    'Initial state'
  )
  
  // ============================================================================
  // COMPUTED
  // ============================================================================
  
  // Convertir les Map en objets réactifs pour le store
  const sheetsData = ref<Record<string, Record<string, CellData>>>({})
  
  const activeSheet = computed<Sheet>(() => {
    const sheet = spreadsheet.value.sheets.find(s => s.id === spreadsheet.value.activeSheetId)
    if (!sheet) return spreadsheet.value.sheets[0]
    
    // Retourner une copie avec les cellules comme Map (compatibilité)
    const sheetData = sheetsData.value[sheet.id] || {}
    return {
      ...sheet,
      cells: new Map(Object.entries(sheetData))
    }
  })
  
  const canUndo = computed(() => history.canUndo.value)
  const canRedo = computed(() => history.canRedo.value)
  
  // Getter pour récupérer les données d'une cellule (utilise l'objet réactif)
  const selectedCellData = computed<CellData | null>(() => {
    if (!selectedCell.value) return null
    const activeId = spreadsheet.value.activeSheetId
    const key = cellKey(selectedCell.value.row, selectedCell.value.col)
    return sheetsData.value[activeId]?.[key] || null
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
      deepClone(sheetsData.value),
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
    const activeId = spreadsheet.value.activeSheetId
    const key = cellKey(position.row, position.col)
    const cell = sheetsData.value[activeId]?.[key]
    currentFormat.value = cell?.format || {}
  }
  
  function selectRange(range: CellRange): void {
    selectionRange.value = range
    selectedCell.value = { row: range.sri, col: range.sci }
    editingCell.value = null
  }
  
  function startEdit(position: CellPosition): void {
    editingCell.value = position
    const activeId = spreadsheet.value.activeSheetId
    const key = cellKey(position.row, position.col)
    const cell = sheetsData.value[activeId]?.[key]
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
    const activeId = spreadsheet.value.activeSheetId
    const existingCell = sheetsData.value[activeId]?.[key]
    
    const formula = formulaEvaluator.isFormula(value) ? value : undefined
    const computedValue = formula 
      ? formulaEvaluator.evaluate(formula, new Map(Object.entries(sheetsData.value[activeId] || {}))) 
      : value
    
    const cellData_obj: CellData = {
      row: position.row,
      col: position.col,
      value: computedValue,
      formula,
      format: existingCell?.format || currentFormat.value || {}
    }
    
    // Initialiser la feuille si nécessaire
    if (!sheetsData.value[activeId]) {
      sheetsData.value[activeId] = {}
    }
    
    if (value === '' && !existingCell?.format) {
      delete sheetsData.value[activeId][key]
    } else {
      // Utiliser l'assignation réactive (pas Map.set qui n'est pas réactif)
      sheetsData.value[activeId][key] = cellData_obj
    }
  }
  
  function updateCellFormat(positions: CellPosition[], format: Partial<CellFormat>): void {
    saveState('Format cells')
    
    const activeId = spreadsheet.value.activeSheetId
    
    // Initialiser la feuille si nécessaire
    if (!sheetsData.value[activeId]) {
      sheetsData.value[activeId] = {}
    }
    
    for (const pos of positions) {
      const key = cellKey(pos.row, pos.col)
      const cell = sheetsData.value[activeId][key]
      
      if (cell) {
        // Créer un nouvel objet pour la réactivité
        sheetsData.value[activeId][key] = {
          ...cell,
          format: { ...cell.format, ...format }
        }
      } else if (Object.keys(format).length > 0) {
        // Créer une nouvelle cellule avec le format
        sheetsData.value[activeId][key] = {
          row: pos.row,
          col: pos.col,
          value: '',
          format: { ...format }
        }
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
      sheetsData.value = state.sheetsData || {}
      editingCell.value = null
    }
  }
  
  function redo(): void {
    const state = history.redo()
    if (state) {
      spreadsheet.value.sheets = state.sheets
      spreadsheet.value.activeSheetId = state.activeSheetId
      sheetsData.value = state.sheetsData || {}
      editingCell.value = null
    }
  }
  
  // ============================================================================
  // ACTIONS - PRESSE-PAPIERS
  // ============================================================================
  
  function cut(): void {
    if (!selectionRange.value) return
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.cut(cellsMap, selectionRange.value, activeSheet.value.id)
  }
  
  function copy(): void {
    if (!selectionRange.value) return
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.copy(cellsMap, selectionRange.value, activeSheet.value.id)
  }
  
  function paste(): void {
    if (!selectedCell.value || !clipboard.hasClipboard()) return
    
    saveState('Paste')
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.paste(
      cellsMap,
      selectedCell.value,
      activeSheet.value.id
    )
    
    // Synchroniser les modifications du clipboard vers sheetsData
    for (const [key, cell] of cellsMap) {
      sheetsData.value[activeId][key] = cell
    }
  }
  
  function activatePaintFormat(): void {
    if (!selectionRange.value) return
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.activatePaintFormat(cellsMap, selectionRange.value)
  }
  
  function applyPaintFormat(range: CellRange): void {
    saveState('Paint format')
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.applyPaintFormat(cellsMap, range)
    
    // Synchroniser les modifications vers sheetsData
    for (const [key, cell] of cellsMap) {
      sheetsData.value[activeId][key] = cell
    }
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
    const activeId = spreadsheet.value.activeSheetId
    const newCellsObj: Record<string, CellData> = {}
    const newMerges = new Map<string, any>()
    const newRowHeights = new Map<number, number>()
    const newColWidths = new Map<number, number>()
    
    // Shift cells - utiliser l'objet sheetsData
    for (const [, cell] of Object.entries(sheetsData.value[activeId] || {})) {
      let newRow = cell.row
      let newCol = cell.col
      
      if (insertRow !== undefined) {
        if (cell.row >= insertRow) newRow += rowShift
      }
      if (insertCol !== undefined) {
        if (cell.col >= insertCol) newCol += colShift
      }
      
      const newKey = cellKey(newRow, newCol)
      newCellsObj[newKey] = { ...cell, row: newRow, col: newCol }
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
    
    // Mettre à jour l'objet réactif
    sheetsData.value[activeId] = newCellsObj
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
    const activeId = spreadsheet.value.activeSheetId
    const newCells: Record<string, CellData> = {}
    
    for (const [key, cell] of Object.entries(sheetsData.value[activeId] || {})) {
      if (cell.row === deleteRow) continue
      if (cell.row > deleteRow) {
        const newKey = cellKey(cell.row - 1, cell.col)
        newCells[newKey] = { ...cell, row: cell.row - 1 }
      } else {
        newCells[key] = cell
      }
    }
    
    sheetsData.value[activeId] = newCells
    
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
    const activeId = spreadsheet.value.activeSheetId
    const newCells: Record<string, CellData> = {}
    
    for (const [key, cell] of Object.entries(sheetsData.value[activeId] || {})) {
      if (cell.col === deleteCol) continue
      if (cell.col > deleteCol) {
        const newKey = cellKey(cell.row, cell.col - 1)
        newCells[newKey] = { ...cell, col: cell.col - 1 }
      } else {
        newCells[key] = cell
      }
    }
    
    sheetsData.value[activeId] = newCells
    
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
        const activeId = spreadsheet.value.activeSheetId
        const key = cellKey(row, filterCol)
        const cell = sheetsData.value[activeId]?.[key]
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
    const activeId = spreadsheet.value.activeSheetId
    
    // Collect all rows in the range with their sort key value
    const rowData: { row: number; sortValue: string | number }[] = []
    
    for (let row = selectionRange.value.sri; row <= eri; row++) {
      const key = cellKey(row, sortCol)
      const cell = sheetsData.value[activeId]?.[key]
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
    const sortedCells: Record<string, CellData> = {}
    
    for (let i = 0; i < rowData.length; i++) {
      const targetRow = rowData[i].row
      const sourceRow = selectionRange.value.sri + i
      
      for (let col = sci; col <= eci; col++) {
        const sourceKey = cellKey(sourceRow, col)
        const targetKey = cellKey(targetRow, col)
        
        const sourceCell = sheetsData.value[activeId]?.[sourceKey]
        if (sourceCell) {
          sortedCells[targetKey] = { ...sourceCell, row: targetRow }
        }
      }
    }
    
    // Update the cells in the sheet
    for (const [key, cell] of Object.entries(sortedCells)) {
      sheetsData.value[activeId][key] = cell
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
    
    // Données réactives (objet au lieu de Map pour la réactivité)
    sheetsData,
    
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
})
