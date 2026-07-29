# Excel Data Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only Excel comparison tool that compares two uploaded Excel sheets by a user-selected mapped key.

**Architecture:** Keep comparison rules in a pure CommonJS utility so they can be exercised by a Node verification script and imported by the Vue page. Keep Excel workbook parsing, Element UI state, result rendering, and export in one tool SFC that follows the existing `src/views/tools/*.vue` pattern. Register the route and menu entry after the page works.

**Tech Stack:** Vue 2 Options API, Element UI 2, scoped SCSS, SheetJS `xlsx`, Node `assert` for core verification, existing `npm run lint` and `npm run build`.

## Global Constraints

- Support `.xlsx` as the primary input format and `.xls` as compatible input.
- Data stays in the browser; do not add a backend or persistent storage.
- Compare one selected sheet from each workbook.
- Default to first-row header mode and support column-letter mode.
- Auto-map exact normalized header matches and allow manual mapping changes.
- Require one enabled mapping as the key.
- Duplicate or empty key rows go to `数据问题` and are excluded from field comparison.
- Export results as `.xlsx` with sheets named `字段差异`, `仅左侧存在`, `仅右侧存在`, `数据问题`, and `汇总`.
- Use existing Vue 2, Element UI, scoped SCSS, and theme CSS variable patterns.
- Verify with `node scripts/verify-excel-compare-core.js`, `npm run lint`, and `npm run build`.

---

## File Structure

- Create `src/utils/excelCompareCore.js`: pure comparison helpers. No browser APIs. CommonJS export to make direct Node verification simple while still importable from Vue.
- Create `scripts/verify-excel-compare-core.js`: executable verification script for key column rules, mapping rules, changed cells, left-only/right-only rows, and data issues.
- Create `src/views/tools/ExcelCompare.vue`: upload controls, sheet selectors, mapping UI, compare action, result tabs, and Excel export.
- Modify `src/router/index.js`: add lazy route `/tool/excel-compare`.
- Modify `src/config/tools.js`: add the tool card under `数据格式与转换`.
- Modify `package.json` and `package-lock.json`: add `xlsx` dependency through `npm install xlsx`.

---

### Task 1: Core Comparison Module

**Files:**
- Create: `src/utils/excelCompareCore.js`
- Create: `scripts/verify-excel-compare-core.js`

**Interfaces:**
- Produces:
  - `columnIndexToLetter(index: number): string`
  - `normalizeHeader(value: unknown): string`
  - `toDisplayValue(value: unknown): string`
  - `buildColumns(rows: Array<Array<unknown>>, mode: 'header' | 'letter'): Array<ColumnMeta>`
  - `buildAutoMappings(leftColumns: Array<ColumnMeta>, rightColumns: Array<ColumnMeta>, mode: 'header' | 'letter'): Array<MappingRow>`
  - `findDuplicateRightMappings(mappings: Array<MappingRow>): Array<number>`
  - `compareRows(options: CompareOptions): ComparisonResult`

`ColumnMeta` shape:

```js
{
  index: 0,
  letter: 'A',
  header: '客户编号',
  label: '客户编号',
  value: '0'
}
```

`MappingRow` shape:

```js
{
  id: 'left-0',
  leftIndex: 0,
  rightIndex: 0,
  enabled: true
}
```

`CompareOptions` shape:

```js
{
  leftRows: [['id', 'name'], ['1', 'Alice']],
  rightRows: [['编号', '姓名'], ['1', 'Alicia']],
  leftColumns: [{ index: 0, letter: 'A', label: 'id', value: '0' }],
  rightColumns: [{ index: 0, letter: 'A', label: '编号', value: '0' }],
  mappings: [{ id: 'left-0', leftIndex: 0, rightIndex: 0, enabled: true }],
  keyMappingId: 'left-0',
  mode: 'header'
}
```

- Consumes: no project-local code.

- [ ] **Step 1: Write the verification script first**

Create `scripts/verify-excel-compare-core.js` with these assertions:

```js
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
    ['ID', '姓名', '金额', '空列'],
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
```

- [ ] **Step 2: Run script and verify it fails because the module does not exist**

Run:

```bash
node scripts/verify-excel-compare-core.js
```

Expected: command fails with a module-not-found error for `../src/utils/excelCompareCore`.

- [ ] **Step 3: Implement the core module**

Create `src/utils/excelCompareCore.js` with pure CommonJS helpers:

```js
function columnIndexToLetter(index) {
  let value = index + 1
  let label = ''

  while (value > 0) {
    const remainder = (value - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    value = Math.floor((value - 1) / 26)
  }

  return label
}

function toDisplayValue(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function normalizeHeader(value) {
  return toDisplayValue(value).toLowerCase()
}

function getCell(row, index) {
  if (!Array.isArray(row)) {
    return ''
  }
  return row[index]
}

function getMaxWidth(rows) {
  return rows.reduce((width, row) => Math.max(width, Array.isArray(row) ? row.length : 0), 0)
}

function hasColumnValue(rows, index) {
  return rows.some(row => toDisplayValue(getCell(row, index)) !== '')
}

function buildColumns(rows, mode) {
  const maxWidth = getMaxWidth(rows)
  const headerRow = mode === 'header' ? rows[0] || [] : []
  const columns = []

  for (let index = 0; index < maxWidth; index += 1) {
    if (!hasColumnValue(rows, index)) {
      continue
    }

    const letter = columnIndexToLetter(index)
    const header = mode === 'header' ? toDisplayValue(getCell(headerRow, index)) : letter
    const label = mode === 'header' ? header || `未命名列 ${letter}` : letter

    columns.push({
      index,
      letter,
      header,
      label,
      value: String(index)
    })
  }

  return columns
}

function groupColumnsByNormalizedHeader(columns) {
  return columns.reduce((groups, column) => {
    const key = normalizeHeader(column.header || column.label)

    if (!key) {
      return groups
    }

    if (!groups[key]) {
      groups[key] = []
    }

    groups[key].push(column)
    return groups
  }, {})
}

function buildAutoMappings(leftColumns, rightColumns, mode) {
  if (mode === 'letter') {
    const rightByIndex = rightColumns.reduce((target, column) => {
      target[column.index] = column
      return target
    }, {})

    return leftColumns
      .filter(leftColumn => rightByIndex[leftColumn.index])
      .map(leftColumn => ({
        id: `left-${leftColumn.index}`,
        leftIndex: leftColumn.index,
        rightIndex: rightByIndex[leftColumn.index].index,
        enabled: true
      }))
  }

  const rightGroups = groupColumnsByNormalizedHeader(rightColumns)
  const leftGroups = groupColumnsByNormalizedHeader(leftColumns)
  const mappings = []

  leftColumns.forEach(leftColumn => {
    const key = normalizeHeader(leftColumn.header || leftColumn.label)
    const leftMatches = leftGroups[key] || []
    const rightMatches = rightGroups[key] || []

    if (key && leftMatches.length === 1 && rightMatches.length === 1) {
      mappings.push({
        id: `left-${leftColumn.index}`,
        leftIndex: leftColumn.index,
        rightIndex: rightMatches[0].index,
        enabled: true
      })
    }
  })

  return mappings
}

function findDuplicateRightMappings(mappings) {
  const seen = {}
  const duplicates = new Set()

  mappings
    .filter(mapping => mapping.enabled && mapping.rightIndex !== null && mapping.rightIndex !== undefined && mapping.rightIndex !== '')
    .forEach(mapping => {
      const key = String(mapping.rightIndex)

      if (seen[key]) {
        duplicates.add(Number(mapping.rightIndex))
      } else {
        seen[key] = true
      }
    })

  return Array.from(duplicates)
}

function getDataRows(rows, mode) {
  const offset = mode === 'header' ? 1 : 0

  return rows.slice(offset).map((row, index) => ({
    row,
    rowNumber: offset + index + 1
  }))
}

function buildRowObject(row, columns) {
  return columns.reduce((target, column) => {
    target[column.label] = toDisplayValue(getCell(row, column.index))
    return target
  }, {})
}

function indexRowsByKey(dataRows, keyIndex, sideLabel) {
  const entries = []
  const issueRows = []
  const counts = {}

  dataRows.forEach(item => {
    const keyValue = toDisplayValue(getCell(item.row, keyIndex))

    if (!keyValue) {
      issueRows.push({
        side: sideLabel,
        issueType: `${sideLabel}空 key`,
        keyValue: '',
        rowNumber: item.rowNumber
      })
      return
    }

    entries.push({
      keyValue,
      row: item.row,
      rowNumber: item.rowNumber
    })
    counts[keyValue] = (counts[keyValue] || 0) + 1
  })

  const duplicateKeys = Object.keys(counts).filter(key => counts[key] > 1)
  const duplicateKeySet = new Set(duplicateKeys)

  entries.forEach(entry => {
    if (duplicateKeySet.has(entry.keyValue)) {
      issueRows.push({
        side: sideLabel,
        issueType: `${sideLabel}重复 key`,
        keyValue: entry.keyValue,
        rowNumber: entry.rowNumber
      })
    }
  })

  const uniqueRows = entries.reduce((target, entry) => {
    if (!duplicateKeySet.has(entry.keyValue)) {
      target[entry.keyValue] = entry
    }
    return target
  }, {})

  return {
    uniqueRows,
    duplicateKeys,
    issueRows
  }
}

function getColumnLabel(columns, index) {
  const column = columns.find(item => item.index === index)
  return column ? column.label : columnIndexToLetter(index)
}

function compareRows(options) {
  const enabledMappings = options.mappings.filter(mapping => mapping.enabled)
  const keyMapping = enabledMappings.find(mapping => mapping.id === options.keyMappingId)

  if (!keyMapping) {
    throw new Error('请选择一个已启用的 key 映射')
  }

  const leftIndexed = indexRowsByKey(
    getDataRows(options.leftRows, options.mode),
    keyMapping.leftIndex,
    '左侧'
  )
  const rightIndexed = indexRowsByKey(
    getDataRows(options.rightRows, options.mode),
    keyMapping.rightIndex,
    '右侧'
  )
  const blockedKeys = new Set(leftIndexed.duplicateKeys.concat(rightIndexed.duplicateKeys))
  const changedCells = []
  const leftOnlyRows = []
  const rightOnlyRows = []
  let changedRowKeys = new Set()

  Object.keys(leftIndexed.uniqueRows).forEach(keyValue => {
    if (blockedKeys.has(keyValue)) {
      return
    }

    const leftEntry = leftIndexed.uniqueRows[keyValue]
    const rightEntry = rightIndexed.uniqueRows[keyValue]

    if (!rightEntry) {
      leftOnlyRows.push({
        keyValue,
        rowNumber: leftEntry.rowNumber,
        values: buildRowObject(leftEntry.row, options.leftColumns)
      })
      return
    }

    enabledMappings
      .filter(mapping => mapping.id !== keyMapping.id)
      .forEach(mapping => {
        const leftValue = toDisplayValue(getCell(leftEntry.row, mapping.leftIndex))
        const rightValue = toDisplayValue(getCell(rightEntry.row, mapping.rightIndex))

        if (leftValue !== rightValue) {
          changedRowKeys.add(keyValue)
          changedCells.push({
            keyValue,
            leftRowNumber: leftEntry.rowNumber,
            rightRowNumber: rightEntry.rowNumber,
            leftColumn: getColumnLabel(options.leftColumns, mapping.leftIndex),
            rightColumn: getColumnLabel(options.rightColumns, mapping.rightIndex),
            leftValue,
            rightValue
          })
        }
      })
  })

  Object.keys(rightIndexed.uniqueRows).forEach(keyValue => {
    if (blockedKeys.has(keyValue) || leftIndexed.uniqueRows[keyValue]) {
      return
    }

    const rightEntry = rightIndexed.uniqueRows[keyValue]

    rightOnlyRows.push({
      keyValue,
      rowNumber: rightEntry.rowNumber,
      values: buildRowObject(rightEntry.row, options.rightColumns)
    })
  })

  const issueRows = leftIndexed.issueRows.concat(rightIndexed.issueRows)

  return {
    summary: {
      comparedKeys: Object.keys(leftIndexed.uniqueRows).filter(key => rightIndexed.uniqueRows[key] && !blockedKeys.has(key)).length,
      changedRows: changedRowKeys.size,
      leftOnlyRows: leftOnlyRows.length,
      rightOnlyRows: rightOnlyRows.length,
      issueRows: issueRows.length
    },
    changedCells,
    leftOnlyRows,
    rightOnlyRows,
    issueRows
  }
}

module.exports = {
  columnIndexToLetter,
  normalizeHeader,
  toDisplayValue,
  buildColumns,
  buildAutoMappings,
  findDuplicateRightMappings,
  compareRows
}
```

- [ ] **Step 4: Run script and verify it passes**

Run:

```bash
node scripts/verify-excel-compare-core.js
```

Expected:

```text
excelCompareCore verification passed
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/utils/excelCompareCore.js scripts/verify-excel-compare-core.js
git commit -m "feat: add excel compare core"
```

---

### Task 2: Excel Tool Page

**Files:**
- Create: `src/views/tools/ExcelCompare.vue`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes from Task 1:
  - `buildColumns(rows, mode)`
  - `buildAutoMappings(leftColumns, rightColumns, mode)`
  - `findDuplicateRightMappings(mappings)`
  - `compareRows(options)`
- Produces:
  - Vue component named `ExcelCompare`.
  - Browser UI for upload, sheet selection, mapping, comparing, result display, reset, and `.xlsx` export.

- [ ] **Step 1: Install SheetJS dependency**

Run:

```bash
npm install xlsx
```

Expected: command exits `0` and updates `package.json` plus `package-lock.json`.

- [ ] **Step 2: Create initial page skeleton**

Create `src/views/tools/ExcelCompare.vue` with:

```vue
<template>
  <section class="excel-compare">
    <div class="excel-compare__header">
      <div>
        <h1>Excel 数据比对</h1>
        <p>上传两个 Excel，选择 Sheet，配置字段映射后按 key 比对差异。</p>
      </div>
      <div class="excel-compare__actions">
        <el-button size="small" icon="el-icon-refresh-left" @click="resetAll">重置</el-button>
        <el-button size="small" icon="el-icon-download" :disabled="!hasResult" @click="exportResult">导出结果</el-button>
      </div>
    </div>

    <el-card shadow="never" class="excel-panel">
      <div class="excel-upload-grid">
        <section class="excel-upload-box">
          <h2>左侧 Excel</h2>
          <el-upload
            drag
            action=""
            accept=".xlsx,.xls"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="file => handleFileChange('left', file)"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">拖拽或点击上传</div>
          </el-upload>
          <p class="excel-file-meta">{{ left.fileName || '未选择文件' }}</p>
          <el-alert v-if="left.errorMessage" :title="left.errorMessage" type="error" :closable="false" show-icon />
          <el-select v-if="left.sheetNames.length" v-model="left.selectedSheetName" placeholder="选择 Sheet" @change="handleSheetChange">
            <el-option v-for="name in left.sheetNames" :key="name" :label="name" :value="name" />
          </el-select>
          <p v-if="left.rows.length" class="excel-file-meta">{{ leftDataRowCount }} 行数据，{{ left.columns.length }} 列</p>
        </section>

        <section class="excel-upload-box">
          <h2>右侧 Excel</h2>
          <el-upload
            drag
            action=""
            accept=".xlsx,.xls"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="file => handleFileChange('right', file)"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">拖拽或点击上传</div>
          </el-upload>
          <p class="excel-file-meta">{{ right.fileName || '未选择文件' }}</p>
          <el-alert v-if="right.errorMessage" :title="right.errorMessage" type="error" :closable="false" show-icon />
          <el-select v-if="right.sheetNames.length" v-model="right.selectedSheetName" placeholder="选择 Sheet" @change="handleSheetChange">
            <el-option v-for="name in right.sheetNames" :key="name" :label="name" :value="name" />
          </el-select>
          <p v-if="right.rows.length" class="excel-file-meta">{{ rightDataRowCount }} 行数据，{{ right.columns.length }} 列</p>
        </section>
      </div>
    </el-card>

    <el-card shadow="never" class="excel-panel">
      <div class="excel-options">
        <el-radio-group v-model="columnMode" size="small" @change="rebuildColumnsAndMappings">
          <el-radio-button label="header">首行作为表头</el-radio-button>
          <el-radio-button label="letter">按列号 A/B/C</el-radio-button>
        </el-radio-group>
        <el-select v-model="keyMappingId" class="excel-key-select" placeholder="选择 key 字段" :disabled="!enabledMappings.length">
          <el-option
            v-for="mapping in enabledMappings"
            :key="mapping.id"
            :label="mappingLabel(mapping)"
            :value="mapping.id"
          />
        </el-select>
        <el-button type="primary" icon="el-icon-s-check" :disabled="!canCompare" @click="runCompare">开始比对</el-button>
      </div>

      <el-alert v-if="mappingWarning" class="excel-alert" :title="mappingWarning" type="warning" :closable="false" show-icon />

      <el-table :data="mappings" border class="excel-mapping-table">
        <el-table-column width="80" label="启用">
          <template slot-scope="{ row }">
            <el-checkbox v-model="row.enabled" @change="handleMappingChange" />
          </template>
        </el-table-column>
        <el-table-column label="左侧字段" min-width="180">
          <template slot-scope="{ row }">{{ columnLabel(left.columns, row.leftIndex) }}</template>
        </el-table-column>
        <el-table-column label="右侧字段" min-width="220">
          <template slot-scope="{ row }">
            <el-select v-model="row.rightIndex" clearable filterable placeholder="选择右侧字段" @change="handleMappingChange">
              <el-option v-for="column in right.columns" :key="column.value" :label="column.label" :value="column.index" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div v-if="hasResult" class="excel-result">
      <div class="excel-summary-grid">
        <div v-for="item in summaryCards" :key="item.label" class="excel-summary-card">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <el-tabs v-model="resultTab" class="excel-result-tabs">
        <el-tab-pane label="字段差异" name="changed">
          <el-table :data="result.changedCells" border>
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column prop="leftRowNumber" label="左侧行号" width="100" />
            <el-table-column prop="rightRowNumber" label="右侧行号" width="100" />
            <el-table-column prop="leftColumn" label="左侧字段" min-width="140" />
            <el-table-column prop="rightColumn" label="右侧字段" min-width="140" />
            <el-table-column prop="leftValue" label="左侧值" min-width="180" show-overflow-tooltip />
            <el-table-column prop="rightValue" label="右侧值" min-width="180" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="仅左侧存在" name="leftOnly">
          <el-table :data="result.leftOnlyRows" border>
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column prop="rowNumber" label="左侧行号" width="120" />
            <el-table-column label="行数据" min-width="260">
              <template slot-scope="{ row }">{{ formatValues(row.values) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="仅右侧存在" name="rightOnly">
          <el-table :data="result.rightOnlyRows" border>
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column prop="rowNumber" label="右侧行号" width="120" />
            <el-table-column label="行数据" min-width="260">
              <template slot-scope="{ row }">{{ formatValues(row.values) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="数据问题" name="issues">
          <el-table :data="result.issueRows" border>
            <el-table-column prop="side" label="来源" width="100" />
            <el-table-column prop="issueType" label="问题" min-width="160" />
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column prop="rowNumber" label="行号" width="100" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </section>
</template>
```

- [ ] **Step 3: Add script implementation**

Add the `<script>` block to `ExcelCompare.vue`:

```js
import * as XLSX from 'xlsx'
import excelCompareCore from '@/utils/excelCompareCore'

const {
  buildColumns,
  buildAutoMappings,
  findDuplicateRightMappings,
  compareRows
} = excelCompareCore

function createWorkbookState() {
  return {
    fileName: '',
    workbook: null,
    sheetNames: [],
    selectedSheetName: '',
    rows: [],
    columns: [],
    errorMessage: ''
  }
}

function createEmptyResult() {
  return {
    summary: {
      comparedKeys: 0,
      changedRows: 0,
      leftOnlyRows: 0,
      rightOnlyRows: 0,
      issueRows: 0
    },
    changedCells: [],
    leftOnlyRows: [],
    rightOnlyRows: [],
    issueRows: []
  }
}

export default {
  name: 'ExcelCompare',
  data() {
    return {
      left: createWorkbookState(),
      right: createWorkbookState(),
      columnMode: 'header',
      mappings: [],
      keyMappingId: '',
      result: createEmptyResult(),
      hasResult: false,
      resultTab: 'changed'
    }
  },
  computed: {
    enabledMappings() {
      return this.mappings.filter(mapping => mapping.enabled && mapping.rightIndex !== null && mapping.rightIndex !== undefined && mapping.rightIndex !== '')
    },
    duplicateRightMappings() {
      return findDuplicateRightMappings(this.mappings)
    },
    mappingWarning() {
      if (this.duplicateRightMappings.length) {
        return '存在重复选择的右侧字段，请保证每个右侧字段只映射一次'
      }
      if (this.left.columns.length && this.right.columns.length && !this.enabledMappings.length) {
        return '尚未配置可用字段映射'
      }
      return ''
    },
    canCompare() {
      return Boolean(
        this.left.rows.length &&
        this.right.rows.length &&
        this.enabledMappings.length &&
        this.keyMappingId &&
        !this.duplicateRightMappings.length
      )
    },
    leftDataRowCount() {
      return Math.max(0, this.left.rows.length - (this.columnMode === 'header' ? 1 : 0))
    },
    rightDataRowCount() {
      return Math.max(0, this.right.rows.length - (this.columnMode === 'header' ? 1 : 0))
    },
    summaryCards() {
      return [
        { label: '已比对 Key', value: this.result.summary.comparedKeys },
        { label: '变更行', value: this.result.summary.changedRows },
        { label: '仅左侧存在', value: this.result.summary.leftOnlyRows },
        { label: '仅右侧存在', value: this.result.summary.rightOnlyRows },
        { label: '数据问题', value: this.result.summary.issueRows }
      ]
    }
  },
  methods: {
    async handleFileChange(side, uploadFile) {
      const rawFile = uploadFile.raw

      if (!rawFile) {
        return
      }

      if (!/\.(xlsx|xls)$/i.test(rawFile.name)) {
        this[side].errorMessage = '请上传 .xlsx 或 .xls 文件'
        return
      }

      try {
        const buffer = await rawFile.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const sheetNames = workbook.SheetNames || []

        this[side] = {
          fileName: rawFile.name,
          workbook,
          sheetNames,
          selectedSheetName: sheetNames[0] || '',
          rows: [],
          columns: [],
          errorMessage: sheetNames.length ? '' : '未读取到 Sheet'
        }
        this.loadSelectedSheet(side)
        this.rebuildColumnsAndMappings()
      } catch (error) {
        this[side] = {
          ...createWorkbookState(),
          fileName: rawFile.name,
          errorMessage: `解析失败：${error.message || '文件无法读取'}`
        }
      }
    },
    loadSelectedSheet(side) {
      const state = this[side]
      const sheet = state.workbook && state.workbook.Sheets[state.selectedSheetName]

      if (!sheet) {
        state.rows = []
        state.columns = []
        state.errorMessage = state.selectedSheetName ? '选中的 Sheet 无法读取' : state.errorMessage
        return
      }

      state.rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
      state.errorMessage = state.rows.length ? '' : '选中的 Sheet 为空'
      state.columns = buildColumns(state.rows, this.columnMode)
    },
    handleSheetChange() {
      this.loadSelectedSheet('left')
      this.loadSelectedSheet('right')
      this.rebuildColumnsAndMappings()
    },
    rebuildColumnsAndMappings() {
      if (this.left.workbook && this.left.selectedSheetName) {
        this.loadSelectedSheet('left')
      }
      if (this.right.workbook && this.right.selectedSheetName) {
        this.loadSelectedSheet('right')
      }

      if (this.left.columns.length && this.right.columns.length) {
        this.mappings = buildAutoMappings(this.left.columns, this.right.columns, this.columnMode)
      } else {
        this.mappings = []
      }

      this.keyMappingId = this.mappings[0] ? this.mappings[0].id : ''
      this.hasResult = false
      this.result = createEmptyResult()
    },
    handleMappingChange() {
      if (!this.enabledMappings.some(mapping => mapping.id === this.keyMappingId)) {
        this.keyMappingId = this.enabledMappings[0] ? this.enabledMappings[0].id : ''
      }
      this.hasResult = false
    },
    runCompare() {
      if (!this.canCompare) {
        this.$message.warning(this.mappingWarning || '请先完成文件、映射和 key 配置')
        return
      }

      try {
        this.result = compareRows({
          leftRows: this.left.rows,
          rightRows: this.right.rows,
          leftColumns: this.left.columns,
          rightColumns: this.right.columns,
          mappings: this.enabledMappings,
          keyMappingId: this.keyMappingId,
          mode: this.columnMode
        })
        this.hasResult = true
        this.$message.success('比对完成')
      } catch (error) {
        this.$message.error(error.message || '比对失败')
      }
    },
    exportResult() {
      if (!this.hasResult) {
        return
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.result.changedCells), '字段差异')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.result.leftOnlyRows.map(this.flattenResultRow)), '仅左侧存在')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.result.rightOnlyRows.map(this.flattenResultRow)), '仅右侧存在')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.result.issueRows), '数据问题')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.summaryCards), '汇总')
      XLSX.writeFile(workbook, `excel_compare_${Date.now()}.xlsx`)
    },
    flattenResultRow(row) {
      return {
        keyValue: row.keyValue,
        rowNumber: row.rowNumber,
        ...row.values
      }
    },
    mappingLabel(mapping) {
      return `${this.columnLabel(this.left.columns, mapping.leftIndex)} -> ${this.columnLabel(this.right.columns, mapping.rightIndex)}`
    },
    columnLabel(columns, index) {
      const column = columns.find(item => item.index === index)
      return column ? column.label : ''
    },
    formatValues(values) {
      return JSON.stringify(values)
    },
    resetAll() {
      this.left = createWorkbookState()
      this.right = createWorkbookState()
      this.columnMode = 'header'
      this.mappings = []
      this.keyMappingId = ''
      this.result = createEmptyResult()
      this.hasResult = false
      this.resultTab = 'changed'
    }
  }
}
```

- [ ] **Step 4: Add scoped styles**

Add this `<style lang="scss" scoped>` block to `ExcelCompare.vue`:

```scss
.excel-compare {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.excel-compare__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;

  h1 {
    margin: 0 0 10px;
    color: var(--color-text);
    font-size: 32px;
    line-height: 1.25;
  }

  p {
    margin: 0;
    color: var(--color-text-muted);
    line-height: 1.7;
  }
}

.excel-compare__actions,
.excel-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.excel-compare__actions {
  justify-content: flex-end;
}

.excel-panel {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.excel-upload-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.excel-upload-box {
  min-width: 0;

  h2 {
    margin: 0 0 12px;
    color: var(--color-text);
    font-size: 16px;
    line-height: 1.4;
  }

  .el-select {
    width: 100%;
    margin-top: 12px;
  }
}

.excel-file-meta {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.excel-key-select {
  width: 280px;
}

.excel-alert {
  margin-top: 14px;
}

.excel-mapping-table {
  width: 100%;
  margin-top: 14px;
}

.excel-result {
  margin-top: 18px;
}

.excel-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.excel-summary-card {
  display: grid;
  gap: 4px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  strong {
    color: var(--color-primary);
    font-size: 24px;
    line-height: 1.2;
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.excel-result-tabs {
  padding: 0 16px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

[data-theme='dark'] .excel-panel,
[data-theme='dark'] .excel-result-tabs {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .excel-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .excel-compare__header {
    flex-direction: column;
  }

  .excel-compare__header h1 {
    font-size: 28px;
  }

  .excel-compare__actions,
  .excel-compare__actions .el-button,
  .excel-key-select {
    width: 100%;
  }

  .excel-upload-grid,
  .excel-summary-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run lint and fix page-level errors**

Run:

```bash
npm run lint
```

Expected: no lint errors. If lint reports unused imports, missing component names, or line-length-independent formatting issues, edit `ExcelCompare.vue` until the same command passes.

- [ ] **Step 6: Run core verification**

Run:

```bash
node scripts/verify-excel-compare-core.js
```

Expected:

```text
excelCompareCore verification passed
```

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json package-lock.json src/views/tools/ExcelCompare.vue
git commit -m "feat: add excel compare page"
```

---

### Task 3: Route, Menu, and Full Verification

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/config/tools.js`

**Interfaces:**
- Consumes from Task 2:
  - Vue component at `src/views/tools/ExcelCompare.vue`
- Produces:
  - Route `/tool/excel-compare`
  - Home/search/sidebar registration under `数据格式与转换`

- [ ] **Step 1: Add lazy route import**

In `src/router/index.js`, add near the other tool imports:

```js
const ExcelCompare = () => import(/* webpackChunkName: "tool-excel-compare" */ '../views/tools/ExcelCompare.vue')
```

- [ ] **Step 2: Register the route**

In the `routes` array near other data conversion routes, add:

```js
{
  path: '/tool/excel-compare',
  name: 'ExcelCompare',
  component: ExcelCompare
}
```

- [ ] **Step 3: Register the tool card**

In `src/config/tools.js`, under the `数据格式与转换` category after `CSV/JSON转换`, add:

```js
{
  name: 'Excel 数据比对',
  path: '/tool/excel-compare',
  icon: 'el-icon-document-copy',
  description: '上传两个 Excel，按表头或列号映射字段，并根据 key 输出新增、删除和字段差异。',
  tags: ['excel', 'xlsx', 'xls', 'compare', 'diff']
}
```

- [ ] **Step 4: Run core verification**

Run:

```bash
node scripts/verify-excel-compare-core.js
```

Expected:

```text
excelCompareCore verification passed
```

- [ ] **Step 5: Run lint**

Run:

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: build exits `0`. Existing webpack asset-size warnings may remain, and any new `xlsx` vendor size warning is acceptable for this feature.

- [ ] **Step 7: Manual browser smoke test**

Run:

```bash
npm run serve -- --port 8080
```

Open `http://localhost:8080/tool/excel-compare` and verify:

- Page loads with two upload panels.
- Header mode and column-letter mode controls are visible.
- Compare button remains disabled before upload, mapping, and key selection.
- Export button remains disabled before results exist.

Stop the dev server after the smoke test.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/router/index.js src/config/tools.js
git commit -m "feat: register excel compare tool"
```
