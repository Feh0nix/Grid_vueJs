import { strict as assert } from 'node:assert'
import type { CellData } from '../src/types/spreadsheet'
import { cellKey } from '../src/utils/helpers'
import { buildChartData } from '../src/utils/chartData'

const cells: Record<string, CellData> = {}
function set(row: number, col: number, value: string, formula?: string) { cells[cellKey(row, col)] = { row, col, value, formula, format: {} } }
set(1, 1, 'Mois'); set(1, 2, 'Ventes'); set(1, 3, 'Marge')
set(2, 1, 'Janvier'); set(2, 2, '10'); set(2, 3, '-2')
set(3, 1, 'Février'); set(3, 2, '15'); set(3, 3, '0', '=B3*2')
const range = { sri: 1, sci: 1, eri: 3, eci: 3 }
const result = buildChartData(cells, range)
assert.deepEqual(result.labels, ['Janvier', 'Février'])
assert.deepEqual(result.series, [{ name: 'Ventes', values: [10, 15] }, { name: 'Marge', values: [-2, 30] }])
set(3, 2, '20')
assert.equal(buildChartData(cells, range).series[1].values[1], 40)
console.log('Chart checks passed')
