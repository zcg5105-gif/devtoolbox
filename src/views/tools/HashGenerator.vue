<template>
  <section class="hash-generator">
    <div class="hash-generator__header">
      <div>
        <h1>Hash 生成器</h1>
        <p>计算文本和文件的 MD5、SHA-1、SHA-256、SHA-512 哈希值，支持批量和对比检测。</p>
      </div>

      <div class="hash-generator__actions">
        <el-radio-group v-model="inputMode" size="small">
          <el-radio-button label="text">文本</el-radio-button>
          <el-radio-button label="file">文件</el-radio-button>
        </el-radio-group>
        <el-select v-model="algorithm" size="small" class="algorithm-select">
          <el-option
            v-for="item in algorithms"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>
    </div>

    <div class="hash-layout">
      <section class="input-panel">
        <div class="panel-header">
          <h2>{{ inputMode === 'text' ? '文本输入' : '文件上传' }}</h2>
          <el-button v-if="inputMode === 'text'" size="mini" icon="el-icon-delete" @click="clearText">
            清空
          </el-button>
          <el-button v-else size="mini" icon="el-icon-delete" :disabled="!fileItems.length" @click="clearFiles">
            清空
          </el-button>
        </div>

        <template v-if="inputMode === 'text'">
          <el-input
            v-model="textInput"
            class="text-input"
            type="textarea"
            :autosize="false"
            spellcheck="false"
            placeholder="每行一条文本，自动批量计算哈希"
          />
          <div class="input-hint">
            共 {{ textLines.length }} 条文本，空行会自动忽略。
          </div>
        </template>

        <template v-else>
          <div
            class="drop-zone"
            :class="{ 'is-dragover': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
            @click="openFilePicker"
          >
            <i class="el-icon-upload"></i>
            <strong>拖拽文件到这里，或点击选择文件</strong>
            <span>支持多文件批量计算，文件内容仅在浏览器本地读取。</span>
            <input ref="fileInput" class="hidden-input" type="file" multiple @change="handleFileChange">
          </div>

          <div v-if="fileItems.length" class="file-list">
            <div v-for="item in fileItems" :key="item.id" class="file-item">
              <div>
                <strong>{{ item.name }}</strong>
                <span>{{ formatSize(item.size) }}</span>
              </div>
              <el-progress
                :percentage="item.progress"
                :status="item.status === 'error' ? 'exception' : item.status === 'done' ? 'success' : undefined"
              />
              <p v-if="item.error">{{ item.error }}</p>
            </div>
          </div>
        </template>
      </section>

      <section class="result-panel">
        <div class="panel-header">
          <h2>计算结果</h2>
          <el-button size="mini" icon="el-icon-document-copy" :disabled="!resultRows.length" @click="copyAll">
            复制全部
          </el-button>
        </div>

        <div class="compare-box">
          <el-input
            v-model.trim="compareHash"
            clearable
            size="small"
            placeholder="输入另一个哈希值进行对比"
          >
            <template slot="prepend">对比</template>
          </el-input>
          <el-tag v-if="compareHash" size="small" :type="matchedRows.length ? 'success' : 'info'" effect="plain">
            {{ matchedRows.length ? `匹配 ${matchedRows.length} 项` : '未匹配' }}
          </el-tag>
        </div>

        <div v-if="!resultRows.length" class="empty-state">
          <i class="el-icon-coin"></i>
          <span>输入文本或上传文件后显示哈希值</span>
        </div>

        <div v-else class="result-list">
          <article
            v-for="row in resultRows"
            :key="row.id"
            class="result-item"
            :class="{ 'is-match': isHashMatched(row.hash) }"
          >
            <div class="result-item__meta">
              <div>
                <strong>{{ row.name }}</strong>
                <span>{{ row.type }} · {{ algorithmLabel }}</span>
              </div>
              <el-button size="mini" icon="el-icon-document-copy" @click="copyHash(row.hash)">
                复制
              </el-button>
            </div>
            <code>{{ row.hash }}</code>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import CryptoJS from 'crypto-js'

const algorithms = [
  { label: 'MD5', value: 'MD5' },
  { label: 'SHA-1', value: 'SHA1' },
  { label: 'SHA-256', value: 'SHA256' },
  { label: 'SHA-512', value: 'SHA512' }
]

export default {
  name: 'HashGenerator',
  data() {
    return {
      inputMode: 'text',
      algorithm: 'SHA256',
      algorithms,
      textInput: 'Hello World\nDevToolbox',
      fileItems: [],
      isDragOver: false,
      compareHash: '',
      textTimer: null
    }
  },
  computed: {
    algorithmLabel() {
      const target = this.algorithms.find(item => item.value === this.algorithm)
      return target ? target.label : this.algorithm
    },
    textLines() {
      return this.textInput
        .split(/\r\n|\r|\n/)
        .map(line => line.trim())
        .filter(Boolean)
    },
    textRows() {
      return this.textLines.map((line, index) => ({
        id: `text-${index}-${line}`,
        name: `文本 ${index + 1}`,
        type: '文本',
        hash: this.hashText(line)
      }))
    },
    fileRows() {
      return this.fileItems
        .filter(item => item.hash)
        .map(item => ({
          id: item.id,
          name: item.name,
          type: '文件',
          hash: item.hash
        }))
    },
    resultRows() {
      return this.inputMode === 'text' ? this.textRows : this.fileRows
    },
    normalizedCompareHash() {
      return this.normalizeHash(this.compareHash)
    },
    matchedRows() {
      if (!this.normalizedCompareHash) {
        return []
      }

      return this.resultRows.filter(row => this.isHashMatched(row.hash))
    }
  },
  watch: {
    algorithm() {
      if (this.inputMode === 'file' && this.fileItems.length) {
        this.rehashFiles()
      }
    }
  },
  beforeDestroy() {
    window.clearTimeout(this.textTimer)
  },
  methods: {
    hashText(value) {
      return this.hashWordArray(CryptoJS.enc.Utf8.parse(value))
    },
    hashWordArray(wordArray) {
      return CryptoJS[this.algorithm](wordArray).toString(CryptoJS.enc.Hex)
    },
    openFilePicker() {
      this.$refs.fileInput.click()
    },
    handleFileChange(event) {
      const files = Array.from(event.target.files || [])
      this.addFiles(files)
      event.target.value = ''
    },
    handleDrop(event) {
      this.isDragOver = false
      const files = Array.from(event.dataTransfer.files || [])
      this.addFiles(files)
    },
    addFiles(files) {
      if (!files.length) {
        return
      }

      const items = files.map(file => ({
        id: `${Date.now()}-${Math.random()}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
        hash: '',
        error: ''
      }))

      this.fileItems = [...this.fileItems, ...items]
      items.forEach(item => this.hashFile(item))
    },
    rehashFiles() {
      this.fileItems.forEach(item => {
        item.progress = 0
        item.status = 'pending'
        item.hash = ''
        item.error = ''
        this.hashFile(item)
      })
    },
    hashFile(item) {
      const reader = new FileReader()

      item.status = 'reading'
      item.progress = 5

      reader.onprogress = event => {
        if (event.lengthComputable) {
          item.progress = Math.max(5, Math.min(95, Math.round((event.loaded / event.total) * 95)))
        }
      }

      reader.onload = () => {
        try {
          const wordArray = CryptoJS.lib.WordArray.create(reader.result)
          item.hash = this.hashWordArray(wordArray)
          item.progress = 100
          item.status = 'done'
        } catch (error) {
          item.error = error.message || '文件哈希计算失败'
          item.status = 'error'
          item.progress = 100
        }
      }

      reader.onerror = () => {
        item.error = '文件读取失败'
        item.status = 'error'
        item.progress = 100
      }

      reader.readAsArrayBuffer(item.file)
    },
    clearText() {
      this.textInput = ''
    },
    clearFiles() {
      this.fileItems = []
    },
    normalizeHash(value) {
      return String(value || '').replace(/\s+/g, '').toLowerCase()
    },
    isHashMatched(hash) {
      return Boolean(this.normalizedCompareHash && this.normalizeHash(hash) === this.normalizedCompareHash)
    },
    async copyHash(hash) {
      try {
        await navigator.clipboard.writeText(hash)
        this.$message.success('已复制哈希值')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    async copyAll() {
      const content = this.resultRows
        .map(row => `${row.name}\t${this.algorithmLabel}\t${row.hash}`)
        .join('\n')

      try {
        await navigator.clipboard.writeText(content)
        this.$message.success('已复制全部结果')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    formatSize(size) {
      if (size < 1024) {
        return `${size} B`
      }
      if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`
      }
      return `${(size / 1024 / 1024).toFixed(2)} MB`
    }
  }
}
</script>

<style lang="scss" scoped>
.hash-generator {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.hash-generator__header {
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

.hash-generator__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.algorithm-select {
  width: 150px;
}

.hash-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
  align-items: start;
}

.input-panel,
.result-panel {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.panel-header {
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
}

.text-input {
  display: block;
}

.text-input ::v-deep .el-textarea__inner {
  min-height: 420px !important;
  padding: 16px;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.input-hint {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 13px;
}

.drop-zone {
  display: flex;
  min-height: 220px;
  margin: 16px;
  padding: 28px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  text-align: center;
  transition: border-color 0.2s, background 0.2s;

  i {
    color: var(--color-primary);
    font-size: 42px;
  }

  strong {
    color: var(--color-text);
    font-size: 16px;
  }

  span {
    font-size: 13px;
    line-height: 1.6;
  }
}

.drop-zone.is-dragover {
  background: rgba(64, 158, 255, 0.08);
  border-color: var(--color-primary);
}

.hidden-input {
  display: none;
}

.file-list {
  display: grid;
  gap: 12px;
  padding: 0 16px 16px;
}

.file-item {
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  > div:first-child {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  strong {
    color: var(--color-text);
    word-break: break-all;
  }

  span,
  p {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  p {
    margin-top: 8px;
    color: #f56c6c;
  }
}

.compare-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.empty-state {
  display: flex;
  min-height: 320px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted);

  i {
    font-size: 38px;
  }
}

.result-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.result-item {
  padding: 14px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  code {
    display: block;
    margin-top: 10px;
    padding: 10px;
    overflow-wrap: anywhere;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    line-height: 1.6;
  }
}

.result-item.is-match {
  border-color: #67c23a;
  box-shadow: 0 0 0 1px rgba(103, 194, 58, 0.2);
}

.result-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong {
    display: block;
    color: var(--color-text);
    word-break: break-all;
  }

  span {
    display: block;
    margin-top: 4px;
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

@media (max-width: 1024px) {
  .hash-generator__header {
    flex-direction: column;
  }

  .hash-generator__actions {
    justify-content: flex-start;
  }

  .hash-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hash-generator__header h1 {
    font-size: 28px;
  }

  .hash-generator__actions,
  .hash-generator__actions .el-radio-group,
  .hash-generator__actions .el-select {
    width: 100%;
  }

  .compare-box,
  .result-item__meta {
    align-items: stretch;
    flex-direction: column;
  }

  .drop-zone {
    margin: 12px;
    padding: 20px;
  }
}
</style>
