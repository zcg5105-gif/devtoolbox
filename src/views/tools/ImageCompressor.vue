<template>
  <section class="image-compressor">
    <div class="image-compressor__header">
      <div>
        <h1>图片压缩</h1>
        <p>使用浏览器 Canvas 本地压缩图片，文件不会上传到服务器。</p>
      </div>

      <div class="image-compressor__actions">
        <el-button
          size="small"
          icon="el-icon-download"
          :disabled="!compressedItems.length"
          @click="downloadAll"
        >
          下载全部
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearImages">
          清空
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="compressor-panel">
      <div
        class="upload-zone"
        :class="{ 'is-dragging': isDragging }"
        @click="openFilePicker"
        @dragenter.prevent="isDragging = true"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <input
          ref="fileInput"
          class="image-compressor__file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          @change="handleFileChange"
        >
        <i class="el-icon-upload"></i>
        <strong>点击上传图片</strong>
        <span>或将 JPEG、PNG、WebP 图片拖拽到这里，支持批量压缩</span>
      </div>
    </el-card>

    <el-card shadow="never" class="compressor-panel">
      <div slot="header" class="compressor-panel__header">
        <span>压缩设置</span>
        <small>所有图片会按当前设置重新压缩</small>
      </div>

      <div class="settings-grid">
        <div class="quality-setting">
          <span>压缩质量：{{ quality }}%</span>
          <el-slider
            v-model="quality"
            :min="10"
            :max="100"
            :step="5"
            show-stops
            @change="recompressAll"
          />
        </div>

        <el-form label-position="top" class="dimension-form" @submit.native.prevent>
          <el-form-item label="最大宽度">
            <el-input-number
              v-model="maxWidth"
              :min="1"
              :max="12000"
              :step="100"
              controls-position="right"
              @change="recompressAll"
            />
          </el-form-item>

          <el-form-item label="最大高度">
            <el-input-number
              v-model="maxHeight"
              :min="1"
              :max="12000"
              :step="100"
              controls-position="right"
              @change="recompressAll"
            />
          </el-form-item>

          <el-form-item label="输出格式">
            <el-select v-model="outputFormat" @change="recompressAll">
              <el-option label="保持原格式" value="original" />
              <el-option label="JPEG" value="image/jpeg" />
              <el-option label="PNG" value="image/png" />
              <el-option label="WebP" value="image/webp" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="image-compressor__alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div v-if="!items.length" class="image-empty">
      上传图片后会显示压缩前后对比
    </div>

    <div v-else class="image-list">
      <el-card
        v-for="item in items"
        :key="item.id"
        shadow="never"
        class="image-card"
      >
        <div slot="header" class="image-card__header">
          <div>
            <strong>{{ item.name }}</strong>
            <small>{{ item.originalWidth }} x {{ item.originalHeight }}</small>
          </div>
          <div class="image-card__actions">
            <el-tag
              v-if="item.status === 'done'"
              size="small"
              :type="item.ratio >= 0 ? 'success' : 'warning'"
              effect="plain"
            >
              {{ ratioText(item) }}
            </el-tag>
            <el-button
              size="mini"
              icon="el-icon-download"
              :disabled="item.status !== 'done'"
              @click="downloadItem(item)"
            >
              下载
            </el-button>
            <el-button size="mini" icon="el-icon-delete" @click="removeItem(item.id)" />
          </div>
        </div>

        <el-alert
          v-if="item.error"
          class="image-card__error"
          :title="item.error"
          type="error"
          :closable="false"
          show-icon
        />

        <div class="image-compare">
          <section class="image-preview">
            <div class="image-preview__header">
              <span>原图</span>
              <strong>{{ formatBytes(item.originalSize) }}</strong>
            </div>
            <div class="image-preview__body">
              <img :src="item.originalUrl" :alt="`${item.name} 原图`">
            </div>
          </section>

          <section class="image-preview">
            <div class="image-preview__header">
              <span>压缩后</span>
              <strong>{{ item.status === 'done' ? formatBytes(item.compressedSize) : '处理中...' }}</strong>
            </div>
            <div class="image-preview__body">
              <img
                v-if="item.compressedUrl"
                :src="item.compressedUrl"
                :alt="`${item.name} 压缩后`"
              >
              <div v-else class="image-preview__placeholder">
                {{ item.status === 'processing' ? '正在压缩...' : '暂无预览' }}
              </div>
            </div>
          </section>
        </div>

        <div class="image-stats">
          <span>输出：{{ item.outputWidth || '-' }} x {{ item.outputHeight || '-' }}</span>
          <span>格式：{{ item.outputType || '-' }}</span>
          <span>节省：{{ item.status === 'done' ? savedBytesText(item) : '-' }}</span>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script>
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default {
  name: 'ImageCompressor',
  data() {
    return {
      items: [],
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      outputFormat: 'original',
      isDragging: false,
      errorMessage: '',
      recompressTimer: null
    }
  },
  computed: {
    compressedItems() {
      return this.items.filter(item => item.status === 'done' && item.compressedBlob)
    }
  },
  beforeDestroy() {
    window.clearTimeout(this.recompressTimer)
    this.items.forEach(this.revokeItemUrls)
  },
  methods: {
    openFilePicker() {
      this.$refs.fileInput.click()
    },
    handleFileChange(event) {
      const files = Array.from(event.target.files || [])
      this.addFiles(files)
      event.target.value = ''
    },
    handleDrop(event) {
      this.isDragging = false
      this.addFiles(Array.from(event.dataTransfer.files || []))
    },
    addFiles(files) {
      const imageFiles = files.filter(file => SUPPORTED_TYPES.includes(file.type))

      if (!imageFiles.length) {
        this.errorMessage = '请选择 JPEG、PNG 或 WebP 图片'
        return
      }

      this.errorMessage = ''
      imageFiles.forEach(file => {
        const item = {
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          file,
          name: file.name,
          originalSize: file.size,
          originalType: file.type,
          originalUrl: URL.createObjectURL(file),
          originalWidth: 0,
          originalHeight: 0,
          compressedBlob: null,
          compressedUrl: '',
          compressedSize: 0,
          outputType: '',
          outputWidth: 0,
          outputHeight: 0,
          ratio: 0,
          status: 'processing',
          error: ''
        }

        this.items.unshift(item)
        this.compressItem(item)
      })
    },
    recompressAll() {
      window.clearTimeout(this.recompressTimer)
      this.recompressTimer = window.setTimeout(() => {
        this.items.forEach(item => {
          this.compressItem(item)
        })
      }, 180)
    },
    async compressItem(item) {
      item.status = 'processing'
      item.error = ''

      try {
        const image = await this.loadImage(item.originalUrl)
        const size = this.calculateTargetSize(image.naturalWidth, image.naturalHeight)
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        const outputType = this.outputFormat === 'original' ? item.originalType : this.outputFormat

        canvas.width = size.width
        canvas.height = size.height
        context.drawImage(image, 0, 0, size.width, size.height)

        const blob = await this.canvasToBlob(canvas, outputType, this.quality / 100)

        if (item.compressedUrl) {
          URL.revokeObjectURL(item.compressedUrl)
        }

        item.originalWidth = image.naturalWidth
        item.originalHeight = image.naturalHeight
        item.compressedBlob = blob
        item.compressedUrl = URL.createObjectURL(blob)
        item.compressedSize = blob.size
        item.outputType = blob.type || outputType
        item.outputWidth = size.width
        item.outputHeight = size.height
        item.ratio = item.originalSize ? Math.round((1 - blob.size / item.originalSize) * 100) : 0
        item.status = 'done'
      } catch (error) {
        item.status = 'error'
        item.error = error.message || '图片压缩失败'
      }
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('图片读取失败'))
        image.src = src
      })
    },
    calculateTargetSize(width, height) {
      const scale = Math.min(1, this.maxWidth / width, this.maxHeight / height)

      return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale))
      }
    },
    canvasToBlob(canvas, type, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('当前浏览器不支持该输出格式'))
          }
        }, type, quality)
      })
    },
    downloadItem(item) {
      if (!item.compressedBlob) {
        return
      }

      const link = document.createElement('a')
      link.href = item.compressedUrl
      link.download = this.getOutputFileName(item)
      link.click()
    },
    downloadAll() {
      this.compressedItems.forEach((item, index) => {
        window.setTimeout(() => {
          this.downloadItem(item)
        }, index * 120)
      })
    },
    getOutputFileName(item) {
      const extensionMap = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
      }
      const baseName = item.name.replace(/\.[^.]+$/, '')
      const extension = extensionMap[item.outputType] || 'jpg'

      return `${baseName}_compressed.${extension}`
    },
    removeItem(id) {
      const index = this.items.findIndex(item => item.id === id)

      if (index < 0) {
        return
      }

      this.revokeItemUrls(this.items[index])
      this.items.splice(index, 1)
    },
    clearImages() {
      this.items.forEach(this.revokeItemUrls)
      this.items = []
      this.errorMessage = ''
    },
    revokeItemUrls(item) {
      if (item.originalUrl) {
        URL.revokeObjectURL(item.originalUrl)
      }

      if (item.compressedUrl) {
        URL.revokeObjectURL(item.compressedUrl)
      }
    },
    formatBytes(value) {
      if (!Number.isFinite(value)) {
        return '-'
      }

      if (value < 1024) {
        return `${value} B`
      }

      if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(2)} KB`
      }

      return `${(value / 1024 / 1024).toFixed(2)} MB`
    },
    ratioText(item) {
      if (item.ratio >= 0) {
        return `压缩率 ${item.ratio}%`
      }

      return `增大 ${Math.abs(item.ratio)}%`
    },
    savedBytesText(item) {
      const saved = item.originalSize - item.compressedSize

      if (saved >= 0) {
        return this.formatBytes(saved)
      }

      return `-${this.formatBytes(Math.abs(saved))}`
    }
  }
}
</script>

<style lang="scss" scoped>
.image-compressor {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.image-compressor__header {
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

.image-compressor__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.image-compressor__file-input {
  display: none;
}

.compressor-panel,
.image-card {
  border-color: var(--color-border);
  border-radius: 8px;
}

.compressor-panel,
.image-compressor__alert,
.image-empty {
  margin-bottom: 18px;
}

.upload-zone {
  display: flex;
  min-height: 190px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-surface-soft);
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.18s ease, background 0.18s ease;

  i {
    margin-bottom: 10px;
    color: var(--color-primary);
    font-size: 34px;
  }

  strong {
    margin-bottom: 6px;
    color: var(--color-text);
    font-size: 16px;
  }

  span {
    font-size: 13px;
    line-height: 1.5;
  }
}

.upload-zone:hover,
.upload-zone.is-dragging {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.compressor-panel__header,
.image-card__header,
.image-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;

  small {
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(360px, 1.1fr);
  gap: 22px;
  align-items: start;
}

.quality-setting {
  color: var(--color-text);
  font-weight: 600;
}

.dimension-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dimension-form ::v-deep .el-input-number,
.dimension-form ::v-deep .el-select {
  width: 100%;
}

.image-empty {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
}

.image-list {
  display: grid;
  gap: 18px;
}

.image-card__header > div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

.image-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.image-card__error {
  margin-bottom: 14px;
}

.image-compare {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.image-preview {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.image-preview__header {
  min-height: 42px;
  padding: 0 12px;
  background: var(--color-surface-soft);
  border-bottom: 1px solid var(--color-border);
}

.image-preview__body {
  display: flex;
  min-height: 260px;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--color-surface);

  img {
    display: block;
    max-width: 100%;
    max-height: 360px;
    object-fit: contain;
  }
}

.image-preview__placeholder {
  color: var(--color-text-muted);
}

.image-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}

@media (max-width: 980px) {
  .image-compressor__header {
    flex-direction: column;
  }

  .image-compressor__actions {
    justify-content: flex-start;
  }

  .settings-grid,
  .image-compare {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .image-compressor__header h1 {
    font-size: 28px;
  }

  .image-compressor__actions,
  .image-compressor__actions .el-button {
    width: 100%;
  }

  .dimension-form {
    grid-template-columns: 1fr;
  }

  .image-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .image-card__actions {
    justify-content: flex-start;
  }
}
</style>
