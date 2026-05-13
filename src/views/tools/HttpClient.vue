<template>
  <section class="http-client">
    <div class="http-client__header">
      <div>
        <h1>HTTP 请求工具</h1>
        <p>轻量级接口调试客户端，支持 Headers、Body、历史记录和常用请求收藏。</p>
      </div>

      <div class="http-client__actions">
        <el-button
          size="small"
          icon="el-icon-star-off"
          :disabled="!url.trim()"
          @click="saveFavorite"
        >
          收藏
        </el-button>
        <el-button size="small" icon="el-icon-upload2" @click="openImportPicker">
          导入
        </el-button>
        <el-button size="small" icon="el-icon-download" @click="exportConfig">
          导出
        </el-button>
        <input
          ref="importInput"
          class="http-client__file-input"
          type="file"
          accept="application/json,.json"
          @change="handleImportFile"
        >
      </div>
    </div>

    <el-card shadow="never" class="http-request-card">
      <div class="http-request-line">
        <el-select v-model="method" class="http-method-select">
          <el-option
            v-for="item in methods"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>
        <el-input
          v-model.trim="url"
          class="http-url-input"
          placeholder="https://api.example.com/users"
          @keyup.enter.native="sendRequest"
        />
        <el-button
          type="primary"
          icon="el-icon-s-promotion"
          :loading="isSending"
          :disabled="!url.trim()"
          @click="sendRequest"
        >
          发送
        </el-button>
      </div>

      <el-tabs v-model="requestTab" class="http-request-tabs">
        <el-tab-pane label="Headers" name="headers">
          <div class="http-table-toolbar">
            <span>Key-Value 表格，空行会自动忽略</span>
            <el-button size="mini" icon="el-icon-plus" @click="addHeader">
              添加 Header
            </el-button>
          </div>
          <div class="http-key-value-table">
            <div class="http-key-value-table__head">
              <span>启用</span>
              <span>Key</span>
              <span>Value</span>
              <span></span>
            </div>
            <div
              v-for="(header, index) in headers"
              :key="header.id"
              class="http-key-value-table__row"
            >
              <el-checkbox v-model="header.enabled" />
              <el-input v-model="header.key" size="small" placeholder="Content-Type" />
              <el-input v-model="header.value" size="small" placeholder="application/json" />
              <el-button
                size="mini"
                icon="el-icon-delete"
                @click="removeHeader(index)"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="Body" name="body">
          <div class="http-body-toolbar">
            <el-radio-group v-model="bodyType" size="small" @change="syncBodyHeaders">
              <el-radio-button label="none">none</el-radio-button>
              <el-radio-button label="form-data">form-data</el-radio-button>
              <el-radio-button label="urlencoded">x-www-form-urlencoded</el-radio-button>
              <el-radio-button label="raw">raw JSON</el-radio-button>
            </el-radio-group>
          </div>

          <div v-if="bodyType === 'none'" class="http-empty-body">
            当前请求不发送 Body
          </div>

          <div v-else-if="bodyType === 'raw'" class="http-raw-body">
            <el-input
              v-model="rawBody"
              type="textarea"
              :autosize="false"
              spellcheck="false"
              placeholder='{"name":"DevToolbox"}'
            />
          </div>

          <div v-else>
            <div class="http-table-toolbar">
              <span>{{ bodyType === 'form-data' ? 'form-data 字段' : 'URL 编码字段' }}</span>
              <el-button size="mini" icon="el-icon-plus" @click="addBodyParam">
                添加字段
              </el-button>
            </div>
            <div class="http-key-value-table">
              <div class="http-key-value-table__head">
                <span>启用</span>
                <span>Key</span>
                <span>Value</span>
                <span></span>
              </div>
              <div
                v-for="(param, index) in bodyParams"
                :key="param.id"
                class="http-key-value-table__row"
              >
                <el-checkbox v-model="param.enabled" />
                <el-input v-model="param.key" size="small" placeholder="name" />
                <el-input v-model="param.value" size="small" placeholder="DevToolbox" />
                <el-button
                  size="mini"
                  icon="el-icon-delete"
                  @click="removeBodyParam(index)"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <div class="http-main-grid">
      <section class="http-side-panel">
        <el-tabs v-model="sideTab">
          <el-tab-pane label="历史" name="history">
            <div v-if="!history.length" class="http-side-empty">
              暂无历史记录
            </div>
            <button
              v-for="item in history"
              :key="item.id"
              class="http-saved-item"
              @click="loadRequest(item)"
            >
              <strong>{{ item.method }}</strong>
              <span>{{ item.url }}</span>
              <small>{{ formatTime(item.createdAt) }}</small>
            </button>
          </el-tab-pane>
          <el-tab-pane label="收藏" name="favorites">
            <div v-if="!favorites.length" class="http-side-empty">
              暂无收藏请求
            </div>
            <div
              v-for="item in favorites"
              :key="item.id"
              class="http-favorite-row"
            >
              <button class="http-saved-item" @click="loadRequest(item)">
                <strong>{{ item.method }}</strong>
                <span>{{ item.url }}</span>
                <small>{{ item.name || formatTime(item.createdAt) }}</small>
              </button>
              <el-button
                size="mini"
                icon="el-icon-delete"
                @click="removeFavorite(item.id)"
              />
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>

      <section class="http-response-panel">
        <div class="http-response-panel__header">
          <h2>响应</h2>
          <div class="http-response-meta">
            <el-tag
              v-if="response.status"
              size="small"
              :type="statusTagType"
              effect="plain"
            >
              {{ response.status }} {{ response.statusText }}
            </el-tag>
            <span v-if="response.duration">{{ response.duration }} ms</span>
          </div>
        </div>

        <el-alert
          v-if="errorMessage"
          class="http-response-error"
          :title="errorMessage"
          type="error"
          :closable="false"
          show-icon
        />

        <el-tabs v-model="responseTab" class="http-response-tabs">
          <el-tab-pane label="响应体" name="body">
            <pre class="http-response-body"><code>{{ formattedResponseBody }}</code></pre>
          </el-tab-pane>
          <el-tab-pane label="响应头" name="headers">
            <pre class="http-response-body"><code>{{ formattedResponseHeaders }}</code></pre>
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>
  </section>
</template>

<script>
const HISTORY_KEY = 'devtoolbox_http_history'
const FAVORITES_KEY = 'devtoolbox_http_favorites'
const MAX_HISTORY = 30

export default {
  name: 'HttpClient',
  data() {
    return {
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      headers: [
        this.createRow('Accept', 'application/json')
      ],
      bodyType: 'none',
      bodyParams: [
        this.createRow('name', 'DevToolbox')
      ],
      rawBody: '{\n  "name": "DevToolbox"\n}',
      requestTab: 'headers',
      responseTab: 'body',
      sideTab: 'history',
      isSending: false,
      response: {
        status: '',
        statusText: '',
        headers: {},
        body: '',
        duration: ''
      },
      errorMessage: '',
      history: [],
      favorites: []
    }
  },
  computed: {
    statusTagType() {
      const status = Number(this.response.status)

      if (status >= 200 && status < 300) {
        return 'success'
      }

      if (status >= 400) {
        return 'danger'
      }

      return 'warning'
    },
    formattedResponseBody() {
      if (!this.response.body) {
        return '响应体会显示在这里'
      }

      return this.formatMaybeJson(this.response.body)
    },
    formattedResponseHeaders() {
      const headers = this.response.headers || {}
      const keys = Object.keys(headers)

      if (!keys.length) {
        return '响应头会显示在这里'
      }

      return keys
        .sort()
        .map(key => `${key}: ${headers[key]}`)
        .join('\n')
    }
  },
  mounted() {
    this.history = this.readStorage(HISTORY_KEY)
    this.favorites = this.readStorage(FAVORITES_KEY)
  },
  methods: {
    createRow(key = '', value = '') {
      return {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        enabled: true,
        key,
        value
      }
    },
    addHeader() {
      this.headers.push(this.createRow())
    },
    removeHeader(index) {
      this.headers.splice(index, 1)
    },
    addBodyParam() {
      this.bodyParams.push(this.createRow())
    },
    removeBodyParam(index) {
      this.bodyParams.splice(index, 1)
    },
    syncBodyHeaders() {
      if (this.bodyType === 'raw') {
        this.setHeader('Content-Type', 'application/json')
      } else if (this.bodyType === 'urlencoded') {
        this.setHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
      } else if (this.bodyType === 'form-data') {
        this.removeHeaderByKey('Content-Type')
      }
    },
    setHeader(key, value) {
      const header = this.headers.find(item => item.key.toLowerCase() === key.toLowerCase())

      if (header) {
        header.enabled = true
        header.value = value
        return
      }

      this.headers.push(this.createRow(key, value))
    },
    removeHeaderByKey(key) {
      this.headers = this.headers.filter(item => item.key.toLowerCase() !== key.toLowerCase())
    },
    async sendRequest() {
      if (!this.url.trim()) {
        this.$message.warning('请输入请求 URL')
        return
      }

      this.isSending = true
      this.errorMessage = ''
      this.response = {
        status: '',
        statusText: '',
        headers: {},
        body: '',
        duration: ''
      }

      const startedAt = performance.now()

      try {
        const requestConfig = this.buildFetchConfig()
        const response = await fetch(this.url, requestConfig)
        const body = await response.text()
        const duration = Math.round(performance.now() - startedAt)

        this.response = {
          status: response.status,
          statusText: response.statusText,
          headers: this.headersToObject(response.headers),
          body,
          duration
        }

        this.saveHistory(duration, response.status)
      } catch (error) {
        this.errorMessage = `请求失败：${error.message || '请检查 URL、网络或 CORS 设置'}`
      } finally {
        this.isSending = false
      }
    },
    buildFetchConfig() {
      const config = {
        method: this.method,
        headers: this.enabledRowsToObject(this.headers)
      }

      if (!['GET', 'HEAD'].includes(this.method) && this.bodyType !== 'none') {
        config.body = this.createRequestBody()
      }

      return config
    },
    createRequestBody() {
      if (this.bodyType === 'raw') {
        return this.rawBody
      }

      const params = this.enabledRows(this.bodyParams)

      if (this.bodyType === 'urlencoded') {
        const searchParams = new URLSearchParams()
        params.forEach(item => searchParams.append(item.key, item.value))
        return searchParams
      }

      const formData = new FormData()
      params.forEach(item => formData.append(item.key, item.value))
      return formData
    },
    enabledRows(rows) {
      return rows.filter(item => item.enabled && item.key.trim())
    },
    enabledRowsToObject(rows) {
      return this.enabledRows(rows).reduce((target, item) => {
        target[item.key.trim()] = item.value
        return target
      }, {})
    },
    headersToObject(headers) {
      const result = {}

      headers.forEach((value, key) => {
        result[key] = value
      })

      return result
    },
    getCurrentRequest(status = '', duration = '') {
      return {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        method: this.method,
        url: this.url,
        headers: this.headers.map(item => ({ ...item })),
        bodyType: this.bodyType,
        bodyParams: this.bodyParams.map(item => ({ ...item })),
        rawBody: this.rawBody,
        status,
        duration,
        createdAt: Date.now()
      }
    },
    saveHistory(duration, status) {
      const item = this.getCurrentRequest(status, duration)
      this.history = [item, ...this.history].slice(0, MAX_HISTORY)
      this.writeStorage(HISTORY_KEY, this.history)
    },
    saveFavorite() {
      const item = this.getCurrentRequest()
      item.name = `${item.method} ${item.url}`
      this.favorites = [item, ...this.favorites]
      this.writeStorage(FAVORITES_KEY, this.favorites)
      this.$message.success('已收藏请求')
    },
    removeFavorite(id) {
      this.favorites = this.favorites.filter(item => item.id !== id)
      this.writeStorage(FAVORITES_KEY, this.favorites)
    },
    loadRequest(item) {
      this.method = item.method || 'GET'
      this.url = item.url || ''
      this.headers = this.restoreRows(item.headers, [this.createRow('Accept', 'application/json')])
      this.bodyType = item.bodyType || 'none'
      this.bodyParams = this.restoreRows(item.bodyParams, [this.createRow()])
      this.rawBody = item.rawBody || ''
      this.$message.success('已载入请求配置')
    },
    restoreRows(rows, fallback) {
      if (!Array.isArray(rows) || !rows.length) {
        return fallback
      }

      return rows.map(item => ({
        id: this.createRow().id,
        enabled: item.enabled !== false,
        key: item.key || '',
        value: item.value || ''
      }))
    },
    exportConfig() {
      const config = this.getCurrentRequest()
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: 'application/json;charset=utf-8'
      })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `http_request_${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    openImportPicker() {
      this.$refs.importInput.click()
    },
    handleImportFile(event) {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        try {
          const config = JSON.parse(reader.result)
          this.loadRequest(config)
        } catch (error) {
          this.$message.error('导入失败，请选择合法 JSON 配置')
        }
      }

      reader.onerror = () => {
        this.$message.error('读取配置失败')
      }

      reader.readAsText(file)
      event.target.value = ''
    },
    readStorage(key) {
      try {
        const value = JSON.parse(localStorage.getItem(key) || '[]')
        return Array.isArray(value) ? value : []
      } catch (error) {
        return []
      }
    },
    writeStorage(key, value) {
      localStorage.setItem(key, JSON.stringify(value))
    },
    formatMaybeJson(value) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2)
      } catch (error) {
        return value
      }
    },
    formatTime(timestamp) {
      if (!timestamp) {
        return ''
      }

      const date = new Date(timestamp)
      const pad = value => String(value).padStart(2, '0')

      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.http-client {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.http-client__header {
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

.http-client__actions,
.http-table-toolbar,
.http-body-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.http-client__actions {
  justify-content: flex-end;
}

.http-client__file-input {
  display: none;
}

.http-request-card {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.http-request-line {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.http-request-tabs {
  margin-top: 18px;
}

.http-table-toolbar {
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.http-body-toolbar {
  margin-bottom: 14px;
}

.http-key-value-table {
  display: grid;
  gap: 8px;
}

.http-key-value-table__head,
.http-key-value-table__row {
  display: grid;
  grid-template-columns: 56px minmax(140px, 0.45fr) minmax(180px, 1fr) 40px;
  gap: 8px;
  align-items: center;
}

.http-key-value-table__head {
  color: var(--color-text-muted);
  font-size: 13px;
}

.http-empty-body {
  min-height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-muted);
}

.http-raw-body ::v-deep .el-textarea__inner {
  min-height: 220px !important;
  resize: vertical;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.http-main-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.http-side-panel,
.http-response-panel {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.http-side-panel {
  padding: 0 12px 12px;
}

.http-side-empty {
  padding: 28px 12px;
  color: var(--color-text-muted);
  text-align: center;
}

.http-saved-item {
  display: grid;
  width: 100%;
  gap: 4px;
  margin-bottom: 8px;
  padding: 10px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;

  strong {
    color: var(--color-primary);
    font-size: 13px;
  }

  span {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.4;
  }

  small {
    color: var(--color-text-muted);
  }
}

.http-favorite-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: 8px;
}

.http-response-panel {
  overflow: hidden;
}

.http-response-panel__header {
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
    line-height: 1.4;
  }
}

.http-response-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.http-response-error {
  margin: 14px 16px 0;
}

.http-response-tabs {
  padding: 0 16px 16px;
}

.http-response-body {
  min-height: 420px;
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
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

[data-theme='dark'] .http-raw-body ::v-deep .el-textarea__inner {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .http-client__header {
    flex-direction: column;
  }

  .http-client__actions {
    justify-content: flex-start;
  }

  .http-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .http-client__header h1 {
    font-size: 28px;
  }

  .http-request-line,
  .http-key-value-table__head,
  .http-key-value-table__row {
    grid-template-columns: 1fr;
  }

  .http-client__actions,
  .http-client__actions .el-button,
  .http-method-select {
    width: 100%;
  }

  .http-response-panel__header {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px 16px;
  }
}
</style>
