<template>
  <section class="regex-tool">
    <div class="regex-tool__header">
      <h1>正则测试器</h1>
      <p>输入正则表达式和测试文本，实时查看匹配结果与高亮位置。</p>
    </div>

    <div class="regex-layout">
      <el-card shadow="never" class="regex-panel">
        <div slot="header" class="regex-panel__header">
          <span>正则与测试文本</span>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="常用正则预设">
            <div class="regex-presets">
              <el-button
                v-for="preset in presets"
                :key="preset.name"
                size="small"
                @click="applyPreset(preset)"
              >
                {{ preset.name }}
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="正则表达式">
            <el-input
              v-model="regexInput"
              clearable
              placeholder="例如 /abc/g，也可以直接输入 abc"
            />
          </el-form-item>

          <el-form-item label="测试文本">
            <el-input
              v-model="testText"
              type="textarea"
              :autosize="{ minRows: 10, maxRows: 18 }"
              placeholder="请输入需要测试的文本"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="regex-panel">
        <div slot="header" class="regex-panel__header">
          <span>匹配结果</span>
          <span class="regex-count">匹配次数：{{ matchCount }}</span>
        </div>

        <el-alert
          v-if="regexError"
          type="error"
          :closable="false"
          :title="regexError"
          class="regex-alert"
        />

        <div v-else-if="matches.length" class="regex-match-list">
          <div
            v-for="match in matches"
            :key="match.key"
            class="regex-match-card"
          >
            <div class="regex-match-card__header">
              <span>#{{ match.number }}</span>
              <span>index: {{ match.index }}</span>
              <CopyButton :text="match.text" />
            </div>
            <code>{{ match.text || '空匹配' }}</code>
            <div v-if="match.groups.length" class="regex-groups">
              <span
                v-for="group in match.groups"
                :key="group.key"
                class="regex-group"
              >
                ${{ group.number }}: {{ group.value }}
              </span>
            </div>
          </div>
        </div>

        <el-empty
          v-else
          description="暂无匹配结果"
          :image-size="80"
        />
      </el-card>
    </div>

    <el-card shadow="never" class="regex-panel regex-panel--highlight">
      <div slot="header" class="regex-panel__header">
        <span>高亮显示</span>
      </div>

      <div class="regex-highlight">
        <template v-if="highlightSegments.length">
          <span
            v-for="segment in highlightSegments"
            :key="segment.key"
            :class="{ 'is-match': segment.type === 'match' }"
          >{{ segment.text }}</span>
        </template>
        <span v-else class="regex-highlight__empty">暂无测试文本</span>
      </div>
    </el-card>
  </section>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue'

export default {
  name: 'RegexTester',
  components: {
    CopyButton
  },
  data() {
    return {
      regexInput: '',
      testText: '',
      presets: [
        {
          name: '邮箱',
          value: '/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g'
        },
        {
          name: '手机号',
          value: '/1[3-9]\\d{9}/g'
        },
        {
          name: 'URL',
          value: '/https?:\\/\\/[^\\s]+/g'
        },
        {
          name: 'IP',
          value: '/\\b(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}\\b/g'
        }
      ]
    }
  },
  computed: {
    matchState() {
      return this.buildMatchState()
    },
    matches() {
      return this.matchState.matches
    },
    matchCount() {
      return this.matches.length
    },
    highlightSegments() {
      return this.matchState.segments
    },
    regexError() {
      return this.matchState.error
    }
  },
  methods: {
    applyPreset(preset) {
      this.regexInput = preset.value
    },
    buildMatchState() {
      const text = this.testText
      const emptyState = {
        error: '',
        matches: [],
        segments: this.createPlainSegments(text)
      }

      if (!this.regexInput.trim() || !text) {
        return emptyState
      }

      const parsed = this.parseRegexInput(this.regexInput.trim())
      let regex

      try {
        regex = new RegExp(parsed.pattern, this.normalizeFlags(parsed.flags))
      } catch (error) {
        return {
          error: error.message,
          matches: [],
          segments: this.createPlainSegments(text)
        }
      }

      return this.collectMatches(regex, text)
    },
    parseRegexInput(value) {
      if (!value.startsWith('/')) {
        return {
          pattern: value,
          flags: ''
        }
      }

      const slashIndex = this.findLastUnescapedSlash(value)

      if (slashIndex <= 0) {
        return {
          pattern: value,
          flags: ''
        }
      }

      return {
        pattern: value.slice(1, slashIndex),
        flags: value.slice(slashIndex + 1)
      }
    },
    findLastUnescapedSlash(value) {
      for (let index = value.length - 1; index > 0; index -= 1) {
        if (value[index] === '/' && !this.isEscaped(value, index)) {
          return index
        }
      }

      return -1
    },
    isEscaped(value, index) {
      let slashCount = 0

      for (let cursor = index - 1; cursor >= 0 && value[cursor] === '\\'; cursor -= 1) {
        slashCount += 1
      }

      return slashCount % 2 === 1
    },
    normalizeFlags(flags) {
      return Array.from(new Set(`${flags}g`.split(''))).join('')
    },
    collectMatches(regex, text) {
      const matches = []
      const segments = []
      let lastIndex = 0
      let match = regex.exec(text)

      while (match) {
        const start = match.index
        const matchedText = match[0]
        const end = start + matchedText.length
        const number = matches.length + 1

        if (start > lastIndex) {
          segments.push({
            key: `text-${lastIndex}-${start}`,
            type: 'text',
            text: text.slice(lastIndex, start)
          })
        }

        if (matchedText) {
          segments.push({
            key: `match-${start}-${end}-${number}`,
            type: 'match',
            text: matchedText
          })
          lastIndex = end
        }

        matches.push({
          key: `result-${start}-${end}-${number}`,
          number,
          index: start,
          text: matchedText,
          groups: match.slice(1).map((value, groupIndex) => ({
            key: `group-${number}-${groupIndex + 1}`,
            number: groupIndex + 1,
            value: value === undefined ? 'undefined' : value
          }))
        })

        if (!matchedText) {
          regex.lastIndex += 1
        }

        match = regex.exec(text)
      }

      if (lastIndex < text.length) {
        segments.push({
          key: `text-${lastIndex}-end`,
          type: 'text',
          text: text.slice(lastIndex)
        })
      }

      return {
        error: '',
        matches,
        segments
      }
    },
    createPlainSegments(text) {
      return text
        ? [
          {
            key: 'text-all',
            type: 'text',
            text
          }
        ]
        : []
    }
  }
}
</script>

<style lang="scss" scoped>
.regex-tool {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.regex-tool__header {
  margin-bottom: 24px;

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

.regex-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 18px;
  align-items: start;
}

.regex-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.regex-panel--highlight {
  margin-top: 18px;
}

.regex-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.regex-count {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
}

.regex-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.regex-alert {
  margin-bottom: 12px;
}

.regex-match-list {
  display: grid;
  gap: 12px;
  max-height: 540px;
  overflow: auto;
}

.regex-match-card {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.regex-match-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.regex-match-card__header .el-button {
  margin-left: auto;
}

.regex-match-card code {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.regex-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.regex-group {
  max-width: 100%;
  padding: 4px 8px;
  overflow-wrap: anywhere;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-muted);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
}

.regex-highlight {
  min-height: 180px;
  padding: 14px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
}

.regex-highlight .is-match {
  padding: 1px 2px;
  background: #facc15;
  border-radius: 3px;
  color: #1f2937;
}

.regex-highlight__empty {
  color: var(--color-text-muted);
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

@media (max-width: 980px) {
  .regex-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .regex-tool__header h1 {
    font-size: 28px;
  }

  .regex-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
