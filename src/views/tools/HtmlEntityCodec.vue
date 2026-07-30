<template>
  <section class="html-entity-tool">
    <div class="tool-header">
      <div>
        <h1>HTML 实体编解码</h1>
        <p>HTML 实体转义、反转义和 Unicode 数字实体编码。</p>
      </div>
      <div class="tool-actions">
        <el-button size="small" icon="el-icon-document-copy" :disabled="!outputText" @click="copyOutput">复制结果</el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearAll">清空</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-options">
      <el-radio-group v-model="mode" size="small">
        <el-radio-button label="escape">HTML 转义</el-radio-button>
        <el-radio-button label="unescape">HTML 反转义</el-radio-button>
        <el-radio-button label="unicode">Unicode 实体</el-radio-button>
      </el-radio-group>
    </el-card>

    <div class="converter-grid">
      <section class="converter-pane">
        <div class="pane-header">
          <h2>输入</h2>
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

      <section class="converter-pane">
        <div class="pane-header">
          <h2>输出</h2>
          <span>{{ outputText.length }} 字符</span>
        </div>
        <el-input
          :value="outputText"
          class="code-textarea"
          type="textarea"
          :autosize="false"
          readonly
          spellcheck="false"
        />
      </section>
    </div>
  </section>
</template>

<script>
const {
  escapeHtml,
  decodeHtmlEntities,
  encodeUnicodeEntities
} = require('@/utils/toolExpansionCore')

export default {
  name: 'HtmlEntityCodec',
  data() {
    return {
      mode: 'escape',
      sourceText: '<span title="DevToolbox">你好 & hello</span>'
    }
  },
  computed: {
    outputText() {
      if (this.mode === 'unescape') {
        return decodeHtmlEntities(this.sourceText)
      }
      if (this.mode === 'unicode') {
        return encodeUnicodeEntities(this.sourceText)
      }
      return escapeHtml(this.sourceText)
    }
  },
  methods: {
    async copyOutput() {
      if (!this.outputText) return

      try {
        await navigator.clipboard.writeText(this.outputText)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    },
    clearAll() {
      this.sourceText = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.html-entity-tool {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.tool-header {
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

.tool-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.tool-options {
  margin-bottom: 18px;
}

.converter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.converter-pane {
  min-width: 0;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.pane-header {
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

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.code-textarea ::v-deep .el-textarea__inner {
  min-height: 460px !important;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .tool-header {
    flex-direction: column;
  }

  .converter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
