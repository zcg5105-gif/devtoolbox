<template>
  <section class="mock-data-tool">
    <div class="tool-header">
      <div>
        <h1>Mock 数据生成器</h1>
        <p>按字段批量生成姓名、手机号、邮箱、地址和 UUID 等 JSON Mock 数据。</p>
      </div>
      <div class="tool-actions">
        <el-button type="primary" size="small" icon="el-icon-magic-stick" @click="generate">生成</el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!outputText" @click="copyOutput">复制</el-button>
        <el-button size="small" icon="el-icon-download" :disabled="!outputText" @click="downloadJson">下载 JSON</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-panel">
      <div class="option-grid">
        <el-form label-position="top">
          <el-form-item label="数量">
            <el-input-number v-model="count" :min="1" :max="1000" />
          </el-form-item>
        </el-form>
        <el-form label-position="top" class="field-form">
          <el-form-item label="字段">
            <el-select v-model="fields" multiple filterable collapse-tags>
              <el-option v-for="field in fieldOptions" :key="field.value" :label="field.label" :value="field.value" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <section class="output-pane">
      <div class="pane-header">
        <h2>JSON 输出</h2>
        <span>{{ rows.length }} 条</span>
      </div>
      <el-input
        v-model="outputText"
        class="json-output"
        type="textarea"
        :autosize="false"
        readonly
        spellcheck="false"
      />
    </section>
  </section>
</template>

<script>
const { generateMockRows } = require('@/utils/toolExpansionCore')

export default {
  name: 'MockDataGenerator',
  data() {
    return {
      count: 10,
      fields: ['name', 'mobile', 'email', 'city'],
      rows: [],
      outputText: '',
      fieldOptions: [
        { label: '姓名', value: 'name' },
        { label: '手机号', value: 'mobile' },
        { label: '邮箱', value: 'email' },
        { label: '城市', value: 'city' },
        { label: '地址', value: 'address' },
        { label: '日期', value: 'date' },
        { label: '数字', value: 'number' },
        { label: '布尔值', value: 'boolean' },
        { label: 'UUID', value: 'uuid' }
      ]
    }
  },
  mounted() {
    this.generate()
  },
  methods: {
    generate() {
      this.rows = generateMockRows({
        count: this.count,
        fields: this.fields
      })
      this.outputText = JSON.stringify(this.rows, null, 2)
    },
    async copyOutput() {
      if (!this.outputText) return

      try {
        await navigator.clipboard.writeText(this.outputText)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    },
    downloadJson() {
      const blob = new Blob([this.outputText], { type: 'application/json;charset=utf-8' })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `mock_data_${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    }
  }
}
</script>

<style lang="scss" scoped>
.mock-data-tool {
  width: 100%;
  max-width: 1180px;
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
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
}

.field-form .el-select {
  width: 100%;
}

.output-pane {
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

.json-output ::v-deep .el-textarea__inner {
  min-height: 520px !important;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .tool-header {
    flex-direction: column;
  }

  .option-grid {
    grid-template-columns: 1fr;
  }
}
</style>
