const assert = require('assert')
const {
  buildHorizontalDiffResult
} = require('../src/utils/excelCompareCore')

const mappings = [
  { id: 'left-0', leftIndex: 0, rightIndex: 0, enabled: true },
  { id: 'left-1', leftIndex: 1, rightIndex: 1, enabled: true },
  { id: 'left-2', leftIndex: 2, rightIndex: 2, enabled: true },
  { id: 'left-3', leftIndex: 3, rightIndex: 3, enabled: true }
]

const leftColumns = [
  { index: 0, label: '编码' },
  { index: 1, label: '姓名' },
  { index: 2, label: '金额' },
  { index: 3, label: '状态' }
]

const rightColumns = [
  { index: 0, label: '编码' },
  { index: 1, label: '姓名' },
  { index: 2, label: '金额' },
  { index: 3, label: '状态' }
]

const changedCells = [
  {
    keyValue: '1001',
    leftRowNumber: 2,
    rightRowNumber: 5,
    leftColumn: '金额',
    rightColumn: '金额',
    leftValue: '100',
    rightValue: '120'
  },
  {
    keyValue: '1001',
    leftRowNumber: 2,
    rightRowNumber: 5,
    leftColumn: '状态',
    rightColumn: '状态',
    leftValue: '启用',
    rightValue: '停用'
  },
  {
    keyValue: '1002',
    leftRowNumber: 3,
    rightRowNumber: 6,
    leftColumn: '金额',
    rightColumn: '金额',
    leftValue: '88',
    rightValue: '90'
  }
]

const result = buildHorizontalDiffResult({
  changedCells,
  mappings,
  keyMappingId: 'left-0',
  leftColumns,
  rightColumns
})

assert.deepStrictEqual(
  result.defaultSelectedColumnIds,
  ['left-2', 'left-3'],
  'defaults should include only fields that differ'
)

assert.deepStrictEqual(
  result.columns.map(column => column.id),
  ['left-1', 'left-2', 'left-3'],
  'columns should include enabled non-key mappings'
)

assert.strictEqual(result.rows.length, 4, 'two changed keys should render four rows')
assert.deepStrictEqual(
  result.rows.map(row => `${row.keyValue}-${row.source}`),
  ['1001-left', '1001-right', '1002-left', '1002-right']
)

assert.strictEqual(result.rows[0].values['left-2'], '100')
assert.strictEqual(result.rows[1].values['left-2'], '120')
assert.strictEqual(result.rows[0].values['left-3'], '启用')
assert.strictEqual(result.rows[1].values['left-3'], '停用')
assert.strictEqual(result.rows[2].values['left-2'], '88')
assert.strictEqual(result.rows[3].values['left-2'], '90')

assert.deepStrictEqual(result.rows[0].changedColumnIds, ['left-2', 'left-3'])
assert.deepStrictEqual(result.rows[1].changedColumnIds, ['left-2', 'left-3'])
assert.deepStrictEqual(result.rows[2].changedColumnIds, ['left-2'])
assert.deepStrictEqual(result.rows[3].changedColumnIds, ['left-2'])

console.log('excel horizontal diff verification passed')
