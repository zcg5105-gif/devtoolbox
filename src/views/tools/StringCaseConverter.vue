<template>
  <section class="case-converter">
    <div class="case-converter__header">
      <div>
        <h1>字符串大小写转换</h1>
        <p>批量转换常见命名格式，支持中英文混合文本并实时生成结果。</p>
      </div>

      <div class="case-converter__actions">
        <el-button
          size="small"
          icon="el-icon-document-copy"
          :disabled="!inputText"
          @click="copyAll"
        >
          复制全部 JSON
        </el-button>
        <el-button size="small" icon="el-icon-magic-stick" @click="loadExample">
          示例
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearText">
          清空
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="input-card">
      <div slot="header" class="input-card__header">
        <span>输入文本</span>
        <div class="stats">
          <span>字符 {{ stats.chars }}</span>
          <span>单词 {{ stats.words }}</span>
          <span>行数 {{ stats.lines }}</span>
        </div>
      </div>

      <el-input
        v-model="inputText"
        type="textarea"
        :autosize="{ minRows: 6, maxRows: 12 }"
        spellcheck="false"
        placeholder="请输入要转换的字符串，例如：hello world / user_name / 用户 name"
      />
    </el-card>

    <div class="result-list">
      <el-card
        v-for="item in results"
        :key="item.key"
        shadow="never"
        class="result-card"
      >
        <div class="result-card__label">
          <strong>{{ item.label }}</strong>
          <small>{{ item.example }}</small>
        </div>
        <code>{{ item.value }}</code>
        <el-button
          size="mini"
          icon="el-icon-document-copy"
          :disabled="!item.value"
          @click="copyText(item.value)"
        >
          复制
        </el-button>
      </el-card>
    </div>
  </section>
</template>

<script>
const EXAMPLE_TEXT = 'hello world 用户 name'

export default {
  name: 'StringCaseConverter',
  data() {
    return {
      inputText: EXAMPLE_TEXT
    }
  },
  computed: {
    words() {
      return this.extractWords(this.inputText)
    },
    results() {
      const value = this.inputText
      const words = this.words

      return [
        {
          key: 'upper',
          label: '全大写',
          example: 'HELLO WORLD',
          value: value.toUpperCase()
        },
        {
          key: 'lower',
          label: '全小写',
          example: 'hello world',
          value: value.toLowerCase()
        },
        {
          key: 'sentence',
          label: '首字母大写',
          example: 'Hello world',
          value: this.capitalizeFirst(value)
        },
        {
          key: 'title',
          label: '每个单词首字母大写',
          example: 'Hello World',
          value: words.map(this.capitalizeWord).join(' ')
        },
        {
          key: 'camel',
          label: '驼峰命名',
          example: 'helloWorld',
          value: this.toCamelCase(words)
        },
        {
          key: 'pascal',
          label: '帕斯卡命名',
          example: 'HelloWorld',
          value: words.map(this.capitalizeWord).join('')
        },
        {
          key: 'snake',
          label: '蛇形命名',
          example: 'hello_world',
          value: words.map(this.normalizeWord).join('_')
        },
        {
          key: 'kebab',
          label: '短横线命名',
          example: 'hello-world',
          value: words.map(this.normalizeWord).join('-')
        },
        {
          key: 'constant',
          label: '常量命名',
          example: 'HELLO_WORLD',
          value: words.map(word => this.normalizeWord(word).toUpperCase()).join('_')
        }
      ]
    },
    stats() {
      return {
        chars: this.inputText.length,
        words: this.words.length,
        lines: this.inputText ? this.inputText.split(/\r\n|\r|\n/).length : 0
      }
    },
    allResultsJson() {
      return JSON.stringify(
        this.results.reduce((target, item) => {
          target[item.key] = item.value
          return target
        }, {}),
        null,
        2
      )
    }
  },
  methods: {
    extractWords(value) {
      if (!value.trim()) {
        return []
      }

      return value
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_\-./\\|]+/g, ' ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    },
    normalizeWord(word) {
      return word.toLowerCase()
    },
    capitalizeFirst(value) {
      const index = value.search(/[\p{L}\p{N}]/u)

      if (index < 0) {
        return value
      }

      return `${value.slice(0, index)}${value[index].toUpperCase()}${value.slice(index + 1).toLowerCase()}`
    },
    capitalizeWord(word) {
      if (!word) {
        return ''
      }

      return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`
    },
    toCamelCase(words) {
      if (!words.length) {
        return ''
      }

      return [
        this.normalizeWord(words[0]),
        ...words.slice(1).map(this.capitalizeWord)
      ].join('')
    },
    async copyAll() {
      await this.copyText(this.allResultsJson)
    },
    async copyText(text) {
      if (!text) {
        return
      }

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
    },
    loadExample() {
      this.inputText = EXAMPLE_TEXT
    },
    clearText() {
      this.inputText = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.case-converter {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.case-converter__header {
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

.case-converter__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.input-card,
.result-card {
  border-color: var(--color-border);
  border-radius: 8px;
}

.input-card {
  margin-bottom: 18px;
}

.input-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
}

.result-list {
  display: grid;
  gap: 12px;
}

.result-card ::v-deep .el-card__body {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.result-card__label {
  display: grid;
  gap: 4px;

  strong {
    color: var(--color-text);
  }

  small {
    color: var(--color-text-muted);
    font-size: 12px;
  }
}

code {
  min-width: 0;
  padding: 10px 12px;
  overflow-wrap: anywhere;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 860px) {
  .case-converter__header {
    flex-direction: column;
  }

  .case-converter__actions {
    justify-content: flex-start;
  }

  .result-card ::v-deep .el-card__body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .case-converter__header h1 {
    font-size: 28px;
  }

  .case-converter__actions,
  .case-converter__actions .el-button {
    width: 100%;
  }

  .input-card__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
