import type { DataValidation, Worksheet } from 'exceljs'
import type { ValidationData, ValidationRule } from '../types/spreadsheet'
import { cellRefToCoords, coordsToCellRef } from './helpers'

type Validations = { model: Record<string, DataValidation>; add: (address: string, validation: DataValidation) => void }
const getValidations = (sheet: Worksheet) => (sheet as unknown as { dataValidations: Validations }).dataValidations

export function writeExcelValidations(sheet: Worksheet, entries: ValidationData[]): void {
  for (const { range, rule } of entries) {
    let validation: DataValidation
    if (rule.type === 'list') {
      const values = rule.values || []
      const joined = values.join(',')
      if (!values.length || values.some(value => /[,"\r\n]/.test(value)) || joined.length > 253) throw new Error('Une liste de validation ne peut pas être exportée : utilisez au plus 253 caractères, sans virgule, guillemet ni retour à la ligne.')
      validation = { type: 'list', formulae: [`"${joined}"`] }
    } else if (rule.type === 'number' || rule.type === 'text' || rule.type === 'date') {
      const kind: DataValidation['type'] = rule.type === 'number' ? (rule.integer ? 'whole' : 'decimal') : rule.type === 'text' ? 'textLength' : 'date'
      const convert = (value: number | string) => rule.type === 'date' ? new Date(`${value}T00:00:00.000Z`) : Number(value)
      let operator: DataValidation['operator'], formulae: (number | Date)[]
      if (rule.min !== undefined && rule.max !== undefined) { operator = 'between'; formulae = [convert(rule.min), convert(rule.max)] }
      else if (rule.min !== undefined) { operator = 'greaterThanOrEqual'; formulae = [convert(rule.min)] }
      else if (rule.max !== undefined) { operator = 'lessThanOrEqual'; formulae = [convert(rule.max)] }
      else {
        operator = 'between'
        formulae = rule.type === 'date' ? [new Date('1900-01-01T00:00:00.000Z'), new Date('9999-12-31T00:00:00.000Z')] : rule.type === 'text' ? [0, 32767] : [-9.99999999999999e307, 9.99999999999999e307]
      }
      validation = { type: kind, operator, formulae }
    } else throw new Error('Une règle de validation personnalisée ne peut pas encore être exportée.')
    validation.allowBlank = rule.allowBlank !== false && !rule.required
    validation.showErrorMessage = true
    validation.errorStyle = 'stop'
    if (rule.message) validation.error = rule.message
    getValidations(sheet).add(`${coordsToCellRef(range.sri, range.sci)}:${coordsToCellRef(range.eri, range.eci)}`, validation)
  }
}

function readRule(source: DataValidation): ValidationRule | null {
  if (source.errorStyle && source.errorStyle !== 'stop') return null
  const common = { allowBlank: !!source.allowBlank, message: source.error || undefined }
  if (source.type === 'list') {
    const formula = source.formulae?.[0]
    if (typeof formula !== 'string' || !/^"[^"]*"$/.test(formula)) return null
    return { type: 'list', values: formula.slice(1, -1).split(','), ...common }
  }
  if (!['decimal', 'whole', 'textLength', 'date'].includes(source.type)) return null
  const operator = source.operator || 'between'
  if (!['between', 'equal', 'greaterThanOrEqual', 'lessThanOrEqual'].includes(operator)) return null
  const values = (source.formulae || []).map(value => source.type === 'date' ? (value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : null) : typeof value === 'number' && Number.isFinite(value) ? value : null)
  if (values[0] == null || (operator === 'between' && values[1] == null)) return null
  const type: ValidationRule['type'] = source.type === 'date' ? 'date' : source.type === 'textLength' ? 'text' : 'number'
  return { type, integer: source.type === 'whole' || undefined, min: operator === 'lessThanOrEqual' ? undefined : values[0]!, max: operator === 'greaterThanOrEqual' ? undefined : operator === 'between' ? values[1]! : values[0]!, ...common }
}

/** ExcelJS développe les plages en cellules ; les regrouper limite le nombre de règles. */
export function readExcelValidations(sheet: Worksheet): { entries: ValidationData[]; skipped: number } {
  const groups = new Map<string, { rule: ValidationRule; rows: Map<number, number[]> }>()
  let skipped = 0
  for (const [address, value] of Object.entries(getValidations(sheet).model)) {
    const pos = cellRefToCoords(address.replace(/\$/g, ''))
    const rule = readRule(value)
    if (!pos || !rule) { skipped++; continue }
    const key = JSON.stringify(rule), group = groups.get(key) || { rule, rows: new Map<number, number[]>() }
    const columns = group.rows.get(pos.row) || []
    columns.push(pos.col); group.rows.set(pos.row, columns); groups.set(key, group)
  }
  const entries: ValidationData[] = []
  for (const { rule, rows } of groups.values()) {
    const previous = new Map<string, ValidationData>()
    for (const [row, cols] of [...rows].sort((a, b) => a[0] - b[0])) {
      const sorted = [...new Set(cols)].sort((a, b) => a - b)
      for (let i = 0; i < sorted.length; i++) {
        const start = sorted[i]
        while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++
        const end = sorted[i], key = `${start}:${end}`, last = previous.get(key)
        if (last && last.range.eri === row - 1) last.range.eri = row
        else { const entry = { rule: { ...rule }, range: { sri: row, eri: row, sci: start, eci: end } }; entries.push(entry); previous.set(key, entry) }
      }
    }
  }
  return { entries, skipped }
}
