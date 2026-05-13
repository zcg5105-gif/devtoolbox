<template>
  <section class="shadow-generator">
    <div class="shadow-generator__header">
      <div>
        <h1>CSS 阴影生成器</h1>
        <p>可视化生成 box-shadow 和 text-shadow，支持多重阴影层和 CSS 类导出。</p>
      </div>

      <div class="shadow-generator__actions">
        <el-button size="small" icon="el-icon-document-copy" @click="copyCss">
          复制 CSS
        </el-button>
        <el-button size="small" icon="el-icon-refresh" @click="resetShadows">
          重置
        </el-button>
      </div>
    </div>

    <div class="shadow-layout">
      <section class="preview-panel">
        <div class="preview-stage">
          <div class="preview-box" :style="{ boxShadow: boxShadowValue }">
            Box Shadow
          </div>
          <p class="preview-text" :style="{ textShadow: textShadowValue }">
            Text Shadow Preview
          </p>
        </div>
      </section>

      <el-card shadow="never" class="shadow-panel">
        <div slot="header" class="shadow-panel__header">
          <span>阴影类型</span>
        </div>

        <el-radio-group v-model="shadowMode" size="small">
          <el-radio-button label="box">box-shadow</el-radio-button>
          <el-radio-button label="text">text-shadow</el-radio-button>
        </el-radio-group>
      </el-card>
    </div>

    <el-card shadow="never" class="shadow-panel">
      <div slot="header" class="shadow-panel__header">
        <span>阴影层</span>
        <el-button size="mini" icon="el-icon-plus" @click="addLayer">
          添加阴影层
        </el-button>
      </div>

      <div class="layer-list">
        <div
          v-for="(layer, index) in layers"
          :key="layer.id"
          class="layer-card"
          :class="{ 'is-active': activeLayerId === layer.id }"
        >
          <button class="layer-card__title" @click="activeLayerId = layer.id">
            <strong>Layer {{ index + 1 }}</strong>
            <span>{{ layerToCss(layer) }}</span>
          </button>
          <el-button
            size="mini"
            icon="el-icon-delete"
            :disabled="layers.length <= 1"
            @click="removeLayer(layer.id)"
          />
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="shadow-panel">
      <div slot="header" class="shadow-panel__header">
        <span>控制面板</span>
        <small>{{ activeLayer ? layerToCss(activeLayer) : '' }}</small>
      </div>

      <div v-if="activeLayer" class="controls-grid">
        <div class="control-row">
          <label>水平偏移：{{ activeLayer.x }}px</label>
          <el-slider v-model="activeLayer.x" :min="-50" :max="50" :step="1" />
        </div>

        <div class="control-row">
          <label>垂直偏移：{{ activeLayer.y }}px</label>
          <el-slider v-model="activeLayer.y" :min="-50" :max="50" :step="1" />
        </div>

        <div class="control-row">
          <label>模糊半径：{{ activeLayer.blur }}px</label>
          <el-slider v-model="activeLayer.blur" :min="0" :max="100" :step="1" />
        </div>

        <div class="control-row">
          <label>扩散半径：{{ activeLayer.spread }}px</label>
          <el-slider
            v-model="activeLayer.spread"
            :min="0"
            :max="50"
            :step="1"
            :disabled="shadowMode === 'text'"
          />
        </div>

        <div class="color-row">
          <label>阴影颜色</label>
          <input v-model="activeLayer.color" class="native-color" type="color">
          <el-input v-model="activeLayer.color" size="small" />
        </div>

        <div class="switch-row">
          <label>内阴影 / 外阴影</label>
          <el-switch
            v-model="activeLayer.inset"
            active-text="内阴影"
            inactive-text="外阴影"
            :disabled="shadowMode === 'text'"
          />
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="shadow-panel">
      <div slot="header" class="shadow-panel__header">
        <span>CSS 代码</span>
        <small>可直接作为 CSS 类使用</small>
      </div>

      <pre class="css-output"><code>{{ cssCode }}</code></pre>
    </el-card>
  </section>
</template>

<script>
const DEFAULT_LAYERS = [
  {
    x: 0,
    y: 12,
    blur: 30,
    spread: 0,
    color: '#2563eb',
    inset: false
  },
  {
    x: 0,
    y: 2,
    blur: 8,
    spread: 0,
    color: '#0f172a',
    inset: false
  }
]

export default {
  name: 'CssBoxShadowGenerator',
  data() {
    const layers = this.createLayers(DEFAULT_LAYERS)

    return {
      shadowMode: 'box',
      layers,
      activeLayerId: layers[0].id
    }
  },
  computed: {
    activeLayer() {
      return this.layers.find(layer => layer.id === this.activeLayerId) || this.layers[0]
    },
    boxShadowValue() {
      return this.layers.map(this.layerToBoxShadow).join(', ')
    },
    textShadowValue() {
      return this.layers.map(this.layerToTextShadow).join(', ')
    },
    activeShadowValue() {
      return this.shadowMode === 'text' ? this.textShadowValue : this.boxShadowValue
    },
    cssCode() {
      const className = this.shadowMode === 'text' ? '.text-shadow-preview' : '.box-shadow-preview'
      const property = this.shadowMode === 'text' ? 'text-shadow' : 'box-shadow'

      return [
        `${className} {`,
        `  ${property}: ${this.activeShadowValue};`,
        '}'
      ].join('\n')
    }
  },
  methods: {
    createLayers(items) {
      return items.map(item => ({
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        ...item
      }))
    },
    layerToCss(layer) {
      return this.shadowMode === 'text' ? this.layerToTextShadow(layer) : this.layerToBoxShadow(layer)
    },
    layerToBoxShadow(layer) {
      return [
        layer.inset ? 'inset' : '',
        `${layer.x}px`,
        `${layer.y}px`,
        `${layer.blur}px`,
        `${layer.spread}px`,
        layer.color
      ].filter(Boolean).join(' ')
    },
    layerToTextShadow(layer) {
      return [
        `${layer.x}px`,
        `${layer.y}px`,
        `${layer.blur}px`,
        layer.color
      ].join(' ')
    },
    addLayer() {
      const layer = this.createLayers([
        {
          x: 0,
          y: 8,
          blur: 18,
          spread: 0,
          color: '#000000',
          inset: false
        }
      ])[0]

      this.layers.push(layer)
      this.activeLayerId = layer.id
    },
    removeLayer(id) {
      if (this.layers.length <= 1) {
        return
      }

      this.layers = this.layers.filter(layer => layer.id !== id)

      if (this.activeLayerId === id) {
        this.activeLayerId = this.layers[0].id
      }
    },
    resetShadows() {
      this.layers = this.createLayers(DEFAULT_LAYERS)
      this.activeLayerId = this.layers[0].id
      this.shadowMode = 'box'
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
.shadow-generator {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.shadow-generator__header {
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

.shadow-generator__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.shadow-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  margin-bottom: 18px;
}

.preview-panel,
.shadow-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.preview-stage {
  display: grid;
  min-height: 360px;
  place-items: center;
  gap: 24px;
  padding: 32px;
  background:
    linear-gradient(45deg, rgba(148, 163, 184, 0.14) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(148, 163, 184, 0.14) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.14) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.14) 75%);
  background-position: 0 0, 0 10px, 10px -10px, -10px 0;
  background-size: 20px 20px;
}

.preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 260px;
  max-width: 100%;
  aspect-ratio: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-weight: 700;
}

.preview-text {
  margin: 0;
  color: var(--color-text);
  font-size: 32px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
}

.shadow-panel {
  margin-bottom: 18px;
}

.shadow-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;

  small {
    min-width: 0;
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
}

.layer-list {
  display: grid;
  gap: 10px;
}

.layer-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.layer-card.is-active {
  border-color: var(--color-primary);
}

.layer-card__title {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;

  span {
    min-width: 0;
    color: var(--color-text-muted);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.control-row label,
.color-row label,
.switch-row label {
  display: block;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 600;
}

.color-row {
  display: grid;
  grid-template-columns: 100%;
  gap: 8px;
}

.native-color {
  width: 60px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.css-output {
  min-height: 120px;
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
  .shadow-generator__header {
    flex-direction: column;
  }

  .shadow-generator__actions {
    justify-content: flex-start;
  }

  .shadow-layout,
  .controls-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .shadow-generator__header h1 {
    font-size: 28px;
  }

  .shadow-generator__actions,
  .shadow-generator__actions .el-button {
    width: 100%;
  }

  .preview-stage {
    min-height: 300px;
    padding: 22px;
  }

  .preview-text {
    font-size: 26px;
  }
}
</style>
