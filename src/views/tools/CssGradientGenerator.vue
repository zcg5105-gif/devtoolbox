<template>
  <section class="gradient-generator">
    <div class="gradient-generator__header">
      <div>
        <h1>CSS 渐变生成器</h1>
        <p>可视化编辑颜色停靠点、方向和径向参数，实时生成带浏览器前缀的 CSS。</p>
      </div>

      <div class="gradient-generator__actions">
        <el-button size="small" icon="el-icon-document-copy" @click="copyCss">
          复制 CSS
        </el-button>
        <el-button size="small" icon="el-icon-refresh" @click="resetGradient">
          重置
        </el-button>
      </div>
    </div>

    <div class="gradient-layout">
      <section class="gradient-preview-panel">
        <div class="gradient-preview" :style="{ background: gradientValue }"></div>
        <div class="gradient-preview__meta">
          <span>{{ gradientTypeLabel }}</span>
          <strong>{{ stops.length }} 个颜色停靠点</strong>
        </div>
      </section>

      <el-card shadow="never" class="gradient-panel">
        <div slot="header" class="gradient-panel__header">
          <span>渐变方向</span>
        </div>

        <el-radio-group v-model="gradientType" size="small" class="gradient-type-tabs">
          <el-radio-button label="linear">线性渐变</el-radio-button>
          <el-radio-button label="radial">径向渐变</el-radio-button>
        </el-radio-group>

        <div v-if="gradientType === 'linear'" class="direction-controls">
          <label>角度：{{ angle }}deg</label>
          <el-slider v-model="angle" :min="0" :max="360" :step="1" />
        </div>

        <div v-else class="radial-controls">
          <el-form label-position="top" @submit.native.prevent>
            <el-form-item label="形状">
              <el-select v-model="radialShape">
                <el-option label="ellipse" value="ellipse" />
                <el-option label="circle" value="circle" />
              </el-select>
            </el-form-item>
            <el-form-item label="位置">
              <el-select v-model="radialPosition">
                <el-option
                  v-for="position in radialPositions"
                  :key="position"
                  :label="position"
                  :value="position"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="gradient-panel">
      <div slot="header" class="gradient-panel__header">
        <span>颜色停靠点</span>
        <el-button size="mini" icon="el-icon-plus" @click="addStop">
          添加
        </el-button>
      </div>

      <div class="stop-list">
        <div
          v-for="stop in sortedStops"
          :key="stop.id"
          class="stop-row"
        >
          <input
            class="native-color"
            type="color"
            :value="colorInputValue(stop.color)"
            @input="updateStopColor(stop.id, $event.target.value)"
          >
          <el-input
            v-model="stop.color"
            size="small"
            placeholder="#ff7a18 / rgb(255,122,24) / hsl(28,100%,55%)"
          />
          <div class="stop-position">
            <span>{{ stop.position }}%</span>
            <el-slider v-model="stop.position" :min="0" :max="100" :step="1" />
          </div>
          <el-button
            size="mini"
            icon="el-icon-delete"
            :disabled="stops.length <= 2"
            @click="removeStop(stop.id)"
          />
        </div>
      </div>
      <p class="format-hint">
        色值可输入 HEX、RGB、HSL；预览区域会按 CSS 原生颜色值实时渲染。
      </p>
    </el-card>

    <el-card shadow="never" class="gradient-panel">
      <div slot="header" class="gradient-panel__header">
        <span>预设渐变模板</span>
      </div>

      <div class="preset-grid">
        <button
          v-for="preset in presets"
          :key="preset.name"
          class="preset-card"
          :style="{ background: previewGradient(preset) }"
          @click="applyPreset(preset)"
        >
          <span>{{ preset.name }}</span>
        </button>
      </div>
    </el-card>

    <el-card shadow="never" class="gradient-panel">
      <div slot="header" class="gradient-panel__header">
        <span>CSS 代码</span>
        <small>包含 -webkit、-moz 和标准写法</small>
      </div>

      <pre class="css-output"><code>{{ cssCode }}</code></pre>
    </el-card>
  </section>
</template>

<script>
const DEFAULT_STOPS = [
  { color: '#ff7a18', position: 0 },
  { color: '#ffb347', position: 25 },
  { color: '#ff4e50', position: 50 },
  { color: '#9b5de5', position: 75 },
  { color: '#2ec4b6', position: 100 }
]

const PRESETS = [
  { name: '日落', colors: ['#ff7e5f', '#feb47b', '#ff6a88', '#d66d75', '#3a1c71'] },
  { name: '海洋', colors: ['#00c6ff', '#0072ff', '#2b5876', '#4e4376', '#001f3f'] },
  { name: '森林', colors: ['#134e5e', '#71b280', '#2d6a4f', '#95d5b2', '#081c15'] },
  { name: '极光', colors: ['#00f5a0', '#00d9f5', '#7b2ff7', '#f107a3', '#ffd166'] },
  { name: '糖果', colors: ['#ff9a9e', '#fad0c4', '#fbc2eb', '#a18cd1', '#84fab0'] },
  { name: '火焰', colors: ['#f12711', '#f5af19', '#ff512f', '#dd2476', '#7f0000'] },
  { name: '冰川', colors: ['#e0f7fa', '#80deea', '#26c6da', '#0288d1', '#01579b'] },
  { name: '葡萄', colors: ['#654ea3', '#eaafc8', '#b06ab3', '#4568dc', '#2b5876'] },
  { name: '晨曦', colors: ['#fceabb', '#f8b500', '#f2994a', '#f2c94c', '#ffffff'] },
  { name: '霓虹', colors: ['#12c2e9', '#c471ed', '#f64f59', '#ff00cc', '#333399'] }
]

export default {
  name: 'CssGradientGenerator',
  data() {
    return {
      gradientType: 'linear',
      angle: 90,
      radialShape: 'ellipse',
      radialPosition: 'center',
      radialPositions: [
        'center',
        'top',
        'bottom',
        'left',
        'right',
        'top left',
        'top right',
        'bottom left',
        'bottom right'
      ],
      stops: this.createStops(DEFAULT_STOPS),
      presets: PRESETS
    }
  },
  computed: {
    sortedStops() {
      return this.stops.slice().sort((first, second) => first.position - second.position)
    },
    stopText() {
      return this.sortedStops
        .map(stop => `${stop.color || '#000000'} ${stop.position}%`)
        .join(', ')
    },
    gradientValue() {
      if (this.gradientType === 'radial') {
        return `radial-gradient(${this.radialShape} at ${this.radialPosition}, ${this.stopText})`
      }

      return `linear-gradient(${this.angle}deg, ${this.stopText})`
    },
    prefixedGradientValue() {
      if (this.gradientType === 'radial') {
        return `${this.radialShape} at ${this.radialPosition}, ${this.stopText}`
      }

      return `${this.angle}deg, ${this.stopText}`
    },
    gradientFunctionName() {
      return this.gradientType === 'radial' ? 'radial-gradient' : 'linear-gradient'
    },
    cssCode() {
      const fallback = this.sortedStops[0] ? this.sortedStops[0].color : '#000000'

      return [
        '.gradient {',
        `  background: ${fallback};`,
        `  background: -webkit-${this.gradientFunctionName}(${this.prefixedGradientValue});`,
        `  background: -moz-${this.gradientFunctionName}(${this.prefixedGradientValue});`,
        `  background: ${this.gradientValue};`,
        '}'
      ].join('\n')
    },
    gradientTypeLabel() {
      if (this.gradientType === 'radial') {
        return `径向渐变 · ${this.radialShape} at ${this.radialPosition}`
      }

      return `线性渐变 · ${this.angle}deg`
    }
  },
  methods: {
    createStops(stops) {
      return stops.map(stop => ({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        color: stop.color,
        position: stop.position
      }))
    },
    addStop() {
      const last = this.sortedStops[this.sortedStops.length - 1]
      const position = last ? Math.min(100, last.position + 10) : 100

      this.stops.push({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        color: '#ffffff',
        position
      })
    },
    removeStop(id) {
      if (this.stops.length <= 2) {
        return
      }

      this.stops = this.stops.filter(stop => stop.id !== id)
    },
    updateStopColor(id, color) {
      const stop = this.stops.find(item => item.id === id)

      if (stop) {
        stop.color = color
      }
    },
    colorInputValue(color) {
      return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000'
    },
    applyPreset(preset) {
      this.gradientType = 'linear'
      this.angle = 90
      this.stops = this.createStops(preset.colors.map((color, index) => ({
        color,
        position: Math.round((index / (preset.colors.length - 1)) * 100)
      })))
    },
    previewGradient(preset) {
      const stops = preset.colors
        .map((color, index) => `${color} ${Math.round((index / (preset.colors.length - 1)) * 100)}%`)
        .join(', ')

      return `linear-gradient(90deg, ${stops})`
    },
    resetGradient() {
      this.gradientType = 'linear'
      this.angle = 90
      this.radialShape = 'ellipse'
      this.radialPosition = 'center'
      this.stops = this.createStops(DEFAULT_STOPS)
    },
    async copyCss() {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.cssCode)
        } else {
          this.copyWithFallback(this.cssCode)
        }
        this.$message.success('CSS 已复制')
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
.gradient-generator {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.gradient-generator__header {
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

.gradient-generator__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.gradient-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  margin-bottom: 18px;
}

.gradient-preview-panel {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.gradient-preview {
  min-height: 320px;
}

.gradient-preview__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 0 14px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);

  strong {
    color: var(--color-text);
  }
}

.gradient-panel {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.gradient-panel__header {
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

.gradient-type-tabs {
  margin-bottom: 18px;
}

.direction-controls label,
.quality-setting label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 600;
}

.radial-controls ::v-deep .el-select {
  width: 100%;
}

.stop-list {
  display: grid;
  gap: 12px;
}

.stop-row {
  display: grid;
  grid-template-columns: 44px minmax(160px, 0.55fr) minmax(220px, 1fr) 40px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.native-color {
  width: 38px;
  height: 34px;
  padding: 0;
  overflow: hidden;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
}

.stop-position {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  span {
    color: var(--color-text-muted);
    font-size: 13px;
    text-align: right;
  }
}

.format-hint {
  margin: 12px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.preset-card {
  min-height: 78px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
  text-align: left;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
}

.css-output {
  min-height: 150px;
  margin: 0;
  overflow: auto;
  padding: 14px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre;
}

@media (max-width: 980px) {
  .gradient-generator__header {
    flex-direction: column;
  }

  .gradient-generator__actions {
    justify-content: flex-start;
  }

  .gradient-layout,
  .stop-row,
  .preset-grid {
    grid-template-columns: 1fr;
  }

  .stop-position {
    grid-template-columns: 1fr;
  }

  .stop-position span {
    text-align: left;
  }
}

@media (max-width: 560px) {
  .gradient-generator__header h1 {
    font-size: 28px;
  }

  .gradient-generator__actions,
  .gradient-generator__actions .el-button {
    width: 100%;
  }

  .gradient-preview {
    min-height: 240px;
  }
}
</style>
