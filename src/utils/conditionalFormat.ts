import type { CellData, ConditionalFormatRule } from '../types/spreadsheet'
import { evaluateFormula, type FormulaContext } from '../composables/useFormula'

export function conditionalFormat(cell: CellData, rules: ConditionalFormatRule[], cells: Map<string, CellData>, context?: FormulaContext): { color?: string; backgroundColor?: string } {
  const applicable = rules.filter(rule => cell.row >= rule.range.sri && cell.row <= rule.range.eri && cell.col >= rule.range.sci && cell.col <= rule.range.eci)
  if (!applicable.length) return {}
  const value = cell.formula ? evaluateFormula(cell.formula, cells, new Set(), context) : cell.value
  if (!value) return {}
  let style: { color?: string; backgroundColor?: string } = {}
  for (const rule of applicable) {
    let matches = false
    if (rule.operator === 'contains') matches = value.toLocaleLowerCase().includes(rule.value.toLocaleLowerCase())
    else if ((cell.formula || cell.valueType !== 'text') && value.trim() !== '') {
      const number = Number(value), threshold = Number(rule.value), upper = Number(rule.value2)
      if (Number.isFinite(number) && Number.isFinite(threshold)) {
        if (rule.operator === 'greater') matches = number > threshold
        else if (rule.operator === 'less') matches = number < threshold
        else matches = Number.isFinite(upper) && number >= threshold && number <= upper
      }
    }
    if (matches) style = { backgroundColor: rule.backgroundColor, color: rule.color }
  }
  return style
}
