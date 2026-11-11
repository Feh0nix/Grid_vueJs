import type { CellMap, CellData, Sheet } from '../types/spreadsheet'
import { cellKey, cellRefToCoords, generateId } from '../utils/helpers'
import { evaluateFormula, type FormulaContext } from './useFormula'
import { applyExcelStyle, readExcelStyle } from '../utils/excelStyles'
import { readExcelValidations, writeExcelValidations } from '../utils/excelValidation'

function exportValue(cell: CellData, cells: CellMap, context?: FormulaContext): string {
  if (!cell.formula || (cell.formula.includes('!') && !context)) return cell.value
  const value = evaluateFormula(cell.formula, cells, new Set(), context)
  return value === '#ERROR!' || value === '#NAME?' ? cell.value : value
}

/** Importer les classeurs XLS historiques avec le lecteur existant. */
async function importLegacyWorkbook(file: File): Promise<{ sheets: Sheet[], data: Record<string, Record<string, CellData>> }> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: true, cellStyles: true, cellNF: true })
  const data: Record<string, Record<string, CellData>> = {}
  const sheets = workbook.SheetNames.map((name, position): Sheet => {
    const source = workbook.Sheets[name]
    const id = generateId()
    const cells: Record<string, CellData> = {}
    for (const [address, raw] of Object.entries(source)) {
      if (address.startsWith('!')) continue
      const pos = XLSX.utils.decode_cell(address)
      const cell = raw as import('xlsx').CellObject
      cells[cellKey(pos.r + 1, pos.c + 1)] = {
        row: pos.r + 1, col: pos.c + 1,
        value: cell.v == null ? '' : String(cell.v),
        formula: cell.f ? `=${cell.f}` : undefined,
        valueType: cell.t === 'n' ? 'number' : cell.t === 'b' ? 'boolean' : cell.t === 'e' ? 'error' : 'text',
        format: cell.z ? { excelNumberFormat: cell.z } : {}
      }
    }
    data[id] = cells
    const merges = new Map((source['!merges'] || []).map(range => {
      const row = range.s.r + 1, col = range.s.c + 1
      return [cellKey(row, col), { row, col, rowspan: range.e.r - range.s.r + 1, colspan: range.e.c - range.s.c + 1 }]
    }))
    const rowHeights = new Map<number, number>(), colWidths = new Map<number, number>()
    const hiddenRows = new Set<number>(), hiddenCols = new Set<number>()
    source['!rows']?.forEach((row, index) => {
      if (row?.hpx) rowHeights.set(index + 1, row.hpx)
      if (row?.hidden) hiddenRows.add(index + 1)
    })
    source['!cols']?.forEach((col, index) => {
      if (col?.wpx) colWidths.set(index + 1, col.wpx)
      if (col?.hidden) hiddenCols.add(index + 1)
    })
    return { id, name, position, cells: new Map(), merges, validations: [], rowHeights, colWidths, hiddenRows, hiddenCols }
  })
  if (!sheets.length) throw new Error('Classeur vide')
  return { sheets, data }
}

/** Importer les fichiers XLSX, y compris les styles de cellules pris en charge. */
export async function importWorkbook(file: File): Promise<{ sheets: Sheet[], data: Record<string, Record<string, CellData>>, warnings?: string[] }> {
  if (/\.xls$/i.test(file.name)) return importLegacyWorkbook(file)
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const data: Record<string, Record<string, CellData>> = {}
  const warnings: string[] = []
  const errorCodes: Record<string, string> = { '#NULL!': '0', '#DIV/0!': '7', '#VALUE!': '15', '#REF!': '23', '#NAME?': '29', '#NUM!': '36', '#N/A': '42' }
  const sheets = workbook.worksheets.map((source, position): Sheet => {
    const id = generateId(), cells: Record<string, CellData> = {}
    const rowModels = (source.model as unknown as { rows?: { number: number }[] }).rows || []
    for (const rowModel of rowModels) {
      const row = source.getRow(rowModel.number)
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (cell.isMerged && cell.master.address !== cell.address) return
        const raw = cell.formula ? cell.result : cell.value
        let value = '', valueType: CellData['valueType'] = 'text'
        if (typeof raw === 'number') { value = String(raw); valueType = 'number' }
        else if (typeof raw === 'boolean') { value = String(raw); valueType = 'boolean' }
        else if (typeof raw === 'string') value = raw
        else if (raw instanceof Date) { value = String((raw.getTime() - Date.UTC(1899, 11, 30)) / 86400000); valueType = 'number' }
        else if (raw && typeof raw === 'object' && 'error' in raw) { value = errorCodes[raw.error] || '15'; valueType = 'error' }
        else if (raw && typeof raw === 'object' && 'richText' in raw) value = raw.richText.map(part => part.text).join('')
        else if (raw && typeof raw === 'object' && 'text' in raw) value = raw.text
        const format = readExcelStyle(cell)
        if (value !== '' || cell.formula || Object.keys(format).length) cells[cellKey(row.number, col)] = { row: row.number, col, value, formula: cell.formula ? `=${cell.formula}` : undefined, valueType, format }
      })
    }
    data[id] = cells
    const merges = new Map<string, import('../types/spreadsheet').MergeCell>()
    for (const address of source.model.merges || []) {
      const [start, end = start] = address.split(':')
      const a = cellRefToCoords(start), b = cellRefToCoords(end)
      if (!a || !b) continue
      merges.set(cellKey(a.row, a.col), { row: a.row, col: a.col, rowspan: b.row - a.row + 1, colspan: b.col - a.col + 1 })
    }
    const rowHeights = new Map<number, number>(), colWidths = new Map<number, number>(), hiddenRows = new Set<number>(), hiddenCols = new Set<number>()
    source.eachRow({ includeEmpty: false }, row => { if (row.height) rowHeights.set(row.number, row.height / 0.75); if (row.hidden) hiddenRows.add(row.number) })
    for (let number = 1; number <= Math.min(source.rowCount, 1000); number++) {
      const row = source.getRow(number)
      if (row.height) rowHeights.set(number, row.height / 0.75)
      if (row.hidden) hiddenRows.add(number)
    }
    source.columns?.forEach((column, index) => { if (column.width) colWidths.set(index + 1, column.width * 7); if (column.hidden) hiddenCols.add(index + 1) })
    const view = (source.views || []).find(item => item.state === 'frozen')
    const freeze = view && view.state === 'frozen' ? { row: view.ySplit || 0, col: view.xSplit || 0 } : undefined
    const validation = readExcelValidations(source)
    if (validation.skipped) warnings.push(`${source.name} : ${validation.skipped} cellule(s) avec une validation non prise en charge.`)
    if ((source as unknown as { conditionalFormattings?: unknown[] }).conditionalFormattings?.length) warnings.push(`${source.name} : mises en forme conditionnelles non importées.`)
    if (source.getImages().length) warnings.push(`${source.name} : images non importées.`)
    return { id, name: source.name, position, cells: new Map(), merges, validations: validation.entries, rowHeights, colWidths, hiddenRows, hiddenCols, freeze }
  })
  if (!sheets.length) throw new Error('Classeur vide')
  return { sheets, data, warnings }
}

export async function createWorkbookBytes(sheets: Sheet[], data: Record<string, Record<string, CellData>>): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const allSheets = new Map(sheets.map(sheet => [sheet.name.toLocaleLowerCase(), new Map(Object.entries(data[sheet.id] || {}))]))
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name)
    const sheetCells = new Map(Object.entries(data[sheet.id] || {}))
    for (const cell of Object.values(data[sheet.id] || {})) {
      const output = worksheet.getCell(cell.row, cell.col)
      const value = exportValue(cell, sheetCells, { currentSheet: sheet.name, sheets: allSheets })
      const numeric = cell.formula ? value.trim() !== '' && Number.isFinite(Number(value)) : cell.valueType === 'number' || (!cell.valueType && value.trim() !== '' && String(Number(value)) === value.trim())
      const result = cell.valueType === 'boolean' ? value === 'true' : numeric ? Number(value) : value
      if (cell.formula) output.value = { formula: cell.formula.slice(1), result }
      else if (cell.valueType === 'error') {
        const errors: Record<string, import('exceljs').CellErrorValue['error']> = { '0': '#NULL!', '7': '#DIV/0!', '15': '#VALUE!', '23': '#REF!', '29': '#NAME?', '36': '#NUM!', '42': '#N/A' }
        output.value = { error: errors[value] || '#VALUE!' }
      } else output.value = result
      applyExcelStyle(output, cell.format)
    }
    for (const m of sheet.merges.values()) worksheet.mergeCells(m.row, m.col, m.row + m.rowspan - 1, m.col + m.colspan - 1)
    for (const [row, height] of sheet.rowHeights) worksheet.getRow(row).height = height * 0.75
    for (const number of sheet.hiddenRows) {
      const row = worksheet.getRow(number)
      row.hidden = true
      if (!row.height && !row.hasValues) row.height = 18.75
    }
    for (const [col, width] of sheet.colWidths) worksheet.getColumn(col).width = width / 7
    for (const col of sheet.hiddenCols) worksheet.getColumn(col).hidden = true
    if (sheet.freeze) worksheet.views = [{ state: 'frozen', xSplit: sheet.freeze.col, ySplit: sheet.freeze.row }]
    writeExcelValidations(worksheet, sheet.validations)
  }
  const bytes = await workbook.xlsx.writeBuffer()
  return Uint8Array.from(new Uint8Array(bytes)).buffer
}

export async function exportWorkbook(sheets: Sheet[], data: Record<string, Record<string, CellData>>, filename: string): Promise<void> {
  const bytes = await createWorkbookBytes(sheets, data)
  downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename)
}

// CSV Export
export function exportToCSV(
  cells: CellMap,
  filename: string = 'spreadsheet.csv',
  context?: FormulaContext
): void {
  if (cells.size === 0) {
    downloadFile('', filename, 'text/csv')
    return
  }
  
  // Find bounds
  let maxRow = 1
  let maxCol = 1
  
  cells.forEach((cell) => {
    maxRow = Math.max(maxRow, cell.row)
    maxCol = Math.max(maxCol, cell.col)
  })
  
  let csv = ''
  
  // Add data rows
  for (let row = 1; row <= maxRow; row++) {
    const rowData: string[] = []
    
    for (let col = 1; col <= maxCol; col++) {
      const key = cellKey(row, col)
      const cell = cells.get(key)
      let value = cell ? exportValue(cell, cells, context) : ''
      
      // Escape CSV special characters
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        value = '"' + value.replace(/"/g, '""') + '"'
      }
      
      rowData.push(value)
    }
    
    csv += rowData.join(',') + '\n'
  }
  
  downloadFile(csv, filename, 'text/csv;charset=utf-8')
}

// XLSX Export (requires xlsx library)
export async function exportToXLSX(
  cells: CellMap,
  filename: string = 'spreadsheet.xlsx'
): Promise<void> {
  const XLSX = await import('xlsx')
  
  if (cells.size === 0) {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([['']])
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), filename)
    return
  }
  
  // Find bounds
  let maxRow = 1
  let maxCol = 1
  
  cells.forEach((cell) => {
    maxRow = Math.max(maxRow, cell.row)
    maxCol = Math.max(maxCol, cell.col)
  })
  
  // Create worksheet data
  const wsData: any[][] = []
  
  // Data rows
  for (let row = 1; row <= maxRow; row++) {
    const rowData: any[] = []
    
    for (let col = 1; col <= maxCol; col++) {
      const key = cellKey(row, col)
      const cell = cells.get(key)
      rowData.push(cell ? cell.value : '')
    }
    
    wsData.push(rowData)
  }
  
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  cells.forEach(cell => {
    if (cell.formula) {
      const address = XLSX.utils.encode_cell({ r: cell.row - 1, c: cell.col - 1 })
      if (ws[address]) ws[address].f = cell.formula.slice(1)
    }
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  downloadBlob(new Blob([wbout], { type: 'application/octet-stream' }), filename)
}

// CSV Import
export function importFromCSV(file: File): Promise<CellMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const cells = new Map<string, CellData>()
        
        if (!text.trim()) {
          resolve(cells)
          return
        }
        
        const dataLines = parseCSV(text.replace(/^\uFEFF/, ''))
        dataLines.forEach((values, rowIndex) => {
          const actualRow = rowIndex + 1
          
          values.forEach((value, colIndex) => {
            const actualCol = colIndex + 1
            
            if (value !== '') {
              const key = cellKey(actualRow, actualCol)
              cells.set(key, {
                row: actualRow,
                col: actualCol,
                value,
                format: {}
              })
            }
          })
        })
        
        resolve(cells)
      } catch (error) {
        reject(new Error('Failed to parse CSV: ' + error))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

// XLSX Import
export async function importFromXLSX(file: File): Promise<CellMap> {
  const XLSX = await import('xlsx')
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const cells = new Map<string, CellData>()
        for (const [address, source] of Object.entries(firstSheet)) {
          if (address.startsWith('!')) continue
          const pos = XLSX.utils.decode_cell(address)
          const cell = source as import('xlsx').CellObject
          cells.set(cellKey(pos.r + 1, pos.c + 1), {
            row: pos.r + 1, col: pos.c + 1,
            value: cell.v == null ? '' : String(cell.v),
            formula: cell.f ? `=${cell.f}` : undefined,
            format: {}
          })
        }
        
        resolve(cells)
      } catch (error) {
        reject(new Error('Failed to parse XLSX: ' + error))
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Helper functions
function parseCSV(line: string): string[][] {
  const rows: string[][] = []
  let values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      values.push(current)
      rows.push(values)
      values = []
      current = ''
      if (char === '\r' && nextChar === '\n') i++
    } else {
      current += char
    }
  }
  
  if (current !== '' || values.length > 0) {
    values.push(current)
    rows.push(values)
  }
  return rows
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Create file input for import
export function createFileInput(
  accept: string,
  onFileSelect: (file: File) => void
): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.style.display = 'none'
  
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }
  
  document.body.appendChild(input)
  input.click()
  document.body.removeChild(input)
}
