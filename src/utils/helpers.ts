import type { CellPosition, CellRange } from '../types/spreadsheet'

// ============================================================================
// CONVERSION RÉFÉRENCES DE CELLULES
// ============================================================================

export function columnToIndex(col: string): number {
  let result = 0
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64)
  }
  return result
}

export function indexToColumn(index: number): string {
  let result = ''
  let idx = index
  while (idx > 0) {
    const remainder = (idx - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    idx = Math.floor((idx - 1) / 26)
  }
  return result
}

export function cellRefToCoords(ref: string): CellPosition | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null
  return {
    col: columnToIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10)
  }
}

export function coordsToCellRef(row: number, col: number): string {
  return `${indexToColumn(col)}${row}`
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`
}

export function parseCellKey(key: string): CellPosition {
  const [row, col] = key.split(',').map(Number)
  return { row, col }
}

// ============================================================================
// PLAGES DE CELLULES
// ============================================================================

export function parseRange(range: string): CellRange | null {
  const [start, end] = range.split(':')
  if (!end) {
    const coords = cellRefToCoords(start)
    if (!coords) return null
    return {
      sri: coords.row,
      sci: coords.col,
      eri: coords.row,
      eci: coords.col
    }
  }
  
  const startCoords = cellRefToCoords(start)
  const endCoords = cellRefToCoords(end)
  
  if (!startCoords || !endCoords) return null
  
  return {
    sri: Math.min(startCoords.row, endCoords.row),
    sci: Math.min(startCoords.col, endCoords.col),
    eri: Math.max(startCoords.row, endCoords.row),
    eci: Math.max(startCoords.col, endCoords.col)
  }
}

export function rangeToString(range: CellRange): string {
  return `${coordsToCellRef(range.sri, range.sci)}:${coordsToCellRef(range.eri, range.eci)}`
}

export function* iterateRange(range: CellRange): Generator<CellPosition> {
  for (let row = range.sri; row <= range.eri; row++) {
    for (let col = range.sci; col <= range.eci; col++) {
      yield { row, col }
    }
  }
}

export function getRangeSize(range: CellRange): number {
  return (range.eri - range.sri + 1) * (range.eci - range.sci + 1)
}

// ============================================================================
// FORMATAGE DE VALEURS
// ============================================================================

export function formatValue(
  value: string | number,
  format: string = 'general',
  decimals: number = 2,
  prefix: string = '',
  suffix: string = ''
): string {
  if (value === '' || value === null || value === undefined) return ''
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return String(value)
  
  let formatted: string
  
  switch (format) {
    case 'number':
      formatted = numValue.toFixed(decimals)
      break
    case 'currency':
      formatted = numValue.toFixed(decimals)
      break
    case 'percentage':
      formatted = (numValue * 100).toFixed(decimals) + '%'
      break
    case 'date':
      const date = new Date(numValue)
      formatted = date.toLocaleDateString()
      break
    default:
      formatted = String(value)
  }
  
  return prefix + formatted + suffix
}

export function parseValue(value: string): number | string {
  const numValue = parseFloat(value)
  return isNaN(numValue) ? value : numValue
}

// ============================================================================
// UTILITAIRES DE CLONE
// ============================================================================

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T
  if (obj instanceof Map) return new Map(Array.from(obj.entries()).map(([k, v]) => [k, deepClone(v)])) as unknown as T
  if (obj instanceof Set) return new Set(Array.from(obj.values()).map(deepClone)) as unknown as T
  
  const cloned = {} as T
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}

// ============================================================================
// GÉNÉRATION D'ID
// ============================================================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// DÉTECTION DE PATTERN (pour autofill)
// ============================================================================

export function detectPattern(values: (string | number)[]): string | null {
  if (values.length < 2) return null
  
  // Vérifier si ce sont des nombres
  const nums = values.map(v => typeof v === 'number' ? v : parseFloat(String(v)))
  if (nums.every(n => !isNaN(n))) {
    const diffs = nums.slice(1).map((n, i) => n - nums[i])
    const allSame = diffs.every(d => d === diffs[0])
    if (allSame) return `arithmetic:${diffs[0]}`
    
    // Vérifier progression géométrique
    const ratios = nums.slice(1).map((n, i) => n / nums[i])
    const allRatiosSame = ratios.every(r => Math.abs(r - ratios[0]) < 0.0001)
    if (allRatiosSame) return `geometric:${ratios[0]}`
  }
  
  // Vérifier les dates
  const dates = values.map(v => new Date(String(v)))
  if (dates.every(d => !isNaN(d.getTime()))) {
    return 'date:day'
  }
  
  return null
}

export function extendPattern(pattern: string, values: (string | number)[], count: number): (string | number)[] {
  const [type, param] = pattern.split(':')
  const result: (string | number)[] = [...values]
  
  if (type === 'arithmetic') {
    const diff = parseFloat(param)
    let last = parseFloat(String(values[values.length - 1]))
    for (let i = 0; i < count; i++) {
      last += diff
      result.push(last)
    }
  } else if (type === 'geometric') {
    const ratio = parseFloat(param)
    let last = parseFloat(String(values[values.length - 1]))
    for (let i = 0; i < count; i++) {
      last *= ratio
      result.push(last)
    }
  } else if (type === 'date') {
    const lastDate = new Date(String(values[values.length - 1]))
    for (let i = 0; i < count; i++) {
      const newDate = new Date(lastDate)
      newDate.setDate(newDate.getDate() + (i + 1))
      result.push(newDate.toISOString().split('T')[0])
    }
  }
  
  return result
}

// ============================================================================
// UTILITAIRES DOM
// ============================================================================

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
