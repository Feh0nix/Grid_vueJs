import type { CellData } from '../types/spreadsheet'

/** Returns a step only when every source cell forms a numeric arithmetic sequence. */
export function numericSeries(cells: (CellData | undefined)[]): { first: number; step: number } | null {
  if (cells.length < 2) return null
  const values: number[] = []
  for (const cell of cells) {
    if (!cell || cell.formula || ['text', 'boolean', 'error'].includes(cell.valueType || '') || cell.value.trim() === '') return null
    const value = Number(cell.value)
    if (!Number.isFinite(value)) return null
    values.push(value)
  }
  const step = values[1] - values[0]
  if (!Number.isFinite(step)) return null
  if (!values.slice(2).every((value, index) => Math.abs((value - values[index + 1]) - step) <= Number.EPSILON * 4 * Math.max(1, Math.abs(step), Math.abs(value)))) return null
  return { first: values[0], step }
}

export function seriesValue(first: number, step: number, offset: number): string | null {
  const value = first + step * offset
  return Number.isFinite(value) ? String(Number(value.toPrecision(15))) : null
}
