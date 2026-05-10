<template>
  <div class="grid-container" ref="gridContainer" @contextmenu.prevent>
    <!-- Corner Header -->
    <div class="corner-header" @click="selectAll"></div>
    
    <!-- Column Headers -->
    <div class="col-headers" ref="colHeaders">
      <div
        v-for="col in visibleCols"
        :key="'col-' + col"
        class="col-header"
        :class="{ selected: isColSelected(col), 'has-filter': hasAutofilter(col) }"
        :style="{ width: getColWidth(col) + 'px' }"
        @click="selectCol(col)"
      >
        {{ indexToColumn(col) }}
        <div
          v-if="hasAutofilter(col)"
          class="filter-indicator"
          @click.stop="toggleFilter(col, $event)"
        >
          <Icons name="chevron-down" />
        </div>
        <div
          class="col-resize-handle"
          @mousedown.stop="startColResize(col, $event)"
        ></div>
      </div>
    </div>
    
    <!-- Row Headers -->
    <div class="row-headers" ref="rowHeaders">
      <div
        v-for="row in visibleRows"
        :key="'row-' + row"
        class="row-header"
        :class="{ selected: isRowSelected(row) }"
        :style="{ height: getRowHeight(row) + 'px' }"
        @click="selectRow(row)"
      >
        {{ row }}
        <div 
          class="row-resize-handle" 
          @mousedown.stop="startRowResize(row, $event)"
        ></div>
      </div>
    </div>
    
    <!-- Grid Cells -->
    <div 
      class="grid-cells" 
      ref="gridCells"
      tabindex="0"
      @keydown="handleKeyDown"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <!-- Freeze highlight lines -->
      <div v-if="sheet.freeze && (sheet.freeze.row > 0 || sheet.freeze.col > 0)" class="freeze-overlay">
        <div 
          v-if="sheet.freeze.row > 0" 
          class="freeze-highlight-line-h"
          :style="{ top: getRowTop(sheet.freeze.row) + 'px' }"
        ></div>
        <div 
          v-if="sheet.freeze.col > 0" 
          class="freeze-highlight-line-v"
          :style="{ left: getColLeft(sheet.freeze.col) + 'px' }"
        ></div>
      </div>
      <div
        v-for="cell in visibleCells"
        :key="cell.key"
        class="cell"
        :class="{
          selected: isCellSelected(cell.row, cell.col),
          'selection-range': isInSelectionRange(cell.row, cell.col),
          editing: editingCell?.row === cell.row && editingCell?.col === cell.col,
          merged: isMergedCell(cell.row, cell.col)
        }"
        :style="getCellStyle(cell)"
        @dblclick="startEdit(cell)"
      >
        <template v-if="editingCell?.row === cell.row && editingCell?.col === cell.col">
          <input
            ref="editInput"
            v-model="localEditValue"
            class="cell-input"
            @blur="saveEdit"
            @keydown.enter.stop="saveEdit"
            @keydown.escape.stop="cancelEdit"
            @keydown.stop
          />
        </template>
        <template v-else>
          <span class="cell-content">{{ formatCellValue(cell) }}</span>
        </template>
        
        <!-- Validation error indicator -->
        <div v-if="hasValidationError(cell)" class="validation-error-indicator">
          <Icons name="validation"></Icons>
        </div>
        
        <!-- Freeze indicator -->
        <div v-if="isFrozenCell(cell)" class="freeze-indicator">
          <Icons name="frozen"></Icons>
        </div>
        
        <!-- Autofill handle -->
        <div
          v-if="isCellSelected(cell.row, cell.col) && isLastSelected(cell) && !isAutofilling"
          class="autofill-handle"
          @mousedown.stop="startAutofill"
        ></div>
      </div>
      
      <!-- Selection border overlay -->
      <div
        v-if="selectionRange && !isAutofilling"
        class="selection-border"
        :style="getSelectionBorderStyle()"
      ></div>
      
      <!-- Autofill preview range -->
      <div
        v-if="isAutofilling && autofillEnd"
        class="autofill-preview"
        :style="getAutofillPreviewStyle()"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import type { CellPosition, CellRange, Sheet, CellData, CellFormat } from '../types/spreadsheet'
import { indexToColumn, cellKey, formatValue } from '../utils/helpers'
import { useSpreadsheetStore } from '../stores'
import { useFormula } from '../composables/useFormula'
import Icons from './Icons.vue'

interface Props {
  sheet: Sheet
  selectedCell: CellPosition | null
  selectionRange: CellRange | null
  editingCell: CellPosition | null
  zoom: number
  showGrid: boolean
  isPaintFormatActive: boolean
  autofilterRange: CellRange | null
  hiddenRows: Set<number>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cellSelect: [position: CellPosition]
  cellRangeSelect: [range: CellRange]
  cellEdit: [position: CellPosition]
  cellEditEnd: []
  cellValueChange: [position: CellPosition, value: string]
  cellFormatChange: [positions: CellPosition[], format: Partial<CellFormat>]
  autofill: [range: CellRange]
  rowResize: [row: number, height: number]
  colResize: [col: number, width: number]
  paintFormatApply: [range: CellRange]
  filterClick: [col: number, position: { top: number; left: number }]
}>()

// Store for reactive cell data access
const store = useSpreadsheetStore()

// Formula - evaluate function for computing cell formulas
const formulaEvaluator = useFormula()

const gridCells = ref<HTMLElement>()
const editInput = ref<HTMLInputElement>()

// State - Use editingCell prop instead of local isEditing
const localEditValue = ref('')
const isSelecting = ref(false)
const selectionStart = ref<CellPosition | null>(null)
const isResizingRow = ref(false)
const isResizingCol = ref(false)
const resizeStart = ref(0)
const resizeInitial = ref(0)
const resizeIndex = ref(0)

// Autofill state
const isAutofilling = ref(false)
const autofillStart = ref<CellPosition | null>(null)
const autofillEnd = ref<CellPosition | null>(null)

// Virtualization state
const scrollTop = ref(0)
const scrollLeft = ref(0)
const viewportHeight = ref(600)
const viewportWidth = ref(1000)
const ROW_BUFFER = 5 // Extra rows to render above/below viewport
const COL_BUFFER = 2 // Extra columns to render left/right of viewport

// Constants
const MAX_ROWS = 1000
const MAX_COLS = 100
const DEFAULT_ROW_HEIGHT = 25
const DEFAULT_COL_WIDTH = 100

// Get all row indices (not hidden by sheet or by filter)
const allRows = computed(() => {
  const rows: number[] = []
  for (let i = 1; i <= MAX_ROWS; i++) {
    if (!props.sheet.hiddenRows.has(i) && !props.hiddenRows.has(i)) {
      rows.push(i)
    }
  }
  return rows
})

const allCols = computed(() => {
  const cols: number[] = []
  for (let i = 1; i <= MAX_COLS; i++) {
    if (!props.sheet.hiddenCols.has(i)) {
      cols.push(i)
    }
  }
  return cols
})

// Calculate visible row range based on scroll position
const visibleRowRange = computed(() => {
  let startRow = 1
  let currentTop = 0
  
  for (const row of allRows.value) {
    const height = getRowHeight(row)
    if (currentTop + height > scrollTop.value) {
      startRow = row
      break
    }
    currentTop += height
  }
  
  let endRow = startRow
  let visibleHeight = 0
  
  for (let i = allRows.value.indexOf(startRow); i < allRows.value.length; i++) {
    const row = allRows.value[i]
    visibleHeight += getRowHeight(row)
    endRow = row
    if (visibleHeight >= viewportHeight.value) break
  }
  
  // Add buffer
  const startIndex = Math.max(0, allRows.value.indexOf(startRow) - ROW_BUFFER)
  const endIndex = Math.min(allRows.value.length - 1, allRows.value.indexOf(endRow) + ROW_BUFFER)
  
  return {
    start: allRows.value[startIndex],
    end: allRows.value[endIndex]
  }
})

// Calculate visible column range based on scroll position
const visibleColRange = computed(() => {
  let startCol = 1
  let currentLeft = 0
  
  for (const col of allCols.value) {
    const width = getColWidth(col)
    if (currentLeft + width > scrollLeft.value) {
      startCol = col
      break
    }
    currentLeft += width
  }
  
  let endCol = startCol
  let visibleWidth = 0
  
  for (let i = allCols.value.indexOf(startCol); i < allCols.value.length; i++) {
    const col = allCols.value[i]
    visibleWidth += getColWidth(col)
    endCol = col
    if (visibleWidth >= viewportWidth.value) break
  }
  
  // Add buffer
  const startIndex = Math.max(0, allCols.value.indexOf(startCol) - COL_BUFFER)
  const endIndex = Math.min(allCols.value.length - 1, allCols.value.indexOf(endCol) + COL_BUFFER)
  
  return {
    start: allCols.value[startIndex],
    end: allCols.value[endIndex]
  }
})

// Computed visible rows within viewport + buffer
const visibleRows = computed(() => {
  const range = visibleRowRange.value
  return allRows.value.filter(r => r >= range.start && r <= range.end)
})

const visibleCols = computed(() => {
  const range = visibleColRange.value
  return allCols.value.filter(c => c >= range.start && c <= range.end)
})

const visibleCells = computed(() => {
  const cells: (CellData & { key: string })[] = []
  const activeId = store.spreadsheet.activeSheetId
  const sheetData = store.sheetsData[activeId] || {}
  
  for (const row of visibleRows.value) {
    for (const col of visibleCols.value) {
      const key = cellKey(row, col)
      const cell = sheetData[key]
      
      if (cell) {
        cells.push({ ...cell, key })
      } else {
        // Create empty cell for grid lines
        cells.push({
          row,
          col,
          value: '',
          format: {},
          key
        })
      }
    }
  }
  
  return cells
})

// Methods
const getRowHeight = (row: number): number => {
  return props.sheet.rowHeights.get(row) || DEFAULT_ROW_HEIGHT
}

const getColWidth = (col: number): number => {
  return props.sheet.colWidths.get(col) || DEFAULT_COL_WIDTH
}

interface CellStyle {
  position: 'absolute'
  left: string
  top: string
  width: string
  height: string
  fontWeight: string
  fontStyle: string
  textDecoration: string
  fontSize: string
  fontFamily: string
  color: string
  backgroundColor: string
  textAlign: 'left' | 'center' | 'right' | 'justify'
  verticalAlign: 'top' | 'middle' | 'bottom'
  zIndex: number
  [key: string]: string | number | undefined
}

const getCellStyle = (cell: CellData & { key: string }): CellStyle => {
  const format = cell.format || {}
  const merge = props.sheet.merges.get(cell.key)
  
  let width = getColWidth(cell.col)
  let height = getRowHeight(cell.row)
  
  // Adjust for merged cells
  if (merge) {
    for (let c = cell.col; c < cell.col + merge.colspan; c++) {
      width += getColWidth(c)
    }
    for (let r = cell.row; r < cell.row + merge.rowspan; r++) {
      height += getRowHeight(r)
    }
  }
  
  return {
    position: 'absolute',
    left: `${getColLeft(cell.col)}px`,
    top: `${getRowTop(cell.row)}px`,
    width: `${width}px`,
    height: `${height}px`,
    fontWeight: format.bold ? 'bold' : 'normal',
    fontStyle: format.italic ? 'italic' : 'normal',
    textDecoration: format.underline ? 'underline' : format.strikethrough ? 'line-through' : 'none',
    fontSize: `${format.fontSize || 11}px`,
    fontFamily: format.fontFamily || 'Arial',
    color: format.color || '#000000',
    backgroundColor: format.backgroundColor || '#ffffff',
    textAlign: format.align || 'left',
    verticalAlign: format.verticalAlign || 'middle',
    zIndex: merge ? 2 : 1
  }
}

const getColLeft = (col: number): number => {
  let left = 0
  for (let i = 1; i < col; i++) {
    if (!props.sheet.hiddenCols.has(i)) {
      left += getColWidth(i)
    }
  }
  return left
}

const getRowTop = (row: number): number => {
  let top = 0
  for (let i = 1; i < row; i++) {
    if (!props.sheet.hiddenRows.has(i)) {
      top += getRowHeight(i)
    }
  }
  return top
}

const formatCellValue = (cell: CellData): string => {
  if (cell.formula) {
    const activeId = store.spreadsheet.activeSheetId
    const cellsMap = new Map(Object.entries(store.sheetsData[activeId] || {}))
    return formulaEvaluator.evaluate(cell.formula, cellsMap)
  }
  return formatValue(
    cell.value,
    cell.format?.format,
    cell.format?.decimals,
    cell.format?.prefix,
    cell.format?.suffix
  )
}

const isCellSelected = (row: number, col: number): boolean => {
  if (!props.selectedCell) return false
  return props.selectedCell.row === row && props.selectedCell.col === col
}

const isInSelectionRange = (row: number, col: number): boolean => {
  if (!props.selectionRange) return false
  const { sri, sci, eri, eci } = props.selectionRange
  return row >= sri && row <= eri && col >= sci && col <= eci
}

const isRowSelected = (row: number): boolean => {
  if (!props.selectionRange) return false
  return row >= props.selectionRange.sri && row <= props.selectionRange.eri
}

const isColSelected = (col: number): boolean => {
  if (!props.selectionRange) return false
  return col >= props.selectionRange.sci && col <= props.selectionRange.eci
}

const isMergedCell = (row: number, col: number): boolean => {
  const key = cellKey(row, col)
  return props.sheet.merges.has(key)
}

const isLastSelected = (cell: CellData): boolean => {
  if (!props.selectionRange) return isCellSelected(cell.row, cell.col)
  return cell.row === props.selectionRange.eri && cell.col === props.selectionRange.eci
}

const selectAll = () => {
  emit('cellRangeSelect', {
    sri: 1,
    sci: 1,
    eri: MAX_ROWS,
    eci: MAX_COLS
  })
}

const selectRow = (row: number) => {
  emit('cellRangeSelect', {
    sri: row,
    sci: 1,
    eri: row,
    eci: MAX_COLS
  })
}

const selectCol = (col: number) => {
  emit('cellRangeSelect', {
    sri: 1,
    sci: col,
    eri: MAX_ROWS,
    eci: col
  })
}

const getCellFromPoint = (x: number, y: number): CellPosition | null => {
  if (!gridCells.value) return null
  
  const rect = gridCells.value.getBoundingClientRect()
  const relX = x - rect.left + scrollLeft.value
  const relY = y - rect.top + scrollTop.value
  
  // Calculate column from x position (accounting for hidden columns)
  let col = 1
  let left = 0
  for (let c = 1; c <= MAX_COLS; c++) {
    if (props.sheet.hiddenCols.has(c)) continue
    const width = getColWidth(c)
    if (left + width > relX) break
    left += width
    col = c + 1
  }
  
  let row = 1
  let top = 0
  while (row <= MAX_ROWS) {
    const height = getRowHeight(row)
    if (top + height > relY) break
    top += height
    row++
  }
  
  return { row, col }
}

const handleMouseDown = (e: MouseEvent) => {
  if (e.button !== 0) return // Only left click
  
  const cell = getCellFromPoint(e.clientX, e.clientY)
  if (!cell) return
  
  // Check if paint format is active
  if (props.isPaintFormatActive) {
    const range: CellRange = {
      sri: cell.row,
      sci: cell.col,
      eri: cell.row,
      eci: cell.col
    }
    emit('paintFormatApply', range)
    return
  }
  
  isSelecting.value = true
  selectionStart.value = cell
  emit('cellSelect', cell)
  
  nextTick(() => {
    setTimeout(() => {
      if (gridCells.value && typeof gridCells.value.focus === 'function') {
        gridCells.value.focus()
      }
    }, 0)
  })
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isSelecting.value || !selectionStart.value) return
  
  const cell = getCellFromPoint(e.clientX, e.clientY)
  if (!cell) return
  
  const range: CellRange = {
    sri: Math.min(selectionStart.value.row, cell.row),
    sci: Math.min(selectionStart.value.col, cell.col),
    eri: Math.max(selectionStart.value.row, cell.row),
    eci: Math.max(selectionStart.value.col, cell.col)
  }
  
  emit('cellRangeSelect', range)
}

const handleMouseUp = () => {
  isSelecting.value = false
  selectionStart.value = null
}

const startEdit = (cell: CellData, initialValue: string = '') => {
  const isTyping = initialValue.length > 0
  // Set local edit value first
  localEditValue.value = initialValue || String(cell.value || '')
  // Then emit the cell edit to set editing state
  emit('cellEdit', { row: cell.row, col: cell.col })

  nextTick(() => {
    setTimeout(() => {
      // Use querySelector because ref inside v-for creates an array in Vue 3
      const input = gridCells.value?.querySelector('.cell-input') as HTMLInputElement | null
      if (input) {
        input.focus()
        if (!isTyping) {
          // Only select all text when entering edit via double-click or F2,
          // not when the user starts typing a character
          input.select()
        } else {
          // Place cursor at the end when typing
          const len = input.value.length
          input.setSelectionRange(len, len)
        }
      }
    }, 10)
  })
}

const saveEdit = () => {
  if (!props.editingCell) return

  emit('cellValueChange', props.editingCell, localEditValue.value)
  emit('cellEditEnd')
}

const handleAutofillMove = (e: MouseEvent) => {
  if (!isAutofilling.value || !gridCells.value) return
  
  const rect = gridCells.value.getBoundingClientRect()
  const relX = e.clientX - rect.left + scrollLeft.value
  const relY = e.clientY - rect.top + scrollTop.value
  
  // Find cell under mouse
  let col = 1
  let left = 0
  for (let c = 1; c <= MAX_COLS; c++) {
    if (props.sheet.hiddenCols.has(c)) continue
    const width = getColWidth(c)
    if (left + width > relX) break
    left += width
    col = c + 1
  }
  
  let row = 1
  let top = 0
  for (let r = 1; r <= MAX_ROWS; r++) {
    if (props.sheet.hiddenRows.has(r)) continue
    const height = getRowHeight(r)
    if (top + height > relY) break
    top += height
    row = r + 1
  }
  
  if (autofillEnd.value) {
    autofillEnd.value = { row, col }
  }
}

const stopAutofill = () => {
  if (isAutofilling.value && autofillEnd.value && props.selectionRange) {
    // Apply autofill logic here
    const { sri, sci, eri, eci } = props.selectionRange
    const targetStartRow = Math.min(eri, autofillEnd.value.row)
    const targetStartCol = Math.min(eci, autofillEnd.value.col)
    const targetEndRow = Math.max(eri, autofillEnd.value.row)
    const targetEndCol = Math.max(eci, autofillEnd.value.col)
    
    // Copy pattern from source to target
    for (let r = targetStartRow; r <= targetEndRow; r++) {
      for (let c = targetStartCol; c <= targetEndCol; c++) {
        // Skip if in original selection
        if (r >= sri && r <= eri && c >= sci && c <= eci) continue
        
        const sourceRow = sri + (r - targetStartRow) % (eri - sri + 1)
        const sourceCol = sci + (c - targetStartCol) % (eci - sci + 1)
        const sourceKey = cellKey(sourceRow, sourceCol)
        const targetKey = cellKey(r, c)
        
        const activeId = store.spreadsheet.activeSheetId
        const sourceCell = store.sheetsData[activeId]?.[sourceKey]
        if (sourceCell) {
          if (!store.sheetsData[activeId]) {
            store.sheetsData[activeId] = {}
          }
          store.sheetsData[activeId][targetKey] = {
            ...sourceCell,
            row: r,
            col: c
          }
        }
      }
    }
    
    // Emit value change for the range start to notify parent
    if (props.selectionRange) {
      emit('cellValueChange', { 
        row: props.selectionRange.sri, 
        col: props.selectionRange.sci 
      }, '')
    }
  }

  isAutofilling.value = false
  autofillStart.value = null
  autofillEnd.value = null
  
  document.removeEventListener('mousemove', handleAutofillMove)
  document.removeEventListener('mouseup', stopAutofill)
}

const handleKeyDown = (e: KeyboardEvent) => {
  const isCurrentlyEditing = props.editingCell !== null
  
  if (isCurrentlyEditing) {
    // When editing, all key events should go to the input, not here.
    // The input has @keydown.stop so this should not normally fire,
    // but as a safety net, just return.
    return
  }
  
  if (!props.selectedCell) return
  
  const { row, col } = props.selectedCell
  
  switch (e.key) {
    case 'ArrowUp':
      if (row > 1) emit('cellSelect', { row: row - 1, col })
      e.preventDefault()
      break
    case 'ArrowDown':
    case 'Enter':
      if (row < MAX_ROWS) emit('cellSelect', { row: row + 1, col })
      e.preventDefault()
      break
    case 'ArrowLeft':
      if (col > 1) emit('cellSelect', { row, col: col - 1 })
      e.preventDefault()
      break
    case 'ArrowRight':
    case 'Tab':
      if (col < MAX_COLS) {
        emit('cellSelect', { row, col: col + 1 })
      }
      e.preventDefault()
      break
    case 'Delete':
    case 'Backspace':
      emit('cellValueChange', { row, col }, '')
      e.preventDefault()
      break
    case 'F2':
      {
        const key = cellKey(row, col)
        const activeId = store.spreadsheet.activeSheetId
        const cell = store.sheetsData[activeId]?.[key]
        if (cell) startEdit(cell)
        e.preventDefault()
      }
      break
    default:
      // Start editing on any printable character
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = cellKey(row, col)
        const activeId = store.spreadsheet.activeSheetId
        const cellData = store.sheetsData[activeId]?.[key]
        const cell: CellData & { key: string } = cellData
          ? { ...cellData, key }
          : { row, col, value: '', format: {}, key }
        startEdit(cell, e.key)
        e.preventDefault()
      }
  }
}

const cancelEdit = () => {
  localEditValue.value = ''
  emit('cellEditEnd')
}

const startRowResize = (row: number, e: MouseEvent) => {
  isResizingRow.value = true
  resizeIndex.value = row
  resizeStart.value = e.clientY
  resizeInitial.value = getRowHeight(row)
  
  document.addEventListener('mousemove', handleRowResize)
  document.addEventListener('mouseup', stopRowResize)
}

const handleRowResize = (e: MouseEvent) => {
  if (!isResizingRow.value) return
  
  const delta = e.clientY - resizeStart.value
  const newHeight = Math.max(10, resizeInitial.value + delta)
  emit('rowResize', resizeIndex.value, newHeight)
}

const stopRowResize = () => {
  isResizingRow.value = false
  document.removeEventListener('mousemove', handleRowResize)
  document.removeEventListener('mouseup', stopRowResize)
}

const startColResize = (col: number, e: MouseEvent) => {
  isResizingCol.value = true
  resizeIndex.value = col
  resizeStart.value = e.clientX
  resizeInitial.value = getColWidth(col)
  
  document.addEventListener('mousemove', handleColResize)
  document.addEventListener('mouseup', stopColResize)
}

const handleColResize = (e: MouseEvent) => {
  if (!isResizingCol.value) return
  
  const delta = e.clientX - resizeStart.value
  const newWidth = Math.max(20, resizeInitial.value + delta)
  emit('colResize', resizeIndex.value, newWidth)
}

const stopColResize = () => {
  isResizingCol.value = false
  document.removeEventListener('mousemove', handleColResize)
  document.removeEventListener('mouseup', stopColResize)
}

const startAutofill = (e: MouseEvent) => {
  if (!props.selectedCell || !props.selectionRange) return
  
  isAutofilling.value = true
  autofillStart.value = { ...props.selectedCell }
  autofillEnd.value = { ...props.selectedCell }
  
  const handleAutofillMove = (moveEvent: MouseEvent) => {
    if (!isAutofilling.value || !props.selectionRange) return
    
    const cell = getCellFromPoint(moveEvent.clientX, moveEvent.clientY)
    if (!cell) return
    
    // Calculate autofill range based on the original selection
    const { sri, sci, eri, eci } = props.selectionRange
    
    // Determine direction and extend range
    let newEri = eri
    let newEci = eci
    
    if (cell.row > eri) {
      // Extending down
      const delta = cell.row - eri
      newEri = eri + delta
    } else if (cell.row < sri) {
      // Extending up
      const delta = sri - cell.row
      newEri = sri - delta
    }
    
    if (cell.col > eci) {
      // Extending right
      const delta = cell.col - eci
      newEci = eci + delta
    } else if (cell.col < sci) {
      // Extending left
      const delta = sci - cell.col
      newEci = sci - delta
    }
    
    autofillEnd.value = { row: newEri, col: newEci }
  }
  
  const handleAutofillUp = () => {
    if (isAutofilling.value && autofillEnd.value && props.selectionRange) {
      const range: CellRange = {
        sri: props.selectionRange.sri,
        sci: props.selectionRange.sci,
        eri: autofillEnd.value.row,
        eci: autofillEnd.value.col
      }
      emit('autofill', range)
    }
    
    isAutofilling.value = false
    autofillStart.value = null
    autofillEnd.value = null
    
    document.removeEventListener('mousemove', handleAutofillMove)
    document.removeEventListener('mouseup', handleAutofillUp)
  }
  
  document.addEventListener('mousemove', handleAutofillMove)
  document.addEventListener('mouseup', handleAutofillUp)
  e.preventDefault()
}

const getAutofillPreviewStyle = () => {
  if (!props.selectionRange || !autofillEnd.value) return {}
  
  const { sri, sci } = props.selectionRange
  const eri = autofillEnd.value.row
  const eci = autofillEnd.value.col
  
  const startLeft = getColLeft(Math.min(sci, eci))
  const startTop = getRowTop(Math.min(sri, eri))
  const endLeft = getColLeft(Math.max(sci, eci)) + getColWidth(Math.max(sci, eci))
  const endTop = getRowTop(Math.max(sri, eri)) + getRowHeight(Math.max(sri, eri))
  
  return {
    left: `${startLeft}px`,
    top: `${startTop}px`,
    width: `${endLeft - startLeft}px`,
    height: `${endTop - startTop}px`
  }
}

const hasValidationError = (cell: CellData): boolean => {
  // Check if cell has validation error
  for (const validation of props.sheet.validations) {
    const { range, rule } = validation
    if (cell.row >= range.sri && cell.row <= range.eri && 
        cell.col >= range.sci && cell.col <= range.eci) {
      if (rule.type === 'number') {
        const val = parseFloat(cell.value)
        if (isNaN(val)) return true
        if (rule.min !== undefined && val < Number(rule.min)) return true
        if (rule.max !== undefined && val > Number(rule.max)) return true
      }
      if (rule.type === 'list' && rule.values) {
        if (!rule.values.includes(cell.value)) return true
      }
    }
  }
  return false
}

const isFrozenCell = (cell: CellData): boolean => {
  if (!props.sheet.freeze) return false
  return cell.row <= props.sheet.freeze.row || cell.col <= props.sheet.freeze.col
}

// Autofilter helpers
const hasAutofilter = (col: number): boolean => {
  if (!props.autofilterRange) return false
  return col >= props.autofilterRange.sci && col <= props.autofilterRange.eci
}

const toggleFilter = (col: number, e: MouseEvent) => {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  emit('filterClick', col, { top: rect.bottom, left: rect.left })
}

const getSelectionBorderStyle = () => {
  if (!props.selectionRange) return {}

  const { sri, sci, eri, eci } = props.selectionRange
  const startLeft = getColLeft(sci)
  const startTop = getRowTop(sri)
  const endLeft = getColLeft(eci) + getColWidth(eci)
  const endTop = getRowTop(eri) + getRowHeight(eri)

  return {
    left: `${startLeft}px`,
    top: `${startTop}px`,
    width: `${endLeft - startLeft}px`,
    height: `${endTop - startTop}px`
  }
}

// Scroll handling for virtualization
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
  scrollLeft.value = target.scrollLeft
}

const updateViewportSize = () => {
  if (gridCells.value) {
    viewportHeight.value = gridCells.value.clientHeight
    viewportWidth.value = gridCells.value.clientWidth
  }
}

// Life cycle
onMounted(() => {
  if (gridCells.value) {
    setTimeout(() => {
      if (gridCells.value && typeof gridCells.value.focus === 'function') {
        gridCells.value.focus()
      }
    }, 0)
    gridCells.value.addEventListener('scroll', handleScroll, { passive: true })
    updateViewportSize()
  }
  window.addEventListener('resize', updateViewportSize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleRowResize)
  document.removeEventListener('mouseup', stopRowResize)
  document.removeEventListener('mousemove', handleColResize)
  document.removeEventListener('mouseup', stopColResize)
  window.removeEventListener('resize', updateViewportSize)
  if (gridCells.value) {
    gridCells.value.removeEventListener('scroll', handleScroll)
  }
})
</script>
