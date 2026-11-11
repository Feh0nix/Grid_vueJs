import type { ValidationData, ValidationRule } from '../types/spreadsheet'

export function listRuleAt(rules: ValidationData[], row: number, col: number): ValidationRule | undefined {
  return rules.find(({ range, rule }) => rule.type === 'list' && row >= range.sri && row <= range.eri && col >= range.sci && col <= range.eci)?.rule
}

export function validateValue(value: string, rule: ValidationRule): string | null {
  const invalid = () => rule.message || 'La valeur ne respecte pas la règle de validation.'
  if (value === '') return rule.allowBlank !== false && !rule.required ? null : invalid()
  if (rule.type === 'list') return rule.values?.includes(value) ? null : invalid()
  if (rule.type === 'number' || rule.type === 'text') {
    const number = rule.type === 'number' ? Number(value) : [...value].length
    if ((rule.type === 'number' && value.trim() === '') || !Number.isFinite(number)) return invalid()
    if (rule.type === 'number' && rule.integer && !Number.isInteger(number)) return invalid()
    if (rule.min !== undefined && number < Number(rule.min)) return invalid()
    if (rule.max !== undefined && number > Number(rule.max)) return invalid()
  }
  if (rule.type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return invalid()
    const date = new Date(`${value}T00:00:00Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return invalid()
    if (rule.min && value < String(rule.min)) return invalid()
    if (rule.max && value > String(rule.max)) return invalid()
  }
  return null
}

export function subtractRange(original: import('../types/spreadsheet').CellRange, removal: import('../types/spreadsheet').CellRange) {
  const top = Math.max(original.sri, removal.sri), bottom = Math.min(original.eri, removal.eri)
  const left = Math.max(original.sci, removal.sci), right = Math.min(original.eci, removal.eci)
  if (top > bottom || left > right) return [original]
  const pieces = []
  if (original.sri < top) pieces.push({ ...original, eri: top - 1 })
  if (bottom < original.eri) pieces.push({ ...original, sri: bottom + 1 })
  if (original.sci < left) pieces.push({ sri: top, eri: bottom, sci: original.sci, eci: left - 1 })
  if (right < original.eci) pieces.push({ sri: top, eri: bottom, sci: right + 1, eci: original.eci })
  return pieces
}

export function editValidationRange(range: import('../types/spreadsheet').CellRange, axis: 'row' | 'col', index: number, operation: 'insert' | 'delete') {
  const lowKey = axis === 'row' ? 'sri' : 'sci', highKey = axis === 'row' ? 'eri' : 'eci'
  let low = range[lowKey], high = range[highKey]
  if (operation === 'insert') {
    if (index <= low) { low++; high++ } else if (index <= high) high++
  } else if (index < low) { low--; high-- }
  else if (index <= high) { if (low === high) return null; high-- }
  return { ...range, [lowKey]: low, [highKey]: high }
}
