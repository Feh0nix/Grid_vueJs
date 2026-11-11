import { ref } from 'vue'
import type { CellData, CellPosition, CellRange, ClipboardData } from '../types/spreadsheet'
import { cellKey, columnToIndex, deepClone, indexToColumn, iterateRange } from '../utils/helpers'

export function parseClipboardText(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i++ }
    else if (char === '"' && (quoted || field === '')) quoted = !quoted
    else if (char === '\t' && !quoted) { row.push(field); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      row.push(field); rows.push(row); row = []; field = ''
      if (char === '\r' && text[i + 1] === '\n') i++
    } else field += char
  }
  if (field || row.length || !rows.length) { row.push(field); rows.push(row) }
  return rows
}

export function serializeClipboardText(rows: string[][]): string {
  return rows.map(row => row.map(value => /[\t\r\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value).join('\t')).join('\r\n')
}

export function shiftFormulaReferences(formula: string, rowOffset: number, colOffset: number): string {
  return formula.split(/("(?:[^"]|"")*"|'(?:[^']|'')*')/g).map((part, index) => {
    if (index % 2) return part
    return part.replace(/(?<![A-Za-z0-9_.$])([\$]?)([A-Za-z]{1,3})([\$]?)([1-9][0-9]*)(?![A-Za-z0-9_!(])/g,
      (_match, colAbsolute: string, colName: string, rowAbsolute: string, rowName: string) => {
        const col = columnToIndex(colName.toUpperCase()) + (colAbsolute ? 0 : colOffset)
        const row = Number(rowName) + (rowAbsolute ? 0 : rowOffset)
        if (col < 1 || col > 16384 || row < 1 || row > 1048576) return '#REF!'
        return `${colAbsolute}${indexToColumn(col)}${rowAbsolute}${row}`
      })
  }).join('')
}

/** Update references to one sheet when a row or column is inserted/deleted. */
export function rewriteStructuralReferences(formula: string, axis: 'row' | 'col', index: number, operation: 'insert' | 'delete', sheetName?: string, includeUnqualified = true): string {
  type Ref = { colAbsolute: string, col: number, rowAbsolute: string, row: number }
  const parse = (text: string): Ref => {
    const match = /^(\$?)([A-Za-z]{1,3})(\$?)([1-9][0-9]*)$/.exec(text)!
    return { colAbsolute: match[1], col: columnToIndex(match[2].toUpperCase()), rowAbsolute: match[3], row: Number(match[4]) }
  }
  const print = (ref: Ref) => `${ref.colAbsolute}${indexToColumn(ref.col)}${ref.rowAbsolute}${ref.row}`
  const pattern = /(?<![A-Za-z0-9_.$!:\[\]])((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!)?(\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)(?::(\$?[A-Za-z]{1,3}\$?[1-9][0-9]*))?(?![A-Za-z0-9_!(\]])/g
  return formula.split(/("(?:[^"]|"")*")/g).map((part, segment) => {
    if (segment % 2) return part
    return part.replace(pattern, (_match, prefix: string | undefined, first: string, second?: string) => {
      const qualifier = prefix?.slice(0, -1)
      const referencedSheet = qualifier?.startsWith("'") ? qualifier.slice(1, -1).replace(/''/g, "'") : qualifier
      if (prefix ? !sheetName || referencedSheet?.toLocaleLowerCase() !== sheetName.toLocaleLowerCase() : !includeUnqualified) return _match
      const start = parse(first), end = second ? parse(second) : undefined
      if (start.col > 16384 || start.row > 1048576 || (end && (end.col > 16384 || end.row > 1048576))) return _match
      if (!end) {
        if (operation === 'delete' && start[axis] === index) return '#REF!'
        if (start[axis] > index || (operation === 'insert' && start[axis] === index)) start[axis] += operation === 'insert' ? 1 : -1
        return `${prefix || ''}${print(start)}`
      }
      const reversed = start[axis] > end[axis]
      let low = Math.min(start[axis], end[axis]), high = Math.max(start[axis], end[axis])
      if (operation === 'insert') {
        if (index <= low) { low++; high++ } else if (index <= high) high++
      } else if (index < low) { low--; high-- }
      else if (index <= high) { if (low === high) return '#REF!'; high-- }
      start[axis] = reversed ? high : low
      end[axis] = reversed ? low : high
      return `${prefix || ''}${print(start)}:${print(end)}`
    })
  }).join('')
}

export function renameSheetReferences(formula: string, oldName: string, newName: string): string {
  const pattern = /(?<![A-Za-z0-9_.$\[\]])('(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!/g
  return formula.split(/("(?:[^"]|"")*")/g).map((part, segment) => segment % 2 ? part : part.replace(pattern, (match, qualifier: string) => {
    const name = qualifier.startsWith("'") ? qualifier.slice(1, -1).replace(/''/g, "'") : qualifier
    return name.toLocaleLowerCase() === oldName.toLocaleLowerCase() ? `'${newName.replace(/'/g, "''")}'!` : match
  })).join('')
}

export function removeSheetReferences(formula: string, sheetName: string): string {
  const pattern = /(?<![A-Za-z0-9_.$\[\]])('(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*)!(\$?[A-Za-z]{1,3}\$?[1-9][0-9]*(?::\$?[A-Za-z]{1,3}\$?[1-9][0-9]*)?)(?![A-Za-z0-9_])/g
  return formula.split(/("(?:[^"]|"")*")/g).map((part, segment) => segment % 2 ? part : part.replace(pattern, (match, qualifier: string) => {
    const name = qualifier.startsWith("'") ? qualifier.slice(1, -1).replace(/''/g, "'") : qualifier
    return name.toLocaleLowerCase() === sheetName.toLocaleLowerCase() ? '#REF!' : match
  })).join('')
}

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
    if (isCut && sourceSheetId === targetSheetId) {
      for (const pos of iterateRange(range)) targetCells.delete(cellKey(pos.row, pos.col))
    }
    for (const pos of iterateRange(range)) {
      targetCells.delete(cellKey(pos.row + rowOffset, pos.col + colOffset))
    }
    
    // Paste each cell
    for (const cell of cells) {
      const newRow = cell.row + rowOffset
      const newCol = cell.col + colOffset
      
      const newCell: CellData = {
        ...deepClone(cell),
        row: newRow,
        col: newCol
      }
      if (!isCut && newCell.formula) newCell.formula = shiftFormulaReferences(newCell.formula, rowOffset, colOffset)
      
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
    return clipboard.value !== null
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
