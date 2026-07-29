const assert = require('assert')
const {
  columnIndexToLetter,
  buildColumns,
  buildAutoMappings,
  findDuplicateRightMappings,
  compareRows
} = require('../src/utils/excelCompareCore')

function run() {
  assert.strictEqual(columnIndexToLetter(0), 'A')
  assert.strictEqual(columnIndexToLetter(25), 'Z')
  assert.strictEqual(columnIndexToLetter(26), 'AA')

  const leftRows = [
    ['ID', '姓名', '金额', ''],
    ['1', 'Alice', '100', ''],
    ['2', 'Bob', '200', ''],
    ['2', 'Bob duplicate', '201', ''],
    ['', 'No key', '999', ''],
    ['3', 'Carol', '300', '']
  ]
  const rightRows = [
    ['id', '姓名', '金额'],
    ['1', 'Alice', '120'],
    ['2', 'Bob', '200'],
    ['4', 'David', '400']
  ]

  const leftColumns = buildColumns(leftRows, 'header')
  const rightColumns = buildColumns(rightRows, 'header')

  assert.deepStrictEqual(
    leftColumns.map(column => column.label),
    ['ID', '姓名', '金额']
  )

  const mappings = buildAutoMappings(leftColumns, rightColumns, 'header')
  assert.strictEqual(mappings.length, 3)
  assert.strictEqual(mappings[0].leftIndex, 0)
  assert.strictEqual(mappings[0].rightIndex, 0)

  assert.deepStrictEqual(
    findDuplicateRightMappings([
      { id: 'a', leftIndex: 0, rightIndex: 1, enabled: true },
      { id: 'b', leftIndex: 1, rightIndex: 1, enabled: true },
      { id: 'c', leftIndex: 2, rightIndex: 2, enabled: false }
    ]),
    [1]
  )

  const result = compareRows({
    leftRows,
    rightRows,
    leftColumns,
    rightColumns,
    mappings,
    keyMappingId: mappings[0].id,
    mode: 'header'
  })

  assert.strictEqual(result.summary.comparedKeys, 1)
  assert.strictEqual(result.summary.changedRows, 1)
  assert.strictEqual(result.summary.leftOnlyRows, 1)
  assert.strictEqual(result.summary.rightOnlyRows, 1)
  assert.strictEqual(result.summary.issueRows, 3)
  assert.strictEqual(result.changedCells[0].keyValue, '1')
  assert.strictEqual(result.changedCells[0].leftValue, '100')
  assert.strictEqual(result.changedCells[0].rightValue, '120')
  assert.strictEqual(result.leftOnlyRows[0].keyValue, '3')
  assert.strictEqual(result.rightOnlyRows[0].keyValue, '4')
  assert(result.issueRows.some(row => row.issueType === '左侧重复 key'))
  assert(result.issueRows.some(row => row.issueType === '左侧空 key'))

  const letterColumns = buildColumns([['x', 'y'], ['1', '2']], 'letter')
  assert.deepStrictEqual(letterColumns.map(column => column.label), ['A', 'B'])
  assert.deepStrictEqual(
    buildAutoMappings(letterColumns, letterColumns, 'letter').map(mapping => mapping.rightIndex),
    [0, 1]
  )
}

run()
console.log('excelCompareCore verification passed')
