<template>
  <section class="path-tester">
    <div class="tool-header">
      <div>
        <h1>JSONPath / XPath 测试器</h1>
        <p>对 JSON 和 XML 运行路径表达式，快速查看匹配结果。</p>
      </div>
      <div class="tool-actions">
        <el-button type="primary" size="small" icon="el-icon-search" @click="runQuery">执行</el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!resultText" @click="copyResult">复制结果</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-panel">
      <div class="option-line">
        <el-radio-group v-model="mode" size="small" @change="resetSample">
          <el-radio-button label="jsonpath">JSONPath</el-radio-button>
          <el-radio-button label="xpath">XPath</el-radio-button>
        </el-radio-group>
        <el-input v-model="expression" class="expression-input" placeholder="输入表达式" @keyup.enter.native="runQuery" />
      </div>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="tool-alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div class="query-grid">
      <section class="query-pane">
        <div class="pane-header">
          <h2>数据源</h2>
          <span>{{ sourceText.length }} 字符</span>
        </div>
        <el-input
          v-model="sourceText"
          class="code-textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
        />
      </section>

      <section class="query-pane">
        <div class="pane-header">
          <h2>匹配结果</h2>
          <span>{{ resultCount }} 项</span>
        </div>
        <pre class="result-block">{{ resultText || '执行表达式后显示结果' }}</pre>
      </section>
    </div>
  </section>
</template>

<script>
import { JSONPath } from 'jsonpath-plus'

const JSON_SAMPLE = JSON.stringify({
  users: [
    { id: 1, name: 'Alice', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}, null, 2)

const XML_SAMPLE = [
  '<users>',
  '  <user id="1"><name>Alice</name><role>admin</role></user>',
  '  <user id="2"><name>Bob</name><role>user</role></user>',
  '</users>'
].join('\n')

export default {
  name: 'PathTester',
  data() {
    return {
      mode: 'jsonpath',
      expression: '$.users[*].name',
      sourceText: JSON_SAMPLE,
      resultText: '',
      resultCount: 0,
      errorMessage: ''
    }
  },
  mounted() {
    this.runQuery()
  },
  methods: {
    resetSample() {
      if (this.mode === 'xpath') {
        this.sourceText = XML_SAMPLE
        this.expression = '//user/name/text()'
      } else {
        this.sourceText = JSON_SAMPLE
        this.expression = '$.users[*].name'
      }
      this.runQuery()
    },
    runQuery() {
      try {
        const values = this.mode === 'jsonpath' ? this.runJsonPath() : this.runXPath()
        this.resultCount = values.length
        this.resultText = JSON.stringify(values, null, 2)
        this.errorMessage = ''
      } catch (error) {
        this.resultCount = 0
        this.resultText = ''
        this.errorMessage = `查询失败：${error.message}`
      }
    },
    runJsonPath() {
      const json = JSON.parse(this.sourceText)
      return JSONPath({ path: this.expression, json })
    },
    runXPath() {
      const parser = new DOMParser()
      const doc = parser.parseFromString(this.sourceText, 'application/xml')
      const parserError = doc.querySelector('parsererror')

      if (parserError) {
        throw new Error(parserError.textContent || 'XML 解析失败')
      }

      const result = doc.evaluate(this.expression, doc, null, XPathResult.ANY_TYPE, null)
      const values = []

      if (result.resultType === XPathResult.STRING_TYPE) return [result.stringValue]
      if (result.resultType === XPathResult.NUMBER_TYPE) return [result.numberValue]
      if (result.resultType === XPathResult.BOOLEAN_TYPE) return [result.booleanValue]

      let node = result.iterateNext()
      while (node) {
        values.push(node.nodeType === Node.ATTRIBUTE_NODE || node.nodeType === Node.TEXT_NODE
          ? node.nodeValue
          : new XMLSerializer().serializeToString(node))
        node = result.iterateNext()
      }

      return values
    },
    async copyResult() {
      if (!this.resultText) return

      try {
        await navigator.clipboard.writeText(this.resultText)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.path-tester {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.tool-header,
.tool-actions,
.option-line,
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
    line-height: 1.25;
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

.tool-panel,
.tool-alert {
  margin-bottom: 18px;
}

.expression-input {
  flex: 1 1 360px;
}

.query-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.query-pane {
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

.code-textarea ::v-deep .el-textarea__inner,
.result-block {
  min-height: 540px !important;
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
  .tool-header,
  .option-line {
    align-items: flex-start;
    flex-direction: column;
  }

  .query-grid {
    grid-template-columns: 1fr;
  }
}
</style>
