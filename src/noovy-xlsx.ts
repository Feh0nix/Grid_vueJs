import { read, utils, writeFileXLSX, type CellObject } from 'xlsx'
import type { GridSheet } from './types/api'

export type { GridSheet }

export function importXlsx(bytes: ArrayBuffer): GridSheet[] {
  const workbook = read(bytes)
  return workbook.SheetNames.map(name => {
    const source = workbook.Sheets[name]
    const rows: GridSheet['rows'] = { len: 100 }
    const cols = { len: 26 }
    const at = (r: number, c: number) => {
      rows.len = Math.max(rows.len, r + 1)
      cols.len = Math.max(cols.len, c + 1)
      const row = rows[r] ??= { cells: {} }
      return row.cells[c] ??= {}
    }

    for (const [address, cell] of Object.entries(source)) {
      if (!/^[A-Z]+[1-9]\d*$/.test(address)) continue
      const { r, c } = utils.decode_cell(address)
      if (cell.f || cell.v != null) at(r, c).text = cell.f ? '=' + cell.f : String(cell.v)
    }
    const merges = (source['!merges'] ?? []).map(({ s, e }) => {
      at(s.r, s.c).merge = [e.r - s.r, e.c - s.c]
      rows.len = Math.max(rows.len, e.r + 1)
      cols.len = Math.max(cols.len, e.c + 1)
      return utils.encode_range(s, e)
    })
    return { name, rows, cols, merges }
  })
}

export function toXlsx(sheets: GridSheet[]) {
  const workbook = utils.book_new()
  for (const sheet of sheets) {
    const target = utils.aoa_to_sheet([])
    let lastRow = 0
    let lastCol = 0
    for (const [row, entry] of Object.entries(sheet.rows)) {
      if (typeof entry !== 'object' || !entry?.cells) continue
      for (const [col, cell] of Object.entries(entry.cells)) {
        if (cell.text == null || cell.text === '') continue
        const r = Number(row)
        const c = Number(col)
        const value = String(cell.text)
        let output: CellObject = { t: 's', v: value }
        if (value.startsWith('=')) output = { t: 'n', f: value.slice(1) }
        else if (/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value) && Number.isFinite(Number(value))) {
          output = { t: 'n', v: Number(value) }
        }
        target[utils.encode_cell({ r, c })] = output
        lastRow = Math.max(lastRow, r)
        lastCol = Math.max(lastCol, c)
      }
    }
    target['!merges'] = (sheet.merges ?? []).map(range => utils.decode_range(range))
    for (const { e } of target['!merges']) {
      lastRow = Math.max(lastRow, e.r)
      lastCol = Math.max(lastCol, e.c)
    }
    target['!ref'] = utils.encode_range({ r: 0, c: 0 }, { r: lastRow, c: lastCol })
    const name = sheet.name.replace(/[\\/:?*\[\]]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31)
    utils.book_append_sheet(workbook, target, name || 'Feuille', true)
  }
  return workbook
}

export function exportXlsx(data: Record<string, unknown>[], title: string) {
  const name = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').trim() || 'Noovy Grid'
  writeFileXLSX(toXlsx(data as GridSheet[]), name + '.xlsx')
}
