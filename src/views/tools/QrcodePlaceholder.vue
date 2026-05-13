<template>
  <section class="qrcode-tool">
    <div class="qrcode-tool__header">
      <h1>二维码生成和解析</h1>
      <p>生成可下载的二维码，支持颜色、尺寸、容错等级和中心 Logo；也可以上传图片解析二维码内容。</p>
    </div>

    <div class="qrcode-tool__grid">
      <el-card shadow="never" class="qrcode-panel">
        <div slot="header" class="qrcode-panel__header">
          <span>二维码生成器</span>
          <el-button
            type="primary"
            size="mini"
            icon="el-icon-download"
            :disabled="!canDownload"
            @click="downloadQrCode"
          >
            下载 PNG
          </el-button>
        </div>

        <div class="qrcode-generator">
          <el-form label-position="top" @submit.native.prevent>
            <el-form-item label="文本 / URL">
              <el-input
                v-model="qrText"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 8 }"
                placeholder="请输入要写入二维码的文本、URL、WiFi 配置或 vCard"
              />
            </el-form-item>

            <div class="qrcode-presets" aria-label="常用预设">
              <el-button size="mini" @click="applyPreset('currentUrl')">
                当前页面 URL
              </el-button>
              <el-button size="mini" @click="applyPreset('hello')">
                Hello World
              </el-button>
              <el-button size="mini" @click="applyPreset('wifi')">
                WiFi 配置
              </el-button>
              <el-button size="mini" @click="applyPreset('vcard')">
                名片 vCard
              </el-button>
            </div>

            <el-form-item label="尺寸">
              <div class="qrcode-slider-row">
                <el-slider
                  v-model="qrSize"
                  :min="100"
                  :max="500"
                  :step="10"
                  show-stops
                />
                <span class="qrcode-size-value">{{ qrSize }}px</span>
              </div>
            </el-form-item>

            <el-form-item label="容错等级">
              <el-radio-group v-model="errorCorrectionLevel" size="small">
                <el-radio-button label="L">L</el-radio-button>
                <el-radio-button label="M">M</el-radio-button>
                <el-radio-button label="Q">Q</el-radio-button>
                <el-radio-button label="H">H</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <div class="qrcode-color-grid">
              <el-form-item label="前景色">
                <div class="qrcode-color-field">
                  <el-color-picker v-model="foregroundColor" />
                  <el-input v-model="foregroundColor" size="small" maxlength="7" />
                </div>
              </el-form-item>

              <el-form-item label="背景色">
                <div class="qrcode-color-field">
                  <el-color-picker v-model="backgroundColor" />
                  <el-input v-model="backgroundColor" size="small" maxlength="7" />
                </div>
              </el-form-item>
            </div>

            <el-form-item label="中心 Logo（可选）">
              <div class="qrcode-upload-row">
                <input
                  ref="logoInput"
                  class="qrcode-hidden-input"
                  type="file"
                  accept="image/*"
                  @change="handleLogoChange"
                >
                <el-button icon="el-icon-upload2" @click="openLogoPicker">
                  上传 Logo
                </el-button>
                <el-button
                  v-if="logoDataUrl"
                  icon="el-icon-delete"
                  @click="removeLogo"
                >
                  移除
                </el-button>
                <span v-if="logoFileName" class="qrcode-file-name">{{ logoFileName }}</span>
              </div>
            </el-form-item>
          </el-form>

          <div class="qrcode-preview">
            <div class="qrcode-preview__canvas-wrap">
              <canvas ref="qrCanvas" :width="qrSize" :height="qrSize"></canvas>
              <div v-if="!qrText.trim()" class="qrcode-preview__empty">
                输入内容后实时生成
              </div>
            </div>
            <p v-if="generationError" class="qrcode-status qrcode-status--error">
              {{ generationError }}
            </p>
            <p v-else class="qrcode-status">
              {{ isGenerating ? '正在生成...' : '预览会随输入和样式变化自动更新' }}
            </p>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="qrcode-panel">
        <div slot="header" class="qrcode-panel__header">
          <span>二维码解析器</span>
          <CopyButton :text="decodeResult" />
        </div>

        <div
          class="qrcode-dropzone"
          :class="{ 'is-dragging': isDragging }"
          @click="openDecodePicker"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDecodeDrop"
        >
          <input
            ref="decodeInput"
            class="qrcode-hidden-input"
            type="file"
            accept="image/*"
            @change="handleDecodeFileChange"
          >
          <i class="el-icon-upload"></i>
          <strong>点击上传二维码图片</strong>
          <span>或将图片拖拽到这里</span>
          <em v-if="decodeFileName">{{ decodeFileName }}</em>
        </div>

        <div v-if="decodePreviewUrl" class="qrcode-image-preview">
          <img :src="decodePreviewUrl" alt="上传的二维码图片">
        </div>

        <div class="qrcode-decode-result">
          <div class="qrcode-decode-result__header">
            <span>解析结果</span>
            <el-button
              v-if="isDecodedUrl"
              size="mini"
              type="primary"
              icon="el-icon-link"
              @click="openDecodedUrl"
            >
              打开链接
            </el-button>
          </div>

          <pre v-if="decodeResult">{{ decodeResult }}</pre>
          <div v-else class="qrcode-result-empty">
            {{ decodeError || (isDecoding ? '正在解析...' : '上传二维码图片后显示解析结果') }}
          </div>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script>
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import CopyButton from '@/components/CopyButton.vue'

const PRESETS = {
  hello: 'Hello World',
  wifi: 'WIFI:T:WPA;S:我的WiFi;P:123456;;',
  vcard: [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:张三',
    'FN:张三',
    'ORG:DevToolBox',
    'TITLE:Developer',
    'TEL;TYPE=CELL:13800138000',
    'EMAIL:zhangsan@example.com',
    'URL:https://example.com',
    'END:VCARD'
  ].join('\n')
}

export default {
  name: 'QrcodePlaceholder',
  components: {
    CopyButton
  },
  data() {
    return {
      qrText: 'Hello World',
      qrSize: 260,
      errorCorrectionLevel: 'M',
      foregroundColor: '#000000',
      backgroundColor: '#ffffff',
      logoDataUrl: '',
      logoFileName: '',
      generationError: '',
      isGenerating: false,
      renderTimer: null,
      renderToken: 0,
      decodeResult: '',
      decodeError: '',
      decodeFileName: '',
      decodePreviewUrl: '',
      isDragging: false,
      isDecoding: false
    }
  },
  computed: {
    canDownload() {
      return Boolean(this.qrText.trim()) && !this.generationError && !this.isGenerating
    },
    isDecodedUrl() {
      return this.isValidUrl(this.decodeResult.trim())
    }
  },
  watch: {
    qrText: 'scheduleRender',
    qrSize: 'scheduleRender',
    errorCorrectionLevel: 'scheduleRender',
    foregroundColor: 'scheduleRender',
    backgroundColor: 'scheduleRender',
    logoDataUrl: 'scheduleRender'
  },
  mounted() {
    this.renderQrCode()
  },
  beforeDestroy() {
    window.clearTimeout(this.renderTimer)
  },
  methods: {
    scheduleRender() {
      window.clearTimeout(this.renderTimer)
      this.renderTimer = window.setTimeout(() => {
        this.renderQrCode()
      }, 120)
    },
    async renderQrCode() {
      const canvas = this.$refs.qrCanvas

      if (!canvas) {
        return
      }

      if (!this.qrText.trim()) {
        this.clearCanvas(canvas)
        this.generationError = ''
        return
      }

      const token = ++this.renderToken
      this.isGenerating = true
      this.generationError = ''

      try {
        await QRCode.toCanvas(canvas, this.qrText, {
          width: this.qrSize,
          margin: 2,
          errorCorrectionLevel: this.errorCorrectionLevel,
          color: {
            dark: this.normalizeColor(this.foregroundColor, '#000000'),
            light: this.normalizeColor(this.backgroundColor, '#ffffff')
          }
        })

        if (token !== this.renderToken) {
          return
        }

        if (this.logoDataUrl) {
          await this.drawLogo(canvas, this.logoDataUrl, token)
        }
      } catch (error) {
        if (token === this.renderToken) {
          this.clearCanvas(canvas)
          this.generationError = '生成失败，请检查输入内容或颜色格式'
        }
      } finally {
        if (token === this.renderToken) {
          this.isGenerating = false
        }
      }
    },
    clearCanvas(canvas) {
      const context = canvas.getContext('2d')
      context.clearRect(0, 0, canvas.width, canvas.height)
    },
    normalizeColor(value, fallback) {
      return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
    },
    async drawLogo(canvas, dataUrl, token) {
      const image = await this.loadImage(dataUrl)

      if (token !== this.renderToken) {
        return
      }

      const context = canvas.getContext('2d')
      const logoSize = Math.round(canvas.width * 0.22)
      const padding = Math.max(6, Math.round(logoSize * 0.16))
      const boxSize = logoSize + padding * 2
      const boxX = Math.round((canvas.width - boxSize) / 2)
      const boxY = Math.round((canvas.height - boxSize) / 2)
      const radius = Math.max(8, Math.round(boxSize * 0.08))
      const scale = Math.min(logoSize / image.naturalWidth, logoSize / image.naturalHeight)
      const drawWidth = Math.round(image.naturalWidth * scale)
      const drawHeight = Math.round(image.naturalHeight * scale)
      const drawX = Math.round((canvas.width - drawWidth) / 2)
      const drawY = Math.round((canvas.height - drawHeight) / 2)

      context.save()
      this.drawRoundRect(context, boxX, boxY, boxSize, boxSize, radius)
      context.fillStyle = this.normalizeColor(this.backgroundColor, '#ffffff')
      context.fill()
      context.strokeStyle = 'rgba(0, 0, 0, 0.08)'
      context.lineWidth = 1
      context.stroke()
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      context.restore()
    },
    drawRoundRect(context, x, y, width, height, radius) {
      const right = x + width
      const bottom = y + height

      context.beginPath()
      context.moveTo(x + radius, y)
      context.lineTo(right - radius, y)
      context.quadraticCurveTo(right, y, right, y + radius)
      context.lineTo(right, bottom - radius)
      context.quadraticCurveTo(right, bottom, right - radius, bottom)
      context.lineTo(x + radius, bottom)
      context.quadraticCurveTo(x, bottom, x, bottom - radius)
      context.lineTo(x, y + radius)
      context.quadraticCurveTo(x, y, x + radius, y)
      context.closePath()
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = src
      })
    },
    openLogoPicker() {
      this.$refs.logoInput.click()
    },
    handleLogoChange(event) {
      const file = event.target.files && event.target.files[0]

      if (file) {
        this.readLogoFile(file)
      }

      event.target.value = ''
    },
    readLogoFile(file) {
      if (!file.type.startsWith('image/')) {
        this.$message.warning('请选择图片文件')
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          this.$message.error('Logo 读取失败')
          return
        }

        this.logoDataUrl = reader.result
        this.logoFileName = file.name
      }

      reader.onerror = () => {
        this.$message.error('Logo 读取失败')
      }

      reader.readAsDataURL(file)
    },
    removeLogo() {
      this.logoDataUrl = ''
      this.logoFileName = ''
    },
    applyPreset(type) {
      if (type === 'currentUrl') {
        this.qrText = window.location.href
        return
      }

      this.qrText = PRESETS[type] || ''
    },
    downloadQrCode() {
      const canvas = this.$refs.qrCanvas

      if (!this.canDownload || !canvas) {
        this.$message.warning('请先生成二维码')
        return
      }

      const link = document.createElement('a')
      link.download = `qrcode_${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    },
    openDecodePicker() {
      this.$refs.decodeInput.click()
    },
    handleDecodeFileChange(event) {
      const file = event.target.files && event.target.files[0]

      if (file) {
        this.decodeImageFile(file)
      }

      event.target.value = ''
    },
    handleDecodeDrop(event) {
      this.isDragging = false
      const file = event.dataTransfer.files && event.dataTransfer.files[0]

      if (file) {
        this.decodeImageFile(file)
      }
    },
    async decodeImageFile(file) {
      if (!file.type.startsWith('image/')) {
        this.$message.warning('请选择图片文件')
        return
      }

      this.isDecoding = true
      this.decodeResult = ''
      this.decodeError = ''
      this.decodeFileName = file.name

      try {
        const dataUrl = await this.readFileAsDataUrl(file)
        const image = await this.loadImage(dataUrl)
        const imageData = this.getImageDataFromImage(image)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        })

        this.decodePreviewUrl = dataUrl

        if (code && code.data) {
          this.decodeResult = code.data
          this.$message.success('解析成功')
        } else {
          this.decodeError = '解析失败，未识别到二维码内容'
        }
      } catch (error) {
        this.decodeError = '解析失败，请换一张更清晰的二维码图片'
      } finally {
        this.isDecoding = false
      }
    },
    readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Invalid file result'))
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    },
    getImageDataFromImage(image) {
      const maxSide = 2400
      const sourceWidth = image.naturalWidth || image.width
      const sourceHeight = image.naturalHeight || image.height
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight))
      const canvas = document.createElement('canvas')
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))
      const context = canvas.getContext('2d', { willReadFrequently: true })

      canvas.width = width
      canvas.height = height
      context.drawImage(image, 0, 0, width, height)

      return context.getImageData(0, 0, width, height)
    },
    isValidUrl(value) {
      if (!value) {
        return false
      }

      try {
        const url = new URL(value)
        return ['http:', 'https:'].includes(url.protocol)
      } catch (error) {
        return false
      }
    },
    openDecodedUrl() {
      if (!this.isDecodedUrl) {
        return
      }

      window.open(this.decodeResult.trim(), '_blank', 'noopener,noreferrer')
    }
  }
}
</script>

<style lang="scss" scoped>
.qrcode-tool {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.qrcode-tool__header {
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

.qrcode-tool__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.qrcode-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.qrcode-panel__header,
.qrcode-decode-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.qrcode-generator {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 20px;
  align-items: start;
}

.qrcode-presets,
.qrcode-upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.qrcode-slider-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 68px;
  align-items: center;
  gap: 14px;
}

.qrcode-size-value {
  color: var(--color-text-muted);
  font-size: 13px;
  text-align: right;
}

.qrcode-color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.qrcode-color-field {
  display: flex;
  align-items: center;
  gap: 10px;

  .el-input {
    width: 112px;
  }
}

.qrcode-hidden-input {
  display: none;
}

.qrcode-file-name {
  min-width: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.qrcode-preview {
  position: sticky;
  top: calc(var(--topbar-height) + 24px);
}

.qrcode-preview__canvas-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 14px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.qrcode-preview canvas {
  display: block;
  max-width: 100%;
  height: auto;
  background: #ffffff;
  border-radius: 6px;
}

.qrcode-preview__empty {
  position: absolute;
  inset: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-soft);
  color: var(--color-text-muted);
  font-size: 14px;
  text-align: center;
}

.qrcode-status {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.qrcode-status--error {
  color: #e11d48;
}

.qrcode-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 178px;
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

  span,
  em {
    font-size: 13px;
    font-style: normal;
    line-height: 1.5;
  }

  em {
    max-width: 100%;
    margin-top: 10px;
    overflow-wrap: anywhere;
  }
}

.qrcode-dropzone.is-dragging,
.qrcode-dropzone:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.qrcode-image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  margin-top: 18px;
  padding: 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  img {
    display: block;
    max-width: 100%;
    max-height: 260px;
    object-fit: contain;
  }
}

.qrcode-decode-result {
  margin-top: 18px;
}

.qrcode-decode-result__header {
  margin-bottom: 10px;
}

.qrcode-decode-result pre,
.qrcode-result-empty {
  min-height: 138px;
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

.qrcode-result-empty {
  display: flex;
  align-items: center;
  color: var(--color-text-muted);
  font-family: inherit;
}

@media (max-width: 1120px) {
  .qrcode-generator {
    grid-template-columns: 1fr;
  }

  .qrcode-preview {
    position: static;
  }
}

@media (max-width: 900px) {
  .qrcode-tool__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .qrcode-tool__header h1 {
    font-size: 28px;
  }

  .qrcode-color-grid,
  .qrcode-slider-row {
    grid-template-columns: 1fr;
  }

  .qrcode-size-value {
    text-align: left;
  }
}
</style>
