import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  SpreadsheetState,
  Sheet,
  CellPosition,
  CellRange,
  CellFormat,
  CellData,
  ValidationRule,
  ChartDefinition,
  ConditionalFormatRule
} from '../types/spreadsheet'
import { generateId, deepClone, cellKey, iterateRange } from '../utils/helpers'
import { useHistory } from '../composables/useHistory'
import { parseClipboardText, removeSheetReferences, renameSheetReferences, rewriteStructuralReferences, serializeClipboardText, shiftFormulaReferences, useClipboard } from '../composables/useClipboard'
import { useFormula } from '../composables/useFormula'
import { editValidationRange, subtractRange, validateValue } from '../utils/validation'
import { numericSeries, seriesValue } from '../utils/autofill'

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
  const validationError = ref('')
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
  
  // ============================================================================
  // COMPUTED
  // ============================================================================
  
  // Convertir les Map en objets réactifs pour le store
  const sheetsData = ref<Record<string, Record<string, CellData>>>({})
  const storageKey = 'grid-vue-workbook-v1'
  const saveError = ref('')

  function saveWorkbook(): boolean {
    try {
      const payload = JSON.stringify({ spreadsheet: spreadsheet.value, sheetsData: sheetsData.value }, (_key, value) => {
        if (value instanceof Map) return { __gridType: 'Map', entries: [...value] }
        if (value instanceof Set) return { __gridType: 'Set', entries: [...value] }
        return value
      })
      localStorage.setItem(storageKey, payload)
      saveError.value = ''
      return true
    } catch {
      saveError.value = 'Impossible de sauvegarder localement. Exportez votre travail.'
      return false
    }
  }

  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const data = JSON.parse(saved, (_key, value) => {
        if (value && value.__gridType === 'Map') return new Map(value.entries)
        if (value && value.__gridType === 'Set') return new Set(value.entries)
        return value
      })
      if (!Array.isArray(data.spreadsheet?.sheets) || !data.spreadsheet.sheets.length || !data.sheetsData) {
        throw new Error('Classeur invalide')
      }
      spreadsheet.value = data.spreadsheet
      sheetsData.value = data.sheetsData
    }
  } catch {
    saveError.value = 'Impossible de restaurer le classeur enregistré.'
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch([spreadsheet, sheetsData], () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveWorkbook, 300)
  }, { deep: true, flush: 'sync' })
  
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
  const activeSheetState = computed(() => spreadsheet.value.sheets.find(s => s.id === spreadsheet.value.activeSheetId) || spreadsheet.value.sheets[0])
  const formulaContext = computed(() => ({
    currentSheet: activeSheetState.value.name,
    sheets: new Map(spreadsheet.value.sheets.map(sheet => [sheet.name.toLocaleLowerCase(), new Map(Object.entries(sheetsData.value[sheet.id] || {}))]))
  }))
  
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
    currentFormat.value = sheetsData.value[sheetId]?.[cellKey(1, 1)]?.format || {}
  }
  
  function addSheet(): void {
    saveState('Add sheet')
    
    let number = 1
    while (spreadsheet.value.sheets.some(sheet => sheet.name.toLocaleLowerCase() === `feuille ${number}`)) number++
    const newSheet = createDefaultSheet(`Feuille ${number}`)
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
    if (index < 0) return
    const name = spreadsheet.value.sheets[index].name
    for (const [id, cells] of Object.entries(sheetsData.value)) {
      if (id === sheetId) continue
      for (const [key, cell] of Object.entries(cells)) {
        if (!cell.formula) continue
        const formula = removeSheetReferences(cell.formula, name)
        if (formula !== cell.formula) cells[key] = { ...cell, formula }
      }
    }
    spreadsheet.value.sheets.splice(index, 1)
    delete sheetsData.value[sheetId]
    
    if (spreadsheet.value.activeSheetId === sheetId) {
      spreadsheet.value.activeSheetId = spreadsheet.value.sheets[0].id
    }
  }
  
  function renameSheet(sheetId: string, newName: string): boolean {
    const name = newName.trim()
    const sheet = spreadsheet.value.sheets.find(s => s.id === sheetId)
    if (!sheet || !name || name.length > 31 || /[\\/?*\[\]:]/.test(name) || name.startsWith("'") || name.endsWith("'") || spreadsheet.value.sheets.some(s => s.id !== sheetId && s.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return false
    if (sheet.name !== name) {
      saveState('Rename sheet')
      for (const cells of Object.values(sheetsData.value)) {
        for (const [key, cell] of Object.entries(cells)) {
          if (!cell.formula) continue
          const formula = renameSheetReferences(cell.formula, sheet.name, name)
          if (formula !== cell.formula) cells[key] = { ...cell, formula }
        }
      }
      sheet.name = name
    }
    return true
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
    const key = cellKey(position.row, position.col)
    const activeId = spreadsheet.value.activeSheetId
    const existingCell = sheetsData.value[activeId]?.[key]
    if ((existingCell?.formula || existingCell?.value || '') === value) return
    if (!validateUpdates([{ ...position, value }])) return
    saveState('Edit cell')
    
    const formula = formulaEvaluator.isFormula(value) ? value : undefined
    const computedValue = formula 
      ? formulaEvaluator.evaluate(formula, new Map(Object.entries(sheetsData.value[activeId] || {})), formulaContext.value)
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

  function clearSelectionContents(): void {
    const range = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    if (!range) return
    const id = spreadsheet.value.activeSheetId
    const source = sheetsData.value[id] || {}
    const keys = Object.keys(source).filter(key => {
      const cell = source[key]
      return cell.row >= range.sri && cell.row <= range.eri && cell.col >= range.sci && cell.col <= range.eci && (cell.value !== '' || !!cell.formula)
    })
    if (!keys.length) return
    saveState('Clear contents')
    for (const key of keys) source[key] = { ...source[key], value: '', formula: undefined, valueType: undefined }
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
    const state = history.undo(spreadsheet.value.sheets, spreadsheet.value.activeSheetId, sheetsData.value)
    if (state) {
      spreadsheet.value.sheets = state.sheets
      spreadsheet.value.activeSheetId = state.activeSheetId
      sheetsData.value = state.sheetsData || {}
      editingCell.value = null
      currentFormat.value = selectedCell.value ? sheetsData.value[state.activeSheetId]?.[cellKey(selectedCell.value.row, selectedCell.value.col)]?.format || {} : {}
    }
  }
  
  function redo(): void {
    const state = history.redo()
    if (state) {
      spreadsheet.value.sheets = state.sheets
      spreadsheet.value.activeSheetId = state.activeSheetId
      sheetsData.value = state.sheetsData || {}
      editingCell.value = null
      currentFormat.value = selectedCell.value ? sheetsData.value[state.activeSheetId]?.[cellKey(selectedCell.value.row, selectedCell.value.col)]?.format || {} : {}
    }
  }
  
  // ============================================================================
  // ACTIONS - PRESSE-PAPIERS
  // ============================================================================
  
  function cut(): void {
    const range = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    if (!range) return
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.cut(cellsMap, range, activeSheet.value.id)
  }
  
  function copy(): void {
    const range = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    if (!range) return
    const activeId = spreadsheet.value.activeSheetId
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.copy(cellsMap, range, activeSheet.value.id)
  }
  
  function paste(): void {
    if (!selectedCell.value || !clipboard.hasClipboard()) return
    
    const activeId = spreadsheet.value.activeSheetId
    const copied = clipboard.getClipboard()
    if (copied) {
      const copiedCells = new Map(copied.cells.map(cell => [cellKey(cell.row, cell.col), cell]))
      const updates = [...iterateRange(copied.range)].map(pos => {
        const cell = copiedCells.get(cellKey(pos.row, pos.col))
        const row = selectedCell.value!.row + pos.row - copied.range.sri
        const col = selectedCell.value!.col + pos.col - copied.range.sci
        const formula = cell?.formula && !copied.isCut ? shiftFormulaReferences(cell.formula, row - pos.row, col - pos.col) : cell?.formula
        return { row, col, value: formula || cell?.value || '' }
      })
      if (!validateUpdates(updates)) return
    }
    saveState('Paste')
    if (copied?.isCut && copied.sourceSheetId && copied.sourceSheetId !== activeId) {
      const source = sheetsData.value[copied.sourceSheetId]
      if (source) for (const pos of iterateRange(copied.range)) delete source[cellKey(pos.row, pos.col)]
    }
    const cellsMap = new Map(Object.entries(sheetsData.value[activeId] || {}))
    clipboard.paste(
      cellsMap,
      selectedCell.value,
      activeSheet.value.id
    )
    
    // Synchroniser les modifications du clipboard vers sheetsData
    sheetsData.value[activeId] = Object.fromEntries(cellsMap)
  }

  function selectionAsText(): string {
    const range = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    if (!range) return ''
    const source = sheetsData.value[spreadsheet.value.activeSheetId] || {}
    const map = new Map(Object.entries(source))
    const rows: string[][] = []
    for (let row = range.sri; row <= range.eri; row++) {
      const values: string[] = []
      for (let col = range.sci; col <= range.eci; col++) {
        const cell = source[cellKey(row, col)]
        values.push(cell?.formula ? formulaEvaluator.evaluate(cell.formula, map, formulaContext.value) : cell?.value || '')
      }
      rows.push(values)
    }
    return serializeClipboardText(rows)
  }

  function pasteText(text: string): void {
    if (!selectedCell.value) return
    const rows = parseClipboardText(text)
    const updates = rows.flatMap((values, r) => values.map((value, c) => ({ row: selectedCell.value!.row + r, col: selectedCell.value!.col + c, value })))
    if (!validateUpdates(updates)) return
    saveState('Paste text')
    const id = spreadsheet.value.activeSheetId
    const cells = { ...(sheetsData.value[id] || {}) }
    rows.forEach((values, r) => values.forEach((value, c) => {
      const row = selectedCell.value!.row + r, col = selectedCell.value!.col + c
      if (row > 1000 || col > 100) return
      const key = cellKey(row, col)
      const formula = formulaEvaluator.isFormula(value) ? value : undefined
      cells[key] = { row, col, value: formula ? formulaEvaluator.evaluate(formula, new Map(Object.entries(cells)), formulaContext.value) : value, formula, format: cells[key]?.format || {} }
    }))
    sheetsData.value[id] = cells
  }

  function autofill(target: CellRange): void {
    const source = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    if (!source) return
    const id = spreadsheet.value.activeSheetId
    const original = sheetsData.value[id] || {}
    const result = { ...original }
    const height = source.eri - source.sri + 1, width = source.eci - source.sci + 1
    const vertical = height >= 2 && target.sci === source.sci && target.eci === source.eci
    const horizontal = width >= 2 && target.sri === source.sri && target.eri === source.eri
    const series = new Map<number, { first: number; step: number }>()
    if (vertical) for (let col = source.sci; col <= source.eci; col++) {
      const pattern = numericSeries(Array.from({ length: height }, (_, i) => original[cellKey(source.sri + i, col)]))
      if (pattern) series.set(col, pattern)
    }
    if (horizontal) for (let row = source.sri; row <= source.eri; row++) {
      const pattern = numericSeries(Array.from({ length: width }, (_, i) => original[cellKey(row, source.sci + i)]))
      if (pattern) series.set(row, pattern)
    }
    const mod = (n: number, divisor: number) => ((n % divisor) + divisor) % divisor
    let changed = false
    const updates: { row: number, col: number, value: string }[] = []
    for (const pos of iterateRange(target)) {
      if (pos.row < 1 || pos.col < 1 || pos.row > 1000 || pos.col > 100) continue
      if (pos.row >= source.sri && pos.row <= source.eri && pos.col >= source.sci && pos.col <= source.eci) continue
      const row = source.sri + mod(pos.row - source.sri, height)
      const col = source.sci + mod(pos.col - source.sci, width)
      const cell = original[cellKey(row, col)]
      const key = cellKey(pos.row, pos.col)
      if (cell) result[key] = { ...deepClone(cell), row: pos.row, col: pos.col, formula: cell.formula ? shiftFormulaReferences(cell.formula, pos.row - row, pos.col - col) : undefined }
      else delete result[key]
      const pattern = vertical ? series.get(pos.col) : horizontal ? series.get(pos.row) : undefined
      const extrapolated = pattern && seriesValue(pattern.first, pattern.step, vertical ? pos.row - source.sri : pos.col - source.sci)
      if (extrapolated != null && result[key]) result[key] = { ...result[key], value: extrapolated, valueType: 'number' }
      updates.push({ row: pos.row, col: pos.col, value: result[key]?.formula || result[key]?.value || '' })
      changed = true
    }
    if (!changed) return
    if (!validateUpdates(updates)) return
    saveState('Autofill')
    sheetsData.value[id] = result
    selectRange(target)
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

  function rewriteOtherSheetReferences(axis: 'row' | 'col', index: number, operation: 'insert' | 'delete'): void {
    const activeId = spreadsheet.value.activeSheetId
    const name = activeSheetState.value.name
    for (const [id, cells] of Object.entries(sheetsData.value)) {
      if (id === activeId) continue
      for (const [key, cell] of Object.entries(cells)) {
        if (!cell.formula) continue
        const formula = rewriteStructuralReferences(cell.formula, axis, index, operation, name, false)
        if (formula !== cell.formula) cells[key] = { ...cell, formula }
      }
    }
  }
  
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
      const formula = cell.formula && insertRow !== undefined ? rewriteStructuralReferences(cell.formula, 'row', insertRow, 'insert', activeSheetState.value.name)
        : cell.formula && insertCol !== undefined ? rewriteStructuralReferences(cell.formula, 'col', insertCol, 'insert', activeSheetState.value.name) : cell.formula
      newCellsObj[newKey] = { ...cell, row: newRow, col: newCol, formula }
    }
    
    // Shift merges
    for (const [, merge] of activeSheet.value.merges) {
      let newRow = merge.row
      let newCol = merge.col
      let rowspan = merge.rowspan
      let colspan = merge.colspan
      
      if (insertRow !== undefined) {
        if (merge.row >= insertRow) newRow += rowShift
        else if (insertRow < merge.row + merge.rowspan) rowspan += rowShift
      }
      if (insertCol !== undefined) {
        if (merge.col >= insertCol) newCol += colShift
        else if (insertCol < merge.col + merge.colspan) colspan += colShift
      }
      
      newMerges.set(cellKey(newRow, newCol), { ...merge, row: newRow, col: newCol, rowspan, colspan })
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
    activeSheetState.value.merges = newMerges
    activeSheetState.value.rowHeights = newRowHeights
    activeSheetState.value.colWidths = newColWidths
    if (insertRow !== undefined) activeSheetState.value.hiddenRows = new Set([...activeSheet.value.hiddenRows].map(row => row >= insertRow ? row + rowShift : row))
    if (insertCol !== undefined) activeSheetState.value.hiddenCols = new Set([...activeSheet.value.hiddenCols].map(col => col >= insertCol ? col + colShift : col))
    const axis = insertRow !== undefined ? 'row' : 'col'
    const index = insertRow ?? insertCol
    if (index !== undefined) activeSheetState.value.validations = activeSheetState.value.validations.map(entry => ({ ...entry, range: editValidationRange(entry.range, axis, index, 'insert')! }))
    if (index !== undefined && activeSheetState.value.charts) activeSheetState.value.charts = activeSheetState.value.charts.map(chart => ({ ...chart, range: editValidationRange(chart.range, axis, index, 'insert')! }))
    if (index !== undefined && activeSheetState.value.conditionalFormats) activeSheetState.value.conditionalFormats = activeSheetState.value.conditionalFormats.map(rule => ({ ...rule, range: editValidationRange(rule.range, axis, index, 'insert')! }))
  }
  
  function insertRow(): void {
    if (!selectedCell.value) return
    saveState('Insert row')
    rewriteOtherSheetReferences('row', selectedCell.value.row, 'insert')
    shiftCellsAndData(1, 0, selectedCell.value.row, undefined)
  }
  
  function insertCol(): void {
    if (!selectedCell.value) return
    saveState('Insert column')
    rewriteOtherSheetReferences('col', selectedCell.value.col, 'insert')
    shiftCellsAndData(0, 1, undefined, selectedCell.value.col)
  }
  
  function deleteRow(): void {
    if (!selectedCell.value) return
    saveState('Delete row')
    
    const deleteRow = selectedCell.value.row
    rewriteOtherSheetReferences('row', deleteRow, 'delete')
    const activeId = spreadsheet.value.activeSheetId
    const newCells: Record<string, CellData> = {}
    
    for (const [key, cell] of Object.entries(sheetsData.value[activeId] || {})) {
      if (cell.row === deleteRow) continue
      const formula = cell.formula ? rewriteStructuralReferences(cell.formula, 'row', deleteRow, 'delete', activeSheetState.value.name) : undefined
      if (cell.row > deleteRow) {
        const newKey = cellKey(cell.row - 1, cell.col)
        newCells[newKey] = { ...cell, row: cell.row - 1, formula }
      } else {
        newCells[key] = { ...cell, formula }
      }
    }
    
    sheetsData.value[activeId] = newCells
    
    // Update merges
    const newMerges = new Map<string, any>()
    for (const [, merge] of activeSheet.value.merges) {
      if (merge.row > deleteRow) {
        newMerges.set(cellKey(merge.row - 1, merge.col), { ...merge, row: merge.row - 1 })
      } else if (deleteRow >= merge.row && deleteRow < merge.row + merge.rowspan) {
        if (merge.rowspan > 1) newMerges.set(cellKey(merge.row, merge.col), { ...merge, rowspan: merge.rowspan - 1 })
      } else {
        newMerges.set(cellKey(merge.row, merge.col), merge)
      }
    }
    activeSheetState.value.merges = newMerges
    activeSheetState.value.rowHeights = new Map([...activeSheet.value.rowHeights].filter(([row]) => row !== deleteRow).map(([row, height]) => [row > deleteRow ? row - 1 : row, height]))
    activeSheetState.value.hiddenRows = new Set([...activeSheet.value.hiddenRows].filter(row => row !== deleteRow).map(row => row > deleteRow ? row - 1 : row))
    activeSheetState.value.validations = activeSheetState.value.validations.flatMap(entry => {
      const range = editValidationRange(entry.range, 'row', deleteRow, 'delete')
      return range ? [{ ...entry, range }] : []
    })
    if (activeSheetState.value.charts) activeSheetState.value.charts = activeSheetState.value.charts.map(chart => ({ ...chart, range: editValidationRange(chart.range, 'row', deleteRow, 'delete') || { ...chart.range, sri: deleteRow, eri: deleteRow } }))
    if (activeSheetState.value.conditionalFormats) activeSheetState.value.conditionalFormats = activeSheetState.value.conditionalFormats.flatMap(rule => { const range = editValidationRange(rule.range, 'row', deleteRow, 'delete'); return range ? [{ ...rule, range }] : [] })
  }
  
  function deleteCol(): void {
    if (!selectedCell.value) return
    saveState('Delete column')
    
    const deleteCol = selectedCell.value.col
    rewriteOtherSheetReferences('col', deleteCol, 'delete')
    const activeId = spreadsheet.value.activeSheetId
    const newCells: Record<string, CellData> = {}
    
    for (const [key, cell] of Object.entries(sheetsData.value[activeId] || {})) {
      if (cell.col === deleteCol) continue
      const formula = cell.formula ? rewriteStructuralReferences(cell.formula, 'col', deleteCol, 'delete', activeSheetState.value.name) : undefined
      if (cell.col > deleteCol) {
        const newKey = cellKey(cell.row, cell.col - 1)
        newCells[newKey] = { ...cell, col: cell.col - 1, formula }
      } else {
        newCells[key] = { ...cell, formula }
      }
    }
    
    sheetsData.value[activeId] = newCells
    
    // Update merges
    const newMerges = new Map<string, any>()
    for (const [, merge] of activeSheet.value.merges) {
      if (merge.col > deleteCol) {
        newMerges.set(cellKey(merge.row, merge.col - 1), { ...merge, col: merge.col - 1 })
      } else if (deleteCol >= merge.col && deleteCol < merge.col + merge.colspan) {
        if (merge.colspan > 1) newMerges.set(cellKey(merge.row, merge.col), { ...merge, colspan: merge.colspan - 1 })
      } else {
        newMerges.set(cellKey(merge.row, merge.col), merge)
      }
    }
    activeSheetState.value.merges = newMerges
    activeSheetState.value.colWidths = new Map([...activeSheet.value.colWidths].filter(([col]) => col !== deleteCol).map(([col, width]) => [col > deleteCol ? col - 1 : col, width]))
    activeSheetState.value.hiddenCols = new Set([...activeSheet.value.hiddenCols].filter(col => col !== deleteCol).map(col => col > deleteCol ? col - 1 : col))
    activeSheetState.value.validations = activeSheetState.value.validations.flatMap(entry => {
      const range = editValidationRange(entry.range, 'col', deleteCol, 'delete')
      return range ? [{ ...entry, range }] : []
    })
    if (activeSheetState.value.charts) activeSheetState.value.charts = activeSheetState.value.charts.map(chart => ({ ...chart, range: editValidationRange(chart.range, 'col', deleteCol, 'delete') || { ...chart.range, sci: deleteCol, eci: deleteCol } }))
    if (activeSheetState.value.conditionalFormats) activeSheetState.value.conditionalFormats = activeSheetState.value.conditionalFormats.flatMap(rule => { const range = editValidationRange(rule.range, 'col', deleteCol, 'delete'); return range ? [{ ...rule, range }] : [] })
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
    
    for (let row = sri + 1; row <= eri; row++) {
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
      const numValue = Number(value)
      const sortValue = value.trim() !== '' && Number.isFinite(numValue) ? numValue : value
      rowData.push({ row, sortValue })
    }
    
    // Sort
    rowData.sort((a, b) => {
      if (a.sortValue === '' || b.sortValue === '') return a.sortValue === b.sortValue ? 0 : a.sortValue === '' ? 1 : -1
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
    const original = sheetsData.value[activeId] || {}
    const sortedCells: Record<string, CellData> = { ...original }
    for (let row = selectionRange.value.sri; row <= eri; row++) {
      for (let col = sci; col <= eci; col++) delete sortedCells[cellKey(row, col)]
    }
    
    for (let i = 0; i < rowData.length; i++) {
      const targetRow = selectionRange.value.sri + i
      const sourceRow = rowData[i].row
      
      for (let col = sci; col <= eci; col++) {
        const sourceKey = cellKey(sourceRow, col)
        const targetKey = cellKey(targetRow, col)
        
        const sourceCell = original[sourceKey]
        if (sourceCell) {
          sortedCells[targetKey] = { ...sourceCell, row: targetRow }
        }
      }
    }
    
    // Update the cells in the sheet
    sheetsData.value[activeId] = sortedCells
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
  function validateUpdates(updates: { row: number, col: number, value: string }[]): boolean {
    validationError.value = ''
    if (updates.some(pos => pos.row < 1 || pos.col < 1 || pos.row > 1000 || pos.col > 100)) {
      validationError.value = 'La plage dépasse les limites de la feuille.'
      return false
    }
    if (!activeSheetState.value.validations.length) return true
    const id = spreadsheet.value.activeSheetId
    const candidate = new Map(Object.entries(sheetsData.value[id] || {}))
    for (const update of updates) {
      const key = cellKey(update.row, update.col), old = candidate.get(key)
      candidate.set(key, { row: update.row, col: update.col, value: update.value, formula: update.value.startsWith('=') ? update.value : undefined, format: old?.format || {} })
    }
    const context = { ...formulaContext.value, sheets: new Map(formulaContext.value.sheets) }
    context.sheets.set(activeSheetState.value.name.toLocaleLowerCase(), candidate)
    for (const update of updates) {
      const rules = activeSheetState.value.validations.filter(({ range }) => update.row >= range.sri && update.row <= range.eri && update.col >= range.sci && update.col <= range.eci)
      if (!rules.length) continue
      const value = update.value.startsWith('=') ? formulaEvaluator.evaluate(update.value, candidate, context) : update.value
      for (const { rule } of rules) {
        const error = validateValue(value, rule)
        if (error) { validationError.value = error; return false }
      }
    }
    return true
  }
  
  function addValidation(rule: ValidationRule): void {
    if (!selectionRange.value && !selectedCell.value) return
    
    saveState('Add validation')
    
    const range = selectionRange.value || {
      sri: selectedCell.value!.row,
      sci: selectedCell.value!.col,
      eri: selectedCell.value!.row,
      eci: selectedCell.value!.col
    }
    
    const remaining = activeSheetState.value.validations.flatMap(entry => subtractRange(entry.range, range).map(piece => ({ ...entry, range: piece })))
    activeSheetState.value.validations = [...remaining, { range: { ...range }, rule: deepClone(rule) }]
  }
  
  function clearValidation(): void {
    const range = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    if (!range) return
    saveState('Clear validation')
    activeSheetState.value.validations = activeSheetState.value.validations.flatMap(entry => subtractRange(entry.range, range).map(piece => ({ ...entry, range: piece })))
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
    const current = activeSheetState.value.freeze
    if (!current && selectedCell.value.row === 1 && selectedCell.value.col === 1) return
    saveState('Freeze panes')
    activeSheetState.value.freeze = current ? undefined : { row: selectedCell.value.row - 1, col: selectedCell.value.col - 1 }
  }
  
  // ============================================================================
  // ACTIONS - DIVERS
  // ============================================================================

  function addChart(): string | null {
    const range = selectionRange.value
    if (!range || range.eri - range.sri + 1 > 200 || range.eci - range.sci + 1 > 9 || range.eri === range.sri) return null
    saveState('Add chart')
    const chart: ChartDefinition = { id: generateId(), title: 'Graphique', type: 'column', range: { ...range } }
    activeSheetState.value.charts = [...(activeSheetState.value.charts || []), chart]
    return chart.id
  }

  function saveConditionalFormat(rule: Omit<ConditionalFormatRule, 'id' | 'range'>, id?: string): boolean {
    const range = selectionRange.value || (selectedCell.value && { sri: selectedCell.value.row, eri: selectedCell.value.row, sci: selectedCell.value.col, eci: selectedCell.value.col })
    const existing = activeSheetState.value.conditionalFormats || []
    const selected = id ? existing.find(item => item.id === id) : undefined
    if ((!id && !range) || (id && !selected)) return false
    saveState(id ? 'Edit conditional format' : 'Add conditional format')
    const item: ConditionalFormatRule = { ...rule, id: id || generateId(), range: { ...(selected?.range || range!) } }
    activeSheetState.value.conditionalFormats = id ? existing.map(entry => entry.id === id ? item : entry) : [...existing, item]
    return true
  }

  function removeConditionalFormat(id: string): void {
    const rules = activeSheetState.value.conditionalFormats || []
    if (!rules.some(rule => rule.id === id)) return
    saveState('Remove conditional format')
    activeSheetState.value.conditionalFormats = rules.filter(rule => rule.id !== id)
  }

  function updateChart(id: string, changes: Partial<Pick<ChartDefinition, 'title' | 'type'>>): void {
    const chart = activeSheetState.value.charts?.find(item => item.id === id)
    if (!chart || Object.entries(changes).every(([key, value]) => chart[key as 'title' | 'type'] === value)) return
    saveState('Edit chart')
    Object.assign(chart, changes)
  }

  function removeChart(id: string): void {
    if (!activeSheetState.value.charts?.some(chart => chart.id === id)) return
    saveState('Remove chart')
    activeSheetState.value.charts = activeSheetState.value.charts.filter(chart => chart.id !== id)
  }
  
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
    saveWorkbook,
    saveError,
    validationError,
    clearSelectionContents,
    selectionAsText,
    pasteText,
    autofill,
    formulaContext,
    addChart,
    updateChart,
    removeChart,
    saveConditionalFormat,
    removeConditionalFormat,
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
