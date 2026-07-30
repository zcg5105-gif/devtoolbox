<template>
  <section class="id-generator-tool">
    <div class="tool-header">
      <div>
        <h1>ID 生成与解析</h1>
        <p>生成 UUID、ULID、Snowflake 风格 ID，并解析可用时间信息。</p>
      </div>
      <div class="tool-actions">
        <el-button type="primary" size="small" icon="el-icon-magic-stick" @click="generate">生成</el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!results.length" @click="copyAll">复制全部</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-panel">
      <div class="option-grid">
        <el-form label-position="top">
          <el-form-item label="类型">
            <el-select v-model="mode">
              <el-option label="UUID v4" value="uuid" />
              <el-option label="ULID" value="ulid" />
              <el-option label="Snowflake" value="snowflake" />
            </el-select>
          </el-form-item>
        </el-form>
        <el-form label-position="top">
          <el-form-item label="数量">
            <el-input-number v-model="count" :min="1" :max="100" />
          </el-form-item>
        </el-form>
        <el-form label-position="top">
          <el-form-item label="Snowflake Epoch">
            <el-input v-model="epochText" />
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <div class="content-grid">
      <el-card shadow="never" class="tool-panel">
        <div slot="header" class="panel-title">生成结果</div>
        <el-table :data="results" height="420">
          <el-table-column prop="value" label="ID" min-width="260" />
          <el-table-column prop="createdAt" label="生成时间" width="180" />
          <el-table-column width="90" label="操作">
            <template slot-scope="{ row }">
              <el-button size="mini" @click="copyOne(row.value)">复制</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never" class="tool-panel">
        <div slot="header" class="panel-title">解析</div>
        <el-form label-position="top">
          <el-form-item label="ID">
            <el-input v-model="parseInput" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="parseType" @change="parseId">
              <el-option label="ULID" value="ulid" />
              <el-option label="Snowflake" value="snowflake" />
            </el-select>
          </el-form-item>
          <el-button type="primary" @click="parseId">解析</el-button>
        </el-form>
        <pre class="parse-result">{{ parseResult || '输入 ID 后显示解析结果' }}</pre>
      </el-card>
    </div>
  </section>
</template>

<script>
const {
  generateUuidV4,
  generateUlid,
  parseUlidTimestamp,
  generateSnowflakeId,
  parseSnowflakeId
} = require('@/utils/toolExpansionCore')

export default {
  name: 'IdGenerator',
  data() {
    return {
      mode: 'uuid',
      count: 10,
      epochText: '2020-01-01T00:00:00.000Z',
      results: [],
      parseInput: '',
      parseType: 'ulid',
      parseResult: ''
    }
  },
  mounted() {
    this.generate()
  },
  methods: {
    generate() {
      const epochMs = Date.parse(this.epochText)
      const rows = []

      for (let index = 0; index < this.count; index += 1) {
        const value = this.createId(index, epochMs)
        rows.push({
          value,
          createdAt: new Date().toLocaleString()
        })
      }

      this.results = rows
      this.parseInput = rows[0] ? rows[0].value : ''
      this.parseType = this.mode === 'uuid' ? 'ulid' : this.mode
      this.parseId()
    },
    createId(index, epochMs) {
      if (this.mode === 'ulid') {
        return generateUlid()
      }
      if (this.mode === 'snowflake') {
        return generateSnowflakeId({
          epochMs,
          workerId: 1,
          sequence: index
        })
      }
      return generateUuidV4()
    },
    parseId() {
      if (!this.parseInput.trim()) {
        this.parseResult = ''
        return
      }

      if (this.parseType === 'ulid') {
        const date = parseUlidTimestamp(this.parseInput)
        this.parseResult = date ? JSON.stringify({ timestamp: date.toISOString() }, null, 2) : 'ULID 解析失败'
        return
      }

      const result = parseSnowflakeId(this.parseInput, Date.parse(this.epochText))
      this.parseResult = JSON.stringify({
        timestamp: result.date ? result.date.toISOString() : '',
        workerId: result.workerId,
        sequence: result.sequence,
        errorMessage: result.errorMessage
      }, null, 2)
    },
    async copyOne(value) {
      try {
        await navigator.clipboard.writeText(value)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    },
    copyAll() {
      this.copyOne(this.results.map(item => item.value).join('\n'))
    }
  }
}
</script>

<style lang="scss" scoped>
.id-generator-tool {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.tool-header,
.tool-actions {
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

.option-grid,
.content-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.content-grid {
  grid-template-columns: minmax(0, 1fr) 360px;
}

.panel-title {
  color: var(--color-text);
  font-weight: 700;
}

.parse-result {
  min-height: 180px;
  margin: 16px 0 0;
  padding: 14px;
  overflow: auto;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  white-space: pre-wrap;
}

@media (max-width: 900px) {
  .tool-header {
    flex-direction: column;
  }

  .option-grid,
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
