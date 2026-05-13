<template>
  <section class="json-schema-tool">
    <div class="json-schema-tool__header">
      <div>
        <h1>JSON Schema 生成器</h1>
        <p>根据 JSON 数据递归推断类型、必填字段、枚举候选、数字范围和嵌套结构。</p>
      </div>

      <div class="json-schema-tool__actions">
        <el-button size="small" icon="el-icon-magic-stick" @click="loadExample">
          示例数据
        </el-button>
        <el-button
          size="small"
          icon="el-icon-document-copy"
          :disabled="!schemaText"
          @click="copySchema"
        >
          复制 Schema
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearInput">
          清空
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      class="json-schema-tool__alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div class="json-schema-grid">
      <section class="json-schema-pane">
        <div class="json-schema-pane__header">
          <h2>JSON 输入</h2>
          <span>{{ inputStats }}</span>
        </div>
        <el-input
          v-model="jsonInput"
          class="json-schema-pane__textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="请输入 JSON 对象或数组"
        />
      </section>

      <section class="json-schema-pane">
        <div class="json-schema-pane__header">
          <h2>生成的 JSON Schema</h2>
          <span>{{ schemaSummary }}</span>
        </div>
        <pre class="json-schema-output"><code>{{ schemaText || 'Schema 会显示在这里' }}</code></pre>
      </section>
    </div>
  </section>
</template>

<script>
const EXAMPLE_JSON = {
  users: [
    {
      id: 1,
      name: 'Alice',
      role: 'admin',
      active: true,
      age: 28,
      tags: ['team-a', 'owner'],
      profile: {
        email: 'alice@example.com',
        city: 'Shanghai'
      }
    },
    {
      id: 2,
      name: 'Bob',
      role: 'user',
      active: false,
      age: 34,
      tags: ['team-b'],
      profile: {
        email: 'bob@example.com',
        city: 'Beijing'
      }
    }
  ],
  total: 2,
  page: 1
}

export default {
  name: 'JsonSchema',
  data() {
    return {
      jsonInput: JSON.stringify(EXAMPLE_JSON, null, 2),
      errorMessage: ''
    }
  },
  computed: {
    parsedJson() {
      const value = this.jsonInput.trim()

      if (!value) {
        return null
      }

      try {
        const parsed = JSON.parse(value)
        this.clearError()
        return parsed
      } catch (error) {
        this.setError(`JSON 解析失败：${error.message}`)
        return null
      }
    },
    schemaObject() {
      if (this.parsedJson === null) {
        return null
      }

      return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'GeneratedSchema',
        ...this.inferSchema([this.parsedJson])
      }
    },
    schemaText() {
      return this.schemaObject ? JSON.stringify(this.schemaObject, null, 2) : ''
    },
    inputStats() {
      const lines = this.jsonInput ? this.jsonInput.split('\n').length : 0
      return `${lines} 行 / ${this.jsonInput.length} 字符`
    },
    schemaSummary() {
      if (!this.schemaObject) {
        return '等待输入'
      }

      return `${this.schemaObject.type || 'mixed'} schema`
    }
  },
  methods: {
    inferSchema(values) {
      const observedValues = values.filter(value => value !== undefined)

      if (!observedValues.length) {
        return {}
      }

      const grouped = observedValues.reduce((target, value) => {
        const type = this.getJsonType(value)
        if (!target[type]) {
          target[type] = []
        }
        target[type].push(value)
        return target
      }, {})
      const types = Object.keys(grouped)
      const nonNullTypes = types.filter(type => type !== 'null')

      if (nonNullTypes.length === 1 && types.includes('null')) {
        const schema = this.inferSchema(grouped[nonNullTypes[0]])
        schema.type = [schema.type, 'null']
        return schema
      }

      if (types.length > 1) {
        return {
          anyOf: types.map(type => this.inferTypeSchema(type, grouped[type]))
        }
      }

      return this.inferTypeSchema(types[0], observedValues)
    },
    inferTypeSchema(type, values) {
      if (type === 'object') {
        return this.inferObjectSchema(values)
      }

      if (type === 'array') {
        return this.inferArraySchema(values)
      }

      if (type === 'number') {
        return this.inferNumberSchema(values)
      }

      if (type === 'string' || type === 'boolean') {
        return this.withEnumCandidate({ type }, values)
      }

      return { type }
    },
    inferObjectSchema(objects) {
      const keys = Array.from(new Set(objects.flatMap(item => Object.keys(item)))).sort()
      const properties = {}
      const required = keys.filter(key => objects.every(item => Object.prototype.hasOwnProperty.call(item, key)))

      keys.forEach(key => {
        properties[key] = this.inferSchema(objects.map(item => item[key]))
      })

      const schema = {
        type: 'object',
        properties
      }

      if (required.length) {
        schema.required = required
      }

      return schema
    },
    inferArraySchema(arrays) {
      const lengths = arrays.map(item => item.length)
      const items = arrays.reduce((target, item) => target.concat(item), [])
      const schema = {
        type: 'array',
        items: items.length ? this.inferSchema(items) : {}
      }

      if (lengths.length) {
        schema.minItems = Math.min(...lengths)
        schema.maxItems = Math.max(...lengths)
      }

      return schema
    },
    inferNumberSchema(values) {
      const schema = {
        type: 'number',
        minimum: Math.min(...values),
        maximum: Math.max(...values)
      }

      return this.withEnumCandidate(schema, values)
    },
    withEnumCandidate(schema, values) {
      const primitiveValues = values.filter(value => ['string', 'number', 'boolean'].includes(typeof value))
      const uniqueValues = Array.from(new Set(primitiveValues))

      if (primitiveValues.length >= 2 && uniqueValues.length <= 8) {
        schema.enum = uniqueValues
      }

      return schema
    },
    getJsonType(value) {
      if (value === null) {
        return 'null'
      }

      if (Array.isArray(value)) {
        return 'array'
      }

      if (typeof value === 'number') {
        return 'number'
      }

      return typeof value
    },
    loadExample() {
      this.jsonInput = JSON.stringify(EXAMPLE_JSON, null, 2)
      this.errorMessage = ''
    },
    clearInput() {
      this.jsonInput = ''
      this.errorMessage = ''
    },
    async copySchema() {
      if (!this.schemaText) {
        this.$message.warning('没有可复制的 Schema')
        return
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.schemaText)
        } else {
          this.copyWithFallback(this.schemaText)
        }
        this.$message.success('Schema 已复制')
      } catch (error) {
        this.$message.error('复制失败')
      }
    },
    copyWithFallback(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    },
    setError(message) {
      this.errorMessage = message
    },
    clearError() {
      if (this.errorMessage) {
        this.errorMessage = ''
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.json-schema-tool {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.json-schema-tool__header {
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

.json-schema-tool__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.json-schema-tool__alert {
  margin-bottom: 18px;
}

.json-schema-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 680px;
}

.json-schema-pane {
  display: flex;
  min-width: 0;
  min-height: 680px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.json-schema-pane__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 16px;
    line-height: 1.4;
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.json-schema-pane__textarea {
  flex: 1;
  min-height: 0;
}

.json-schema-pane__textarea ::v-deep .el-textarea__inner {
  height: 100%;
  min-height: 625px !important;
  padding: 16px;
  resize: none;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
}

.json-schema-output {
  flex: 1;
  min-height: 625px;
  margin: 0;
  overflow: auto;
  padding: 16px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre;
}

.json-schema-output code {
  display: block;
  min-width: max-content;
}

[data-theme='dark'] .json-schema-pane__textarea ::v-deep .el-textarea__inner,
[data-theme='dark'] .json-schema-output {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .json-schema-tool__header {
    flex-direction: column;
  }

  .json-schema-tool__actions {
    justify-content: flex-start;
  }

  .json-schema-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .json-schema-tool__header h1 {
    font-size: 28px;
  }

  .json-schema-tool__actions,
  .json-schema-tool__actions .el-button {
    width: 100%;
  }

  .json-schema-grid,
  .json-schema-pane {
    min-height: 520px;
  }

  .json-schema-pane__textarea ::v-deep .el-textarea__inner,
  .json-schema-output {
    min-height: 465px !important;
  }
}
</style>
