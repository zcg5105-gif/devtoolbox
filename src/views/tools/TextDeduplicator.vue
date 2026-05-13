<template>
  <section class="text-deduplicator">
    <div class="text-deduplicator__header">
      <div>
        <h1>文本列表处理</h1>
        <p>按行去重、排序、过滤和统计重复次数，适合处理 ID、URL、关键词等列表。</p>
      </div>

      <div class="text-deduplicator__actions">
        <el-button size="small" icon="el-icon-magic-stick" @click="loadExample">
          示例
        </el-button>
        <el-button
          size="small"
          icon="el-icon-document-copy"
          :disabled="!outputText"
          @click="copyOutput"
        >
          复制结果
        </el-button>
        <el-button
          size="small"
          icon="el-icon-download"
          :disabled="!outputText"
          @click="downloadOutput"
        >
          下载
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="options-card">
      <div class="options-row">
        <el-checkbox v-model="ignoreCase">
          忽略大小写去重
        </el-checkbox>
        <el-checkbox v-model="keepOriginalOrder">
          保留原始顺序
        </el-checkbox>
        <el-checkbox v-model="showCounts">
          输出重复次数
        </el-checkbox>
      </div>

      <div class="filter-row">
        <el-input
          v-model="regexFilter"
          clearable
          prefix-icon="el-icon-search"
          placeholder="正则过滤，例如：^\\d 只保留数字开头的行"
        />
        <el-button icon="el-icon-finished" @click="applyRegexFilter">
          应用过滤
        </el-button>
      </div>

      <el-alert
        v-if="errorMessage"
        class="text-deduplicator__alert"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />
    </el-card>

    <div class="operation-bar">
      <el-button icon="el-icon-copy-document" @click="deduplicate">
        去重
      </el-button>
      <el-button icon="el-icon-sort-up" @click="sortAsc">
        升序
      </el-button>
      <el-button icon="el-icon-sort-down" @click="sortDesc">
        降序
      </el-button>
      <el-button icon="el-icon-refresh" @click="shuffleLines">
        随机排序
      </el-button>
      <el-button icon="el-icon-sort" @click="reverseLines">
        反转
      </el-button>
      <el-button icon="el-icon-remove-outline" @click="removeBlankLines">
        去除空白行
      </el-button>
      <el-button icon="el-icon-scissors" @click="trimLines">
        去除首尾空格
      </el-button>
    </div>

    <div class="text-grid">
      <section class="text-pane">
        <div class="text-pane__header">
          <h2>输入区</h2>
          <span>{{ inputStats }}</span>
        </div>
        <el-input
          v-model="inputText"
          class="text-pane__textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="每行一条数据"
        />
      </section>

      <section class="text-pane">
        <div class="text-pane__header">
          <h2>输出区</h2>
          <span>{{ outputStats }}</span>
        </div>
        <el-input
          v-model="outputText"
          class="text-pane__textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="处理结果会显示在这里"
        />
      </section>
    </div>

    <el-card shadow="never" class="counts-card">
      <div slot="header" class="counts-card__header">
        <span>重复次数统计</span>
        <small>{{ duplicateSummary }}</small>
      </div>

      <div v-if="!countRows.length" class="counts-empty">
        输入内容后显示统计结果
      </div>
      <div v-else class="counts-table">
        <div class="counts-table__head">
          <span>值</span>
          <span>次数</span>
        </div>
        <div
          v-for="row in countRows"
          :key="row.key"
          class="counts-table__row"
        >
          <code>{{ row.value }}</code>
          <strong>{{ row.count }}</strong>
        </div>
      </div>
    </el-card>
  </section>
</template>

<script>
const EXAMPLE_TEXT = [
  '1001 Alice',
  '1002 Bob',
  '1001 Alice',
  '  apple  ',
  'Apple',
  '',
  'banana',
  '3003 Carol'
].join('\n')

export default {
  name: 'TextDeduplicator',
  data() {
    return {
      inputText: EXAMPLE_TEXT,
      outputText: '',
      ignoreCase: false,
      keepOriginalOrder: true,
      showCounts: false,
      regexFilter: '',
      errorMessage: ''
    }
  },
  computed: {
    inputLines() {
      return this.splitLines(this.inputText)
    },
    outputLines() {
      return this.splitLines(this.outputText)
    },
    countRows() {
      const map = new Map()

      this.inputLines.forEach(line => {
        const key = this.normalizeKey(line)
        const current = map.get(key)

        if (current) {
          current.count += 1
        } else {
          map.set(key, {
            key,
            value: line,
            count: 1
          })
        }
      })

      return Array.from(map.values()).sort((first, second) => second.count - first.count)
    },
    duplicateSummary() {
      const duplicates = this.countRows.filter(row => row.count > 1).length
      return `${this.countRows.length} 个唯一值，${duplicates} 个重复值`
    },
    inputStats() {
      return this.formatStats(this.inputLines)
    },
    outputStats() {
      return this.formatStats(this.outputLines)
    }
  },
  mounted() {
    this.deduplicate()
  },
  methods: {
    splitLines(value) {
      if (!value) {
        return []
      }

      return value.split(/\r\n|\r|\n/)
    },
    joinLines(lines) {
      this.outputText = lines.join('\n')
    },
    normalizeKey(line) {
      return this.ignoreCase ? line.toLowerCase() : line
    },
    deduplicate() {
      const seen = new Set()
      let lines = []

      this.inputLines.forEach(line => {
        const key = this.normalizeKey(line)

        if (!seen.has(key)) {
          seen.add(key)
          lines.push(line)
        }
      })

      if (!this.keepOriginalOrder) {
        lines = this.sortLines(lines, 'asc')
      }

      if (this.showCounts) {
        const countMap = new Map(this.countRows.map(row => [row.key, row.count]))
        lines = lines.map(line => `${line}\t${countMap.get(this.normalizeKey(line)) || 1}`)
      }

      this.joinLines(lines)
    },
    sortAsc() {
      this.joinLines(this.sortLines(this.outputOrInputLines(), 'asc'))
    },
    sortDesc() {
      this.joinLines(this.sortLines(this.outputOrInputLines(), 'desc'))
    },
    shuffleLines() {
      const lines = this.outputOrInputLines().slice()

      for (let index = lines.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1))
        ;[lines[index], lines[target]] = [lines[target], lines[index]]
      }

      this.joinLines(lines)
    },
    reverseLines() {
      this.joinLines(this.outputOrInputLines().slice().reverse())
    },
    removeBlankLines() {
      this.joinLines(this.outputOrInputLines().filter(line => line.trim()))
    },
    trimLines() {
      this.joinLines(this.outputOrInputLines().map(line => line.trim()))
    },
    applyRegexFilter() {
      if (!this.regexFilter) {
        this.errorMessage = ''
        this.joinLines(this.outputOrInputLines())
        return
      }

      try {
        const pattern = new RegExp(this.regexFilter)
        this.joinLines(this.outputOrInputLines().filter(line => pattern.test(line)))
        this.errorMessage = ''
      } catch (error) {
        this.errorMessage = `正则无效：${error.message}`
      }
    },
    sortLines(lines, direction) {
      return lines.slice().sort((first, second) => {
        const result = first.localeCompare(second, 'zh-Hans-CN', {
          numeric: true,
          sensitivity: this.ignoreCase ? 'base' : 'variant'
        })

        return direction === 'asc' ? result : -result
      })
    },
    outputOrInputLines() {
      return this.outputText ? this.outputLines : this.inputLines
    },
    formatStats(lines) {
      return `${lines.length} 行 / ${lines.filter(line => line.trim()).length} 非空行`
    },
    async copyOutput() {
      if (!this.outputText) {
        return
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.outputText)
        } else {
          this.copyWithFallback(this.outputText)
        }
        this.$message.success('结果已复制')
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
    downloadOutput() {
      if (!this.outputText) {
        return
      }

      const blob = new Blob([this.outputText], {
        type: 'text/plain;charset=utf-8'
      })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `text_result_${Date.now()}.txt`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    loadExample() {
      this.inputText = EXAMPLE_TEXT
      this.outputText = ''
      this.errorMessage = ''
      this.deduplicate()
    }
  }
}
</script>

<style lang="scss" scoped>
.text-deduplicator {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.text-deduplicator__header {
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

.text-deduplicator__actions,
.options-row,
.filter-row,
.operation-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.text-deduplicator__actions {
  justify-content: flex-end;
}

.options-card,
.counts-card {
  border-color: var(--color-border);
  border-radius: 8px;
}

.options-card,
.operation-bar,
.text-grid,
.text-deduplicator__alert {
  margin-bottom: 18px;
}

.filter-row {
  margin-top: 14px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.text-deduplicator__alert {
  margin-top: 14px;
}

.operation-bar {
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.text-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 480px;
}

.text-pane {
  display: flex;
  min-width: 0;
  min-height: 480px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.text-pane__header,
.counts-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;

  h2 {
    margin: 0;
    font-size: 16px;
  }

  span,
  small {
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
  }
}

.text-pane__header {
  min-height: 50px;
  padding: 0 14px;
  border-bottom: 1px solid var(--color-border);
}

.text-pane__textarea {
  flex: 1;
  min-height: 0;
}

.text-pane__textarea ::v-deep .el-textarea__inner {
  height: 100%;
  min-height: 430px !important;
  padding: 14px;
  resize: none;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
}

.counts-empty {
  padding: 28px;
  color: var(--color-text-muted);
  text-align: center;
}

.counts-table {
  display: grid;
  gap: 8px;
}

.counts-table__head,
.counts-table__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px;
  gap: 12px;
  align-items: center;
}

.counts-table__head {
  color: var(--color-text-muted);
  font-size: 13px;
}

.counts-table__row {
  padding: 9px 10px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  code {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
  }

  strong {
    color: var(--color-primary);
    text-align: right;
  }
}

[data-theme='dark'] .text-pane__textarea ::v-deep .el-textarea__inner {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 900px) {
  .text-deduplicator__header {
    flex-direction: column;
  }

  .text-deduplicator__actions {
    justify-content: flex-start;
  }

  .filter-row,
  .text-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .text-deduplicator__header h1 {
    font-size: 28px;
  }

  .text-deduplicator__actions,
  .text-deduplicator__actions .el-button,
  .filter-row .el-button {
    width: 100%;
  }

  .text-pane__header,
  .counts-card__header {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px 14px;
  }
}
</style>
