<template>
  <section class="log-viewer-tool">
    <div class="tool-header">
      <div>
        <h1>日志格式化查看器</h1>
        <p>格式化 JSON Lines 和普通日志，支持级别识别、过滤和复制。</p>
      </div>
      <div class="tool-actions">
        <el-button type="primary" size="small" icon="el-icon-refresh" @click="parse">解析</el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!filteredRows.length" @click="copyFiltered">复制过滤结果</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-panel">
      <div class="option-grid">
        <el-select v-model="mode" @change="parse">
          <el-option label="Auto" value="auto" />
          <el-option label="JSON Lines" value="jsonLines" />
          <el-option label="Plain text" value="plain" />
          <el-option label="Java stack trace" value="javaStack" />
        </el-select>
        <el-input v-model="keyword" placeholder="过滤关键字" prefix-icon="el-icon-search" />
        <el-checkbox-group v-model="levels">
          <el-checkbox label="error">error</el-checkbox>
          <el-checkbox label="warn">warn</el-checkbox>
          <el-checkbox label="info">info</el-checkbox>
          <el-checkbox label="debug">debug</el-checkbox>
          <el-checkbox label="trace">trace</el-checkbox>
          <el-checkbox label="other">other</el-checkbox>
        </el-checkbox-group>
      </div>
    </el-card>

    <div class="log-grid">
      <section class="log-pane">
        <div class="pane-header">
          <h2>原始日志</h2>
          <span>{{ logText.length }} 字符</span>
        </div>
        <el-input
          v-model="logText"
          class="log-input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
        />
      </section>

      <section class="log-pane">
        <div class="pane-header">
          <h2>详情</h2>
          <span>{{ selectedRow ? `第 ${selectedRow.lineNumber} 行` : '未选择' }}</span>
        </div>
        <pre class="detail-block">{{ detailText }}</pre>
      </section>
    </div>

    <el-card shadow="never" class="tool-panel">
      <el-table :data="filteredRows" border height="420" @row-click="selectedRow = $event">
        <el-table-column prop="lineNumber" label="行" width="80" />
        <el-table-column label="级别" width="100">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="levelType(row.level)">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="time" label="时间" min-width="170" />
        <el-table-column prop="message" label="消息" min-width="320" show-overflow-tooltip />
      </el-table>
    </el-card>
  </section>
</template>

<script>
const { parseLogs, filterLogRows } = require('@/utils/toolExpansionCore')

const SAMPLE_LOG = [
  '{"level":"error","message":"boom","time":"2024-01-01 10:00:00"}',
  'INFO started',
  '  at demo.App'
].join('\n')

export default {
  name: 'LogViewer',
  data() {
    return {
      logText: SAMPLE_LOG,
      mode: 'auto',
      keyword: '',
      levels: ['error', 'warn', 'info', 'debug', 'trace', 'other'],
      rows: [],
      selectedRow: null
    }
  },
  computed: {
    filteredRows() {
      return filterLogRows(this.rows, {
        keyword: this.keyword,
        levels: this.levels
      })
    },
    detailText() {
      if (!this.selectedRow) {
        return '点击日志行查看详情'
      }

      return JSON.stringify(this.selectedRow, null, 2)
    }
  },
  mounted() {
    this.parse()
  },
  methods: {
    parse() {
      this.rows = parseLogs(this.logText, { mode: this.mode })
      this.selectedRow = this.rows[0] || null
    },
    levelType(level) {
      if (level === 'error') return 'danger'
      if (level === 'warn') return 'warning'
      if (level === 'info') return 'success'
      return 'info'
    },
    async copyFiltered() {
      const content = this.filteredRows.map(row => row.raw).join('\n')

      try {
        await navigator.clipboard.writeText(content)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.log-viewer-tool {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.tool-header,
.tool-actions,
.pane-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;

  h1 {
    margin: 0 0 10px;
    color: var(--color-text);
    font-size: 32px;
  }

  p {
    margin: 0;
    color: var(--color-text-muted);
    line-height: 1.7;
  }
}

.tool-actions {
  flex-wrap: wrap;
  justify-content: flex-end;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.tool-panel {
  margin-bottom: 18px;
  border-color: var(--color-border);
}

.option-grid {
  display: grid;
  grid-template-columns: 180px minmax(220px, 1fr) minmax(0, 2fr);
  gap: 14px;
  align-items: center;
}

.log-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 18px;
  margin-bottom: 18px;
}

.log-pane {
  min-width: 0;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.pane-header {
  justify-content: space-between;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 16px;
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.log-input ::v-deep .el-textarea__inner,
.detail-block {
  min-height: 260px !important;
  margin: 0;
  padding: 16px;
  overflow: auto;
  background: var(--color-surface);
  border: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .tool-header {
    flex-direction: column;
  }

  .option-grid,
  .log-grid {
    grid-template-columns: 1fr;
  }
}
</style>
