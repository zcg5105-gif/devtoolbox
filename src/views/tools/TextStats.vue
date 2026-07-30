<template>
  <section class="text-stats-tool">
    <div class="tool-header">
      <div>
        <h1>文本统计分析</h1>
        <p>统计字符、字节、行数、词频和中英文数字构成。</p>
      </div>
      <div class="tool-actions">
        <el-button size="small" icon="el-icon-document-copy" @click="copySummary">复制摘要</el-button>
        <el-button size="small" icon="el-icon-delete" @click="text = ''">清空</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-panel">
      <div class="option-line">
        <el-checkbox v-model="caseInsensitive">词频忽略大小写</el-checkbox>
        <el-checkbox v-model="ignorePunctuation">词频忽略标点</el-checkbox>
      </div>
    </el-card>

    <div class="stats-grid">
      <div v-for="item in statCards" :key="item.label" class="stat-card">
        <strong>{{ item.value }}</strong>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="content-grid">
      <section class="text-pane">
        <div class="pane-header">
          <h2>输入文本</h2>
          <span>{{ stats.bytes }} bytes</span>
        </div>
        <el-input
          v-model="text"
          class="text-input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
        />
      </section>

      <section class="text-pane">
        <div class="pane-header">
          <h2>Top 词频</h2>
          <span>{{ stats.topWords.length }} 项</span>
        </div>
        <el-table :data="stats.topWords" height="420">
          <el-table-column prop="word" label="词" />
          <el-table-column prop="count" label="次数" width="100" />
        </el-table>
      </section>
    </div>
  </section>
</template>

<script>
const { analyzeText } = require('@/utils/toolExpansionCore')

export default {
  name: 'TextStats',
  data() {
    return {
      text: 'Hello hello DevToolbox\n你好 123',
      caseInsensitive: true,
      ignorePunctuation: true
    }
  },
  computed: {
    stats() {
      return analyzeText(this.text, {
        caseInsensitive: this.caseInsensitive,
        ignorePunctuation: this.ignorePunctuation
      })
    },
    statCards() {
      return [
        { label: '字符数', value: this.stats.characters },
        { label: '非空白字符', value: this.stats.charactersNoWhitespace },
        { label: 'UTF-8 字节', value: this.stats.bytes },
        { label: '行数', value: this.stats.lines },
        { label: '非空行', value: this.stats.nonEmptyLines },
        { label: '英文词数', value: this.stats.words },
        { label: '中文字符', value: this.stats.chineseCharacters },
        { label: '英文字母', value: this.stats.englishLetters },
        { label: '数字', value: this.stats.digits },
        { label: '空白字符', value: this.stats.whitespace }
      ]
    }
  },
  methods: {
    async copySummary() {
      const summary = this.statCards.map(item => `${item.label}: ${item.value}`).join('\n')

      try {
        await navigator.clipboard.writeText(summary)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.text-stats-tool {
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

.tool-panel {
  margin-bottom: 18px;
  border-color: var(--color-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.stat-card {
  display: grid;
  gap: 4px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  strong {
    color: var(--color-primary);
    font-size: 24px;
    line-height: 1.2;
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
}

.text-pane {
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

.text-input ::v-deep .el-textarea__inner {
  min-height: 420px !important;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  line-height: 1.7;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .tool-header,
  .option-line {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
