// ============================================================================
// EXPORT CSV
// Texte brut lisible par Excel / LibreOffice : separateur « ; » et BOM UTF-8
// pour que les accents s'ouvrent correctement en double-clic sous Windows.
// ============================================================================

import type { GridSheet } from '../types/api'

const SEPARATOR = ';'
const NEEDS_QUOTE = /[";\n\r\t]/

function formatCell(value: string): string {
  return NEEDS_QUOTE.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Feuille au format CSV (une ligne par ligne remplie, sans en-tete). */
export function toCsv(sheet: GridSheet): string {
  const rows = sheet.rows as unknown as Record<string, { cells?: Record<string, { text?: string }> }>
  const filled = Object.keys(rows).filter(key => /^\d+$/.test(key))
  if (!filled.length) return ''

  const lines: string[] = []
  const lastRow = Math.max(...filled.map(Number))
  for (let r = 0; r <= lastRow; r += 1) {
    const cells = rows[r]?.cells ?? {}
    const columns = Object.keys(cells).map(Number).filter(Number.isInteger)
    if (!columns.length) {
      lines.push('')
      continue
    }
    const lastColumn = Math.max(...columns)
    const values: string[] = []
    for (let c = 0; c <= lastColumn; c += 1) values.push(formatCell(cells[c]?.text ?? ''))
    lines.push(values.join(SEPARATOR))
  }

  while (lines.length && !lines[lines.length - 1]) lines.pop()
  return lines.join('\r\n')
}

/** Telecharge un CSV nomme d'apres le classeur et la feuille. */
export function downloadCsv(text: string, title: string, sheetName: string): void {
  const base = `${title} - ${sheetName}`.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim()
  const blob = new Blob(['\ufeff', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${base || 'Noovy Grid'}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
