import { ref } from 'vue'
import type { CellData, CellPosition, CellRange, ClipboardData } from '../types/spreadsheet'
import { cellKey, deepClone, iterateRange } from '../utils/helpers'

export function useClipboard() {
  const clipboard = ref<ClipboardData | null>(null)
  const paintFormatSource = ref<{ cells: CellData[]; format: any } | null>(null)
  const isPaintFormatActive = ref(false)
  
  // Copy cells to clipboard
  const copy = (
    cells: Map<string, CellData>,
    range: CellRange,
    sourceSheetId?: string
  ): void => {
    const copiedCells: CellData[] = []
    
    for (const pos of iterateRange(range)) {
      const key = cellKey(pos.row, pos.col)
      const cell = cells.get(key)
      if (cell) {
        copiedCells.push(deepClone(cell))
      }
    }
    
    clipboard.value = {
      cells: copiedCells,
      range: deepClone(range),
      isCut: false,
      sourceSheetId
    }
  }
  
  // Cut cells to clipboard
  const cut = (
    cells: Map<string, CellData>,
    range: CellRange,
    sourceSheetId?: string
  ): void => {
    copy(cells, range, sourceSheetId)
    if (clipboard.value) {
      clipboard.value.isCut = true
    }
  }
  
  // Paste cells from clipboard
  const paste = (
    targetCells: Map<string, CellData>,
    startPosition: CellPosition,
    targetSheetId?: string
  ): CellData[] => {
    if (!clipboard.value) return []
    
    const { cells, range, isCut, sourceSheetId } = clipboard.value
    const pastedCells: CellData[] = []
    
    // Calculate offset
    const rowOffset = startPosition.row - range.sri
    const colOffset = startPosition.col - range.sci
    
    // Paste each cell
    for (const cell of cells) {
      const newRow = cell.row + rowOffset
      const newCol = cell.col + colOffset
      
      const newCell: CellData = {
        ...deepClone(cell),
        row: newRow,
        col: newCol
      }
      
      // If it was a cut and same sheet, remove from original position
      if (isCut && sourceSheetId === targetSheetId) {
        const oldKey = cellKey(cell.row, cell.col)
        targetCells.delete(oldKey)
      }
      
      const newKey = cellKey(newRow, newCol)
      targetCells.set(newKey, newCell)
      pastedCells.push(newCell)
    }
    
    // Clear clipboard if it was a cut
    if (isCut) {
      clipboard.value = null
    }
    
    return pastedCells
  }
  
  // Get clipboard content
  const getClipboard = (): ClipboardData | null => {
    return deepClone(clipboard.value)
  }
  
  // Check if clipboard has content
  const hasClipboard = (): boolean => {
    return clipboard.value !== null && clipboard.value.cells.length > 0
  }
  
  // Clear clipboard
  const clear = (): void => {
    clipboard.value = null
    paintFormatSource.value = null
    isPaintFormatActive.value = false
  }
  
  // Activate paint format mode
  const activatePaintFormat = (
    cells: Map<string, CellData>,
    range: CellRange
  ): void => {
    const formatCells: CellData[] = []
    
    for (const pos of iterateRange(range)) {
      const key = cellKey(pos.row, pos.col)
      const cell = cells.get(key)
      if (cell) {
        formatCells.push(deepClone(cell))
      }
    }
    
    if (formatCells.length > 0) {
      paintFormatSource.value = {
        cells: formatCells,
        format: deepClone(formatCells[0].format)
      }
      isPaintFormatActive.value = true
    }
  }
  
  // Apply paint format to target cells
  const applyPaintFormat = (
    targetCells: Map<string, CellData>,
    range: CellRange
  ): boolean => {
    if (!isPaintFormatActive.value || !paintFormatSource.value) {
      return false
    }
    
    const { format } = paintFormatSource.value
    
    for (const pos of iterateRange(range)) {
      const key = cellKey(pos.row, pos.col)
      const cell = targetCells.get(key)
      
      if (cell) {
        cell.format = deepClone(format)
      } else {
        // Create new cell with only format
        const newCell: CellData = {
          row: pos.row,
          col: pos.col,
          value: '',
          format: deepClone(format)
        }
        targetCells.set(key, newCell)
      }
    }
    
    // Deactivate paint format after single use (Excel behavior)
    isPaintFormatActive.value = false
    
    return true
  }
  
  // Check if paint format is active
  const getPaintFormatActive = (): boolean => {
    return isPaintFormatActive.value
  }
  
  // Deactivate paint format
  const deactivatePaintFormat = (): void => {
    isPaintFormatActive.value = false
    paintFormatSource.value = null
  }
  
  return {
    clipboard: () => clipboard.value,
    isPaintFormatActive: () => isPaintFormatActive.value,
    copy,
    cut,
    paste,
    getClipboard,
    hasClipboard,
    clear,
    activatePaintFormat,
    applyPaintFormat,
    getPaintFormatActive,
    deactivatePaintFormat
  }
}
