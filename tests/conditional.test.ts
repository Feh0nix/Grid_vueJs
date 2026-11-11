import { strict as assert } from 'node:assert'
import type { CellData, ConditionalFormatRule } from '../src/types/spreadsheet'
import { cellKey } from '../src/utils/helpers'
import { conditionalFormat } from '../src/utils/conditionalFormat'

const range = { sri: 1, sci: 1, eri: 5, eci: 2 }
const rule: ConditionalFormatRule = { id: 'a', range, operator: 'greater', value: '10', backgroundColor: '#ccffcc', color: '#003300' }
const cells = new Map<string, CellData>()
const cell: CellData = { row: 1, col: 1, value: '15', format: {} }
cells.set(cellKey(1, 1), cell)
assert.deepEqual(conditionalFormat(cell, [rule], cells), { backgroundColor: '#ccffcc', color: '#003300' })
assert.deepEqual(conditionalFormat({ ...cell, value: '10' }, [rule], cells), {})
assert.deepEqual(conditionalFormat({ ...cell, valueType: 'text' }, [rule], cells), {})
assert.deepEqual(conditionalFormat({ ...cell, row: 6 }, [rule], cells), {})
const textRule = { ...rule, id: 'b', operator: 'contains' as const, value: 'BON', backgroundColor: '#ffeecc' }
assert.equal(conditionalFormat({ ...cell, value: 'Bonjour' }, [textRule], cells).backgroundColor, '#ffeecc')
const between = { ...rule, operator: 'between' as const, value: '5', value2: '15' }
assert.equal(conditionalFormat(cell, [between], cells).backgroundColor, '#ccffcc')
const formula = { ...cell, value: '0', formula: '=A1+1' }
cells.set(cellKey(1, 1), { ...cell, value: '10' })
assert.equal(conditionalFormat(formula, [rule], cells).backgroundColor, '#ccffcc')
console.log('Conditional formatting checks passed')
