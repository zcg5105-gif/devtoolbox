<template>
  <section class="csv-json-converter">
    <div class="csv-json-converter__header">
      <div>
        <h1>CSV / JSON 转换器</h1>
        <p>CSV 与 JSON 双向转换，支持引号字段、分隔符切换、字段选择和嵌套对象扁平化。</p>
      </div>

      <div class="csv-json-converter__actions">
        <el-button size="small" icon="el-icon-sort" @click="toggleMode">
          切换方向
        </el-button>
        <el-button size="small" icon="el-icon-upload2" @click="openFilePicker">
          导入文件
        </el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!outputText" @click="copyResult">
          复制结果
        </el-button>
        <el-button size="small" icon="el-icon-download" :disabled="!outputText" @click="downloadResult">
          下载结果
        </el-button>
        <input
          ref="fileInput"
          class="hidden-input"
          type="file"
          accept=".csv,.json,.txt,text/csv,application/json,text/plain"
          @change="handleFileChange"
        >
      </div>
    </div>

    <el-card shadow="never" class="converter-options">
      <div class="options-grid">
        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="转换方向">
            <el-radio-group v-model="mode" size="small">
              <el-radio-button label="csvToJson">CSV 转 JSON</el-radio-button>
              <el-radio-button label="jsonToCsv">JSON 转 CSV</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="CSV 分隔符">
            <el-select v-model="delimiter">
              <el-option
                v-for="option in delimiterOptions"
                :key="option.label"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <el-form v-if="mode === 'csvToJson'" label-position="top" @submit.native.prevent>
          <el-form-item label="CSV 选项">
            <el-checkbox v-model="firstRowAsKey">
              首行作为 key
            </el-checkbox>
          </el-form-item>
        </el-form>

        <el-form v-else label-position="top" @submit.native.prevent>
          <el-form-item label="导出字段">
            <el-select
              v-model="selectedFields"
              multiple
              filterable
              collapse-tags
              placeholder="选择需要导出的字段"
            >
              <el-option
                v-for="field in availableFields"
                :key="field"
                :label="field"
                :value="field"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div class="status-row">
        <el-tag size="small" :type="errorMessage ? 'danger' : 'success'" effect="plain">
          {{ errorMessage ? '格式错误' : validationMessage }}
        </el-tag>
        <span v-if="isProcessing">正在分批处理大文件...</span>
      </div>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="converter-alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div class="converter-grid">
      <section class="converter-pane">
        <div class="converter-pane__header">
          <h2>CSV {{ mode === 'csvToJson' ? '输入' : '输出' }}</h2>
          <span>{{ csvStats }}</span>
        </div>
        <el-input
          v-model="csvText"
          class="converter-pane__textarea"
          type="textarea"
          :readonly="mode !== 'csvToJson'"
          :autosize="false"
          spellcheck="false"
          placeholder="name,age,city"
        />
      </section>

      <section class="converter-pane">
        <div class="converter-pane__header">
          <h2>JSON {{ mode === 'jsonToCsv' ? '输入' : '输出' }}</h2>
          <span>{{ jsonStats }}</span>
        </div>
        <el-input
          v-model="jsonText"
          class="converter-pane__textarea"
          type="textarea"
          :readonly="mode !== 'jsonToCsv'"
          :autosize="false"
          spellcheck="false"
          placeholder='[{"name":"Alice","age":28}]'
        />
      </section>
    </div>
  </section>
</template>

<script>
const SAMPLE_CSV = [
  'id,name,user.email,user.city,role',
  '1,Alice,alice@example.com,Shanghai,admin',
  '2,Bob,bob@example.com,Beijing,user',
  '3,"Carol, QA",carol@example.com,Hangzhou,user'
].join('\n')

export default {
  name: 'CsvJsonConverter',
  data() {
    return {
      mode: 'csvToJson',
      csvText: SAMPLE_CSV,
      jsonText: '',
      delimiter: ',',
      delimiterOptions: [
        { label: '逗号 ,', value: ',' },
        { label: '制表符 Tab', value: '\t' },
        { label: '分号 ;', value: ';' }
      ],
      firstRowAsKey: true,
      availableFields: [],
      selectedFields: [],
      errorMessage: '',
      validationMessage: '等待转换',
      isProcessing: false,
      convertTimer: null,
      convertToken: 0
    }
  },
  computed: {
    outputText() {
      return this.mode === 'csvToJson' ? this.jsonText : this.csvText
    },
    csvStats() {
      return this.formatStats(this.csvText)
    },
    jsonStats() {
      return this.formatStats(this.jsonText)
    }
  },
  watch: {
    mode() {
      this.scheduleConvert()
    },
    csvText() {
      if (this.mode === 'csvToJson') {
        this.scheduleConvert()
      }
    },
    jsonText() {
      if (this.mode === 'jsonToCsv') {
        this.scheduleConvert()
      }
    },
    delimiter() {
      this.scheduleConvert()
    },
    firstRowAsKey() {
      if (this.mode === 'csvToJson') {
        this.scheduleConvert()
      }
    },
    selectedFields() {
      if (this.mode === 'jsonToCsv') {
        this.scheduleConvert()
      }
    }
  },
  mounted() {
    this.scheduleConvert()
  },
  beforeDestroy() {
    window.clearTimeout(this.convertTimer)
    this.convertToken += 1
  },
  methods: {
    scheduleConvert() {
      window.clearTimeout(this.convertTimer)
      this.convertTimer = window.setTimeout(() => {
        this.convert()
      }, 180)
    },
    async convert() {
      const token = ++this.convertToken

      this.isProcessing = true
      this.errorMessage = ''

      try {
        if (this.mode === 'csvToJson') {
          await this.convertCsvToJson(token)
        } else {
          this.convertJsonToCsv()
        }
      } catch (error) {
        if (error.message !== 'CANCELLED') {
          this.errorMessage = error.message || '转换失败'
        }
      } finally {
        if (token === this.convertToken) {
          this.isProcessing = false
        }
      }
    },
    async convertCsvToJson(token) {
      const rows = await this.parseCsvAsync(this.csvText, this.delimiter, token)

      if (!rows.length) {
        this.jsonText = ''
        this.validationMessage = 'CSV 为空'
        return
      }

      const maxColumns = Math.max(...rows.map(row => row.length))
      const headers = this.firstRowAsKey
        ? this.normalizeHeaders(rows[0], maxColumns)
        : Array.from({ length: maxColumns }, (item, index) => `column${index + 1}`)
      const dataRows = this.firstRowAsKey ? rows.slice(1) : rows
      const result = dataRows
        .filter(row => row.some(value => value !== ''))
        .map(row => headers.reduce((target, key, index) => {
          target[key] = row[index] || ''
          return target
        }, {}))

      this.jsonText = JSON.stringify(result, null, 2)
      this.validationMessage = `已转换 ${result.length} 行`
    },
    convertJsonToCsv() {
      const source = this.jsonText.trim()

      if (!source) {
        this.csvText = ''
        this.availableFields = []
        this.selectedFields = []
        this.validationMessage = 'JSON 为空'
        return
      }

      const parsed = JSON.parse(source)
      const records = this.extractRecords(parsed)
      const flattened = records.map(record => this.flattenObject(record))
      const fields = this.collectFields(flattened)

      this.availableFields = fields

      if (!this.selectedFields.length || this.selectedFields.some(field => !fields.includes(field))) {
        this.selectedFields = fields.slice()
      }

      const selected = this.selectedFields.length ? this.selectedFields : fields
      const rows = [
        selected,
        ...flattened.map(item => selected.map(field => item[field] === undefined ? '' : item[field]))
      ]

      this.csvText = rows.map(row => row.map(value => this.escapeCsvValue(value)).join(this.delimiter)).join('\n')
      this.validationMessage = `已转换 ${records.length} 条记录`
    },
    async parseCsvAsync(text, delimiter, token) {
      const rows = []
      let row = []
      let field = ''
      let inQuotes = false

      for (let index = 0; index < text.length; index += 1) {
        if (token !== this.convertToken) {
          throw new Error('CANCELLED')
        }

        const char = text[index]
        const next = text[index + 1]

        if (inQuotes) {
          if (char === '"' && next === '"') {
            field += '"'
            index += 1
          } else if (char === '"') {
            inQuotes = false
          } else {
            field += char
          }
        } else if (char === '"') {
          inQuotes = true
        } else if (char === delimiter) {
          row.push(field)
          field = ''
        } else if (char === '\n') {
          row.push(field)
          rows.push(row)
          row = []
          field = ''
        } else if (char !== '\r') {
          field += char
        }

        if (index > 0 && index % 50000 === 0) {
          await this.nextFrame()
        }
      }

      if (inQuotes) {
        throw new Error('CSV 引号未闭合')
      }

      row.push(field)
      rows.push(row)

      return rows.filter((item, index) => index < rows.length - 1 || item.some(value => value !== ''))
    },
    normalizeHeaders(row, maxColumns) {
      const seen = {}

      return Array.from({ length: maxColumns }, (item, index) => {
        const raw = row[index] ? row[index].trim() : `column${index + 1}`
        const base = raw || `column${index + 1}`

        seen[base] = (seen[base] || 0) + 1
        return seen[base] === 1 ? base : `${base}_${seen[base]}`
      })
    },
    collectFields(records) {
      const fields = []
      const seen = new Set()

      records.forEach(record => {
        Object.keys(record).forEach(key => {
          if (!seen.has(key)) {
            seen.add(key)
            fields.push(key)
          }
        })
      })

      return fields
    },
    nextFrame() {
      return new Promise(resolve => window.setTimeout(resolve, 0))
    },
    extractRecords(value) {
      if (Array.isArray(value)) {
        return value
      }

      if (value && typeof value === 'object') {
        const arrayKey = Object.keys(value).find(key => Array.isArray(value[key]))
        if (arrayKey) {
          return value[arrayKey]
        }
        return [value]
      }

      throw new Error('JSON 必须是对象、对象数组，或包含数组字段的对象')
    },
    flattenObject(value, prefix = '', target = {}) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        target[prefix || 'value'] = Array.isArray(value) || value && typeof value === 'object'
          ? JSON.stringify(value)
          : value
        return target
      }

      Object.keys(value).forEach(key => {
        const path = prefix ? `${prefix}.${key}` : key
        const child = value[key]

        if (child && typeof child === 'object' && !Array.isArray(child)) {
          this.flattenObject(child, path, target)
        } else {
          target[path] = Array.isArray(child) ? JSON.stringify(child) : child
        }
      })

      return target
    },
    escapeCsvValue(value) {
      const text = value === null || typeof value === 'undefined' ? '' : String(value)
      const needsQuote = text.includes(this.delimiter) || text.includes('"') || /[\r\n]/.test(text)

      if (!needsQuote) {
        return text
      }

      return `"${text.replace(/"/g, '""')}"`
    },
    toggleMode() {
      this.mode = this.mode === 'csvToJson' ? 'jsonToCsv' : 'csvToJson'
    },
    openFilePicker() {
      this.$refs.fileInput.click()
    },
    handleFileChange(event) {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        if (this.mode === 'csvToJson') {
          this.csvText = reader.result
        } else {
          this.jsonText = reader.result
        }
      }

      reader.onerror = () => {
        this.$message.error('文件读取失败')
      }

      reader.readAsText(file)
      event.target.value = ''
    },
    async copyResult() {
      try {
        await navigator.clipboard.writeText(this.outputText)
        this.$message.success('已复制结果')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    downloadResult() {
      const isJson = this.mode === 'csvToJson'
      const blob = new Blob([this.outputText], {
        type: isJson ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8'
      })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = isJson ? `converted_${Date.now()}.json` : `converted_${Date.now()}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    formatStats(value) {
      const lines = value ? value.split(/\r\n|\r|\n/).length : 0
      return `${lines} 行 / ${value.length} 字符`
    }
  }
}
</script>

<style lang="scss" scoped>
.csv-json-converter {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.csv-json-converter__header {
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

.csv-json-converter__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.hidden-input {
  display: none;
}

.converter-options {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.options-grid {
  display: grid;
  grid-template-columns: 260px 180px minmax(260px, 1fr);
  gap: 16px;
  align-items: start;
}

.converter-options ::v-deep .el-select {
  width: 100%;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.converter-alert {
  margin-bottom: 18px;
}

.converter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 680px;
}

.converter-pane {
  display: flex;
  min-width: 0;
  min-height: 680px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.converter-pane__header {
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

.converter-pane__textarea {
  flex: 1;
  min-height: 0;
}

.converter-pane__textarea ::v-deep .el-textarea__inner {
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

[data-theme='dark'] .converter-pane__textarea ::v-deep .el-textarea__inner {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .csv-json-converter__header {
    flex-direction: column;
  }

  .csv-json-converter__actions {
    justify-content: flex-start;
  }

  .options-grid,
  .converter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .csv-json-converter__header h1 {
    font-size: 28px;
  }

  .csv-json-converter__actions,
  .csv-json-converter__actions .el-button {
    width: 100%;
  }

  .converter-grid,
  .converter-pane {
    min-height: 520px;
  }

  .converter-pane__textarea ::v-deep .el-textarea__inner {
    min-height: 465px !important;
  }
}
</style>
