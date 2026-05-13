<template>
  <section class="color-palette">
    <div class="color-palette__header">
      <div>
        <h1>颜色调色板</h1>
        <p>选择主色后自动生成配色方案，支持图片取色、对比度检测和调色板导出。</p>
      </div>

      <div class="color-palette__actions">
        <el-button size="small" icon="el-icon-refresh" @click="randomPalette">
          随机配色
        </el-button>
        <el-button size="small" icon="el-icon-download" @click="exportJson">
          导出 JSON
        </el-button>
        <el-button size="small" icon="el-icon-document-copy" @click="copyCssVariables">
          复制 CSS 变量
        </el-button>
      </div>
    </div>

    <div class="palette-top-grid">
      <el-card shadow="never" class="palette-panel">
        <div slot="header" class="palette-panel__header">
          <span>主色选择器</span>
          <small>{{ normalizedMainColor }}</small>
        </div>

        <div class="main-color-control">
          <input v-model="mainColor" class="native-color" type="color">
          <el-input v-model.trim="mainColor" placeholder="#2563eb" @change="normalizeMainColor" />
        </div>

        <div class="main-color-preview" :style="{ backgroundColor: normalizedMainColor }">
          <span :style="{ color: bestTextColor(normalizedMainColor) }">Preview</span>
        </div>
      </el-card>

      <el-card shadow="never" class="palette-panel">
        <div slot="header" class="palette-panel__header">
          <span>从图片提取颜色</span>
          <small>Canvas 本地处理</small>
        </div>

        <div class="image-picker">
          <input
            ref="imageInput"
            class="hidden-input"
            type="file"
            accept="image/*"
            @change="handleImageFile"
          >
          <el-button icon="el-icon-upload2" @click="openImagePicker">
            上传图片
          </el-button>
          <span v-if="imageName">{{ imageName }}</span>
        </div>

        <div v-if="extractedColors.length" class="extracted-grid">
          <button
            v-for="color in extractedColors"
            :key="color"
            class="extracted-color"
            :style="{ backgroundColor: color }"
            @click="setMainColor(color)"
          >
            <span :style="{ color: bestTextColor(color) }">{{ color }}</span>
          </button>
        </div>
        <div v-else class="empty-extracted">
          上传图片后显示主色调
        </div>
      </el-card>
    </div>

    <div class="scheme-list">
      <el-card
        v-for="scheme in schemes"
        :key="scheme.key"
        shadow="never"
        class="palette-panel scheme-card"
      >
        <div slot="header" class="palette-panel__header">
          <span>{{ scheme.name }}</span>
          <small>{{ scheme.description }}</small>
        </div>

        <div class="swatch-grid">
          <div
            v-for="color in scheme.colors"
            :key="`${scheme.key}-${color.hex}`"
            class="swatch-card"
          >
            <div class="swatch-preview" :style="{ backgroundColor: color.hex }">
              <span :style="{ color: color.bestText }">
                {{ color.contrastLabel }}
              </span>
            </div>
            <div class="swatch-info">
              <div class="swatch-line">
                <strong>HEX</strong>
                <code>{{ color.hex }}</code>
                <el-button size="mini" icon="el-icon-document-copy" @click="copyText(color.hex)" />
              </div>
              <div class="swatch-line">
                <strong>RGB</strong>
                <code>{{ color.rgbText }}</code>
                <el-button size="mini" icon="el-icon-document-copy" @click="copyText(color.rgbText)" />
              </div>
              <div class="swatch-line">
                <strong>HSL</strong>
                <code>{{ color.hslText }}</code>
                <el-button size="mini" icon="el-icon-document-copy" @click="copyText(color.hslText)" />
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="palette-panel">
      <div slot="header" class="palette-panel__header">
        <span>调色板导出</span>
        <small>基于所有方案去重后生成</small>
      </div>

      <div class="export-grid">
        <pre><code>{{ paletteJson }}</code></pre>
        <pre><code>{{ cssVariables }}</code></pre>
      </div>
    </el-card>
  </section>
</template>

<script>
const SCHEME_DEFS = [
  { key: 'complementary', name: '互补色', offsets: [0, 180], description: '180deg' },
  { key: 'analogous', name: '类似色', offsets: [-30, 0, 30], description: '-30deg / 0deg / 30deg' },
  { key: 'triadic', name: '三等分配色', offsets: [0, 120, 240], description: '0deg / 120deg / 240deg' },
  { key: 'tetradic', name: '四等分配色', offsets: [0, 90, 180, 270], description: '0deg / 90deg / 180deg / 270deg' }
]

export default {
  name: 'ColorPalette',
  data() {
    return {
      mainColor: '#2563eb',
      imageName: '',
      extractedColors: []
    }
  },
  computed: {
    normalizedMainColor() {
      return this.normalizeHex(this.mainColor) || '#2563eb'
    },
    mainHsl() {
      return this.rgbToHsl(this.hexToRgb(this.normalizedMainColor))
    },
    schemes() {
      return SCHEME_DEFS.map(scheme => ({
        ...scheme,
        colors: scheme.offsets.map(offset => {
          const hue = (this.mainHsl.h + offset + 360) % 360
          return this.createColorInfo(this.hslToHex({
            h: hue,
            s: this.mainHsl.s,
            l: this.mainHsl.l
          }))
        })
      }))
    },
    uniqueColors() {
      const map = new Map()
      this.schemes.forEach(scheme => {
        scheme.colors.forEach(color => {
          map.set(color.hex, color)
        })
      })
      return Array.from(map.values())
    },
    paletteJson() {
      return JSON.stringify(this.uniqueColors.map(color => ({
        hex: color.hex,
        rgb: color.rgb,
        hsl: color.hsl,
        contrast: {
          black: color.blackContrast,
          white: color.whiteContrast,
          recommendedText: color.bestText
        }
      })), null, 2)
    },
    cssVariables() {
      const lines = this.uniqueColors.map((color, index) => `  --palette-color-${index + 1}: ${color.hex};`)
      return [':root {', ...lines, '}'].join('\n')
    }
  },
  methods: {
    normalizeMainColor() {
      const normalized = this.normalizeHex(this.mainColor)

      if (normalized) {
        this.mainColor = normalized
      }
    },
    setMainColor(color) {
      this.mainColor = color
    },
    randomPalette() {
      this.mainColor = this.rgbToHex({
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256)
      })
    },
    createColorInfo(hex) {
      const rgb = this.hexToRgb(hex)
      const hsl = this.rgbToHsl(rgb)
      const blackContrast = this.contrastRatio(rgb, { r: 0, g: 0, b: 0 })
      const whiteContrast = this.contrastRatio(rgb, { r: 255, g: 255, b: 255 })
      const bestText = blackContrast >= whiteContrast ? '#000000' : '#ffffff'
      const bestRatio = Math.max(blackContrast, whiteContrast)

      return {
        hex,
        rgb,
        hsl,
        rgbText: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        hslText: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        blackContrast: blackContrast.toFixed(2),
        whiteContrast: whiteContrast.toFixed(2),
        bestText,
        contrastLabel: bestRatio >= 4.5 ? 'AA 可读' : '低对比'
      }
    },
    openImagePicker() {
      this.$refs.imageInput.click()
    },
    handleImageFile(event) {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        return
      }

      if (!file.type.startsWith('image/')) {
        this.$message.warning('请选择图片文件')
        event.target.value = ''
        return
      }

      this.imageName = file.name
      this.extractColorsFromImage(file)
      event.target.value = ''
    },
    extractColorsFromImage(file) {
      const reader = new FileReader()

      reader.onload = () => {
        const image = new Image()
        image.onload = () => {
          const canvas = document.createElement('canvas')
          const size = 160
          const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight))
          const width = Math.max(1, Math.round(image.naturalWidth * scale))
          const height = Math.max(1, Math.round(image.naturalHeight * scale))
          const context = canvas.getContext('2d', { willReadFrequently: true })

          canvas.width = width
          canvas.height = height
          context.drawImage(image, 0, 0, width, height)
          this.extractedColors = this.quantizeColors(context.getImageData(0, 0, width, height).data)

          if (this.extractedColors[0]) {
            this.mainColor = this.extractedColors[0]
          }
        }
        image.src = reader.result
      }

      reader.onerror = () => {
        this.$message.error('图片读取失败')
      }

      reader.readAsDataURL(file)
    },
    quantizeColors(data) {
      const buckets = new Map()

      for (let index = 0; index < data.length; index += 16) {
        const alpha = data[index + 3]
        if (alpha < 128) {
          continue
        }

        const r = Math.round(data[index] / 32) * 32
        const g = Math.round(data[index + 1] / 32) * 32
        const b = Math.round(data[index + 2] / 32) * 32
        const key = `${Math.min(r, 255)},${Math.min(g, 255)},${Math.min(b, 255)}`
        buckets.set(key, (buckets.get(key) || 0) + 1)
      }

      return Array.from(buckets.entries())
        .sort((first, second) => second[1] - first[1])
        .slice(0, 8)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number)
          return this.rgbToHex({ r, g, b })
        })
    },
    normalizeHex(value) {
      const color = value.trim()

      if (/^#[0-9a-fA-F]{6}$/.test(color)) {
        return color.toUpperCase()
      }

      if (/^#[0-9a-fA-F]{3}$/.test(color)) {
        return `#${color.slice(1).split('').map(char => char + char).join('')}`.toUpperCase()
      }

      return ''
    },
    hexToRgb(hex) {
      const normalized = this.normalizeHex(hex)
      const value = normalized.slice(1)

      return {
        r: parseInt(value.slice(0, 2), 16),
        g: parseInt(value.slice(2, 4), 16),
        b: parseInt(value.slice(4, 6), 16)
      }
    },
    rgbToHex({ r, g, b }) {
      return `#${[r, g, b].map(value => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`.toUpperCase()
    },
    rgbToHsl({ r, g, b }) {
      const red = r / 255
      const green = g / 255
      const blue = b / 255
      const max = Math.max(red, green, blue)
      const min = Math.min(red, green, blue)
      let h = 0
      let s = 0
      const l = (max + min) / 2

      if (max !== min) {
        const delta = max - min
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

        if (max === red) {
          h = (green - blue) / delta + (green < blue ? 6 : 0)
        } else if (max === green) {
          h = (blue - red) / delta + 2
        } else {
          h = (red - green) / delta + 4
        }

        h /= 6
      }

      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      }
    },
    hslToHex({ h, s, l }) {
      const saturation = s / 100
      const lightness = l / 100
      const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
      const hue = h / 60
      const x = chroma * (1 - Math.abs((hue % 2) - 1))
      const match = lightness - chroma / 2
      let rgb = [0, 0, 0]

      if (hue >= 0 && hue < 1) rgb = [chroma, x, 0]
      else if (hue < 2) rgb = [x, chroma, 0]
      else if (hue < 3) rgb = [0, chroma, x]
      else if (hue < 4) rgb = [0, x, chroma]
      else if (hue < 5) rgb = [x, 0, chroma]
      else rgb = [chroma, 0, x]

      return this.rgbToHex({
        r: Math.round((rgb[0] + match) * 255),
        g: Math.round((rgb[1] + match) * 255),
        b: Math.round((rgb[2] + match) * 255)
      })
    },
    relativeLuminance({ r, g, b }) {
      const transform = value => {
        const channel = value / 255
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)
      }

      return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b)
    },
    contrastRatio(first, second) {
      const firstLum = this.relativeLuminance(first)
      const secondLum = this.relativeLuminance(second)
      const lighter = Math.max(firstLum, secondLum)
      const darker = Math.min(firstLum, secondLum)

      return (lighter + 0.05) / (darker + 0.05)
    },
    bestTextColor(hex) {
      const rgb = this.hexToRgb(hex)
      return this.contrastRatio(rgb, { r: 0, g: 0, b: 0 }) >= this.contrastRatio(rgb, { r: 255, g: 255, b: 255 })
        ? '#000000'
        : '#ffffff'
    },
    exportJson() {
      const blob = new Blob([this.paletteJson], {
        type: 'application/json;charset=utf-8'
      })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `palette_${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    async copyCssVariables() {
      await this.copyText(this.cssVariables)
    },
    async copyText(text) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text)
        } else {
          this.copyWithFallback(text)
        }
        this.$message.success('复制成功')
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
    }
  }
}
</script>

<style lang="scss" scoped>
.color-palette {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.color-palette__header {
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

.color-palette__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.palette-top-grid {
  display: grid;
  grid-template-columns: 0.85fr 1.15fr;
  gap: 18px;
  margin-bottom: 18px;
}

.palette-panel {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.palette-panel__header {
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

.main-color-control {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;
}

.native-color {
  width: 64px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
}

.main-color-preview {
  display: flex;
  min-height: 150px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;

  span {
    font-size: 28px;
    font-weight: 800;
  }
}

.hidden-input {
  display: none;
}

.image-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  span {
    color: var(--color-text-muted);
    overflow-wrap: anywhere;
  }
}

.extracted-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.extracted-color {
  min-height: 60px;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.empty-extracted {
  display: flex;
  min-height: 104px;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
}

.scheme-list {
  display: grid;
  gap: 0;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.swatch-card {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.swatch-preview {
  display: flex;
  min-height: 110px;
  align-items: center;
  justify-content: center;

  span {
    font-weight: 800;
  }
}

.swatch-info {
  display: grid;
  gap: 8px;
  padding: 10px;
  background: var(--color-surface);
}

.swatch-line {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 34px;
  gap: 8px;
  align-items: center;

  strong {
    color: var(--color-text-muted);
    font-size: 12px;
  }

  code {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 13px;
  }
}

.export-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.export-grid pre {
  min-height: 220px;
  margin: 0;
  overflow: auto;
  padding: 14px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .color-palette__header {
    flex-direction: column;
  }

  .color-palette__actions {
    justify-content: flex-start;
  }

  .palette-top-grid,
  .export-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .color-palette__header h1 {
    font-size: 28px;
  }

  .color-palette__actions,
  .color-palette__actions .el-button,
  .main-color-control,
  .extracted-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .palette-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
