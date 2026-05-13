<template>
  <section class="random-generator">
    <div class="random-generator__header">
      <div>
        <h1>随机生成器</h1>
        <p>生成随机整数、小数、字符串、UUID、颜色和独立随机密码，支持批量、不重复和种子随机。</p>
      </div>

      <div class="random-generator__actions">
        <el-select v-model="mode" class="mode-select">
          <el-option label="随机整数" value="integer" />
          <el-option label="随机小数" value="decimal" />
          <el-option label="随机字符串" value="string" />
          <el-option label="UUID v4" value="uuid" />
          <el-option label="随机颜色" value="color" />
          <el-option label="随机密码" value="password" />
        </el-select>
        <el-button type="primary" icon="el-icon-magic-stick" @click="generate">
          生成
        </el-button>
      </div>
    </div>

    <div class="random-layout">
      <section class="settings-panel">
        <div class="panel-header">
          <h2>生成配置</h2>
        </div>

        <div class="settings-body">
          <div class="common-grid">
            <label>
              <span>生成数量</span>
              <el-input-number v-model="count" :min="1" :max="200" controls-position="right" />
            </label>
            <label>
              <span>种子</span>
              <el-input v-model.trim="seed" clearable placeholder="留空则使用安全随机" />
            </label>
          </div>

          <template v-if="mode === 'integer'">
            <div class="common-grid">
              <label>
                <span>最小值</span>
                <el-input-number v-model="integer.min" controls-position="right" />
              </label>
              <label>
                <span>最大值</span>
                <el-input-number v-model="integer.max" controls-position="right" />
              </label>
            </div>
            <el-checkbox v-model="integer.unique">
              不重复随机数（抽奖 / 抽签）
            </el-checkbox>
          </template>

          <template v-if="mode === 'decimal'">
            <div class="common-grid">
              <label>
                <span>最小值</span>
                <el-input-number v-model="decimal.min" controls-position="right" />
              </label>
              <label>
                <span>最大值</span>
                <el-input-number v-model="decimal.max" controls-position="right" />
              </label>
              <label>
                <span>小数位数</span>
                <el-input-number v-model="decimal.places" :min="0" :max="12" controls-position="right" />
              </label>
            </div>
          </template>

          <template v-if="mode === 'string'">
            <label class="full-row">
              <span>字符串长度</span>
              <el-slider v-model="stringOptions.length" :min="1" :max="128" />
            </label>
            <div class="checkbox-grid">
              <el-checkbox v-model="stringOptions.numbers">数字</el-checkbox>
              <el-checkbox v-model="stringOptions.lowercase">小写字母</el-checkbox>
              <el-checkbox v-model="stringOptions.uppercase">大写字母</el-checkbox>
              <el-checkbox v-model="stringOptions.symbols">符号</el-checkbox>
            </div>
            <label class="full-row">
              <span>自定义字符集</span>
              <el-input v-model="stringOptions.custom" clearable placeholder="填写后会追加到字符集" />
            </label>
          </template>

          <template v-if="mode === 'uuid'">
            <el-alert title="生成 RFC 4122 风格的 UUID v4。" type="info" :closable="false" show-icon />
          </template>

          <template v-if="mode === 'color'">
            <el-radio-group v-model="colorFormat" size="small">
              <el-radio-button label="hex">HEX</el-radio-button>
              <el-radio-button label="rgb">RGB</el-radio-button>
            </el-radio-group>
          </template>

          <template v-if="mode === 'password'">
            <label class="full-row">
              <span>密码长度</span>
              <el-slider v-model="password.length" :min="6" :max="32" />
            </label>
            <div class="checkbox-grid">
              <el-checkbox v-model="password.uppercase">大写字母</el-checkbox>
              <el-checkbox v-model="password.lowercase">小写字母</el-checkbox>
              <el-checkbox v-model="password.numbers">数字</el-checkbox>
              <el-checkbox v-model="password.symbols">特殊字符</el-checkbox>
            </div>
          </template>
        </div>
      </section>

      <section class="result-panel">
        <div class="panel-header">
          <h2>生成结果</h2>
          <div class="result-actions">
            <el-button size="mini" icon="el-icon-document-copy" :disabled="!results.length" @click="copyAll">
              复制全部
            </el-button>
            <el-button size="mini" icon="el-icon-delete" :disabled="!results.length" @click="results = []">
              清空
            </el-button>
          </div>
        </div>

        <div v-if="!results.length" class="empty-state">
          <i class="el-icon-magic-stick"></i>
          <span>配置参数后点击生成</span>
        </div>

        <div v-else class="result-list">
          <article v-for="(item, index) in results" :key="`${item}-${index}`" class="result-item">
            <span>#{{ index + 1 }}</span>
            <code>{{ item }}</code>
            <el-button size="mini" icon="el-icon-document-copy" @click="copyText(item)">
              复制
            </el-button>
          </article>
        </div>
      </section>

      <section class="history-panel">
        <div class="panel-header">
          <h2>历史记录</h2>
          <el-button size="mini" icon="el-icon-delete" :disabled="!history.length" @click="clearHistory">
            清空
          </el-button>
        </div>

        <div v-if="!history.length" class="empty-history">
          暂无历史记录
        </div>
        <div v-else class="history-list">
          <button v-for="item in history" :key="item.id" type="button" @click="restoreHistory(item)">
            <strong>{{ modeLabel(item.mode) }} · {{ item.count }} 条</strong>
            <span>{{ formatTime(item.createdAt) }}</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
const HISTORY_KEY = 'devtoolbox_random_history'
const CHARSETS = {
  numbers: '0123456789',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: '!@#$%^&*_-+=?'
}

export default {
  name: 'RandomGenerator',
  data() {
    return {
      mode: 'integer',
      count: 5,
      seed: '',
      integer: {
        min: 1,
        max: 100,
        unique: false
      },
      decimal: {
        min: 0,
        max: 1,
        places: 4
      },
      stringOptions: {
        length: 12,
        numbers: true,
        lowercase: true,
        uppercase: true,
        symbols: false,
        custom: ''
      },
      colorFormat: 'hex',
      password: {
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
      },
      results: [],
      history: []
    }
  },
  mounted() {
    this.loadHistory()
    this.generate()
  },
  methods: {
    generate() {
      const random = this.createRandom()
      const generators = {
        integer: () => this.generateIntegers(random),
        decimal: () => this.generateDecimals(random),
        string: () => this.generateStrings(random),
        uuid: () => this.generateUuids(random),
        color: () => this.generateColors(random),
        password: () => this.generatePasswords(random)
      }

      try {
        this.results = generators[this.mode]()
        this.recordHistory()
      } catch (error) {
        this.$message.error(error.message || '生成失败')
      }
    },
    generateIntegers(random) {
      const min = Math.min(this.integer.min, this.integer.max)
      const max = Math.max(this.integer.min, this.integer.max)
      const range = max - min + 1

      if (this.integer.unique && this.count > range) {
        throw new Error('不重复数量不能超过整数范围')
      }

      if (!this.integer.unique) {
        return Array.from({ length: this.count }, () => String(this.randomInt(random, min, max)))
      }

      return this.shuffle(Array.from({ length: range }, (item, index) => min + index), random)
        .slice(0, this.count)
        .map(String)
    },
    generateDecimals(random) {
      const min = Math.min(this.decimal.min, this.decimal.max)
      const max = Math.max(this.decimal.min, this.decimal.max)

      return Array.from({ length: this.count }, () => {
        const value = min + random() * (max - min)
        return value.toFixed(this.decimal.places)
      })
    },
    generateStrings(random) {
      const pool = this.getStringPool(this.stringOptions)

      return Array.from({ length: this.count }, () => this.randomString(pool, this.stringOptions.length, random))
    },
    generateUuids(random) {
      return Array.from({ length: this.count }, () => {
        const bytes = Array.from({ length: 16 }, () => this.randomInt(random, 0, 255))
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80
        const hex = bytes.map(value => value.toString(16).padStart(2, '0'))

        return [
          hex.slice(0, 4).join(''),
          hex.slice(4, 6).join(''),
          hex.slice(6, 8).join(''),
          hex.slice(8, 10).join(''),
          hex.slice(10, 16).join('')
        ].join('-')
      })
    },
    generateColors(random) {
      return Array.from({ length: this.count }, () => {
        const rgb = [
          this.randomInt(random, 0, 255),
          this.randomInt(random, 0, 255),
          this.randomInt(random, 0, 255)
        ]

        if (this.colorFormat === 'rgb') {
          return `rgb(${rgb.join(', ')})`
        }

        return `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`
      })
    },
    generatePasswords(random) {
      const pool = this.getStringPool(this.password)

      return Array.from({ length: this.count }, () => this.randomString(pool, this.password.length, random))
    },
    getStringPool(options) {
      const pool = [
        options.numbers ? CHARSETS.numbers : '',
        options.lowercase ? CHARSETS.lowercase : '',
        options.uppercase ? CHARSETS.uppercase : '',
        options.symbols ? CHARSETS.symbols : '',
        options.custom || ''
      ].join('')
      const uniquePool = Array.from(new Set(pool.split(''))).join('')

      if (!uniquePool) {
        throw new Error('请至少选择一个字符集')
      }

      return uniquePool
    },
    randomString(pool, length, random) {
      return Array.from({ length }, () => pool[this.randomInt(random, 0, pool.length - 1)]).join('')
    },
    createRandom() {
      if (this.seed) {
        return this.seededRandom(this.seed)
      }

      return () => {
        const values = new Uint32Array(1)
        window.crypto.getRandomValues(values)
        return values[0] / 4294967296
      }
    },
    seededRandom(seed) {
      let state = this.hashSeed(seed)

      return () => {
        state += 0x6D2B79F5
        let value = state
        value = Math.imul(value ^ value >>> 15, value | 1)
        value ^= value + Math.imul(value ^ value >>> 7, value | 61)
        return ((value ^ value >>> 14) >>> 0) / 4294967296
      }
    },
    hashSeed(seed) {
      let hash = 2166136261

      for (let index = 0; index < seed.length; index += 1) {
        hash ^= seed.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
      }

      return hash >>> 0
    },
    randomInt(random, min, max) {
      return min + Math.floor(random() * (max - min + 1))
    },
    shuffle(items, random) {
      const copy = items.slice()

      for (let index = copy.length - 1; index > 0; index -= 1) {
        const target = this.randomInt(random, 0, index)
        const temp = copy[index]
        copy[index] = copy[target]
        copy[target] = temp
      }

      return copy
    },
    async copyText(value) {
      try {
        await navigator.clipboard.writeText(value)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    async copyAll() {
      try {
        await navigator.clipboard.writeText(this.results.join('\n'))
        this.$message.success('已复制全部结果')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    recordHistory() {
      this.history = [
        {
          id: `${Date.now()}-${Math.random()}`,
          mode: this.mode,
          count: this.results.length,
          results: this.results,
          createdAt: Date.now()
        },
        ...this.history
      ].slice(0, 20)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history))
    },
    loadHistory() {
      try {
        this.history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
      } catch (error) {
        this.history = []
      }
    },
    clearHistory() {
      this.history = []
      localStorage.removeItem(HISTORY_KEY)
    },
    restoreHistory(item) {
      this.mode = item.mode
      this.results = item.results || []
    },
    modeLabel(mode) {
      return {
        integer: '随机整数',
        decimal: '随机小数',
        string: '随机字符串',
        uuid: 'UUID v4',
        color: '随机颜色',
        password: '随机密码'
      }[mode] || mode
    },
    formatTime(value) {
      const date = new Date(value)
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }
  }
}
</script>

<style lang="scss" scoped>
.random-generator {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.random-generator__header {
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

.random-generator__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.mode-select {
  width: 170px;
}

.random-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr);
  gap: 18px;
  align-items: start;
}

.settings-panel,
.result-panel,
.history-panel {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.history-panel {
  grid-column: 1 / -1;
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

.settings-body {
  display: grid;
  gap: 18px;
  padding: 18px;
}

.common-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.common-grid label,
.full-row {
  display: grid;
  gap: 8px;
  color: var(--color-text);

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.common-grid ::v-deep .el-input-number,
.common-grid ::v-deep .el-input {
  width: 100%;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  .el-checkbox {
    margin-right: 0;
  }
}

.result-actions {
  display: flex;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.empty-state,
.empty-history {
  display: flex;
  min-height: 300px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted);

  i {
    font-size: 38px;
  }
}

.empty-history {
  min-height: 120px;
}

.result-list {
  display: grid;
  gap: 10px;
  max-height: 620px;
  overflow: auto;
  padding: 16px;
}

.result-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }

  code {
    overflow-wrap: anywhere;
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    line-height: 1.6;
  }
}

.history-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  padding: 16px;
}

.history-list button {
  display: grid;
  gap: 6px;
  padding: 12px;
  cursor: pointer;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  text-align: left;

  strong {
    color: var(--color-text);
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.history-list button:hover {
  border-color: var(--color-primary);
}

@media (max-width: 1024px) {
  .random-generator__header {
    flex-direction: column;
  }

  .random-generator__actions {
    justify-content: flex-start;
  }

  .random-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .random-generator__header h1 {
    font-size: 28px;
  }

  .random-generator__actions,
  .random-generator__actions .el-select,
  .random-generator__actions .el-button {
    width: 100%;
  }

  .random-generator__actions,
  .common-grid,
  .checkbox-grid,
  .result-item {
    grid-template-columns: 1fr;
  }

  .random-generator__actions {
    flex-direction: column;
  }
}
</style>
