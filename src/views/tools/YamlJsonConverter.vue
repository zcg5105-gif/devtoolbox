<template>
  <section class="yaml-json-tool">
    <div class="tool-header">
      <div>
        <h1>YAML / JSON 转换器</h1>
        <p>YAML 与 JSON 双向转换，支持格式化、复制和错误提示。</p>
      </div>
      <div class="tool-actions">
        <el-button size="small" icon="el-icon-refresh" @click="convert">转换</el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!outputText" @click="copyOutput">复制结果</el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearAll">清空</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-options">
      <el-radio-group v-model="mode" size="small" @change="convert">
        <el-radio-button label="yamlToJson">YAML 转 JSON</el-radio-button>
        <el-radio-button label="jsonToYaml">JSON 转 YAML</el-radio-button>
      </el-radio-group>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="tool-alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

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
          @input="scheduleConvert"
        />
      </section>

      <section class="converter-pane">
        <div class="pane-header">
          <h2>输出</h2>
          <span>{{ outputText.length }} 字符</span>
        </div>
        <el-input
          v-model="outputText"
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
import yaml from 'js-yaml'

const SAMPLE_YAML = [
  'name: DevToolbox',
  'enabled: true',
  'items:',
  '  - json',
  '  - yaml'
].join('\n')

export default {
  name: 'YamlJsonConverter',
  data() {
    return {
      mode: 'yamlToJson',
      sourceText: SAMPLE_YAML,
      outputText: '',
      errorMessage: '',
      convertTimer: null
    }
  },
  mounted() {
    this.convert()
  },
  beforeDestroy() {
    window.clearTimeout(this.convertTimer)
  },
  methods: {
    scheduleConvert() {
      window.clearTimeout(this.convertTimer)
      this.convertTimer = window.setTimeout(this.convert, 180)
    },
    convert() {
      try {
        const parsed = this.mode === 'yamlToJson'
          ? yaml.load(this.sourceText)
          : JSON.parse(this.sourceText)

        this.outputText = this.mode === 'yamlToJson'
          ? JSON.stringify(parsed, null, 2)
          : yaml.dump(parsed, { noRefs: true })
        this.errorMessage = ''
      } catch (error) {
        this.outputText = ''
        this.errorMessage = `转换失败：${error.message}`
      }
    },
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
      this.outputText = ''
      this.errorMessage = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.yaml-json-tool {
  width: 100%;
  max-width: 1280px;
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

.tool-options,
.tool-alert {
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
  gap: 12px;
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
  min-height: 560px !important;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

@media (max-width: 900px) {
  .tool-header,
  .converter-grid {
    grid-template-columns: 1fr;
  }

  .tool-header {
    flex-direction: column;
  }
}
</style>
