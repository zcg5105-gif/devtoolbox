<template>
  <section class="sql-tool-page">
    <div class="sql-tool-page__header">
      <div>
        <h1>SQL 格式化</h1>
        <p>格式化、压缩并高亮展示常见 SQL 方言语句。</p>
      </div>

      <div class="sql-tool-page__actions">
        <el-select
          v-model="dialect"
          class="sql-tool-page__dialect"
          size="small"
          placeholder="选择方言"
          @change="handleDialectChange"
        >
          <el-option
            v-for="option in dialectOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-checkbox v-model="autoFormat" @change="handleAutoFormatChange">
          自动格式化
        </el-checkbox>

        <el-button
          type="primary"
          size="small"
          icon="el-icon-magic-stick"
          @click="formatSql"
        >
          格式化
        </el-button>
        <el-button size="small" icon="el-icon-minus" @click="compressSql">
          压缩
        </el-button>
        <el-button size="small" icon="el-icon-copy-document" @click="copyResult">
          复制
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearSql">
          清空
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      class="sql-tool-page__alert"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    />

    <div class="sql-tool-page__examples">
      <span>示例：</span>
      <el-button
        v-for="example in examples"
        :key="example.name"
        size="mini"
        plain
        @click="applyExample(example)"
      >
        {{ example.name }}
      </el-button>
    </div>

    <div class="sql-editor">
      <section class="sql-editor__pane">
        <div class="sql-editor__pane-header">
          <h2>SQL 输入</h2>
          <span>{{ inputSql.length }} 字符</span>
        </div>

        <el-input
          v-model="inputSql"
          class="sql-editor__textarea"
          type="textarea"
          placeholder="请输入 SQL 语句"
          :autosize="false"
          spellcheck="false"
          @input="handleInput"
        />
      </section>

      <section class="sql-editor__pane">
        <div class="sql-editor__pane-header">
          <h2>格式化结果</h2>
          <span>{{ dialectLabel }}</span>
        </div>

        <pre class="sql-editor__output"><code v-html="highlightedOutput"></code></pre>
      </section>
    </div>
  </section>
</template>

<script>
import { format as formatSqlWithLibrary } from 'sql-formatter'
import hljs from 'highlight.js/lib/core'
import sqlLanguage from 'highlight.js/lib/languages/sql'

hljs.registerLanguage('sql', sqlLanguage)

const DIALECT_OPTIONS = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQL Server', value: 'transactsql' },
  { label: 'Oracle', value: 'plsql' },
  { label: 'SQLite', value: 'sqlite' }
]

const EXAMPLES = [
  {
    name: '简单 SELECT',
    sql: 'select id,name,email from users where status = 1 and created_at >= \'2026-01-01\' order by created_at desc limit 20;'
  },
  {
    name: 'JOIN 查询',
    sql: 'select u.id,u.name,o.order_no,o.total_amount from users u inner join orders o on u.id = o.user_id where o.status = \'paid\' and o.total_amount > 100 order by o.created_at desc;'
  },
  {
    name: 'INSERT 语句',
    sql: 'insert into users (name,email,status,created_at) values (\'Alice\',\'alice@example.com\',1,current_timestamp);'
  },
  {
    name: 'CREATE TABLE',
    sql: 'create table users (id integer primary key,name varchar(100) not null,email varchar(160) unique,status integer default 1,created_at timestamp default current_timestamp);'
  }
]

export default {
  name: 'SqlPlaceholder',
  data() {
    return {
      autoFormat: false,
      dialect: 'mysql',
      errorMessage: '',
      inputSql: EXAMPLES[0].sql,
      outputSql: ''
    }
  },
  computed: {
    dialectOptions() {
      return DIALECT_OPTIONS
    },
    dialectLabel() {
      const option = this.dialectOptions.find(item => item.value === this.dialect)
      return option ? option.label : 'SQL'
    },
    examples() {
      return EXAMPLES
    },
    highlightedOutput() {
      if (!this.outputSql) {
        return '<span class="sql-token sql-token--muted">格式化结果会显示在这里</span>'
      }

      return this.highlightSql(this.outputSql)
    }
  },
  mounted() {
    this.formatSql(false)
  },
  methods: {
    applyExample(example) {
      this.inputSql = example.sql
      this.formatSql(false)
      this.$message.success(`已载入示例：${example.name}`)
    },
    handleInput() {
      this.errorMessage = ''

      if (this.autoFormat) {
        window.clearTimeout(this.autoFormatTimer)
        this.autoFormatTimer = window.setTimeout(() => {
          this.formatSql(false)
        }, 300)
        return
      }

      this.outputSql = this.inputSql
    },
    handleAutoFormatChange(enabled) {
      if (enabled) {
        this.formatSql(false)
      }
    },
    handleDialectChange() {
      if (this.inputSql.trim()) {
        this.formatSql(false)
      }
    },
    formatSql(showMessage = true) {
      const content = this.inputSql.trim()

      if (!content) {
        this.outputSql = ''
        this.errorMessage = ''
        return
      }

      try {
        this.outputSql = this.formatSqlWithLibrary(content)
        this.errorMessage = ''

        if (showMessage) {
          this.$message.success('SQL 已格式化')
        }
      } catch (error) {
        this.errorMessage = `SQL 格式化失败：${error.message || '请检查语句是否完整'}`

        if (showMessage) {
          this.$message.error('SQL 格式化失败')
        }
      }
    },
    compressSql() {
      const content = this.inputSql.trim()

      if (!content) {
        this.outputSql = ''
        this.errorMessage = ''
        this.$message.warning('请输入 SQL 后再压缩')
        return
      }

      try {
        this.outputSql = this.compressSqlWithLibrary(content)
        this.errorMessage = ''
        this.$message.success('SQL 已压缩')
      } catch (error) {
        this.errorMessage = `SQL 压缩失败：${error.message || '请检查语句是否完整'}`
        this.$message.error('SQL 压缩失败')
      }
    },
    clearSql() {
      this.inputSql = ''
      this.outputSql = ''
      this.errorMessage = ''
      this.$message.success('已清空')
    },
    copyResult() {
      const content = this.outputSql || this.inputSql

      if (!content) {
        this.$message.warning('没有可复制的内容')
        return
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(content)
          .then(() => {
            this.$message.success('已复制')
          })
          .catch(() => {
            this.fallbackCopy(content)
          })
        return
      }

      this.fallbackCopy(content)
    },
    fallbackCopy(content) {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()

      try {
        document.execCommand('copy')
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      } finally {
        document.body.removeChild(textarea)
      }
    },
    formatSqlWithLibrary(sql) {
      return formatSqlWithLibrary(sql, {
        language: this.dialect,
        keywordCase: 'upper',
        tabWidth: 2,
        useTabs: false,
        linesBetweenQueries: 1
      })
    },
    compressSqlWithLibrary(sql) {
      const formattedSql = this.formatSqlWithLibrary(sql)

      return formattedSql
        .replace(/--[^\n]*(?:\n|$)/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+([,);])/g, '$1')
        .replace(/([(])\s+/g, '$1')
        .trim()
    },
    highlightSql(sql) {
      return hljs.highlight(sql, {
        language: 'sql',
        ignoreIllegals: true
      }).value
    }
  },
  beforeDestroy() {
    window.clearTimeout(this.autoFormatTimer)
  }
}
</script>

<style lang="scss" scoped>
.sql-tool-page {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.sql-tool-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.sql-tool-page__header h1 {
  margin: 0 0 10px;
  color: var(--color-text);
  font-size: 32px;
  line-height: 1.25;
}

.sql-tool-page__header p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.sql-tool-page__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.sql-tool-page__actions .el-button + .el-button {
  margin-left: 0;
}

.sql-tool-page__dialect {
  width: 150px;
}

.sql-tool-page__alert {
  margin-bottom: 18px;
}

.sql-tool-page__examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.sql-tool-page__examples .el-button + .el-button {
  margin-left: 0;
}

.sql-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  min-height: 620px;
}

.sql-editor__pane {
  display: flex;
  min-width: 0;
  min-height: 620px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.sql-editor__pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);
}

.sql-editor__pane-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.4;
}

.sql-editor__pane-header span {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 13px;
}

.sql-editor__textarea {
  flex: 1;
  min-height: 0;
}

.sql-editor__textarea ::v-deep .el-textarea__inner {
  height: 100%;
  min-height: 565px !important;
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

.sql-editor__output {
  flex: 1;
  min-height: 565px;
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

.sql-editor__output code {
  display: block;
  min-width: max-content;
}

::v-deep .hljs-keyword,
::v-deep .hljs-built_in,
::v-deep .sql-token--keyword {
  color: #2563eb;
  font-weight: 700;
}

::v-deep .hljs-string,
::v-deep .sql-token--string {
  color: #15803d;
}

::v-deep .hljs-number,
::v-deep .sql-token--number {
  color: #c2410c;
}

::v-deep .hljs-comment,
::v-deep .sql-token--comment {
  color: #6b7280;
  font-style: italic;
}

::v-deep .sql-token--muted {
  color: var(--color-text-muted);
}

[data-theme='dark'] .sql-editor__textarea ::v-deep .el-textarea__inner,
[data-theme='dark'] .sql-editor__output {
  background: var(--color-surface);
  color: var(--color-text);
}

[data-theme='dark'] ::v-deep .hljs-keyword,
[data-theme='dark'] ::v-deep .hljs-built_in,
[data-theme='dark'] ::v-deep .sql-token--keyword {
  color: #60a5fa;
}

[data-theme='dark'] ::v-deep .hljs-string,
[data-theme='dark'] ::v-deep .sql-token--string {
  color: #4ade80;
}

[data-theme='dark'] ::v-deep .hljs-number,
[data-theme='dark'] ::v-deep .sql-token--number {
  color: #fb923c;
}

[data-theme='dark'] ::v-deep .hljs-comment,
[data-theme='dark'] ::v-deep .sql-token--comment {
  color: #9ca3af;
}

@media (max-width: 1024px) {
  .sql-tool-page__header {
    flex-direction: column;
  }

  .sql-tool-page__actions {
    justify-content: flex-start;
  }

  .sql-editor {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .sql-tool-page__header h1 {
    font-size: 28px;
  }

  .sql-tool-page__actions {
    width: 100%;
  }

  .sql-tool-page__actions .el-button,
  .sql-tool-page__dialect {
    flex: 1 1 calc(50% - 10px);
  }

  .sql-tool-page__actions .el-checkbox {
    flex: 1 1 100%;
  }

  .sql-editor,
  .sql-editor__pane {
    min-height: 520px;
  }

  .sql-editor__textarea ::v-deep .el-textarea__inner,
  .sql-editor__output {
    min-height: 465px !important;
  }
}
</style>
