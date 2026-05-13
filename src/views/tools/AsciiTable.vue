<template>
  <section class="ascii-table-page">
    <div class="ascii-table-page__header">
      <div>
        <h1>ASCII 码表</h1>
        <p>查询 ASCII / 扩展 ASCII 的十进制、十六进制、八进制、二进制和字符表示。</p>
      </div>

      <div class="ascii-table-page__actions">
        <el-input
          v-model.trim="keyword"
          clearable
          prefix-icon="el-icon-search"
          placeholder="搜索十进制 / 十六进制 / 字符"
        />
        <el-button icon="el-icon-document-copy" @click="copyCsv">
          复制 CSV
        </el-button>
      </div>
    </div>

    <div class="converter-grid">
      <section class="converter-panel">
        <div class="panel-header">
          <h2>字符转 ASCII</h2>
        </div>
        <el-input
          v-model="charInput"
          class="converter-input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="输入字符或转义序列，例如：A、\n、\t、\\"
        />
        <div class="conversion-list">
          <div v-for="item in charConversions" :key="item.index" class="conversion-item">
            <span>{{ item.label }}</span>
            <strong>DEC {{ item.dec }}</strong>
            <code>HEX {{ item.hex }}</code>
            <code>BIN {{ item.bin }}</code>
          </div>
        </div>
      </section>

      <section class="converter-panel">
        <div class="panel-header">
          <h2>ASCII 转字符</h2>
        </div>
        <el-input
          v-model.trim="codeInput"
          class="code-input"
          placeholder="输入数字，如 65、0x41、0101、0b1000001"
        />
        <div class="code-result">
          <template v-if="codeConversion">
            <span>{{ codeConversion.description }}</span>
            <strong>{{ codeConversion.display }}</strong>
            <code>{{ codeConversion.hex }} · {{ codeConversion.bin }}</code>
          </template>
          <template v-else>
            <span>请输入 0-{{ showExtended ? 255 : 127 }} 范围内的 ASCII 编码</span>
          </template>
        </div>
      </section>
    </div>

    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <div>
          <el-switch v-model="showExtended" active-text="显示扩展 ASCII（128-255）" />
        </div>
        <el-tag size="small" effect="plain">
          当前 {{ filteredRows.length }} 项 / 总 {{ tableRows.length }} 项
        </el-tag>
      </div>

      <el-table :data="filteredRows" border stripe height="620" class="ascii-table">
        <el-table-column prop="dec" label="十进制" width="90" />
        <el-table-column prop="hex" label="十六进制" width="100" />
        <el-table-column prop="oct" label="八进制" width="90" />
        <el-table-column prop="bin" label="二进制" width="130" />
        <el-table-column label="字符" width="120">
          <template slot-scope="{ row }">
            <code>{{ row.display }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="escape" label="转义序列" width="120" />
        <el-table-column prop="description" label="说明" min-width="220" />
      </el-table>
    </el-card>
  </section>
</template>

<script>
const CONTROL_NAMES = [
  ['NUL', '空字符'],
  ['SOH', '标题开始'],
  ['STX', '正文开始'],
  ['ETX', '正文结束'],
  ['EOT', '传输结束'],
  ['ENQ', '询问'],
  ['ACK', '确认'],
  ['BEL', '响铃'],
  ['BS', '退格'],
  ['HT', '水平制表符'],
  ['LF', '换行'],
  ['VT', '垂直制表符'],
  ['FF', '换页'],
  ['CR', '回车'],
  ['SO', '移出'],
  ['SI', '移入'],
  ['DLE', '数据链路转义'],
  ['DC1', '设备控制 1'],
  ['DC2', '设备控制 2'],
  ['DC3', '设备控制 3'],
  ['DC4', '设备控制 4'],
  ['NAK', '否定确认'],
  ['SYN', '同步空闲'],
  ['ETB', '传输块结束'],
  ['CAN', '取消'],
  ['EM', '介质结束'],
  ['SUB', '替换'],
  ['ESC', '转义'],
  ['FS', '文件分隔符'],
  ['GS', '组分隔符'],
  ['RS', '记录分隔符'],
  ['US', '单元分隔符']
]

const ESCAPES = {
  0: '\\0',
  8: '\\b',
  9: '\\t',
  10: '\\n',
  11: '\\v',
  12: '\\f',
  13: '\\r',
  27: '\\e',
  34: '\\"',
  39: "\\'",
  92: '\\\\'
}

const ESCAPE_INPUTS = {
  '\\0': '\0',
  '\\b': '\b',
  '\\t': '\t',
  '\\n': '\n',
  '\\v': '\v',
  '\\f': '\f',
  '\\r': '\r',
  '\\e': String.fromCharCode(27),
  '\\\\': '\\'
}

export default {
  name: 'AsciiTable',
  data() {
    return {
      keyword: '',
      showExtended: false,
      charInput: 'A\\n\\t',
      codeInput: '0x41'
    }
  },
  computed: {
    tableRows() {
      const max = this.showExtended ? 255 : 127
      return Array.from({ length: max + 1 }, (item, code) => this.createRow(code))
    },
    filteredRows() {
      const keyword = this.keyword.toLowerCase()

      if (!keyword) {
        return this.tableRows
      }

      return this.tableRows.filter(row => [
        row.dec,
        row.hex,
        row.oct,
        row.bin,
        row.char,
        row.display,
        row.escape,
        row.description
      ].join(' ').toLowerCase().includes(keyword))
    },
    parsedChars() {
      return this.parseEscapes(this.charInput)
    },
    charConversions() {
      return Array.from(this.parsedChars).slice(0, 64).map((char, index) => {
        const code = char.charCodeAt(0)
        const row = this.createRow(code)

        return {
          index,
          label: row.display,
          dec: row.dec,
          hex: row.hex,
          bin: row.bin
        }
      })
    },
    codeConversion() {
      const code = this.parseCode(this.codeInput)
      const max = this.showExtended ? 255 : 127

      if (Number.isNaN(code) || code < 0 || code > max) {
        return null
      }

      return this.createRow(code)
    }
  },
  methods: {
    createRow(code) {
      const isControl = code < 32 || code === 127
      const control = code < 32 ? CONTROL_NAMES[code] : code === 127 ? ['DEL', '删除'] : null
      const char = String.fromCharCode(code)
      const hex = `0x${code.toString(16).toUpperCase().padStart(2, '0')}`
      const oct = `0o${code.toString(8).padStart(3, '0')}`
      const bin = `0b${code.toString(2).padStart(8, '0')}`
      const display = isControl ? control[0] : code === 32 ? 'SPACE' : char
      const escape = ESCAPES[code] || ''
      const description = isControl
        ? `${control[0]}，${control[1]}`
        : code === 32
          ? '空格'
          : code > 127
            ? '扩展 ASCII 字符'
            : '可打印字符'

      return {
        dec: code,
        hex,
        oct,
        bin,
        char,
        display,
        escape,
        description
      }
    },
    parseEscapes(value) {
      return value.replace(/\\(?:0|b|t|n|v|f|r|e|\\)/g, match => ESCAPE_INPUTS[match] || match)
    },
    parseCode(value) {
      const input = value.trim().toLowerCase()

      if (!input) {
        return NaN
      }
      if (input.startsWith('0x')) {
        return parseInt(input.slice(2), 16)
      }
      if (input.startsWith('0b')) {
        return parseInt(input.slice(2), 2)
      }
      if (input.startsWith('0o')) {
        return parseInt(input.slice(2), 8)
      }
      if (/^[0-7]{3,}$/.test(input) && input.startsWith('0')) {
        return parseInt(input, 8)
      }
      return parseInt(input, 10)
    },
    async copyCsv() {
      const headers = ['dec', 'hex', 'oct', 'bin', 'display', 'escape', 'description']
      const csv = [
        headers.join(','),
        ...this.tableRows.map(row => headers.map(key => this.escapeCsv(row[key])).join(','))
      ].join('\n')

      try {
        await navigator.clipboard.writeText(csv)
        this.$message.success('已复制 ASCII 表 CSV')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    escapeCsv(value) {
      const text = String(value === undefined || value === null ? '' : value)

      if (!/[",\r\n]/.test(text)) {
        return text
      }

      return `"${text.replace(/"/g, '""')}"`
    }
  }
}
</script>

<style lang="scss" scoped>
.ascii-table-page {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.ascii-table-page__header {
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

.ascii-table-page__actions {
  display: flex;
  min-width: 420px;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.converter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.converter-panel,
.table-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 16px;
  }
}

.converter-input ::v-deep .el-textarea__inner {
  min-height: 120px !important;
  padding: 14px 16px;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.code-input {
  display: block;
  padding: 16px;
}

.conversion-list {
  display: grid;
  gap: 10px;
  max-height: 220px;
  overflow: auto;
  padding: 0 16px 16px;
}

.conversion-item,
.code-result {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(120px, 1fr);
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);

  span {
    color: var(--color-text-muted);
  }

  code {
    font-family: Consolas, Monaco, 'Courier New', monospace;
  }
}

.code-result {
  grid-template-columns: minmax(120px, 1fr) minmax(100px, 0.7fr) minmax(180px, 1fr);
  margin: 0 16px 16px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.ascii-table ::v-deep .el-table__body-wrapper {
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.ascii-table code {
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .ascii-table-page__header {
    flex-direction: column;
  }

  .ascii-table-page__actions {
    min-width: 0;
    width: 100%;
    justify-content: flex-start;
  }

  .converter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ascii-table-page__header h1 {
    font-size: 28px;
  }

  .ascii-table-page__actions,
  .ascii-table-page__actions .el-input,
  .ascii-table-page__actions .el-button {
    width: 100%;
  }

  .ascii-table-page__actions,
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .conversion-item,
  .code-result {
    grid-template-columns: 1fr;
  }
}
</style>
