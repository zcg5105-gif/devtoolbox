<template>
  <section class="ua-parser">
    <div class="ua-parser__header">
      <div>
        <h1>User-Agent 解析器</h1>
        <p>解析浏览器、操作系统、设备类型、渲染引擎和 CPU 架构，支持双 UA 对比。</p>
      </div>

      <div class="ua-parser__actions">
        <el-button icon="el-icon-monitor" @click="useCurrentUa">
          获取当前浏览器 UA
        </el-button>
        <el-button type="primary" icon="el-icon-document-copy" :disabled="!uaText" @click="copyJson">
          复制 JSON
        </el-button>
      </div>
    </div>

    <div class="ua-layout">
      <section class="input-panel">
        <div class="panel-header">
          <h2>UA 输入</h2>
          <el-button size="mini" icon="el-icon-delete" @click="clearInput">
            清空
          </el-button>
        </div>

        <el-input
          v-model="uaText"
          class="ua-input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="粘贴 User-Agent 字符串"
        />

        <div class="compare-toggle">
          <el-switch v-model="compareEnabled" active-text="对比两个 UA" />
        </div>

        <el-input
          v-if="compareEnabled"
          v-model="compareText"
          class="ua-input ua-input--compare"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="粘贴第二个 User-Agent 字符串"
        />
      </section>

      <section class="result-panel">
        <div class="panel-header">
          <h2>解析结果</h2>
          <el-tag size="small" effect="plain">
            实时解析
          </el-tag>
        </div>

        <div v-if="!uaText" class="empty-state">
          <i class="el-icon-s-platform"></i>
          <span>输入 UA 后显示解析结果</span>
        </div>

        <div v-else class="result-content">
          <div class="summary-card">
            <div class="summary-card__icon">
              <i :class="deviceIcon(primaryInfo.deviceType)"></i>
            </div>
            <div>
              <h2>{{ primaryInfo.browser }}</h2>
              <p>{{ primaryInfo.os }} · {{ primaryInfo.deviceType }}</p>
            </div>
          </div>

          <div class="info-grid">
            <div v-for="item in infoItems(primaryInfo)" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value || '-' }}</strong>
            </div>
          </div>
        </div>
      </section>

      <section v-if="compareEnabled" class="compare-panel">
        <div class="panel-header">
          <h2>UA 对比</h2>
          <el-button size="mini" icon="el-icon-sort" @click="swapUa">
            交换
          </el-button>
        </div>

        <div class="compare-grid">
          <div v-for="row in compareRows" :key="row.label" class="compare-row">
            <span>{{ row.label }}</span>
            <strong :class="{ 'is-different': row.left !== row.right }">{{ row.left || '-' }}</strong>
            <strong :class="{ 'is-different': row.left !== row.right }">{{ row.right || '-' }}</strong>
          </div>
        </div>
      </section>

      <section class="examples-panel">
        <div class="panel-header">
          <h2>常见 UA 示例</h2>
        </div>

        <div class="example-list">
          <button v-for="item in examples" :key="item.name" type="button" @click="applyExample(item.ua)">
            <strong>{{ item.name }}</strong>
            <span>{{ item.desc }}</span>
          </button>
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
          <button v-for="item in history" :key="item.id" type="button" @click="applyExample(item.ua)">
            <strong>{{ item.browser }}</strong>
            <span>{{ item.os }} · {{ formatTime(item.createdAt) }}</span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
import { UAParser } from 'ua-parser-js'

const HISTORY_KEY = 'devtoolbox_ua_history'
const EXAMPLES = [
  {
    name: 'Chrome Windows',
    desc: '桌面 Chrome',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  },
  {
    name: 'Safari iPhone',
    desc: '移动 Safari',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Firefox Linux',
    desc: '桌面 Firefox',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0'
  },
  {
    name: 'Edge Windows',
    desc: '桌面 Edge',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0'
  },
  {
    name: 'Googlebot',
    desc: '搜索引擎爬虫',
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
  }
]

export default {
  name: 'UserAgentParser',
  data() {
    return {
      uaText: '',
      compareText: '',
      compareEnabled: false,
      history: [],
      historyTimer: null,
      examples: EXAMPLES
    }
  },
  computed: {
    primaryResult() {
      return this.parseUa(this.uaText)
    },
    compareResult() {
      return this.parseUa(this.compareText)
    },
    primaryInfo() {
      return this.normalizeResult(this.primaryResult)
    },
    compareInfo() {
      return this.normalizeResult(this.compareResult)
    },
    compareRows() {
      return [
        { label: '浏览器', left: this.primaryInfo.browser, right: this.compareInfo.browser },
        { label: '浏览器版本', left: this.primaryInfo.browserVersion, right: this.compareInfo.browserVersion },
        { label: '操作系统', left: this.primaryInfo.os, right: this.compareInfo.os },
        { label: '设备类型', left: this.primaryInfo.deviceType, right: this.compareInfo.deviceType },
        { label: '渲染引擎', left: this.primaryInfo.engine, right: this.compareInfo.engine },
        { label: 'CPU 架构', left: this.primaryInfo.cpu, right: this.compareInfo.cpu }
      ]
    },
    resultJson() {
      return JSON.stringify({
        userAgent: this.uaText,
        parsed: this.primaryResult,
        normalized: this.primaryInfo
      }, null, 2)
    }
  },
  watch: {
    uaText(value) {
      window.clearTimeout(this.historyTimer)
      if (!value.trim()) {
        return
      }
      this.historyTimer = window.setTimeout(() => {
        this.recordHistory()
      }, 800)
    }
  },
  mounted() {
    this.loadHistory()
    this.useCurrentUa()
  },
  beforeDestroy() {
    window.clearTimeout(this.historyTimer)
  },
  methods: {
    parseUa(value) {
      const text = value.trim()

      if (!text) {
        return {}
      }

      return UAParser(text)
    },
    normalizeResult(result) {
      const browser = result.browser || {}
      const os = result.os || {}
      const device = result.device || {}
      const engine = result.engine || {}
      const cpu = result.cpu || {}

      return {
        browser: browser.name || '未知浏览器',
        browserVersion: browser.version || '',
        os: [os.name, os.version].filter(Boolean).join(' ') || '未知系统',
        osName: os.name || '',
        osVersion: os.version || '',
        deviceType: this.normalizeDeviceType(device.type),
        deviceVendor: device.vendor || '',
        deviceModel: device.model || '',
        engine: [engine.name, engine.version].filter(Boolean).join(' ') || '未知引擎',
        engineName: engine.name || '',
        engineVersion: engine.version || '',
        cpu: cpu.architecture || '未知架构'
      }
    },
    normalizeDeviceType(type) {
      if (type === 'mobile') {
        return '移动'
      }
      if (type === 'tablet') {
        return '平板'
      }
      if (type) {
        return type
      }
      return '桌面'
    },
    infoItems(info) {
      return [
        { label: '浏览器名称', value: info.browser },
        { label: '浏览器版本', value: info.browserVersion },
        { label: '操作系统', value: info.os },
        { label: '设备类型', value: info.deviceType },
        { label: '设备厂商', value: info.deviceVendor || '-' },
        { label: '设备型号', value: info.deviceModel || '-' },
        { label: '渲染引擎', value: info.engine },
        { label: 'CPU 架构', value: info.cpu }
      ]
    },
    deviceIcon(type) {
      if (type === '移动') {
        return 'el-icon-mobile-phone'
      }
      if (type === '平板') {
        return 'el-icon-mobile'
      }
      return 'el-icon-monitor'
    },
    useCurrentUa() {
      this.uaText = navigator.userAgent || ''
    },
    applyExample(ua) {
      this.uaText = ua
    },
    clearInput() {
      this.uaText = ''
      this.compareText = ''
    },
    swapUa() {
      const next = this.uaText
      this.uaText = this.compareText
      this.compareText = next
    },
    async copyJson() {
      try {
        await navigator.clipboard.writeText(this.resultJson)
        this.$message.success('已复制解析 JSON')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    recordHistory() {
      const info = this.primaryInfo

      if (!this.uaText.trim()) {
        return
      }

      this.history = [
        {
          id: `${Date.now()}-${Math.random()}`,
          ua: this.uaText,
          browser: info.browser,
          os: info.os,
          createdAt: Date.now()
        },
        ...this.history.filter(item => item.ua !== this.uaText)
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
.ua-parser {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.ua-parser__header {
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

.ua-parser__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.ua-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.95fr) minmax(0, 1.05fr);
  gap: 18px;
  align-items: start;
}

.input-panel,
.result-panel,
.compare-panel,
.examples-panel,
.history-panel {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.compare-panel,
.examples-panel,
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

.ua-input ::v-deep .el-textarea__inner {
  min-height: 180px !important;
  padding: 16px;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.ua-input--compare {
  border-top: 1px solid var(--color-border);
}

.compare-toggle {
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
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

.result-content {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  h2 {
    margin: 0 0 4px;
    color: var(--color-text);
    font-size: 20px;
  }

  p {
    margin: 0;
    color: var(--color-text-muted);
  }
}

.summary-card__icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-primary);
  border-radius: 8px;
  color: #fff;
  font-size: 26px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  div {
    min-width: 0;
    padding: 12px;
    background: var(--color-background);
    border: 1px solid var(--color-border);
    border-radius: 8px;
  }

  span {
    display: block;
    margin-bottom: 5px;
    color: var(--color-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    overflow-wrap: anywhere;
    color: var(--color-text);
    line-height: 1.5;
  }
}

.compare-grid {
  display: grid;
  padding: 16px;
}

.compare-row {
  display: grid;
  grid-template-columns: 140px repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);

  span {
    color: var(--color-text-muted);
  }

  strong {
    overflow-wrap: anywhere;
    color: var(--color-text);
    font-weight: 500;
  }

  .is-different {
    color: #e6a23c;
  }
}

.compare-row:last-child {
  border-bottom: 0;
}

.example-list,
.history-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  padding: 16px;
}

.example-list button,
.history-list button {
  display: grid;
  gap: 6px;
  padding: 12px;
  cursor: pointer;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: inherit;
  text-align: left;

  strong {
    color: var(--color-text);
  }

  span {
    color: var(--color-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }
}

.example-list button:hover,
.history-list button:hover {
  border-color: var(--color-primary);
}

.empty-history {
  min-height: 120px;
}

@media (max-width: 1024px) {
  .ua-parser__header {
    flex-direction: column;
  }

  .ua-parser__actions {
    justify-content: flex-start;
  }

  .ua-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ua-parser__header h1 {
    font-size: 28px;
  }

  .ua-parser__actions,
  .ua-parser__actions .el-button {
    width: 100%;
  }

  .info-grid,
  .compare-row {
    grid-template-columns: 1fr;
  }
}
</style>
