import { strict as assert } from 'node:assert'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { createWorkbookBytes, importWorkbook } from '../src/composables/useImportExport'

const empty = new ExcelJS.Workbook()
empty.addWorksheet('Vide')
const emptyImport = await importWorkbook(new File([await empty.xlsx.writeBuffer()], 'empty.xlsx'))
assert.equal(emptyImport.sheets[0].name, 'Vide')
assert.equal(emptyImport.sheets[0].freeze, undefined)

const wb = XLSX.utils.book_new()
const first = XLSX.utils.aoa_to_sheet([[2, 3], ['text']])
first.C1 = { t: 'n', v: 5, f: 'A1+B1' }
first['!ref'] = 'A1:C2'
first['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }]
first['!rows'] = [{ hpx: 40 }, { hidden: true }]
first['!cols'] = [{ wpx: 150 }, { hidden: true }]
first.A1.z = '0.00'
first.A2 = { t: 's', v: '00123' }
XLSX.utils.book_append_sheet(wb, first, 'First')
const second = XLSX.utils.aoa_to_sheet([['second sheet', 3]])
second.B1 = { t: 'n', v: 3, f: 'First!A1+1' }
XLSX.utils.book_append_sheet(wb, second, 'Second')
const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
const result = await importWorkbook(new File([bytes], 'test.xlsx'))
assert.deepEqual(result.sheets.map(sheet => sheet.name), ['First', 'Second'])
const firstCells = Object.values(result.data[result.sheets[0].id])
assert.equal(firstCells.find(cell => cell.col === 3)?.formula, '=A1+B1')
assert.equal(result.sheets[0].merges.size, 1)
assert.equal(Object.values(result.data[result.sheets[1].id])[0].value, 'second sheet')
firstCells.find(cell => cell.row === 1 && cell.col === 1)!.value = '10'
const exported = await createWorkbookBytes(result.sheets, result.data)
const reread = XLSX.read(exported, { type: 'array', cellStyles: true, cellNF: true })
assert.deepEqual(reread.SheetNames, ['First', 'Second'])
assert.equal(reread.Sheets.First.C1.f, 'A1+B1')
assert.equal(reread.Sheets.First.C1.v, 13)
assert.equal(reread.Sheets.Second.B1.f, 'First!A1+1')
assert.equal(reread.Sheets.Second.B1.v, 11)
assert.equal(reread.Sheets.First.A2.t, 's')
assert.equal(reread.Sheets.First.A2.v, '00123')
assert.equal(reread.Sheets.First.A1.z, '0.00')
assert.equal(reread.Sheets.First['!merges']?.length, 1)
assert.equal(reread.Sheets.First['!rows']?.[1]?.hidden, true)
assert.equal(reread.Sheets.First['!cols']?.[1]?.hidden, true)
const styled = new ExcelJS.Workbook()
const styledSheet = styled.addWorksheet('Styles')
styledSheet.getCell('A1').value = 42
styledSheet.getCell('A1').font = { bold: true, italic: true, name: 'Arial', size: 14, color: { argb: 'FFFF0000' } }
styledSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } }
styledSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
styledSheet.getCell('A1').border = { bottom: { style: 'thin', color: { argb: 'FF0000FF' } } }
styledSheet.getCell('C3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
styledSheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
styledSheet.getRow(8).hidden = true
styledSheet.getRow(8).height = 18.75
styledSheet.getCell('B1').dataValidation = { type: 'whole', operator: 'between', formulae: [1, 5], allowBlank: false, showErrorMessage: true, error: 'Nombre interdit' }
styledSheet.getCell('B2').dataValidation = { type: 'whole', operator: 'between', formulae: [1, 5], allowBlank: false, showErrorMessage: true, error: 'Nombre interdit' }
const styledBytes = await styled.xlsx.writeBuffer()
const parsed = await importWorkbook(new File([styledBytes], 'styles.xlsx'))
const format = Object.values(parsed.data[parsed.sheets[0].id])[0].format
assert.equal(format.bold, true); assert.equal(format.italic, true); assert.equal(format.fontSize, 14)
assert.equal(format.color?.toLowerCase(), '#ff0000'); assert.equal(format.backgroundColor?.toLowerCase(), '#ccffcc')
assert.equal(format.align, 'center'); assert.equal(format.textwrap, true); assert.equal(format.border?.bottom?.style, 'thin')
assert.equal(Object.values(parsed.data[parsed.sheets[0].id]).find(cell => cell.row === 3 && cell.col === 3)?.format.backgroundColor?.toLowerCase(), '#ffff00')
assert.deepEqual(parsed.sheets[0].freeze, { row: 2, col: 1 })
assert.equal(parsed.sheets[0].hiddenRows.has(8), true, 'hidden empty row on import')
assert.equal(parsed.sheets[0].validations.length, 1)
assert.deepEqual(parsed.sheets[0].validations[0].range, { sri: 1, sci: 2, eri: 2, eci: 2 })
assert.equal(parsed.sheets[0].validations[0].rule.integer, true)
assert.equal(parsed.sheets[0].validations[0].rule.message, 'Nombre interdit')
parsed.sheets[0].rowHeights.delete(8)
const styledRoundTrip = new ExcelJS.Workbook()
await styledRoundTrip.xlsx.load(await createWorkbookBytes(parsed.sheets, parsed.data))
const written = styledRoundTrip.getWorksheet('Styles')!.getCell('A1')
assert.equal(written.font.bold, true); assert.equal(written.font.color?.argb, 'FFFF0000')
assert.equal(written.fill.type === 'pattern' ? written.fill.fgColor?.argb : '', 'FFCCFFCC')
assert.equal(written.alignment.horizontal, 'center'); assert.equal(written.border.bottom?.style, 'thin')
assert.equal(styledRoundTrip.getWorksheet('Styles')!.getRow(8).hidden, true, 'hidden empty row on export')
assert.equal(styledRoundTrip.getWorksheet('Styles')!.getCell('B2').dataValidation.type, 'whole')
assert.deepEqual(styledRoundTrip.getWorksheet('Styles')!.getCell('B2').dataValidation.formulae, [1, 5])
parsed.sheets[0].validations.push({ range: { sri: 4, sci: 1, eri: 4, eci: 1 }, rule: { type: 'list', values: ['Oui', 'Non'], allowBlank: true } })
parsed.sheets[0].validations.push({ range: { sri: 5, sci: 1, eri: 5, eci: 1 }, rule: { type: 'date', min: '2024-01-01', max: '2024-12-31' } })
parsed.sheets[0].validations.push({ range: { sri: 6, sci: 1, eri: 6, eci: 1 }, rule: { type: 'text', min: 2, max: 8 } })
const validationBytes = await createWorkbookBytes(parsed.sheets, parsed.data)
const validated = await importWorkbook(new File([validationBytes], 'validation.xlsx'))
assert.deepEqual(validated.sheets[0].validations.find(item => item.range.sri === 4)?.rule.values, ['Oui', 'Non'])
assert.equal(validated.sheets[0].validations.find(item => item.range.sri === 5)?.rule.min, '2024-01-01')
assert.equal(validated.sheets[0].validations.find(item => item.range.sri === 6)?.rule.max, 8)
parsed.sheets[0].validations.push({ range: { sri: 3, sci: 1, eri: 3, eci: 1 }, rule: { type: 'list', values: ['a,b'] } })
await assert.rejects(createWorkbookBytes(parsed.sheets, parsed.data), /liste de validation/)
console.log('Workbook import checks passed')
