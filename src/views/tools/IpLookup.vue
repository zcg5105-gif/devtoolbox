<template>
  <section class="ip-lookup">
    <div class="ip-lookup__header">
      <div>
        <h1>IP 归属地查询</h1>
        <p>查询 IPv4 / IPv6 的国家、地区、城市、运营商、ASN 和经纬度信息。</p>
      </div>

      <div class="ip-lookup__actions">
        <el-button icon="el-icon-position" @click="lookupCurrentIp">
          当前 IP
        </el-button>
        <el-button type="primary" icon="el-icon-search" :loading="loading" @click="lookupBatch">
          查询
        </el-button>
      </div>
    </div>

    <div class="ip-lookup__grid">
      <section class="input-panel">
        <div class="panel-header">
          <h2>查询输入</h2>
          <el-button size="mini" icon="el-icon-delete" @click="clearInput">
            清空
          </el-button>
        </div>

        <el-input
          v-model="queryText"
          class="ip-input"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="每行一个 IP，例如：&#10;8.8.8.8&#10;2001:4860:4860::8888"
        />

        <div class="input-tools">
          <el-button size="small" @click="loadSample">
            示例
          </el-button>
          <el-button size="small" :disabled="!results.length" @click="exportJson">
            导出 JSON
          </el-button>
          <el-button size="small" :disabled="!results.length" @click="exportCsv">
            导出 CSV
          </el-button>
        </div>

        <div class="status-box">
          <el-progress v-if="loading" :percentage="progress" />
          <el-tag v-else size="small" effect="plain">
            {{ statusText }}
          </el-tag>
          <span>数据源：ip-api.com JSONP，结果缓存 24 小时。</span>
        </div>
      </section>

      <section class="result-panel">
        <div class="panel-header">
          <h2>查询结果</h2>
          <el-button size="mini" icon="el-icon-refresh-left" :disabled="!cacheSize" @click="clearCache">
            清缓存
          </el-button>
        </div>

        <div v-if="!results.length" class="empty-state">
          <i class="el-icon-location-outline"></i>
          <span>输入 IP 或点击当前 IP 开始查询</span>
        </div>

        <div v-else class="result-list">
          <article
            v-for="item in results"
            :key="item.id"
            class="result-card"
            :class="{ 'is-error': item.status !== 'success' }"
            @click="selectedId = item.id"
          >
            <div class="result-card__top">
              <div>
                <strong>{{ item.ip }}</strong>
                <span>{{ item.cached ? '缓存结果' : '实时查询' }} · {{ item.source }}</span>
              </div>
              <el-tag size="small" :type="item.status === 'success' ? 'success' : 'danger'" effect="plain">
                {{ item.status === 'success' ? '成功' : '失败' }}
              </el-tag>
            </div>

            <el-alert
              v-if="item.status !== 'success'"
              :title="item.error || '查询失败'"
              type="error"
              :closable="false"
              show-icon
            />

            <div v-else class="info-grid">
              <div>
                <span>国家</span>
                <strong>{{ item.country || '-' }}</strong>
              </div>
              <div>
                <span>地区</span>
                <strong>{{ item.region || '-' }}</strong>
              </div>
              <div>
                <span>城市</span>
                <strong>{{ item.city || '-' }}</strong>
              </div>
              <div>
                <span>ISP</span>
                <strong>{{ item.isp || item.org || '-' }}</strong>
              </div>
              <div>
                <span>ASN</span>
                <strong>{{ item.asn || '-' }}</strong>
              </div>
              <div>
                <span>经纬度</span>
                <strong>{{ formatCoordinate(item) }}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="map-panel">
        <div class="panel-header">
          <h2>地图</h2>
          <div v-if="selectedSuccess" class="map-actions">
            <el-button size="mini" icon="el-icon-location" @click="openMap('amap')">
              高德地图
            </el-button>
            <el-button size="mini" icon="el-icon-map-location" @click="openMap('osm')">
              OSM
            </el-button>
          </div>
        </div>

        <div v-if="!selectedSuccess" class="empty-map">
          暂无可显示的坐标
        </div>
        <div v-else class="map-preview">
          <div class="map-preview__grid"></div>
          <div class="map-preview__pin">
            <i class="el-icon-location"></i>
          </div>
          <div class="map-preview__info">
            <strong>{{ selectedResult.city || selectedResult.region || selectedResult.country || selectedResult.ip }}</strong>
            <span>{{ formatCoordinate(selectedResult) }}</span>
            <el-button size="mini" icon="el-icon-document-copy" @click="copyCoordinate">
              复制坐标
            </el-button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
const CACHE_KEY = 'devtoolbox_ip_lookup_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000
const IP_API_FIELDS = [
  'status',
  'message',
  'query',
  'country',
  'countryCode',
  'regionName',
  'city',
  'lat',
  'lon',
  'isp',
  'org',
  'as',
  'asname',
  'timezone'
].join(',')

export default {
  name: 'IpLookup',
  data() {
    return {
      queryText: '',
      results: [],
      selectedId: '',
      loading: false,
      progress: 0,
      cache: {}
    }
  },
  computed: {
    queries() {
      return this.queryText
        .split(/\r\n|\r|\n/)
        .map(item => item.trim())
        .filter(Boolean)
    },
    cacheSize() {
      return Object.keys(this.cache).length
    },
    statusText() {
      if (!this.results.length) {
        return `缓存 ${this.cacheSize} 条`
      }

      return `已查询 ${this.results.length} 条，缓存 ${this.cacheSize} 条`
    },
    selectedResult() {
      return this.results.find(item => item.id === this.selectedId) || this.results.find(item => item.status === 'success')
    },
    selectedSuccess() {
      return this.selectedResult && this.selectedResult.status === 'success' && this.hasCoordinate(this.selectedResult)
    },
    osmLink() {
      if (!this.selectedSuccess) {
        return ''
      }

      return `https://www.openstreetmap.org/?mlat=${this.selectedResult.lat}&mlon=${this.selectedResult.lon}#map=10/${this.selectedResult.lat}/${this.selectedResult.lon}`
    },
    amapLink() {
      if (!this.selectedSuccess) {
        return ''
      }

      const name = encodeURIComponent(`${this.selectedResult.ip} ${this.selectedResult.city || this.selectedResult.country || ''}`.trim())
      return `https://uri.amap.com/marker?position=${this.selectedResult.lon},${this.selectedResult.lat}&name=${name}&src=devtoolbox&coordinate=wgs84&callnative=0`
    }
  },
  mounted() {
    this.loadCache()
  },
  methods: {
    async lookupCurrentIp() {
      await this.lookupItems([''])
    },
    async lookupBatch() {
      const queries = this.queries

      if (!queries.length) {
        await this.lookupCurrentIp()
        return
      }

      await this.lookupItems(queries)
    },
    async lookupItems(queries) {
      this.loading = true
      this.progress = 0
      this.results = []
      this.selectedId = ''

      const uniqueQueries = Array.from(new Set(queries)).slice(0, 50)
      const nextResults = []

      for (let index = 0; index < uniqueQueries.length; index += 1) {
        const query = uniqueQueries[index]
        const result = await this.lookupOne(query)
        nextResults.push(result)
        this.results = nextResults.slice()
        this.progress = Math.round(((index + 1) / uniqueQueries.length) * 100)

        if (!this.selectedId && result.status === 'success') {
          this.selectedId = result.id
        }
      }

      this.loading = false
    },
    async lookupOne(query) {
      const cacheKey = query || '__current__'
      const cached = this.getCached(cacheKey)

      if (cached) {
        return {
          ...cached,
          id: `${cacheKey}-${Date.now()}`,
          cached: true
        }
      }

      try {
        const raw = await this.requestIpApi(query)
        const normalized = this.normalizeIpApiResult(raw, query)

        if (normalized.status === 'success') {
          this.setCached(query || normalized.ip, normalized)
          if (!query) {
            this.setCached('__current__', normalized)
          }
        }

        return normalized
      } catch (error) {
        return {
          id: `${query || 'current'}-${Date.now()}`,
          ip: query || '当前访问者 IP',
          status: 'fail',
          error: error.message || '查询失败',
          source: 'ip-api.com',
          cached: false
        }
      }
    },
    requestIpApi(query) {
      return new Promise((resolve, reject) => {
        const callbackName = `__devtoolboxIpLookup_${Date.now()}_${Math.random().toString(16).slice(2)}`
        const script = document.createElement('script')
        const path = query ? `/${encodeURIComponent(query)}` : ''
        const timeout = window.setTimeout(() => {
          cleanup()
          reject(new Error('请求超时，请稍后重试'))
        }, 12000)

        const cleanup = () => {
          window.clearTimeout(timeout)
          delete window[callbackName]
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
        }

        window[callbackName] = data => {
          cleanup()
          resolve(data)
        }

        script.onerror = () => {
          cleanup()
          reject(new Error('API 加载失败。若当前页面使用 HTTPS，请配置代理或改用支持 HTTPS 的服务。'))
        }
        script.src = `http://ip-api.com/json${path}?fields=${encodeURIComponent(IP_API_FIELDS)}&lang=zh-CN&callback=${callbackName}`
        document.body.appendChild(script)
      })
    },
    normalizeIpApiResult(raw, query) {
      const asText = raw.as || ''
      const asMatch = String(asText).match(/AS\d+/i)

      return {
        id: `${raw.query || query || 'current'}-${Date.now()}`,
        ip: raw.query || query || '当前访问者 IP',
        status: raw.status,
        error: raw.message || '',
        country: raw.country || '',
        countryCode: raw.countryCode || '',
        region: raw.regionName || '',
        city: raw.city || '',
        isp: raw.isp || '',
        org: raw.org || '',
        asn: asMatch ? asMatch[0].toUpperCase() : '',
        asName: raw.asname || asText,
        lat: raw.lat,
        lon: raw.lon,
        timezone: raw.timezone || '',
        source: 'ip-api.com',
        cached: false,
        updatedAt: Date.now()
      }
    },
    loadSample() {
      this.queryText = [
        '8.8.8.8',
        '1.1.1.1',
        '2001:4860:4860::8888'
      ].join('\n')
    },
    clearInput() {
      this.queryText = ''
      this.results = []
      this.selectedId = ''
      this.progress = 0
    },
    loadCache() {
      try {
        this.cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      } catch (error) {
        this.cache = {}
      }
    },
    persistCache() {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cache))
    },
    getCached(query) {
      const key = String(query || '').toLowerCase()
      const item = this.cache[key]

      if (!item || Date.now() - item.savedAt > CACHE_TTL) {
        if (item) {
          this.$delete(this.cache, key)
          this.persistCache()
        }
        return null
      }

      return item.data
    },
    setCached(query, data) {
      const key = String(query || '').toLowerCase()

      this.$set(this.cache, key, {
        savedAt: Date.now(),
        data
      })
      this.persistCache()
    },
    clearCache() {
      this.cache = {}
      localStorage.removeItem(CACHE_KEY)
    },
    hasCoordinate(item) {
      return item && item.lat !== '' && item.lon !== '' && item.lat !== undefined && item.lon !== undefined
    },
    formatCoordinate(item) {
      if (!this.hasCoordinate(item)) {
        return '-'
      }

      return `${Number(item.lat).toFixed(4)}, ${Number(item.lon).toFixed(4)}`
    },
    openMap(provider) {
      const url = provider === 'amap' ? this.amapLink : this.osmLink

      if (!url) {
        this.$message.warning('暂无可打开的坐标')
        return
      }

      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) {
        this.$message.warning('浏览器拦截了弹窗，请允许弹窗或复制坐标手动打开地图')
      }
    },
    async copyCoordinate() {
      if (!this.selectedSuccess) {
        return
      }

      try {
        await navigator.clipboard.writeText(`${this.selectedResult.lat}, ${this.selectedResult.lon}`)
        this.$message.success('已复制坐标')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    exportJson() {
      this.downloadFile(JSON.stringify(this.results, null, 2), 'ip_lookup.json', 'application/json;charset=utf-8')
    },
    exportCsv() {
      const headers = ['ip', 'status', 'country', 'region', 'city', 'isp', 'org', 'asn', 'asName', 'lat', 'lon', 'timezone', 'cached']
      const rows = [
        headers,
        ...this.results.map(item => headers.map(key => item[key] === undefined ? '' : item[key]))
      ]
      const csv = rows.map(row => row.map(this.escapeCsv).join(',')).join('\n')

      this.downloadFile(csv, 'ip_lookup.csv', 'text/csv;charset=utf-8')
    },
    escapeCsv(value) {
      const text = String(value === null || value === undefined ? '' : value)

      if (!/[",\r\n]/.test(text)) {
        return text
      }

      return `"${text.replace(/"/g, '""')}"`
    },
    downloadFile(content, filename, type) {
      const blob = new Blob([content], { type })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    }
  }
}
</script>

<style lang="scss" scoped>
.ip-lookup {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.ip-lookup__header {
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

.ip-lookup__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.ip-lookup__grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
  gap: 18px;
  align-items: start;
}

.input-panel,
.result-panel,
.map-panel {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.map-panel {
  grid-column: 1 / -1;
  overflow: hidden;
}

.map-actions {
  display: flex;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
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

.ip-input ::v-deep .el-textarea__inner {
  min-height: 260px !important;
  padding: 16px;
  resize: vertical;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.input-tools,
.status-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
}

.status-box {
  color: var(--color-text-muted);
  font-size: 13px;

  .el-progress {
    min-width: 180px;
    flex: 1;
  }
}

.empty-state,
.empty-map {
  display: flex;
  min-height: 320px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-muted);

  i {
    font-size: 38px;
  }
}

.result-list {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.result-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  cursor: pointer;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.result-card:hover {
  border-color: var(--color-primary);
}

.result-card.is-error {
  border-color: rgba(245, 108, 108, 0.45);
}

.result-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  strong {
    display: block;
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    word-break: break-all;
  }

  span {
    display: block;
    margin-top: 4px;
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  div {
    min-width: 0;
    padding: 10px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }

  span {
    display: block;
    margin-bottom: 4px;
    color: var(--color-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    overflow-wrap: anywhere;
    color: var(--color-text);
    font-size: 14px;
    line-height: 1.5;
  }
}

.map-preview {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.16), rgba(103, 194, 58, 0.12)),
    var(--color-background);
}

.map-preview__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(144, 147, 153, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(144, 147, 153, 0.18) 1px, transparent 1px);
  background-size: 42px 42px;
}

.map-preview__pin {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  background: #f56c6c;
  border: 4px solid #fff;
  border-radius: 50%;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
  color: #fff;
  font-size: 28px;
}

.map-preview__info {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: grid;
  gap: 8px;
  min-width: 220px;
  max-width: calc(100% - 36px);
  padding: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);

  strong {
    color: var(--color-text);
    font-size: 16px;
    word-break: break-all;
  }

  span {
    color: var(--color-text-muted);
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 13px;
  }
}

@media (max-width: 1024px) {
  .ip-lookup__header {
    flex-direction: column;
  }

  .ip-lookup__actions {
    justify-content: flex-start;
  }

  .ip-lookup__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .ip-lookup__header h1 {
    font-size: 28px;
  }

  .ip-lookup__actions,
  .ip-lookup__actions .el-button {
    width: 100%;
  }

  .result-card__top,
  .input-tools,
  .status-box {
    align-items: stretch;
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .map-actions {
    flex-direction: column;

    .el-button {
      width: 100%;
    }
  }

  .map-preview__info {
    right: 12px;
    bottom: 12px;
    left: 12px;
  }
}
</style>
