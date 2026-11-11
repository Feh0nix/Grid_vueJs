import { strict as assert } from 'node:assert'
import { useHistory } from '../src/composables/useHistory'
import type { CellData, Sheet } from '../src/types/spreadsheet'

const history = useHistory(50)
const sheets: Sheet[] = []
const data = (value: string): Record<string, Record<string, CellData>> => ({
  sheet: { A1: { row: 1, col: 1, value, format: {} } }
})
history.push(sheets, 'sheet', data(''), 'first edit')
assert.equal(history.canUndo.value, true)
assert.equal(history.undo(sheets, 'sheet', data('one'))?.sheetsData.sheet.A1.value, '')
assert.equal(history.canUndo.value, false)
assert.equal(history.redo()?.sheetsData.sheet.A1.value, 'one')
assert.equal(history.canRedo.value, false)
history.push(sheets, 'sheet', data('one'), 'second edit')
assert.equal(history.undo(sheets, 'sheet', data('two'))?.sheetsData.sheet.A1.value, 'one')
assert.equal(history.undo(sheets, 'sheet', data('one'))?.sheetsData.sheet.A1.value, '')
assert.equal(history.redo()?.sheetsData.sheet.A1.value, 'one')
history.push(sheets, 'sheet', data('one'), 'branch')
assert.equal(history.canRedo.value, false)
assert.equal(history.undo(sheets, 'sheet', data('branch'))?.sheetsData.sheet.A1.value, 'one')
console.log('History checks passed')
