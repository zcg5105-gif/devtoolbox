<template>
  <section class="image-base64-tool">
    <div class="tool-header">
      <div>
        <h1>图片 Base64 转换</h1>
        <p>图片转 Data URL/Base64，并支持 Base64 还原预览和下载。</p>
      </div>
      <div class="tool-actions">
        <el-button size="small" icon="el-icon-document-copy" :disabled="!dataUrl" @click="copyDataUrl">复制 Data URL</el-button>
        <el-button size="small" icon="el-icon-download" :disabled="!previewUrl" @click="downloadDecodedImage">下载图片</el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearAll">清空</el-button>
      </div>
    </div>

    <div class="image-grid">
      <el-card shadow="never" class="tool-panel">
        <div slot="header" class="panel-title">图片转 Base64</div>
        <el-upload
          drag
          action=""
          accept="image/*"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">拖拽或点击上传图片</div>
        </el-upload>
        <div class="stats-list">
          <span>文件：{{ stats.fileName || '-' }}</span>
          <span>MIME：{{ stats.mimeType || '-' }}</span>
          <span>大小：{{ stats.fileSize || '-' }}</span>
          <span>Base64 长度：{{ stats.base64Length }}</span>
          <span>尺寸：{{ stats.dimensions || '-' }}</span>
        </div>
      </el-card>

      <el-card shadow="never" class="tool-panel">
        <div slot="header" class="panel-title">Base64 还原预览</div>
        <el-select v-model="reverseMimeType" class="mime-select">
          <el-option label="PNG" value="image/png" />
          <el-option label="JPEG" value="image/jpeg" />
          <el-option label="WebP" value="image/webp" />
          <el-option label="GIF" value="image/gif" />
          <el-option label="SVG" value="image/svg+xml" />
        </el-select>
        <el-input
          v-model="reverseText"
          class="reverse-input"
          type="textarea"
          :autosize="false"
          placeholder="粘贴 Data URL 或纯 Base64"
          @input="normalizeReverseInput"
        />
      </el-card>
    </div>

    <div class="image-grid">
      <section class="result-pane">
        <div class="pane-header">
          <h2>Data URL</h2>
          <span>{{ dataUrl.length }} 字符</span>
        </div>
        <el-input
          v-model="dataUrl"
          class="data-textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          @input="handleDataUrlInput"
        />
      </section>

      <section class="result-pane">
        <div class="pane-header">
          <h2>预览</h2>
          <span>{{ previewUrl ? '可预览' : '等待输入' }}</span>
        </div>
        <div class="preview-box">
          <img v-if="previewUrl" :src="previewUrl" alt="Base64 preview" @load="handlePreviewLoad">
          <el-empty v-else description="上传或粘贴图片 Base64 后预览" />
        </div>
      </section>
    </div>
  </section>
</template>

<script>
const { normalizeBase64Input } = require('@/utils/toolExpansionCore')

export default {
  name: 'ImageBase64',
  data() {
    return {
      dataUrl: '',
      reverseText: '',
      reverseMimeType: 'image/png',
      previewUrl: '',
      stats: {
        fileName: '',
        mimeType: '',
        fileSize: '',
        base64Length: 0,
        dimensions: ''
      }
    }
  },
  methods: {
    handleFileChange(file) {
      const rawFile = file.raw

      if (!rawFile || !rawFile.type.startsWith('image/')) {
        this.$message.error('请选择图片文件')
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        this.dataUrl = reader.result
        this.previewUrl = reader.result
        this.reverseText = reader.result
        this.stats = {
          fileName: rawFile.name,
          mimeType: rawFile.type,
          fileSize: this.formatBytes(rawFile.size),
          base64Length: this.getBase64Length(reader.result),
          dimensions: ''
        }
        this.readImageSize(reader.result)
      }
      reader.onerror = () => this.$message.error('读取图片失败')
      reader.readAsDataURL(rawFile)
    },
    readImageSize(dataUrl) {
      const image = new Image()

      image.onload = () => {
        this.stats.dimensions = `${image.naturalWidth} x ${image.naturalHeight}`
      }
      image.src = dataUrl
    },
    normalizeReverseInput() {
      this.previewUrl = normalizeBase64Input(this.reverseText, this.reverseMimeType)
      this.dataUrl = this.previewUrl
      this.stats.base64Length = this.getBase64Length(this.dataUrl)
    },
    handleDataUrlInput() {
      this.previewUrl = normalizeBase64Input(this.dataUrl, this.reverseMimeType)
      this.reverseText = this.dataUrl
      this.stats.base64Length = this.getBase64Length(this.dataUrl)
    },
    handlePreviewLoad(event) {
      this.stats.dimensions = `${event.target.naturalWidth} x ${event.target.naturalHeight}`
    },
    getBase64Length(dataUrl) {
      const value = String(dataUrl || '')
      const commaIndex = value.indexOf(',')
      return commaIndex >= 0 ? value.slice(commaIndex + 1).length : value.length
    },
    formatBytes(bytes) {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    },
    async copyDataUrl() {
      if (!this.dataUrl) return

      try {
        await navigator.clipboard.writeText(this.dataUrl)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    },
    downloadDecodedImage() {
      if (!this.previewUrl) return

      const link = document.createElement('a')
      link.href = this.previewUrl
      link.download = `image_base64_${Date.now()}`
      link.click()
    },
    clearAll() {
      this.dataUrl = ''
      this.reverseText = ''
      this.previewUrl = ''
      this.stats = {
        fileName: '',
        mimeType: '',
        fileSize: '',
        base64Length: 0,
        dimensions: ''
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.image-base64-tool {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.tool-header,
.tool-actions,
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

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.tool-panel,
.result-pane {
  min-width: 0;
  border-color: var(--color-border);
  border-radius: 8px;
}

.result-pane {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.panel-title {
  color: var(--color-text);
  font-weight: 700;
}

.stats-list {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.mime-select {
  width: 100%;
  margin-bottom: 12px;
}

.reverse-input ::v-deep .el-textarea__inner,
.data-textarea ::v-deep .el-textarea__inner {
  min-height: 260px !important;
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.data-textarea ::v-deep .el-textarea__inner {
  border: 0;
  border-radius: 0;
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

.preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 318px;
  padding: 16px;
  background: var(--color-surface-soft);

  img {
    max-width: 100%;
    max-height: 300px;
  }
}

@media (max-width: 900px) {
  .tool-header {
    flex-direction: column;
  }

  .image-grid {
    grid-template-columns: 1fr;
  }
}
</style>
