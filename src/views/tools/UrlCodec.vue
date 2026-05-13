<template>
  <section class="url-codec-tool">
    <div class="url-codec-tool__header">
      <h1>URL 编解码</h1>
      <p>对 URL 片段进行 encodeURIComponent / decodeURIComponent 处理，并解析完整 URL。</p>
    </div>

    <el-card shadow="never" class="url-codec-panel">
      <el-form label-position="top" @submit.native.prevent>
        <el-form-item label="输入内容">
          <el-input
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 12 }"
            placeholder="请输入 URL 或需要编解码的文本"
          />
        </el-form-item>

        <div class="url-codec-actions">
          <el-button type="primary" icon="el-icon-lock" @click="encodeText">
            编码
          </el-button>
          <el-button icon="el-icon-unlock" @click="decodeText">
            解码
          </el-button>
          <el-button icon="el-icon-connection" @click="parseUrl">
            解析 URL
          </el-button>
        </div>
      </el-form>
    </el-card>

    <el-card
      v-if="resultText"
      shadow="never"
      class="url-codec-panel url-codec-panel--result"
    >
      <div slot="header" class="url-codec-panel__header">
        <span>{{ resultTitle }}</span>
        <CopyButton :text="resultText" />
      </div>
      <pre class="url-codec-result">{{ resultText }}</pre>
    </el-card>

    <el-card
      v-if="parsedItems.length"
      shadow="never"
      class="url-codec-panel url-codec-panel--result"
    >
      <div slot="header" class="url-codec-panel__header">
        <span>URL 解析结果</span>
      </div>

      <div class="url-codec-result-list">
        <div
          v-for="item in parsedItems"
          :key="item.key"
          class="url-codec-result-row"
        >
          <span class="url-codec-result-row__label">{{ item.label }}</span>
          <code>{{ item.value || '无' }}</code>
          <CopyButton :text="item.value" />
        </div>
      </div>
    </el-card>
  </section>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue'

export default {
  name: 'UrlCodec',
  components: {
    CopyButton
  },
  data() {
    return {
      inputText: '',
      resultTitle: '',
      resultText: '',
      parsedItems: []
    }
  },
  methods: {
    getTrimmedInput() {
      const value = this.inputText.trim()

      if (!value) {
        this.$message.warning('请输入内容')
        return ''
      }

      return value
    },
    encodeText() {
      const value = this.getTrimmedInput()

      if (!value) {
        return
      }

      this.resultTitle = '编码结果'
      this.resultText = encodeURIComponent(value)
      this.parsedItems = []
    },
    decodeText() {
      const value = this.getTrimmedInput()

      if (!value) {
        return
      }

      try {
        this.resultTitle = '解码结果'
        this.resultText = decodeURIComponent(value)
        this.parsedItems = []
      } catch (error) {
        this.$message.error('解码失败，请检查输入内容是否为合法 URI 编码')
      }
    },
    parseUrl() {
      const value = this.getTrimmedInput()

      if (!value) {
        return
      }

      try {
        const url = new URL(value)

        this.resultText = ''
        this.resultTitle = ''
        this.parsedItems = [
          { key: 'protocol', label: 'protocol', value: url.protocol },
          { key: 'host', label: 'host', value: url.host },
          { key: 'path', label: 'path', value: url.pathname },
          { key: 'query', label: 'query', value: url.search.replace(/^\?/, '') },
          { key: 'hash', label: 'hash', value: url.hash.replace(/^#/, '') }
        ]
      } catch (error) {
        this.$message.error('解析失败，请输入包含协议的完整 URL')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.url-codec-tool {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.url-codec-tool__header {
  margin-bottom: 24px;

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

.url-codec-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.url-codec-panel + .url-codec-panel {
  margin-top: 18px;
}

.url-codec-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.url-codec-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.url-codec-result {
  min-height: 96px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.url-codec-result-list {
  display: grid;
  gap: 12px;
}

.url-codec-result-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 10px 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.url-codec-result-row__label {
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.4;
}

code {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
}

@media (max-width: 560px) {
  .url-codec-tool__header h1 {
    font-size: 28px;
  }

  .url-codec-result-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}
</style>
