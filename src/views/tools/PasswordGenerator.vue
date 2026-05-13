<template>
  <section class="password-generator">
    <div class="password-generator__header">
      <div>
        <h1>密码生成器</h1>
        <p>随机生成强密码或可记忆密码，支持批量生成、强度评估和本地历史记录。</p>
      </div>

      <div class="password-generator__actions">
        <el-button type="primary" icon="el-icon-magic-stick" @click="generatePasswords">
          生成
        </el-button>
        <el-button icon="el-icon-refresh" @click="generatePasswords">
          刷新
        </el-button>
      </div>
    </div>

    <div class="password-layout">
      <section class="settings-panel">
        <div class="panel-header">
          <h2>生成选项</h2>
          <el-switch
            v-model="memorableMode"
            active-text="可记忆"
            inactive-text="随机"
            @change="generatePasswords"
          />
        </div>

        <div class="settings-body">
          <div class="setting-row">
            <div class="setting-row__label">
              <span>密码长度</span>
              <strong>{{ length }} 位</strong>
            </div>
            <el-slider v-model="length" :min="6" :max="32" @change="generatePasswords" />
          </div>

          <div v-if="!memorableMode" class="checkbox-grid">
            <el-checkbox v-model="options.uppercase" @change="handleOptionChange">
              大写字母（A-Z）
            </el-checkbox>
            <el-checkbox v-model="options.lowercase" @change="handleOptionChange">
              小写字母（a-z）
            </el-checkbox>
            <el-checkbox v-model="options.numbers" @change="handleOptionChange">
              数字（0-9）
            </el-checkbox>
            <el-checkbox v-model="options.symbols" @change="handleOptionChange">
              特殊字符（!@#$%^&*）
            </el-checkbox>
            <el-checkbox v-model="excludeSimilar" @change="generatePasswords">
              排除相似字符（iIl1、oO0）
            </el-checkbox>
          </div>

          <div v-else class="memorable-note">
            <i class="el-icon-notebook-2"></i>
            <span>可记忆密码使用单词、数字和符号组合，便于人工输入。</span>
          </div>

          <div class="strength-card">
            <div class="strength-card__top">
              <span>密码强度</span>
              <strong :class="`is-${strength.level}`">{{ strength.label }}</strong>
            </div>
            <el-progress :percentage="strength.score" :show-text="false" :color="strength.color" />
          </div>
        </div>
      </section>

      <section class="result-panel">
        <div class="panel-header">
          <h2>生成结果</h2>
          <el-button size="mini" icon="el-icon-document-copy" :disabled="!passwords.length" @click="copyAll">
            复制全部
          </el-button>
        </div>

        <div class="result-list">
          <article v-for="(item, index) in passwords" :key="item.id" class="password-item">
            <div class="password-item__main">
              <code>{{ visible ? item.value : maskPassword(item.value) }}</code>
              <div class="password-item__actions">
                <el-tooltip :content="visible ? '隐藏密码' : '显示密码'" placement="top">
                  <el-button
                    circle
                    size="mini"
                    :icon="visible ? 'el-icon-view' : 'el-icon-view'"
                    @click="visible = !visible"
                  />
                </el-tooltip>
                <el-button size="mini" icon="el-icon-document-copy" @click="copyPassword(item.value)">
                  复制
                </el-button>
              </div>
            </div>
            <div class="password-item__meta">
              <span>#{{ index + 1 }}</span>
              <span>{{ item.length }} 位</span>
              <span>{{ item.mode }}</span>
            </div>
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
          <div v-for="item in history" :key="item.id" class="history-item">
            <span>{{ formatTime(item.createdAt) }}</span>
            <strong>{{ item.length }} 位</strong>
            <em>{{ item.mode }}</em>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
const HISTORY_KEY = 'devtoolbox_password_history'
const SIMILAR_CHARS = /[iIl1oO0]/g

const RANDOM_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*'
}

const WORDS = [
  'river',
  'cloud',
  'stone',
  'maple',
  'orbit',
  'silver',
  'harbor',
  'matrix',
  'forest',
  'summit',
  'pixel',
  'bridge'
]

export default {
  name: 'PasswordGenerator',
  data() {
    return {
      length: 16,
      options: {
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true
      },
      excludeSimilar: false,
      memorableMode: false,
      visible: true,
      passwords: [],
      history: []
    }
  },
  computed: {
    firstPassword() {
      return this.passwords[0] ? this.passwords[0].value : ''
    },
    strength() {
      const password = this.firstPassword
      const variety = [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password)
      ].filter(Boolean).length

      let score = Math.min(100, Math.round((password.length / 32) * 55 + variety * 12))

      if (password.length < 10) {
        score = Math.min(score, 35)
      }

      if (score < 45) {
        return { label: '弱', level: 'weak', score, color: '#f56c6c' }
      }
      if (score < 75) {
        return { label: '中', level: 'medium', score, color: '#e6a23c' }
      }
      return { label: '强', level: 'strong', score, color: '#67c23a' }
    }
  },
  mounted() {
    this.loadHistory()
    this.generatePasswords()
  },
  methods: {
    handleOptionChange() {
      if (!Object.values(this.options).some(Boolean)) {
        this.options.lowercase = true
      }
      this.generatePasswords()
    },
    generatePasswords() {
      this.passwords = Array.from({ length: 5 }, (item, index) => {
        const value = this.memorableMode ? this.generateMemorablePassword() : this.generateRandomPassword()

        return {
          id: `${Date.now()}-${index}-${value}`,
          value,
          length: value.length,
          mode: this.memorableMode ? '可记忆' : '随机'
        }
      })

      this.recordHistory(this.passwords[0])
    },
    generateRandomPassword() {
      const selectedSets = Object.keys(this.options)
        .filter(key => this.options[key])
        .map(key => this.filterSimilar(RANDOM_SETS[key]))
        .filter(Boolean)
      const pool = selectedSets.join('')
      const required = selectedSets.map(set => this.pickChar(set))
      const remainingLength = Math.max(0, this.length - required.length)
      const chars = [
        ...required,
        ...Array.from({ length: remainingLength }, () => this.pickChar(pool))
      ]

      return this.shuffle(chars).join('').slice(0, this.length)
    },
    generateMemorablePassword() {
      const words = [
        this.capitalize(this.pickItem(WORDS)),
        this.capitalize(this.pickItem(WORDS)),
        this.capitalize(this.pickItem(WORDS))
      ]
      const number = String(this.randomInt(10, 999))
      const symbol = this.pickChar('!@#$%^&*')
      const base = `${words.join('-')}-${number}${symbol}`

      if (base.length >= this.length) {
        return base.slice(0, this.length)
      }

      return `${base}${this.generateRandomSuffix(this.length - base.length)}`
    },
    generateRandomSuffix(size) {
      const pool = this.filterSimilar(`${RANDOM_SETS.lowercase}${RANDOM_SETS.numbers}`)
      return Array.from({ length: size }, () => this.pickChar(pool)).join('')
    },
    filterSimilar(value) {
      return this.excludeSimilar ? value.replace(SIMILAR_CHARS, '') : value
    },
    pickItem(items) {
      return items[this.randomInt(0, items.length - 1)]
    },
    pickChar(source) {
      return source[this.randomInt(0, source.length - 1)]
    },
    randomInt(min, max) {
      const range = max - min + 1
      const values = new Uint32Array(1)
      window.crypto.getRandomValues(values)
      return min + (values[0] % range)
    },
    shuffle(items) {
      const copy = items.slice()

      for (let index = copy.length - 1; index > 0; index -= 1) {
        const target = this.randomInt(0, index)
        const temp = copy[index]
        copy[index] = copy[target]
        copy[target] = temp
      }

      return copy
    },
    capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
    maskPassword(value) {
      return '•'.repeat(value.length)
    },
    async copyPassword(value) {
      try {
        await navigator.clipboard.writeText(value)
        this.$message.success('已复制密码')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    async copyAll() {
      try {
        await navigator.clipboard.writeText(this.passwords.map(item => item.value).join('\n'))
        this.$message.success('已复制全部密码')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    recordHistory(item) {
      if (!item) {
        return
      }

      this.history = [
        {
          id: `${Date.now()}-${Math.random()}`,
          createdAt: Date.now(),
          length: item.length,
          mode: item.mode
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
    formatTime(value) {
      const date = new Date(value)

      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }
  }
}
</script>

<style lang="scss" scoped>
.password-generator {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.password-generator__header {
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

.password-generator__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.password-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.25fr);
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

.setting-row__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);

  strong {
    color: var(--color-primary);
  }
}

.checkbox-grid {
  display: grid;
  gap: 12px;

  .el-checkbox {
    margin-right: 0;
  }
}

.memorable-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.strength-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.strength-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);

  .is-weak {
    color: #f56c6c;
  }

  .is-medium {
    color: #e6a23c;
  }

  .is-strong {
    color: #67c23a;
  }
}

.result-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.password-item {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.password-item__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  code {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 16px;
    line-height: 1.6;
  }
}

.password-item__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.password-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.history-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  padding: 16px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
  font-size: 13px;

  strong {
    color: var(--color-text);
  }

  em {
    font-style: normal;
  }
}

.empty-history {
  padding: 28px 16px;
  color: var(--color-text-muted);
  text-align: center;
}

@media (max-width: 1024px) {
  .password-generator__header {
    flex-direction: column;
  }

  .password-generator__actions {
    justify-content: flex-start;
  }

  .password-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .password-generator__header h1 {
    font-size: 28px;
  }

  .password-generator__actions,
  .password-generator__actions .el-button {
    width: 100%;
  }

  .password-item__main,
  .history-item {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
