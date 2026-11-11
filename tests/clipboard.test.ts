import { strict as assert } from 'node:assert'
import { parseClipboardText, removeSheetReferences, renameSheetReferences, rewriteStructuralReferences, serializeClipboardText, shiftFormulaReferences, useClipboard } from '../src/composables/useClipboard'
import { cellKey } from '../src/utils/helpers'
import type { CellData } from '../src/types/spreadsheet'

assert.equal(shiftFormulaReferences('=A1+$B2+C$3+$D$4+SUM(A1:B2)', 2, 1), '=B3+$B4+D$3+$D$4+SUM(B3:C4)')
assert.equal(shiftFormulaReferences('=IF(A1="A1",\'Q1\'!B2,Sheet1!C3)', 1, 1), '=IF(B2="A1",\'Q1\'!C3,Sheet1!D4)')
assert.equal(shiftFormulaReferences('=A1', -1, 0), '=#REF!')
assert.equal(rewriteStructuralReferences('=SUM($A$1:A3)+A4', 'row', 2, 'insert'), '=SUM($A$1:A4)+A5')
assert.equal(rewriteStructuralReferences('=SUM(A1:A4)+A2+A5', 'row', 2, 'delete'), '=SUM(A1:A3)+#REF!+A4')
assert.equal(rewriteStructuralReferences('=SUM(Other!A1:B2)+A2+"A2"', 'row', 2, 'delete'), '=SUM(Other!A1:B2)+#REF!+"A2"')
assert.equal(rewriteStructuralReferences("=SUM('Sales 2025'!$A$1:B4)+Other!A3+A3+\"Sales 2025!A3\"", 'row', 3, 'insert', 'Sales 2025', false), "=SUM('Sales 2025'!$A$1:B5)+Other!A3+A3+\"Sales 2025!A3\"")
assert.equal(rewriteStructuralReferences("='O''Brien'!A1+A1", 'col', 1, 'insert', "O'Brien", false), "='O''Brien'!B1+A1")
assert.equal(rewriteStructuralReferences('=[Book]Sales!A3+Table[A3]+Sales!A3', 'row', 3, 'insert', 'Sales', false), '=[Book]Sales!A3+Table[A3]+Sales!A4')
assert.equal(renameSheetReferences('=Sales!A1+"Sales!A1"+[Book]Sales!A1', 'Sales', "O'Brien"), "='O''Brien'!A1+\"Sales!A1\"+[Book]Sales!A1")
assert.equal(removeSheetReferences('=SUM(Sales!A1:B3)+Other!A1+"Sales!A1"+[Book]Sales!A1', 'Sales'), '=SUM(#REF!)+Other!A1+"Sales!A1"+[Book]Sales!A1')
const clipboard = useClipboard()
const cells = new Map<string, CellData>([[cellKey(1, 1), { row: 1, col: 1, value: '1', formula: '=B1+$C$1', format: {} }]])
clipboard.copy(cells, { sri: 1, sci: 1, eri: 1, eci: 1 }, 'one')
clipboard.paste(cells, { row: 2, col: 2 }, 'one')
assert.equal(cells.get(cellKey(2, 2))?.formula, '=C2+$C$1')
const table = [['one', 'tab\tinside', 'line\nbreak'], ['"quoted"', '', 'last']]
assert.deepEqual(parseClipboardText(serializeClipboardText(table)), table)
assert.deepEqual(parseClipboardText('a\tb\r\nc\td\r\n'), [['a', 'b'], ['c', 'd']])
console.log('Clipboard checks passed')
