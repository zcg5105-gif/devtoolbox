<template>
  <section class="code-obfuscator">
    <div class="code-obfuscator__header">
      <div>
        <h1>JavaScript 代码混淆</h1>
        <p>对 JavaScript 代码进行压缩、变量重命名和字符串加密处理。</p>
      </div>

      <div class="code-obfuscator__actions">
        <el-button
          type="primary"
          size="small"
          icon="el-icon-lock"
          :loading="isObfuscating"
          @click="obfuscateCode"
        >
          开始混淆
        </el-button>
        <el-button
          size="small"
          icon="el-icon-document-copy"
          :disabled="!outputCode"
          @click="copyOutput"
        >
          复制
        </el-button>
        <el-button
          size="small"
          icon="el-icon-download"
          :disabled="!outputCode"
          @click="downloadOutput"
        >
          下载
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearCode">
          清空
        </el-button>
      </div>
    </div>

    <el-alert
      class="code-obfuscator__warning"
      title="仅供学习和合法代码保护场景使用。混淆结果不可逆，请保留原始代码。"
      type="warning"
      :closable="false"
      show-icon
    />

    <el-card shadow="never" class="code-obfuscator-options">
      <div slot="header" class="code-obfuscator-options__header">
        <span>混淆选项</span>
        <span>{{ strengthLabel }}</span>
      </div>

      <div class="code-obfuscator-options__grid">
        <el-checkbox v-model="options.compact" @change="handleOptionChange">
          压缩
        </el-checkbox>
        <el-checkbox v-model="options.renameVariables" @change="handleOptionChange">
          变量重命名
        </el-checkbox>
        <el-checkbox v-model="options.stringEncryption" @change="handleOptionChange">
          字符串加密
        </el-checkbox>

        <div class="code-obfuscator-strength">
          <span>混淆强度</span>
          <el-slider
            v-model="strength"
            :min="1"
            :max="3"
            :step="1"
            :marks="strengthMarks"
            @change="handleOptionChange"
          />
        </div>
      </div>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="code-obfuscator__error"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div class="code-obfuscator-stats">
      <div class="code-obfuscator-stat">
        <span>混淆前</span>
        <strong>{{ originalSize }}</strong>
      </div>
      <div class="code-obfuscator-stat">
        <span>混淆后</span>
        <strong>{{ obfuscatedSize }}</strong>
      </div>
      <div class="code-obfuscator-stat">
        <span>变化</span>
        <strong :class="{ 'is-negative': sizeDelta.startsWith('+') }">
          {{ sizeDelta }}
        </strong>
      </div>
    </div>

    <div class="code-obfuscator-editor">
      <section class="code-obfuscator-pane">
        <div class="code-obfuscator-pane__header">
          <h2>输入 JS 代码</h2>
          <span>{{ inputCode.length }} 字符</span>
        </div>
        <el-input
          v-model="inputCode"
          class="code-obfuscator-pane__textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="请输入 JavaScript 代码"
          @input="handleInput"
        />
      </section>

      <section class="code-obfuscator-pane">
        <div class="code-obfuscator-pane__header">
          <h2>混淆后代码</h2>
          <span>{{ outputCode.length }} 字符</span>
        </div>
        <pre class="code-obfuscator-output"><code>{{ outputCode || '混淆结果会显示在这里' }}</code></pre>
      </section>
    </div>
  </section>
</template>

<script>
const SAMPLE_CODE = [
  'function greetUser(name) {',
  '  const message = `Hello, ${name}!`;',
  '  console.log(message);',
  '  return message;',
  '}',
  '',
  'greetUser("DevToolbox");'
].join('\n')

export default {
  name: 'CodeObfuscator',
  data() {
    return {
      inputCode: SAMPLE_CODE,
      outputCode: '',
      errorMessage: '',
      strength: 2,
      strengthMarks: {
        1: '低',
        2: '中',
        3: '高'
      },
      options: {
        compact: true,
        renameVariables: true,
        stringEncryption: false
      },
      obfuscateTimer: null,
      obfuscatorModule: null,
      isObfuscating: false
    }
  },
  computed: {
    strengthLabel() {
      return `当前强度：${this.strengthMarks[this.strength]}`
    },
    originalSize() {
      return this.formatBytes(this.byteSize(this.inputCode))
    },
    obfuscatedSize() {
      return this.formatBytes(this.byteSize(this.outputCode))
    },
    sizeDelta() {
      const inputSize = this.byteSize(this.inputCode)
      const outputSize = this.byteSize(this.outputCode)

      if (!this.outputCode || inputSize === 0) {
        return '0 B'
      }

      const delta = outputSize - inputSize
      const percent = Math.round((delta / inputSize) * 100)
      const sign = delta > 0 ? '+' : ''

      return `${sign}${this.formatBytes(delta)} (${sign}${percent}%)`
    }
  },
  mounted() {
    this.obfuscateCode(false)
  },
  beforeDestroy() {
    window.clearTimeout(this.obfuscateTimer)
  },
  methods: {
    async loadObfuscator() {
      if (!this.obfuscatorModule) {
        const module = await import(
          /* webpackChunkName: "lib-javascript-obfuscator" */ 'javascript-obfuscator'
        )
        this.obfuscatorModule = module.default || module
      }
      return this.obfuscatorModule
    },
    handleInput() {
      this.errorMessage = ''
      window.clearTimeout(this.obfuscateTimer)
      this.obfuscateTimer = window.setTimeout(() => {
        this.obfuscateCode(false)
      }, 450)
    },
    handleOptionChange() {
      this.obfuscateCode(false)
    },
    async obfuscateCode(showMessage = true) {
      const code = this.inputCode.trim()

      if (!code) {
        this.outputCode = ''
        this.errorMessage = ''
        return
      }

      try {
        this.isObfuscating = true
        const JavaScriptObfuscator = await this.loadObfuscator()
        const result = JavaScriptObfuscator.obfuscate(code, this.createObfuscatorOptions())
        this.outputCode = result.getObfuscatedCode()
        this.errorMessage = ''

        if (showMessage) {
          this.$message.success('代码已混淆')
        }
      } catch (error) {
        this.outputCode = ''
        this.errorMessage = `混淆失败：${error.message || '请检查 JavaScript 语法'}`

        if (showMessage) {
          this.$message.error('混淆失败')
        }
      } finally {
        this.isObfuscating = false
      }
    },
    createObfuscatorOptions() {
      const strengthOptions = {
        1: {
          controlFlowFlattening: false,
          deadCodeInjection: false,
          stringArrayThreshold: 0.35
        },
        2: {
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.35,
          deadCodeInjection: false,
          stringArrayThreshold: 0.55
        },
        3: {
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.75,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.25,
          stringArrayThreshold: 0.85
        }
      }

      return {
        compact: this.options.compact,
        identifierNamesGenerator: this.options.renameVariables ? 'hexadecimal' : 'mangled-shuffled',
        renameGlobals: false,
        simplify: true,
        stringArray: this.options.stringEncryption,
        stringArrayEncoding: this.options.stringEncryption ? ['base64'] : [],
        stringArrayRotate: this.options.stringEncryption,
        stringArrayShuffle: this.options.stringEncryption,
        transformObjectKeys: this.options.stringEncryption,
        unicodeEscapeSequence: false,
        ...strengthOptions[this.strength]
      }
    },
    async copyOutput() {
      if (!this.outputCode) {
        this.$message.warning('没有可复制的混淆结果')
        return
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.outputCode)
        } else {
          this.copyWithFallback(this.outputCode)
        }
        this.$message.success('已复制混淆结果')
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
      if (!this.outputCode) {
        this.$message.warning('没有可下载的混淆结果')
        return
      }

      const blob = new Blob([this.outputCode], {
        type: 'text/javascript;charset=utf-8'
      })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `obfuscated_${Date.now()}.js`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    clearCode() {
      this.inputCode = ''
      this.outputCode = ''
      this.errorMessage = ''
      this.$message.success('已清空')
    },
    byteSize(value) {
      return new Blob([value || '']).size
    },
    formatBytes(value) {
      const absoluteValue = Math.abs(value)

      if (absoluteValue < 1024) {
        return `${value} B`
      }

      if (absoluteValue < 1024 * 1024) {
        return `${(value / 1024).toFixed(2)} KB`
      }

      return `${(value / 1024 / 1024).toFixed(2)} MB`
    }
  }
}
</script>

<style lang="scss" scoped>
.code-obfuscator {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.code-obfuscator__header {
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

.code-obfuscator__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.code-obfuscator__warning,
.code-obfuscator__error,
.code-obfuscator-options,
.code-obfuscator-stats {
  margin-bottom: 18px;
}

.code-obfuscator-options {
  border-color: var(--color-border);
  border-radius: 8px;
}

.code-obfuscator-options__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;

  span:last-child {
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
  }
}

.code-obfuscator-options__grid {
  display: grid;
  grid-template-columns: auto auto auto minmax(260px, 1fr);
  gap: 18px;
  align-items: center;
}

.code-obfuscator-strength {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-width: 0;
  color: var(--color-text);
  font-size: 14px;
}

.code-obfuscator-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.code-obfuscator-stat {
  min-width: 0;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  strong {
    color: var(--color-text);
    font-size: 20px;
    line-height: 1.3;
  }

  strong.is-negative {
    color: #dc2626;
  }
}

.code-obfuscator-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 620px;
}

.code-obfuscator-pane {
  display: flex;
  min-width: 0;
  min-height: 620px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.code-obfuscator-pane__header {
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

.code-obfuscator-pane__textarea {
  flex: 1;
  min-height: 0;
}

.code-obfuscator-pane__textarea ::v-deep .el-textarea__inner {
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

.code-obfuscator-output {
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

.code-obfuscator-output code {
  display: block;
  min-width: max-content;
}

[data-theme='dark'] .code-obfuscator-pane__textarea ::v-deep .el-textarea__inner,
[data-theme='dark'] .code-obfuscator-output {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .code-obfuscator__header {
    flex-direction: column;
  }

  .code-obfuscator__actions {
    justify-content: flex-start;
  }

  .code-obfuscator-options__grid,
  .code-obfuscator-editor {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .code-obfuscator__header h1 {
    font-size: 28px;
  }

  .code-obfuscator__actions {
    width: 100%;
  }

  .code-obfuscator__actions .el-button {
    flex: 1 1 calc(50% - 10px);
  }

  .code-obfuscator-stats {
    grid-template-columns: 1fr;
  }

  .code-obfuscator-strength {
    grid-template-columns: 1fr;
  }

  .code-obfuscator-editor,
  .code-obfuscator-pane {
    min-height: 520px;
  }

  .code-obfuscator-pane__textarea ::v-deep .el-textarea__inner,
  .code-obfuscator-output {
    min-height: 465px !important;
  }
}
</style>
