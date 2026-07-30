<template>
  <section class="jwt-batch-tool">
    <div class="tool-header">
      <div>
        <h1>JWT 批量检查</h1>
        <p>批量解析 JWT Header/Payload，检查过期时间和常见 Claims。仅解析 Header/Payload，不验证签名。</p>
      </div>
      <div class="tool-actions">
        <el-button type="primary" size="small" icon="el-icon-search" @click="parseTokens">解析</el-button>
        <el-button size="small" icon="el-icon-download" :disabled="!rows.length" @click="exportCsv">导出 CSV</el-button>
      </div>
    </div>

    <div class="content-grid">
      <section class="input-pane">
        <div class="pane-header">
          <h2>Token 列表</h2>
          <span>每行一个</span>
        </div>
        <el-input
          v-model="tokenText"
          class="token-input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
        />
      </section>

      <section class="input-pane">
        <div class="pane-header">
          <h2>详情</h2>
          <span>{{ selectedRow ? `#${selectedRow.index}` : '未选择' }}</span>
        </div>
        <pre class="detail-block">{{ detailText }}</pre>
      </section>
    </div>

    <el-card shadow="never" class="tool-panel">
      <el-table :data="rows" border @row-click="selectedRow = $event">
        <el-table-column prop="index" label="#" width="60" />
        <el-table-column label="状态" width="120">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="statusType(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="algorithm" label="Alg" width="100" />
        <el-table-column prop="subject" label="Sub" min-width="120" />
        <el-table-column prop="issuer" label="Issuer" min-width="120" />
        <el-table-column prop="audience" label="Audience" min-width="120" />
        <el-table-column prop="issuedAt" label="Issued At" min-width="170" />
        <el-table-column prop="expiration" label="Expiration" min-width="170" />
      </el-table>
    </el-card>
  </section>
</template>

<script>
const { parseJwtBatch } = require('@/utils/toolExpansionCore')

function createSampleToken() {
  const encode = value => btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ sub: 'user-1', iss: 'devtoolbox', aud: 'web', iat: 1700000000, exp: 1893456000 }),
    ''
  ].join('.')
}

export default {
  name: 'JwtBatchChecker',
  data() {
    return {
      tokenText: `${createSampleToken()}\ninvalid.token`,
      rows: [],
      selectedRow: null
    }
  },
  computed: {
    detailText() {
      if (!this.selectedRow) {
        return '点击表格行查看 Header / Payload'
      }

      return JSON.stringify({
        header: this.selectedRow.header,
        payload: this.selectedRow.payload,
        errorMessage: this.selectedRow.errorMessage
      }, null, 2)
    }
  },
  mounted() {
    this.parseTokens()
  },
  methods: {
    parseTokens() {
      this.rows = parseJwtBatch(this.tokenText)
      this.selectedRow = this.rows[0] || null
    },
    statusType(status) {
      if (status === 'valid') return 'success'
      if (status === 'expired' || status === 'invalid') return 'danger'
      return 'warning'
    },
    exportCsv() {
      const header = ['index', 'status', 'algorithm', 'subject', 'issuer', 'audience', 'issuedAt', 'expiration']
      const lines = [
        header.join(','),
        ...this.rows.map(row => header.map(key => this.escapeCsv(row[key])).join(','))
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `jwt_batch_${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    escapeCsv(value) {
      const text = String(value || '')
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
  }
}
</script>

<style lang="scss" scoped>
.jwt-batch-tool {
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
    max-width: 760px;
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

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 18px;
  margin-bottom: 18px;
}

.input-pane {
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

.token-input ::v-deep .el-textarea__inner,
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

.tool-panel {
  border-color: var(--color-border);
}

@media (max-width: 900px) {
  .tool-header {
    flex-direction: column;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
