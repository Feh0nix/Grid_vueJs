import { strict as assert } from 'node:assert'
import { editValidationRange, listRuleAt, subtractRange, validateValue } from '../src/utils/validation'

assert.equal(validateValue('3', { type: 'number', min: 1, max: 5 }), null)
assert.ok(validateValue('7', { type: 'number', min: 1, max: 5 }))
assert.ok(validateValue('2abc', { type: 'number' }))
assert.ok(validateValue('', { type: 'list', values: ['a'], allowBlank: false }))
assert.equal(validateValue('a', { type: 'list', values: ['a'] }), null)
const lists = [{ range: { sri: 2, sci: 2, eri: 4, eci: 3 }, rule: { type: 'list' as const, values: ['a', 'b'], allowBlank: false } }]
assert.deepEqual(listRuleAt(lists, 3, 2)?.values, ['a', 'b'])
assert.equal(listRuleAt(lists, 1, 2), undefined)
assert.ok(validateValue('💚', { type: 'text', min: 2 }))
assert.ok(validateValue('2025-02-29', { type: 'date' }))
assert.equal(validateValue('2024-02-29', { type: 'date', min: '2024-01-01' }), null)
const pieces = subtractRange({ sri: 1, sci: 1, eri: 3, eci: 3 }, { sri: 2, sci: 2, eri: 2, eci: 2 })
assert.equal(pieces.reduce((sum, r) => sum + (r.eri - r.sri + 1) * (r.eci - r.sci + 1), 0), 8)
assert.deepEqual(editValidationRange({ sri: 2, sci: 1, eri: 4, eci: 2 }, 'row', 3, 'insert'), { sri: 2, sci: 1, eri: 5, eci: 2 })
assert.equal(editValidationRange({ sri: 2, sci: 1, eri: 2, eci: 2 }, 'row', 2, 'delete'), null)
console.log('Validation checks passed')
