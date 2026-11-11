import { strict as assert } from 'node:assert'
import { evaluateFormula } from '../src/composables/useFormula'
import type { CellData } from '../src/types/spreadsheet'
import { cellKey } from '../src/utils/helpers'

const cells = new Map<string, CellData>([
  [cellKey(1, 1), { row: 1, col: 1, value: '5', format: {} }],
  [cellKey(2, 1), { row: 2, col: 1, value: 'hello', format: {} }]
])
const other = new Map<string, CellData>([
  [cellKey(1, 1), { row: 1, col: 1, value: '10', format: {} }],
  [cellKey(2, 1), { row: 2, col: 1, value: '20', format: {} }],
  [cellKey(3, 1), { row: 3, col: 1, value: '0', formula: '=A1*2', format: {} }]
])
const context = { currentSheet: 'Main', sheets: new Map([['main', cells], ['sales 2025', other]]) }
assert.equal(evaluateFormula('=SUM(1,2,3)', cells), '6')
assert.equal(evaluateFormula('=$A$1+A$1+$A1', cells), '15')
assert.equal(evaluateFormula('=SUM($A$1:$A$3)', cells), '5')
assert.equal(evaluateFormula('=SUM(1,MAX(2,3))', cells), '4')
assert.equal(evaluateFormula('=IF(2>1,10,20)', cells), '10')
assert.equal(evaluateFormula('=1<>2', cells), 'TRUE')
assert.equal(evaluateFormula('=COUNT(A1:A3)', cells), '1')
assert.equal(evaluateFormula('=AVERAGE(A1:A3)', cells), '5')
assert.equal(evaluateFormula('=MIN(A1:A3)', cells), '5')
assert.equal(evaluateFormula('=MAX(A1:A3)', cells), '5')
assert.equal(evaluateFormula('=1/0', cells), '#DIV/0!')
assert.equal(evaluateFormula('=1/0+1', cells), '#DIV/0!')
assert.equal(evaluateFormula('=SUM(1,1/0)', cells), '#DIV/0!')
assert.equal(evaluateFormula('=IF(1=1,2,1/0)', cells), '2')
assert.equal(evaluateFormula('=#REF!+1', cells), '#REF!')
assert.equal(evaluateFormula('=DOESNOTEXIST(1)', cells), '#NAME?')
assert.equal(evaluateFormula("='Sales 2025'!A1+A1", cells, new Set(), context), '15')
assert.equal(evaluateFormula("=SUM('Sales 2025'!A1:A3)", cells, new Set(), context), '50')
assert.equal(evaluateFormula('=Missing!A1', cells, new Set(), context), '#REF!')
other.set(cellKey(4, 1), { row: 4, col: 1, value: '', formula: '=Main!A4', format: {} })
cells.set(cellKey(4, 1), { row: 4, col: 1, value: '', formula: "='Sales 2025'!A4", format: {} })
assert.equal(evaluateFormula("='Sales 2025'!A4", cells, new Set(), context), '#REF!')
console.log('Formula checks passed')
