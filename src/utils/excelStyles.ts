import type { CellFormat, CellBorder, BorderStyle } from '../types/spreadsheet'
import type { Cell, Color, Border } from 'exceljs'

const toArgb = (color?: string) => color && /^#[0-9a-f]{6}$/i.test(color) ? `FF${color.slice(1).toUpperCase()}` : undefined
const fromColor = (color?: Partial<Color>) => color?.argb && /^[0-9a-f]{8}$/i.test(color.argb) ? `#${color.argb.slice(2)}` : undefined
const supportedBorder = (style: string): style is BorderStyle['style'] => ['thin', 'medium', 'thick', 'dashed', 'dotted', 'double'].includes(style)

export function applyExcelStyle(cell: Cell, format: CellFormat): void {
  const fontColor = toArgb(format.color), fillColor = toArgb(format.backgroundColor)
  if (format.fontFamily || format.fontSize || format.bold || format.italic || format.underline || format.strikethrough || fontColor) cell.font = {
    name: format.fontFamily, size: format.fontSize, bold: format.bold, italic: format.italic,
    underline: format.underline, strike: format.strikethrough, color: fontColor ? { argb: fontColor } : undefined
  }
  if (fillColor) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } }
  if (format.align || format.verticalAlign || format.textwrap) cell.alignment = { horizontal: format.align, vertical: format.verticalAlign, wrapText: format.textwrap }
  if (format.border) {
    const border: Partial<import('exceljs').Borders> = {}
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const value = format.border[side]
      if (value) border[side] = { style: value.style, color: { argb: toArgb(value.color) || 'FF000000' } }
    }
    cell.border = border
  }
  const decimals = Math.max(0, Math.min(10, format.decimals ?? 2))
  const number = `0${decimals ? '.' + '0'.repeat(decimals) : ''}`
  if (format.format === 'number') cell.numFmt = number
  else if (format.format === 'currency') cell.numFmt = `"€"${number}`
  else if (format.format === 'percentage') cell.numFmt = `${number}%`
  else if (format.format === 'date') cell.numFmt = 'yyyy-mm-dd'
  else if (format.format === 'text') cell.numFmt = '@'
  else if (format.excelNumberFormat !== undefined) cell.numFmt = String(format.excelNumberFormat)
}

export function readExcelStyle(cell: Cell): CellFormat {
  const result: CellFormat = {}
  const font = cell.font
  if (font?.bold) result.bold = true
  if (font?.italic) result.italic = true
  if (font?.underline && font.underline !== 'none') result.underline = true
  if (font?.strike) result.strikethrough = true
  if (font?.name) result.fontFamily = font.name
  if (font?.size) result.fontSize = font.size
  const color = fromColor(font?.color)
  if (color) result.color = color
  if (cell.fill?.type === 'pattern' && cell.fill.pattern === 'solid') {
    const background = fromColor(cell.fill.fgColor)
    if (background) result.backgroundColor = background
  }
  const alignment = cell.alignment
  if (alignment?.horizontal && ['left', 'center', 'right'].includes(alignment.horizontal)) result.align = alignment.horizontal as CellFormat['align']
  if (alignment?.vertical && ['top', 'middle', 'bottom'].includes(alignment.vertical)) result.verticalAlign = alignment.vertical as CellFormat['verticalAlign']
  if (alignment?.wrapText) result.textwrap = true
  if (cell.numFmt && cell.numFmt !== 'General') result.excelNumberFormat = cell.numFmt
  const border: CellBorder = {}
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const edge = cell.border?.[side] as Partial<Border> | undefined
    if (edge?.style && supportedBorder(edge.style)) border[side] = { style: edge.style, color: fromColor(edge.color) || '#000000' }
  }
  if (Object.keys(border).length) result.border = border
  return result
}
