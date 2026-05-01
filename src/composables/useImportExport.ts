import type { CellMap, CellData } from '../types/spreadsheet'
import { cellKey, indexToColumn } from '../utils/helpers'

// CSV Export
export function exportToCSV(
  cells: CellMap,
  filename: string = 'spreadsheet.csv'
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
  
  // Add header row with column letters
  const header: string[] = []
  for (let col = 1; col <= maxCol; col++) {
    header.push(indexToColumn(col))
  }
  csv += header.join(',') + '\n'
  
  // Add data rows
  for (let row = 1; row <= maxRow; row++) {
    const rowData: string[] = []
    
    for (let col = 1; col <= maxCol; col++) {
      const key = cellKey(row, col)
      const cell = cells.get(key)
      let value = cell?.value || ''
      
      // Escape CSV special characters
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
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
  
  // Header row
  const header: string[] = ['']
  for (let col = 1; col <= maxCol; col++) {
    header.push(indexToColumn(col))
  }
  wsData.push(header)
  
  // Data rows
  for (let row = 1; row <= maxRow; row++) {
    const rowData: any[] = [row]
    
    for (let col = 1; col <= maxCol; col++) {
      const key = cellKey(row, col)
      const cell = cells.get(key)
      rowData.push(cell ? cell.value : '')
    }
    
    wsData.push(rowData)
  }
  
  const ws = XLSX.utils.aoa_to_sheet(wsData)
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
        
        const lines = text.split('\n').filter(line => line.trim())
        
        // Skip header row (column letters)
        const dataLines = lines.slice(1)
        
        dataLines.forEach((line, rowIndex) => {
          const actualRow = rowIndex + 1
          const values = parseCSVLine(line)
          
          values.forEach((value, colIndex) => {
            const actualCol = colIndex + 1
            
            if (value.trim()) {
              const key = cellKey(actualRow, actualCol)
              cells.set(key, {
                row: actualRow,
                col: actualCol,
                value: value.trim(),
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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]
        
        const cells = new Map<string, CellData>()
        
        jsonData.forEach((row, rowIndex) => {
          const actualRow = rowIndex + 1
          
          row.forEach((value, colIndex) => {
            const actualCol = colIndex + 1
            
            if (value !== null && value !== undefined && String(value).trim() !== '') {
              const key = cellKey(actualRow, actualCol)
              cells.set(key, {
                row: actualRow,
                col: actualCol,
                value: String(value),
                format: {}
              })
            }
          })
        })
        
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
function parseCSVLine(line: string): string[] {
  const values: string[] = []
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
    } else {
      current += char
    }
  }
  
  values.push(current)
  return values
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
