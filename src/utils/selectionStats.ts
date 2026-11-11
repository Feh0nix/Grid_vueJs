import type { CellData, CellRange } from '../types/spreadsheet'
import { evaluateFormula, type FormulaContext } from '../composables/useFormula'

export function selectionStats(cells: Record<string, CellData>, range: CellRange | null, context?: FormulaContext) {
  if (!range) return { count: 0, numericCount: 0, sum: 0, average: 0 }
  const values = Object.values(cells).filter(cell => cell.row >= range.sri && cell.row <= range.eri && cell.col >= range.sci && cell.col <= range.eci)
  const map = new Map(Object.entries(cells))
  let count = 0, numericCount = 0, sum = 0
  for (const cell of values) {
    const value = cell.formula ? evaluateFormula(cell.formula, map, new Set(), context) : cell.value
    if (value === '') continue
    count++
    if ((!cell.formula && cell.valueType === 'text') || value.trim() === '') continue
    const number = Number(value)
    if (Number.isFinite(number)) { numericCount++; sum += number }
  }
  return { count, numericCount, sum, average: numericCount ? sum / numericCount : 0 }
}
