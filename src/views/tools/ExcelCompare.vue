<template>
  <section class="excel-compare">
    <div class="excel-compare__header">
      <div>
        <h1>Excel 数据比对</h1>
        <p>上传两个 Excel，选择 Sheet，配置字段映射后按 key 比对差异。</p>
      </div>
      <div class="excel-compare__actions">
        <el-button size="small" icon="el-icon-refresh-left" @click="resetAll">
          重置
        </el-button>
        <el-button
          size="small"
          icon="el-icon-download"
          :disabled="!hasResult"
          @click="exportResult"
        >
          导出结果
        </el-button>
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
          <el-alert
            v-if="left.errorMessage"
            class="excel-alert"
            :title="left.errorMessage"
            type="error"
            :closable="false"
            show-icon
          />
          <el-select
            v-if="left.sheetNames.length"
            v-model="left.selectedSheetName"
            placeholder="选择 Sheet"
            @change="handleSheetChange"
          >
            <el-option
              v-for="name in left.sheetNames"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
          <p v-if="left.rows.length" class="excel-file-meta">
            {{ leftDataRowCount }} 行数据，{{ left.columns.length }} 列
          </p>
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
          <el-alert
            v-if="right.errorMessage"
            class="excel-alert"
            :title="right.errorMessage"
            type="error"
            :closable="false"
            show-icon
          />
          <el-select
            v-if="right.sheetNames.length"
            v-model="right.selectedSheetName"
            placeholder="选择 Sheet"
            @change="handleSheetChange"
          >
            <el-option
              v-for="name in right.sheetNames"
              :key="name"
              :label="name"
              :value="name"
            />
          </el-select>
          <p v-if="right.rows.length" class="excel-file-meta">
            {{ rightDataRowCount }} 行数据，{{ right.columns.length }} 列
          </p>
        </section>
      </div>
    </el-card>

    <el-card shadow="never" class="excel-panel">
      <div class="excel-options">
        <el-radio-group
          v-model="columnMode"
          size="small"
          @change="rebuildColumnsAndMappings"
        >
          <el-radio-button label="header">首行作为表头</el-radio-button>
          <el-radio-button label="letter">按列号 A/B/C</el-radio-button>
        </el-radio-group>
        <el-select
          v-model="keyMappingId"
          class="excel-key-select"
          placeholder="选择 key 字段"
          :disabled="!enabledMappings.length"
        >
          <el-option
            v-for="mapping in enabledMappings"
            :key="mapping.id"
            :label="mappingLabel(mapping)"
            :value="mapping.id"
          />
        </el-select>
        <el-button
          type="primary"
          icon="el-icon-s-check"
          :disabled="!canCompare"
          @click="runCompare"
        >
          开始比对
        </el-button>
      </div>

      <el-alert
        v-if="mappingWarning"
        class="excel-alert"
        :title="mappingWarning"
        type="warning"
        :closable="false"
        show-icon
      />

      <el-table :data="mappings" border class="excel-mapping-table">
        <el-table-column width="80" label="启用">
          <template slot-scope="{ row }">
            <el-checkbox v-model="row.enabled" @change="handleMappingChange" />
          </template>
        </el-table-column>
        <el-table-column label="左侧字段" min-width="180">
          <template slot-scope="{ row }">
            {{ columnLabel(left.columns, row.leftIndex) }}
          </template>
        </el-table-column>
        <el-table-column label="右侧字段" min-width="220">
          <template slot-scope="{ row }">
            <el-select
              v-model="row.rightIndex"
              clearable
              filterable
              placeholder="选择右侧字段"
              @change="handleMappingChange"
            >
              <el-option
                v-for="column in right.columns"
                :key="column.value"
                :label="column.label"
                :value="column.index"
              />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div v-if="hasResult" class="excel-result">
      <div class="excel-summary-grid">
        <div
          v-for="item in summaryCards"
          :key="item.label"
          class="excel-summary-card"
        >
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <el-tabs v-model="resultTab" class="excel-result-tabs">
        <el-tab-pane label="字段差异" name="changed">
          <div class="excel-diff-toolbar">
            <div>
              <strong>横向对比</strong>
              <span>每个 Key 两行展示，第一行为左边，第二行为右边。</span>
            </div>
            <el-select
              v-model="selectedDiffColumnIds"
              multiple
              collapse-tags
              filterable
              class="excel-diff-field-select"
              placeholder="选择展示字段"
              :disabled="!horizontalDiff.columns.length"
            >
              <el-option
                v-for="column in horizontalDiff.columns"
                :key="column.id"
                :label="column.label"
                :value="column.id"
              />
            </el-select>
          </div>

          <el-empty
            v-if="!horizontalDiffRows.length"
            description="暂无字段差异"
          />
          <el-table
            v-else
            :data="horizontalDiffRows"
            border
            class="excel-horizontal-table"
            :row-class-name="horizontalRowClassName"
          >
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column
              prop="sourceLabel"
              label="来源"
              width="90"
            >
              <template slot-scope="{ row }">
                <el-tag
                  size="mini"
                  :type="row.source === 'left' ? 'info' : 'success'"
                >
                  {{ row.sourceLabel }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rowNumber" label="行号" width="90" />
            <el-table-column
              v-for="column in visibleHorizontalColumns"
              :key="column.id"
              :label="column.label"
              min-width="180"
              show-overflow-tooltip
            >
              <template slot-scope="{ row }">
                <span
                  class="excel-diff-cell"
                  :class="{ 'excel-diff-cell--changed': isHorizontalCellChanged(row, column.id) }"
                >
                  {{ row.values[column.id] }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="仅左侧存在" name="leftOnly">
          <el-table :data="result.leftOnlyRows" border>
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column prop="rowNumber" label="左侧行号" width="120" />
            <el-table-column label="行数据" min-width="260">
              <template slot-scope="{ row }">
                {{ formatValues(row.values) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="仅右侧存在" name="rightOnly">
          <el-table :data="result.rightOnlyRows" border>
            <el-table-column prop="keyValue" label="Key" min-width="140" />
            <el-table-column prop="rowNumber" label="右侧行号" width="120" />
            <el-table-column label="行数据" min-width="260">
              <template slot-scope="{ row }">
                {{ formatValues(row.values) }}
              </template>
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

<script>
const {
  buildColumns,
  buildAutoMappings,
  findDuplicateRightMappings,
  buildHorizontalDiffResult,
  compareRows
} = require('@/utils/excelCompareCore')

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
      resultTab: 'changed',
      horizontalDiff: {
        columns: [],
        defaultSelectedColumnIds: [],
        rows: []
      },
      selectedDiffColumnIds: [],
      xlsxModule: null
    }
  },
  computed: {
    enabledMappings() {
      return this.mappings.filter(mapping => {
        return mapping.enabled &&
          mapping.rightIndex !== null &&
          mapping.rightIndex !== undefined &&
          mapping.rightIndex !== ''
      })
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
    },
    visibleHorizontalColumns() {
      const selectedIds = new Set(this.selectedDiffColumnIds)
      return this.horizontalDiff.columns.filter(column => selectedIds.has(column.id))
    },
    horizontalDiffRows() {
      if (!this.visibleHorizontalColumns.length) {
        return []
      }
      return this.horizontalDiff.rows
    }
  },
  methods: {
    async loadXlsx() {
      if (!this.xlsxModule) {
        this.xlsxModule = await import(/* webpackChunkName: "lib-xlsx" */ 'xlsx')
      }
      return this.xlsxModule
    },
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
        const XLSX = await this.loadXlsx()
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
      const XLSX = this.xlsxModule
      const state = this[side]
      const sheet = state.workbook && state.workbook.Sheets[state.selectedSheetName]

      if (!XLSX || !sheet) {
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

      this.mappings = this.createMappings()
      this.keyMappingId = this.enabledMappings[0] ? this.enabledMappings[0].id : ''
      this.hasResult = false
      this.result = createEmptyResult()
      this.resetHorizontalDiff()
    },
    createMappings() {
      if (!this.left.columns.length) {
        return []
      }

      const autoMappings = buildAutoMappings(this.left.columns, this.right.columns, this.columnMode)
      const rightIndexByLeftIndex = autoMappings.reduce((target, mapping) => {
        target[mapping.leftIndex] = mapping.rightIndex
        return target
      }, {})

      return this.left.columns.map(leftColumn => {
        const hasAutoMapping = Object.prototype.hasOwnProperty.call(
          rightIndexByLeftIndex,
          leftColumn.index
        )

        return {
          id: `left-${leftColumn.index}`,
          leftIndex: leftColumn.index,
          rightIndex: hasAutoMapping ? rightIndexByLeftIndex[leftColumn.index] : '',
          enabled: hasAutoMapping
        }
      })
    },
    handleMappingChange() {
      if (!this.enabledMappings.some(mapping => mapping.id === this.keyMappingId)) {
        this.keyMappingId = this.enabledMappings[0] ? this.enabledMappings[0].id : ''
      }
      this.hasResult = false
      this.resetHorizontalDiff()
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
        this.horizontalDiff = buildHorizontalDiffResult({
          changedCells: this.result.changedCells,
          mappings: this.enabledMappings,
          keyMappingId: this.keyMappingId,
          leftColumns: this.left.columns,
          rightColumns: this.right.columns
        })
        this.selectedDiffColumnIds = this.horizontalDiff.defaultSelectedColumnIds.slice()
        this.hasResult = true
        this.$message.success('比对完成')
      } catch (error) {
        this.$message.error(error.message || '比对失败')
      }
    },
    async exportResult() {
      if (!this.hasResult) {
        return
      }

      const XLSX = await this.loadXlsx()
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
    isHorizontalCellChanged(row, columnId) {
      return row.changedColumnIds.includes(columnId)
    },
    horizontalRowClassName({ row }) {
      return row.source === 'left' ? 'excel-horizontal-row--left' : 'excel-horizontal-row--right'
    },
    resetHorizontalDiff() {
      this.horizontalDiff = {
        columns: [],
        defaultSelectedColumnIds: [],
        rows: []
      }
      this.selectedDiffColumnIds = []
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
      this.resetHorizontalDiff()
    }
  }
}
</script>

<style lang="scss" scoped>
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

.excel-diff-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 14px 0;

  strong {
    display: block;
    margin-bottom: 4px;
    color: var(--color-text);
    font-size: 15px;
    line-height: 1.4;
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }
}

.excel-diff-field-select {
  width: 360px;
  max-width: 100%;
}

.excel-horizontal-table {
  width: 100%;
}

.excel-diff-cell {
  display: inline-block;
  max-width: 100%;
  min-height: 24px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.excel-diff-cell--changed {
  background: #fef3c7;
  color: #92400e;
  font-weight: 700;
}

::v-deep .excel-horizontal-row--left td {
  background: rgba(37, 99, 235, 0.04);
}

::v-deep .excel-horizontal-row--right td {
  border-bottom: 2px solid var(--color-border);
}

[data-theme='dark'] .excel-panel,
[data-theme='dark'] .excel-result-tabs {
  background: var(--color-surface);
  color: var(--color-text);
}

[data-theme='dark'] .excel-diff-cell--changed {
  background: #78350f;
  color: #fde68a;
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
  .excel-diff-field-select,
  .excel-key-select {
    width: 100%;
  }

  .excel-diff-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .excel-upload-grid,
  .excel-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
