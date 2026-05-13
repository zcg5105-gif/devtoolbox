<template>
  <section class="json-editor-page">
    <div class="json-editor-page__header">
      <div>
        <h1>JSON 编辑器</h1>
        <p>格式化、压缩、校验并查看 JSON 树形结构。</p>
      </div>

      <div class="json-editor-page__actions">
        <el-button
          type="primary"
          icon="el-icon-magic-stick"
          @click="formatJson"
        >
          格式化
        </el-button>
        <el-button icon="el-icon-minus" @click="compressJson">
          压缩
        </el-button>
        <el-button icon="el-icon-circle-check" @click="validateJson">
          校验
        </el-button>
        <el-button icon="el-icon-copy-document" @click="copyJson">
          复制
        </el-button>
        <el-button icon="el-icon-delete" @click="clearJson">
          清空
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      class="json-editor-page__alert"
      :title="errorMessage"
      type="error"
      show-icon
      :closable="false"
    />

    <el-alert
      v-else-if="inputJson"
      class="json-editor-page__alert"
      title="JSON 校验通过"
      type="success"
      show-icon
      :closable="false"
    />

    <div class="json-editor">
      <section class="json-editor__pane">
        <div class="json-editor__pane-header">
          <h2>输入 JSON</h2>
          <span>{{ inputJson.length }} 字符</span>
        </div>

        <el-input
          v-model="inputJson"
          class="json-editor__textarea"
          type="textarea"
          placeholder="请输入 JSON"
          :autosize="false"
          spellcheck="false"
          @input="handleInput"
        />
      </section>

      <section class="json-editor__pane">
        <div class="json-editor__pane-header">
          <h2>树形结构</h2>
          <span v-if="parsedJson">{{ rootTypeText }}</span>
        </div>

        <div class="json-editor__tree">
          <JsonTree
            v-if="canRenderTree"
            :data="parsedJson"
          />
          <el-empty
            v-else
            :description="treeEmptyText"
          />
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import JsonTree from '@/components/JsonTree.vue'

export default {
  name: 'JsonEditor',
  components: {
    JsonTree
  },
  data() {
    return {
      inputJson: '',
      parsedJson: null,
      errorMessage: ''
    }
  },
  computed: {
    canRenderTree() {
      return this.parsedJson !== null && typeof this.parsedJson === 'object'
    },
    rootTypeText() {
      if (Array.isArray(this.parsedJson)) {
        return `Array(${this.parsedJson.length})`
      }
      if (this.parsedJson && typeof this.parsedJson === 'object') {
        return `Object(${Object.keys(this.parsedJson).length})`
      }
      return typeof this.parsedJson
    },
    treeEmptyText() {
      if (!this.inputJson) {
        return '输入 JSON 后显示树形结构'
      }
      if (this.errorMessage) {
        return '修正 JSON 错误后显示树形结构'
      }
      return '当前 JSON 根节点不是对象或数组'
    }
  },
  methods: {
    handleInput() {
      this.validateJson(false)
    },
    validateJson(showMessage = true) {
      const content = this.inputJson.trim()

      if (!content) {
        this.parsedJson = null
        this.errorMessage = ''
        return false
      }

      try {
        this.parsedJson = JSON.parse(content)
        this.errorMessage = ''

        if (showMessage) {
          this.$message.success('JSON 校验通过')
        }

        return true
      } catch (error) {
        this.parsedJson = null
        this.errorMessage = `JSON 解析失败：${error.message}`

        if (showMessage) {
          this.$message.error('JSON 校验失败')
        }

        return false
      }
    },
    formatJson() {
      if (!this.validateJson(false)) {
        this.$message.error('JSON 格式错误，无法格式化')
        return
      }

      this.inputJson = JSON.stringify(this.parsedJson, null, 2)
      this.$message.success('已格式化')
    },
    compressJson() {
      if (!this.validateJson(false)) {
        this.$message.error('JSON 格式错误，无法压缩')
        return
      }

      this.inputJson = JSON.stringify(this.parsedJson)
      this.$message.success('已压缩')
    },
    copyJson() {
      if (!this.inputJson) {
        this.$message.warning('没有可复制的内容')
        return
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(this.inputJson)
          .then(() => {
            this.$message.success('已复制')
          })
          .catch(() => {
            this.fallbackCopy()
          })
        return
      }

      this.fallbackCopy()
    },
    fallbackCopy() {
      const textarea = document.createElement('textarea')
      textarea.value = this.inputJson
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
    clearJson() {
      this.inputJson = ''
      this.parsedJson = null
      this.errorMessage = ''
      this.$message.success('已清空')
    }
  }
}
</script>

<style lang="scss" scoped>
.json-editor-page {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.json-editor-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.json-editor-page__header h1 {
  margin: 0 0 10px;
  color: var(--color-text);
  font-size: 32px;
  line-height: 1.25;
}

.json-editor-page__header p {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.json-editor-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.json-editor-page__actions .el-button + .el-button {
  margin-left: 0;
}

.json-editor-page__alert {
  margin-bottom: 18px;
}

.json-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  min-height: 620px;
}

.json-editor__pane {
  display: flex;
  min-width: 0;
  min-height: 620px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.json-editor__pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);
}

.json-editor__pane-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.4;
}

.json-editor__pane-header span {
  flex: 0 0 auto;
  color: var(--color-text-muted);
  font-size: 13px;
}

.json-editor__textarea {
  flex: 1;
  min-height: 0;
}

.json-editor__textarea ::v-deep .el-textarea__inner {
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

.json-editor__tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  background: var(--color-surface);
}

[data-theme='dark'] .json-editor__textarea ::v-deep .el-textarea__inner {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .json-editor-page__header {
    flex-direction: column;
  }

  .json-editor-page__actions {
    justify-content: flex-start;
  }

  .json-editor {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .json-editor-page__header h1 {
    font-size: 28px;
  }

  .json-editor-page__actions {
    width: 100%;
  }

  .json-editor-page__actions .el-button {
    flex: 1 1 calc(50% - 10px);
  }

  .json-editor,
  .json-editor__pane {
    min-height: 520px;
  }

  .json-editor__textarea ::v-deep .el-textarea__inner {
    min-height: 465px !important;
  }
}
</style>
