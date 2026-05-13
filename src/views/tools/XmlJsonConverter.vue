<template>
  <section class="xml-json-converter">
    <div class="xml-json-converter__header">
      <div>
        <h1>XML / JSON 转换器</h1>
        <p>XML 与 JSON 双向转换，保留属性、文本节点和层级结构。</p>
      </div>

      <div class="xml-json-converter__actions">
        <el-button size="small" icon="el-icon-sort" @click="toggleMode">
          切换方向
        </el-button>
        <el-button size="small" icon="el-icon-document" @click="loadExample">
          示例
        </el-button>
        <el-button size="small" icon="el-icon-document-copy" :disabled="!outputText" @click="copyResult">
          复制结果
        </el-button>
        <el-button size="small" icon="el-icon-download" :disabled="!outputText" @click="downloadResult">
          下载结果
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="converter-options">
      <div class="options-grid">
        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="转换方向">
            <el-radio-group v-model="mode" size="small">
              <el-radio-button label="xmlToJson">XML 转 JSON</el-radio-button>
              <el-radio-button label="jsonToXml">JSON 转 XML</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="缩进空格">
            <el-input-number
              v-model="indent"
              :min="0"
              :max="8"
              :step="2"
              size="small"
              controls-position="right"
            />
          </el-form-item>
        </el-form>

        <div class="options-note">
          <el-tag size="small" :type="errorMessage ? 'danger' : 'success'" effect="plain">
            {{ errorMessage ? '转换失败' : validationMessage }}
          </el-tag>
          <span>属性保存为 @attributes，文本保存为 _text。</span>
        </div>
      </div>
    </el-card>

    <el-alert
      v-if="errorMessage"
      class="converter-alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div class="converter-grid">
      <section class="converter-pane">
        <div class="converter-pane__header">
          <h2>XML {{ mode === 'xmlToJson' ? '输入' : '输出' }}</h2>
          <span>{{ xmlStats }}</span>
        </div>
        <el-input
          v-model="xmlText"
          class="converter-pane__textarea"
          type="textarea"
          :readonly="mode !== 'xmlToJson'"
          :autosize="false"
          spellcheck="false"
          placeholder="<root></root>"
        />
      </section>

      <section class="converter-pane">
        <div class="converter-pane__header">
          <h2>JSON {{ mode === 'jsonToXml' ? '输入' : '输出' }}</h2>
          <span>{{ jsonStats }}</span>
        </div>
        <el-input
          v-model="jsonText"
          class="converter-pane__textarea"
          type="textarea"
          :readonly="mode !== 'jsonToXml'"
          :autosize="false"
          spellcheck="false"
          placeholder='{"root":{"_text":"value"}}'
        />
      </section>
    </div>
  </section>
</template>

<script>
import { js2xml, xml2js } from 'xml-js'

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<note id="1001" priority="high">
  <to>Alice</to>
  <from>DevToolbox</from>
  <heading reminder="true">Meeting</heading>
  <body>下午 3 点同步 XML 与 JSON 转换规则。</body>
  <tags>
    <tag>xml</tag>
    <tag>json</tag>
  </tags>
</note>`

const SAMPLE_JSON = {
  note: {
    '@attributes': {
      id: '1001',
      priority: 'high'
    },
    to: {
      _text: 'Alice'
    },
    from: {
      _text: 'DevToolbox'
    },
    heading: {
      '@attributes': {
        reminder: 'true'
      },
      _text: 'Meeting'
    },
    body: {
      _text: '下午 3 点同步 XML 与 JSON 转换规则。'
    },
    tags: {
      tag: [
        { _text: 'xml' },
        { _text: 'json' }
      ]
    }
  }
}

export default {
  name: 'XmlJsonConverter',
  data() {
    return {
      mode: 'xmlToJson',
      xmlText: SAMPLE_XML,
      jsonText: '',
      indent: 2,
      errorMessage: '',
      validationMessage: '等待转换',
      convertTimer: null
    }
  },
  computed: {
    outputText() {
      return this.mode === 'xmlToJson' ? this.jsonText : this.xmlText
    },
    xmlStats() {
      return this.formatStats(this.xmlText)
    },
    jsonStats() {
      return this.formatStats(this.jsonText)
    },
    spaces() {
      return Number(this.indent) || 0
    }
  },
  watch: {
    mode() {
      this.scheduleConvert()
    },
    xmlText() {
      if (this.mode === 'xmlToJson') {
        this.scheduleConvert()
      }
    },
    jsonText() {
      if (this.mode === 'jsonToXml') {
        this.scheduleConvert()
      }
    },
    indent() {
      this.scheduleConvert()
    }
  },
  mounted() {
    this.scheduleConvert()
  },
  beforeDestroy() {
    window.clearTimeout(this.convertTimer)
  },
  methods: {
    scheduleConvert() {
      window.clearTimeout(this.convertTimer)
      this.convertTimer = window.setTimeout(() => {
        this.convert()
      }, 160)
    },
    convert() {
      this.errorMessage = ''

      try {
        if (this.mode === 'xmlToJson') {
          this.convertXmlToJson()
        } else {
          this.convertJsonToXml()
        }
      } catch (error) {
        this.errorMessage = this.normalizeError(error)
      }
    },
    convertXmlToJson() {
      const source = this.xmlText.trim()

      if (!source) {
        this.jsonText = ''
        this.validationMessage = 'XML 为空'
        return
      }

      const result = xml2js(source, {
        compact: true,
        attributesKey: '@attributes',
        textKey: '_text',
        cdataKey: '_cdata',
        commentKey: '_comment',
        ignoreDeclaration: false,
        ignoreInstruction: false,
        ignoreAttributes: false,
        trim: false,
        alwaysChildren: false
      })

      this.jsonText = JSON.stringify(result, null, this.spaces)
      this.validationMessage = 'XML 已转换为 JSON'
    },
    convertJsonToXml() {
      const source = this.jsonText.trim()

      if (!source) {
        this.xmlText = ''
        this.validationMessage = 'JSON 为空'
        return
      }

      const parsed = JSON.parse(source)
      this.xmlText = js2xml(parsed, {
        compact: true,
        attributesKey: '@attributes',
        textKey: '_text',
        cdataKey: '_cdata',
        commentKey: '_comment',
        spaces: this.spaces
      })
      this.validationMessage = 'JSON 已转换为 XML'
    },
    normalizeError(error) {
      if (!error) {
        return '转换失败'
      }

      const message = error.message || String(error)
      if (/Unexpected token|JSON/.test(message)) {
        return `JSON 格式错误：${message}`
      }
      if (/Unclosed|Invalid|Unexpected close tag|Text data outside of root node/i.test(message)) {
        return `XML 格式错误：${message}`
      }
      return message
    },
    toggleMode() {
      this.mode = this.mode === 'xmlToJson' ? 'jsonToXml' : 'xmlToJson'
      if (this.mode === 'jsonToXml' && !this.jsonText.trim()) {
        this.jsonText = JSON.stringify(SAMPLE_JSON, null, this.spaces)
      }
      if (this.mode === 'xmlToJson' && !this.xmlText.trim()) {
        this.xmlText = SAMPLE_XML
      }
    },
    loadExample() {
      if (this.mode === 'xmlToJson') {
        this.xmlText = SAMPLE_XML
      } else {
        this.jsonText = JSON.stringify(SAMPLE_JSON, null, this.spaces)
      }
    },
    async copyResult() {
      try {
        await navigator.clipboard.writeText(this.outputText)
        this.$message.success('已复制结果')
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
    downloadResult() {
      const isJson = this.mode === 'xmlToJson'
      const blob = new Blob([this.outputText], {
        type: isJson ? 'application/json;charset=utf-8' : 'application/xml;charset=utf-8'
      })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = isJson ? `converted_${Date.now()}.json` : `converted_${Date.now()}.xml`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    formatStats(value) {
      const lines = value ? value.split(/\r\n|\r|\n/).length : 0
      return `${lines} 行 / ${value.length} 字符`
    }
  }
}
</script>

<style lang="scss" scoped>
.xml-json-converter {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.xml-json-converter__header {
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

.xml-json-converter__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.converter-options {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.options-grid {
  display: grid;
  grid-template-columns: 280px 160px minmax(260px, 1fr);
  gap: 16px;
  align-items: start;
}

.options-note {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.converter-alert {
  margin-bottom: 18px;
}

.converter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 680px;
}

.converter-pane {
  display: flex;
  min-width: 0;
  min-height: 680px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.converter-pane__header {
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

  span {
    color: var(--color-text-muted);
    font-size: 13px;
  }
}

.converter-pane__textarea {
  flex: 1;
  min-height: 0;
}

.converter-pane__textarea ::v-deep .el-textarea__inner {
  height: 100%;
  min-height: 625px !important;
  padding: 16px;
  resize: none;
  background: var(--color-surface);
  border: 0;
  border-radius: 0;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
}

[data-theme='dark'] .converter-pane__textarea ::v-deep .el-textarea__inner {
  background: var(--color-surface);
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .xml-json-converter__header {
    flex-direction: column;
  }

  .xml-json-converter__actions {
    justify-content: flex-start;
  }

  .options-grid,
  .converter-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .xml-json-converter__header h1 {
    font-size: 28px;
  }

  .xml-json-converter__actions,
  .xml-json-converter__actions .el-button {
    width: 100%;
  }

  .options-note {
    align-items: flex-start;
    flex-direction: column;
  }

  .converter-grid,
  .converter-pane {
    min-height: 520px;
  }

  .converter-pane__textarea ::v-deep .el-textarea__inner {
    min-height: 465px !important;
  }
}
</style>
