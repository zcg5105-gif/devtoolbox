<template>
  <section class="text-diff-tool">
    <div class="text-diff-tool__header">
      <div>
        <h1>文本差异对比</h1>
        <p>对比两段文本、代码或配置文件，支持并排视图与统一视图。</p>
      </div>

      <div class="text-diff-toolbar">
        <el-select
          v-model="language"
          size="small"
          class="text-diff-toolbar__language"
          placeholder="语言"
        >
          <el-option
            v-for="option in languageOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>

        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="split">并排视图</el-radio-button>
          <el-radio-button label="unified">统一视图</el-radio-button>
        </el-radio-group>

        <el-button size="small" icon="el-icon-sort" @click="swapTexts">
          交换左右
        </el-button>
        <el-button
          size="small"
          icon="el-icon-document-copy"
          :disabled="!diffText"
          @click="copyDiff"
        >
          复制差异
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearTexts">
          清空
        </el-button>
      </div>
    </div>

    <div class="text-diff-editors">
      <section class="text-diff-editor">
        <div class="text-diff-editor__header">
          <h2>原始文本</h2>
          <span>{{ leftStats }}</span>
        </div>
        <el-input
          v-model="leftText"
          class="text-diff-editor__input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="请输入原始文本"
        />
      </section>

      <section class="text-diff-editor">
        <div class="text-diff-editor__header">
          <h2>对比文本</h2>
          <span>{{ rightStats }}</span>
        </div>
        <el-input
          v-model="rightText"
          class="text-diff-editor__input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="请输入对比文本"
        />
      </section>
    </div>

    <el-card shadow="never" class="text-diff-result">
      <div slot="header" class="text-diff-result__header">
        <span>差异结果</span>
        <div class="text-diff-legend">
          <span><i class="is-added"></i>新增 {{ summary.added }}</span>
          <span><i class="is-removed"></i>删除 {{ summary.removed }}</span>
          <span><i class="is-modified"></i>修改 {{ summary.modified }}</span>
        </div>
      </div>

      <div v-if="!hasContent" class="text-diff-empty">
        输入左右两段文本后显示差异结果
      </div>

      <div v-else-if="!hasChanges" class="text-diff-empty">
        两段文本完全一致
      </div>

      <div v-else-if="viewMode === 'split'" class="text-diff-split">
        <div class="text-diff-split__pane">
          <div class="text-diff-split__title">原始文本</div>
          <div class="text-diff-code">
            <div
              v-for="line in splitRows.left"
              :key="line.id"
              class="text-diff-code__line"
              :class="lineClass(line)"
            >
              <span class="text-diff-code__number">{{ line.number || '' }}</span>
              <code v-html="highlightLine(line.text)"></code>
            </div>
          </div>
        </div>

        <div class="text-diff-split__pane">
          <div class="text-diff-split__title">对比文本</div>
          <div class="text-diff-code">
            <div
              v-for="line in splitRows.right"
              :key="line.id"
              class="text-diff-code__line"
              :class="lineClass(line)"
            >
              <span class="text-diff-code__number">{{ line.number || '' }}</span>
              <code v-html="highlightLine(line.text)"></code>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-diff-code text-diff-code--unified">
        <div
          v-for="line in unifiedRows"
          :key="line.id"
          class="text-diff-code__line"
          :class="lineClass(line)"
        >
          <span class="text-diff-code__marker">{{ line.marker }}</span>
          <span class="text-diff-code__number">{{ line.number || '' }}</span>
          <code v-html="highlightLine(line.text)"></code>
        </div>
      </div>
    </el-card>
  </section>
</template>

<script>
import { createPatch, diffLines } from 'diff'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('bash', bash)

const LANGUAGE_OPTIONS = [
  { label: '纯文本', value: 'plaintext' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSON', value: 'json' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML / XML', value: 'xml' },
  { label: 'CSS', value: 'css' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Shell', value: 'bash' }
]

export default {
  name: 'TextDiff',
  data() {
    return {
      leftText: [
        'function hello(name) {',
        '  return "Hello " + name;',
        '}',
        '',
        'console.log(hello("World"));'
      ].join('\n'),
      rightText: [
        'function hello(name) {',
        '  const message = `Hello ${name}`;',
        '  return message;',
        '}',
        '',
        'console.log(hello("DevToolbox"));'
      ].join('\n'),
      language: 'javascript',
      viewMode: 'split'
    }
  },
  computed: {
    languageOptions() {
      return LANGUAGE_OPTIONS
    },
    hasContent() {
      return Boolean(this.leftText || this.rightText)
    },
    diffParts() {
      return diffLines(this.leftText, this.rightText, {
        newlineIsToken: false
      })
    },
    hasChanges() {
      return this.diffParts.some(part => part.added || part.removed)
    },
    summary() {
      let added = 0
      let removed = 0

      this.diffParts.forEach(part => {
        const lineCount = this.getLines(part.value).length

        if (part.added) {
          added += lineCount
        } else if (part.removed) {
          removed += lineCount
        }
      })

      return {
        added,
        removed,
        modified: Math.min(added, removed)
      }
    },
    splitRows() {
      const left = []
      const right = []
      let leftNumber = 1
      let rightNumber = 1
      let index = 0

      this.diffParts.forEach((part, partIndex) => {
        const lines = this.getLines(part.value)

        lines.forEach(line => {
          if (part.added) {
            right.push(this.createLine(`right-${partIndex}-${index}`, line, rightNumber, 'added'))
            left.push(this.createLine(`left-blank-${partIndex}-${index}`, '', '', 'blank'))
            rightNumber += 1
          } else if (part.removed) {
            left.push(this.createLine(`left-${partIndex}-${index}`, line, leftNumber, 'removed'))
            right.push(this.createLine(`right-blank-${partIndex}-${index}`, '', '', 'blank'))
            leftNumber += 1
          } else {
            left.push(this.createLine(`left-${partIndex}-${index}`, line, leftNumber, 'same'))
            right.push(this.createLine(`right-${partIndex}-${index}`, line, rightNumber, 'same'))
            leftNumber += 1
            rightNumber += 1
          }
          index += 1
        })
      })

      return this.markModifiedPairs(left, right)
    },
    unifiedRows() {
      const rows = []
      let oldNumber = 1
      let newNumber = 1
      let index = 0

      this.diffParts.forEach((part, partIndex) => {
        const lines = this.getLines(part.value)

        lines.forEach(line => {
          if (part.added) {
            rows.push(this.createLine(`unified-${partIndex}-${index}`, line, newNumber, 'added', '+'))
            newNumber += 1
          } else if (part.removed) {
            rows.push(this.createLine(`unified-${partIndex}-${index}`, line, oldNumber, 'removed', '-'))
            oldNumber += 1
          } else {
            rows.push(this.createLine(`unified-${partIndex}-${index}`, line, oldNumber, 'same', ' '))
            oldNumber += 1
            newNumber += 1
          }
          index += 1
        })
      })

      return this.markUnifiedModified(rows)
    },
    diffText() {
      if (!this.hasContent) {
        return ''
      }

      return createPatch('text-diff', this.leftText, this.rightText, 'original', 'changed')
    },
    leftStats() {
      return this.formatStats(this.leftText)
    },
    rightStats() {
      return this.formatStats(this.rightText)
    }
  },
  methods: {
    getLines(value) {
      if (!value) {
        return []
      }

      return value.replace(/\n$/, '').split('\n')
    },
    createLine(id, text, number, type, marker = '') {
      return {
        id,
        text,
        number,
        type,
        marker
      }
    },
    markModifiedPairs(left, right) {
      for (let index = 0; index < left.length; index += 1) {
        if (left[index].type === 'removed' && right[index] && right[index].type === 'added') {
          left[index].type = 'modified'
          right[index].type = 'modified'
        }
      }

      return { left, right }
    },
    markUnifiedModified(rows) {
      for (let index = 0; index < rows.length - 1; index += 1) {
        if (rows[index].type === 'removed' && rows[index + 1].type === 'added') {
          rows[index].type = 'modified'
          rows[index + 1].type = 'modified'
        }
      }

      return rows
    },
    lineClass(line) {
      return {
        'is-added': line.type === 'added',
        'is-removed': line.type === 'removed',
        'is-modified': line.type === 'modified',
        'is-blank': line.type === 'blank'
      }
    },
    highlightLine(line) {
      const safeLine = line || ' '

      if (this.language === 'plaintext') {
        return this.escapeHtml(safeLine)
      }

      try {
        return hljs.highlight(safeLine, {
          language: this.language,
          ignoreIllegals: true
        }).value
      } catch (error) {
        return this.escapeHtml(safeLine)
      }
    },
    formatStats(value) {
      const lines = value ? this.getLines(value).length : 0
      return `${lines} 行 / ${value.length} 字符`
    },
    swapTexts() {
      const nextLeft = this.rightText
      this.rightText = this.leftText
      this.leftText = nextLeft
      this.$message.success('已交换左右内容')
    },
    clearTexts() {
      this.leftText = ''
      this.rightText = ''
      this.$message.success('已清空')
    },
    async copyDiff() {
      if (!this.diffText) {
        this.$message.warning('没有可复制的差异结果')
        return
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.diffText)
        } else {
          this.copyWithFallback(this.diffText)
        }
        this.$message.success('差异结果已复制')
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
    escapeHtml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }
  }
}
</script>

<style lang="scss" scoped>
.text-diff-tool {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.text-diff-tool__header {
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

.text-diff-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.text-diff-toolbar__language {
  width: 136px;
}

.text-diff-editors {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.text-diff-editor {
  display: flex;
  min-width: 0;
  min-height: 320px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.text-diff-editor__header,
.text-diff-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.text-diff-editor__header {
  min-height: 48px;
  padding: 0 14px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    font-size: 16px;
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
  }
}

.text-diff-editor__input {
  flex: 1;
  min-height: 0;
}

.text-diff-editor__input ::v-deep .el-textarea__inner {
  height: 100%;
  min-height: 270px !important;
  padding: 14px;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
}

.text-diff-result {
  border-color: var(--color-border);
  border-radius: 8px;
}

.text-diff-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
}

.text-diff-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  padding: 24px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  text-align: center;
}

.text-diff-split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.text-diff-split__pane {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.text-diff-split__title {
  min-height: 40px;
  padding: 10px 12px;
  background: var(--color-surface-soft);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 700;
}

.text-diff-code {
  overflow: auto;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.text-diff-code--unified {
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.text-diff-code__line {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  min-width: max-content;
}

.text-diff-code--unified .text-diff-code__line {
  grid-template-columns: 28px 54px minmax(0, 1fr);
}

.text-diff-code__number,
.text-diff-code__marker {
  padding: 2px 8px;
  user-select: none;
  background: rgba(148, 163, 184, 0.12);
  border-right: 1px solid var(--color-border);
  color: var(--color-text-muted);
  text-align: right;
}

.text-diff-code__marker {
  text-align: center;
}

.text-diff-code code {
  display: block;
  min-width: 0;
  padding: 2px 10px;
  white-space: pre;
}

.text-diff-code__line.is-added,
.text-diff-legend .is-added {
  background: rgba(22, 163, 74, 0.16);
}

.text-diff-code__line.is-removed,
.text-diff-legend .is-removed {
  background: rgba(220, 38, 38, 0.16);
}

.text-diff-code__line.is-modified,
.text-diff-legend .is-modified {
  background: rgba(234, 179, 8, 0.22);
}

.text-diff-code__line.is-blank {
  background: repeating-linear-gradient(
    -45deg,
    rgba(148, 163, 184, 0.08),
    rgba(148, 163, 184, 0.08) 6px,
    transparent 6px,
    transparent 12px
  );
}

::v-deep .hljs-keyword,
::v-deep .hljs-built_in,
::v-deep .hljs-title {
  color: #2563eb;
  font-weight: 700;
}

::v-deep .hljs-string,
::v-deep .hljs-attr {
  color: #15803d;
}

::v-deep .hljs-number,
::v-deep .hljs-literal {
  color: #c2410c;
}

::v-deep .hljs-comment {
  color: #6b7280;
  font-style: italic;
}

[data-theme='dark'] .text-diff-editor__input ::v-deep .el-textarea__inner,
[data-theme='dark'] .text-diff-code {
  background: var(--color-surface);
  color: var(--color-text);
}

[data-theme='dark'] ::v-deep .hljs-keyword,
[data-theme='dark'] ::v-deep .hljs-built_in,
[data-theme='dark'] ::v-deep .hljs-title {
  color: #60a5fa;
}

[data-theme='dark'] ::v-deep .hljs-string,
[data-theme='dark'] ::v-deep .hljs-attr {
  color: #4ade80;
}

[data-theme='dark'] ::v-deep .hljs-number,
[data-theme='dark'] ::v-deep .hljs-literal {
  color: #fb923c;
}

[data-theme='dark'] ::v-deep .hljs-comment {
  color: #9ca3af;
}

@media (max-width: 1024px) {
  .text-diff-tool__header {
    flex-direction: column;
  }

  .text-diff-toolbar {
    justify-content: flex-start;
  }

  .text-diff-editors,
  .text-diff-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .text-diff-tool__header h1 {
    font-size: 28px;
  }

  .text-diff-toolbar,
  .text-diff-toolbar__language {
    width: 100%;
  }

  .text-diff-toolbar .el-button,
  .text-diff-toolbar .el-radio-group {
    width: 100%;
  }

  .text-diff-result__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
