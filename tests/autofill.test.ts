import { strict as assert } from 'node:assert'
import type { CellData } from '../src/types/spreadsheet'
import { numericSeries, seriesValue } from '../src/utils/autofill'
const cell = (value: string): CellData => ({ row: 1, col: 1, value, format: {} })
assert.deepEqual(numericSeries([cell('1'), cell('3'), cell('5')]), { first: 1, step: 2 })
assert.equal(numericSeries([cell('1'), cell('3'), cell('6')]), null)
assert.equal(numericSeries([{ ...cell('1'), valueType: 'text' }, cell('2')]), null)
assert.equal(seriesValue(0.1, 0.1, 2), '0.3')
assert.equal(seriesValue(1e308, 1e308, 2), null)
console.log('Autofill checks passed')
