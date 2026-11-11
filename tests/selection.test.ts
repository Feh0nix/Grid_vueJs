import { strict as assert } from 'node:assert'
import { selectionStats } from '../src/utils/selectionStats'
import { cellKey } from '../src/utils/helpers'
import type { CellData } from '../src/types/spreadsheet'

const cells: Record<string, CellData> = {
  [cellKey(1, 1)]: { row: 1, col: 1, value: '2', format: {} },
  [cellKey(2, 1)]: { row: 2, col: 1, value: '3', format: {} },
  [cellKey(3, 1)]: { row: 3, col: 1, value: '7', formula: '=A1+A2', format: {} },
  [cellKey(4, 1)]: { row: 4, col: 1, value: '10', valueType: 'text', format: {} }
}
assert.deepEqual(selectionStats(cells, { sri: 1, sci: 1, eri: 4, eci: 1 }), { count: 4, numericCount: 3, sum: 10, average: 10 / 3 })
assert.equal(selectionStats(cells, null).count, 0)
console.log('Selection checks passed')
