<template>
  <section class="url-params-tool">
    <div class="tool-header">
      <div>
        <h1>URL 参数解析与对比</h1>
        <p>解析、编辑、重组 URL 查询参数，并对比两个 URL 的参数差异。</p>
      </div>
      <div class="tool-actions">
        <el-button size="small" icon="el-icon-refresh" @click="parseMainUrl">解析</el-button>
        <el-button size="small" icon="el-icon-sort" @click="sortParams">参数排序</el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!builtUrl" @click="copyBuiltUrl">复制 URL</el-button>
      </div>
    </div>

    <el-card shadow="never" class="tool-panel">
      <el-input v-model="mainUrl" placeholder="https://example.com/path?a=1" @keyup.enter.native="parseMainUrl">
        <template slot="prepend">URL</template>
      </el-input>
      <el-alert
        v-if="mainParse.errorMessage || mainParse.assumedProtocol"
        class="tool-alert"
        :title="mainParse.errorMessage || '输入未包含协议，已按 https:// 解析'"
        :type="mainParse.errorMessage ? 'error' : 'warning'"
        :closable="false"
        show-icon
      />
    </el-card>

    <div class="url-grid">
      <el-card shadow="never" class="tool-panel">
        <div slot="header" class="panel-title">URL 组成</div>
        <el-form label-position="top">
          <el-form-item label="协议">
            <el-input v-model="parts.protocol" @input="rebuildUrl" />
          </el-form-item>
          <el-form-item label="Host">
            <el-input v-model="parts.host" @input="rebuildUrl" />
          </el-form-item>
          <el-form-item label="Path">
            <el-input v-model="parts.pathname" @input="rebuildUrl" />
          </el-form-item>
          <el-form-item label="Hash">
            <el-input v-model="parts.hash" @input="rebuildUrl" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="tool-panel">
        <div slot="header" class="panel-title">
          <span>查询参数</span>
          <el-button size="mini" icon="el-icon-plus" @click="addParam">添加参数</el-button>
        </div>
        <div class="param-table">
          <div class="param-row param-row--head">
            <span>启用</span>
            <span>Key</span>
            <span>Value</span>
            <span></span>
          </div>
          <div v-for="(param, index) in params" :key="param.id" class="param-row">
            <el-checkbox v-model="param.enabled" @change="rebuildUrl" />
            <el-input v-model="param.key" size="small" @input="rebuildUrl" />
            <el-input v-model="param.value" size="small" @input="rebuildUrl" />
            <el-button size="mini" icon="el-icon-delete" @click="removeParam(index)" />
          </div>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="tool-panel">
      <div slot="header" class="panel-title">重组 URL</div>
      <pre class="result-block">{{ builtUrl }}</pre>
    </el-card>

    <el-card shadow="never" class="tool-panel">
      <div slot="header" class="panel-title">参数对比</div>
      <div class="compare-line">
        <el-input v-model="compareUrl" placeholder="输入第二个 URL" />
        <el-button type="primary" icon="el-icon-s-data" @click="compareUrls">对比</el-button>
      </div>
      <el-tabs v-model="compareTab">
        <el-tab-pane label="仅左侧" name="left">
          <el-table :data="compareResult.onlyInLeft" border>
            <el-table-column prop="key" label="Key" />
            <el-table-column prop="value" label="Value" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="仅右侧" name="right">
          <el-table :data="compareResult.onlyInRight" border>
            <el-table-column prop="key" label="Key" />
            <el-table-column prop="value" label="Value" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="值不同" name="changed">
          <el-table :data="compareResult.changed" border>
            <el-table-column prop="key" label="Key" />
            <el-table-column prop="leftValue" label="左侧值" />
            <el-table-column prop="rightValue" label="右侧值" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </section>
</template>

<script>
const {
  parseUrlInput,
  buildUrlFromParts,
  compareQueryParams
} = require('@/utils/toolExpansionCore')

export default {
  name: 'UrlParamsTool',
  data() {
    return {
      mainUrl: 'https://example.com/api/users?page=1&size=20#list',
      compareUrl: 'https://example.com/api/users?page=2&debug=true#list',
      mainParse: parseUrlInput(''),
      parts: {
        protocol: '',
        host: '',
        pathname: '',
        hash: ''
      },
      params: [],
      builtUrl: '',
      compareResult: {
        onlyInLeft: [],
        onlyInRight: [],
        changed: [],
        errors: []
      },
      compareTab: 'changed'
    }
  },
  mounted() {
    this.parseMainUrl()
    this.compareUrls()
  },
  methods: {
    parseMainUrl() {
      const parsed = parseUrlInput(this.mainUrl)
      this.mainParse = parsed
      this.parts = { ...parsed.parts }
      this.params = parsed.params.map(param => ({ ...param }))
      this.rebuildUrl()
    },
    addParam() {
      this.params.push({
        id: `param_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        enabled: true,
        key: '',
        value: ''
      })
      this.rebuildUrl()
    },
    removeParam(index) {
      this.params.splice(index, 1)
      this.rebuildUrl()
    },
    sortParams() {
      this.params.sort((left, right) => left.key.localeCompare(right.key))
      this.rebuildUrl()
    },
    rebuildUrl() {
      this.builtUrl = buildUrlFromParts(this.parts, this.params)
    },
    async copyBuiltUrl() {
      if (!this.builtUrl) return

      try {
        await navigator.clipboard.writeText(this.builtUrl)
        this.$message.success('已复制')
      } catch (error) {
        this.$message.error('复制失败，请手动复制')
      }
    },
    compareUrls() {
      this.compareResult = compareQueryParams(this.builtUrl || this.mainUrl, this.compareUrl)
      if (this.compareResult.errors.length) {
        this.$message.warning(this.compareResult.errors[0])
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.url-params-tool {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.tool-header,
.tool-actions,
.panel-title,
.compare-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-header {
  align-items: flex-start;
  justify-content: space-between;
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

.tool-actions {
  flex-wrap: wrap;
  justify-content: flex-end;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.tool-panel {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.tool-alert {
  margin-top: 12px;
}

.url-grid {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 18px;
}

.panel-title {
  justify-content: space-between;
  color: var(--color-text);
  font-weight: 700;
}

.param-table {
  display: grid;
  gap: 8px;
}

.param-row {
  display: grid;
  grid-template-columns: 56px minmax(120px, 0.4fr) minmax(160px, 1fr) 42px;
  gap: 8px;
  align-items: center;
}

.param-row--head {
  color: var(--color-text-muted);
  font-size: 13px;
}

.result-block {
  min-height: 54px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.compare-line {
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .tool-header {
    flex-direction: column;
  }

  .url-grid,
  .param-row,
  .compare-line {
    grid-template-columns: 1fr;
  }
}
</style>
