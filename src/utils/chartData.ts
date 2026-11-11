import type { CellData, CellRange } from '../types/spreadsheet'
import { cellKey, indexToColumn } from './helpers'
import { evaluateFormula, type FormulaContext } from '../composables/useFormula'

export interface ChartData { labels: string[]; series: { name: string; values: (number | null)[] }[] }

export function buildChartData(cells: Record<string, CellData>, range: CellRange, context?: FormulaContext): ChartData {
  const map = new Map(Object.entries(cells))
  const valueAt = (row: number, col: number) => {
    const cell = cells[cellKey(row, col)]
    if (!cell) return ''
    return cell.formula ? evaluateFormula(cell.formula, map, new Set(), context) : cell.value
  }
  const numericAt = (row: number, col: number): number | null => {
    const cell = cells[cellKey(row, col)]
    if (!cell || (!cell.formula && cell.valueType === 'text')) return null
    const value = valueAt(row, col)
    if (!value.trim()) return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
  }
  const firstDataCol = range.sci < range.eci ? range.sci + 1 : range.sci
  const hasHeader = Array.from({ length: range.eci - firstDataCol + 1 }, (_, i) => firstDataCol + i)
    .some(col => valueAt(range.sri, col) !== '' && numericAt(range.sri, col) === null)
  const firstDataRow = range.sri + (hasHeader ? 1 : 0)
  const labels: string[] = []
  for (let row = firstDataRow; row <= range.eri; row++) labels.push(firstDataCol === range.sci ? String(row) : valueAt(row, range.sci) || String(row))
  const series = []
  for (let col = firstDataCol; col <= range.eci; col++) {
    const values = Array.from({ length: labels.length }, (_, i) => numericAt(firstDataRow + i, col))
    if (values.some(value => value !== null)) series.push({ name: hasHeader && valueAt(range.sri, col) || indexToColumn(col), values })
  }
  return { labels, series }
}
