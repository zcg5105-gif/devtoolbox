<template>
  <section class="regex-reference">
    <div class="regex-reference__header">
      <div>
        <h1>正则表达式速查手册</h1>
        <p>按语法分类查看说明和示例，右侧可实时测试匹配结果并收藏常用表达式。</p>
      </div>

      <div class="regex-reference__actions">
        <el-button size="small" icon="el-icon-star-off" :disabled="!pattern" @click="addFavorite">
          收藏当前正则
        </el-button>
        <el-button size="small" icon="el-icon-printer" @click="printCheatsheet">
          打印小抄
        </el-button>
      </div>
    </div>

    <div class="regex-layout">
      <aside class="regex-sidebar">
        <el-card shadow="never" class="regex-panel">
          <div slot="header" class="regex-panel__header">
            <span>语法分类</span>
          </div>
          <button
            v-for="category in categories"
            :key="category.key"
            class="category-button"
            :class="{ 'is-active': activeCategory === category.key }"
            @click="activeCategory = category.key"
          >
            <i :class="category.icon"></i>
            <span>{{ category.name }}</span>
          </button>
        </el-card>

        <el-card shadow="never" class="regex-panel favorites-panel">
          <div slot="header" class="regex-panel__header">
            <span>收藏</span>
            <small>{{ favorites.length }}</small>
          </div>

          <div v-if="!favorites.length" class="empty-state">暂无收藏</div>
          <div
            v-for="item in favorites"
            :key="item.id"
            class="favorite-item"
          >
            <button @click="useFavorite(item)">
              <strong>/{{ item.pattern }}/{{ item.flags }}</strong>
              <small>{{ item.name || '未命名正则' }}</small>
            </button>
            <el-button size="mini" icon="el-icon-delete" @click="removeFavorite(item.id)" />
          </div>
        </el-card>
      </aside>

      <main class="regex-content">
        <el-card shadow="never" class="regex-panel">
          <div slot="header" class="regex-panel__header">
            <span>{{ activeCategoryInfo.name }}</span>
            <small>{{ activeCategoryInfo.description }}</small>
          </div>

          <div class="syntax-list">
            <button
              v-for="item in activeCategoryInfo.items"
              :key="item.token"
              class="syntax-card"
              :class="{ 'is-active': selectedToken === item.token }"
              @click="selectSyntax(item)"
            >
              <code>{{ item.token }}</code>
              <span>{{ item.title }}</span>
            </button>
          </div>

          <div v-if="selectedSyntax" class="syntax-detail">
            <div class="syntax-detail__title">
              <code>{{ selectedSyntax.token }}</code>
              <h2>{{ selectedSyntax.title }}</h2>
            </div>
            <p>{{ selectedSyntax.description }}</p>
            <div class="syntax-example">
              <span>示例</span>
              <code>{{ selectedSyntax.example }}</code>
              <el-button size="mini" icon="el-icon-video-play" @click="useExample(selectedSyntax)">
                试用
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" class="regex-panel common-panel">
          <div slot="header" class="regex-panel__header">
            <span>常用正则库</span>
            <small>点击即用</small>
          </div>

          <div class="common-pattern-grid">
            <button
              v-for="item in commonPatterns"
              :key="item.name"
              class="common-pattern"
              @click="usePattern(item)"
            >
              <strong>{{ item.name }}</strong>
              <code>{{ item.pattern }}</code>
            </button>
          </div>
        </el-card>

        <el-card shadow="never" class="regex-panel cheatsheet-panel">
          <div slot="header" class="regex-panel__header">
            <span>正则小抄卡片</span>
            <small>打印时只保留本区域和基础说明</small>
          </div>

          <div class="cheatsheet-grid">
            <div
              v-for="category in categories"
              :key="category.key"
              class="cheatsheet-card"
            >
              <h3>{{ category.name }}</h3>
              <p v-for="item in category.items.slice(0, 5)" :key="item.token">
                <code>{{ item.token }}</code>
                <span>{{ item.title }}</span>
              </p>
            </div>
          </div>
        </el-card>
      </main>

      <aside class="regex-tester">
        <el-card shadow="never" class="regex-panel">
          <div slot="header" class="regex-panel__header">
            <span>在线测试器</span>
            <el-tag size="small" :type="regexError ? 'danger' : 'success'" effect="plain">
              {{ regexError ? '正则错误' : `${matches.length} 个匹配` }}
            </el-tag>
          </div>

          <el-form label-position="top" @submit.native.prevent>
            <el-form-item label="正则表达式">
              <el-input v-model="pattern" spellcheck="false" placeholder="例如：\\b\\w+@\\w+\\.com\\b" />
            </el-form-item>

            <el-form-item label="Flags">
              <el-checkbox-group v-model="flags">
                <el-checkbox label="g">g</el-checkbox>
                <el-checkbox label="i">i</el-checkbox>
                <el-checkbox label="m">m</el-checkbox>
                <el-checkbox label="s">s</el-checkbox>
                <el-checkbox label="u">u</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="测试文本">
              <el-input
                v-model="testText"
                type="textarea"
                :autosize="{ minRows: 7, maxRows: 12 }"
                spellcheck="false"
                placeholder="请输入要匹配的文本"
              />
            </el-form-item>
          </el-form>

          <el-alert
            v-if="regexError"
            class="regex-error"
            :title="regexError"
            type="error"
            :closable="false"
            show-icon
          />

          <div class="match-preview">
            <div class="match-preview__title">匹配高亮</div>
            <div class="highlight-box">
              <template v-for="segment in highlightedSegments">
                <mark v-if="segment.match" :key="segment.id">{{ segment.text }}</mark>
                <span v-else :key="segment.id">{{ segment.text }}</span>
              </template>
            </div>
          </div>

          <div class="match-process">
            <div class="match-preview__title">匹配过程</div>
            <div v-if="!matches.length" class="empty-state">暂无匹配</div>
            <ol v-else>
              <li v-for="match in matches" :key="match.id">
                <strong>#{{ match.index + 1 }}</strong>
                <span>位置 {{ match.start }}-{{ match.end }}</span>
                <code>{{ match.value }}</code>
                <small v-if="match.groups.length">分组：{{ match.groups.join(' / ') }}</small>
              </li>
            </ol>
          </div>
        </el-card>
      </aside>
    </div>
  </section>
</template>

<script>
const FAVORITES_KEY = 'devtoolbox_regex_favorites'

const CATEGORIES = [
  {
    key: 'metacharacters',
    name: '元字符',
    icon: 'el-icon-cpu',
    description: '匹配字符、边界和任意内容的基础语法。',
    items: [
      { token: '.', title: '任意字符', description: '匹配除换行符之外的任意单个字符。', example: 'h.t', text: 'hot hit hat hut' },
      { token: '\\d', title: '数字', description: '匹配任意数字，等价于 [0-9]。', example: '\\d+', text: 'A12 B34 C' },
      { token: '\\w', title: '单词字符', description: '匹配字母、数字或下划线。', example: '\\w+', text: 'hello_123 你好' },
      { token: '\\s', title: '空白字符', description: '匹配空格、制表符、换行等空白。', example: '\\s+', text: 'hello   world' },
      { token: '\\b', title: '单词边界', description: '匹配单词开始或结束位置。', example: '\\bcat\\b', text: 'cat scatter cat' }
    ]
  },
  {
    key: 'quantifiers',
    name: '量词',
    icon: 'el-icon-data-line',
    description: '控制前一个模式重复出现的次数。',
    items: [
      { token: '*', title: '0 次或多次', description: '匹配前一项 0 次或更多次。', example: 'go*gle', text: 'ggle gogle google' },
      { token: '+', title: '1 次或多次', description: '匹配前一项 1 次或更多次。', example: '\\d+', text: 'id=123 count=45' },
      { token: '?', title: '0 次或 1 次', description: '匹配前一项 0 次或 1 次。', example: 'colou?r', text: 'color colour' },
      { token: '{n}', title: '固定次数', description: '匹配前一项恰好 n 次。', example: '\\d{4}', text: '2026-05-13' },
      { token: '{n,m}', title: '范围次数', description: '匹配前一项 n 到 m 次。', example: '\\w{3,6}', text: 'api token username' }
    ]
  },
  {
    key: 'assertions',
    name: '断言',
    icon: 'el-icon-view',
    description: '匹配位置而不消费字符。',
    items: [
      { token: '^', title: '行首', description: '匹配输入或每行的开始位置。', example: '^ERROR', text: 'ERROR start\nINFO ok' },
      { token: '$', title: '行尾', description: '匹配输入或每行的结束位置。', example: 'done$', text: 'task done\npending' },
      { token: '(?=x)', title: '正向先行断言', description: '当前位置后面必须匹配 x。', example: '\\d+(?=px)', text: '12px 20em 8px' },
      { token: '(?!x)', title: '负向先行断言', description: '当前位置后面不能匹配 x。', example: 'foo(?!bar)', text: 'foo foobar fooqux' },
      { token: '(?<=x)', title: '正向后行断言', description: '当前位置前面必须匹配 x。', example: '(?<=￥)\\d+', text: '￥128 $99' }
    ]
  },
  {
    key: 'groups',
    name: '分组',
    icon: 'el-icon-collection',
    description: '组合模式、捕获内容和复用匹配。',
    items: [
      { token: '(abc)', title: '捕获分组', description: '捕获匹配内容，可在结果中查看。', example: '(\\d{4})-(\\d{2})-(\\d{2})', text: '2026-05-13' },
      { token: '(?:abc)', title: '非捕获分组', description: '只分组不捕获，适合结构控制。', example: '(?:https?)://\\S+', text: 'http://a.com https://b.com' },
      { token: 'a|b', title: '或', description: '匹配左侧或右侧任一模式。', example: 'cat|dog', text: 'cat bird dog' },
      { token: '\\1', title: '反向引用', description: '引用前面捕获分组匹配到的内容。', example: '(\\w+)\\s+\\1', text: 'hello hello test ok' },
      { token: '(?<name>x)', title: '命名分组', description: '为捕获分组命名，便于读取。', example: '(?<year>\\d{4})', text: 'year 2026' }
    ]
  },
  {
    key: 'patterns',
    name: '常用模式',
    icon: 'el-icon-star-off',
    description: '日常校验和提取的常见表达式。',
    items: [
      { token: '邮箱', title: '邮箱地址', description: '匹配常见邮箱地址。', example: '[\\w.-]+@[\\w.-]+\\.\\w+', text: 'admin@example.com test@site.cn' },
      { token: '手机号', title: '中国大陆手机号', description: '匹配 1 开头的 11 位手机号。', example: '1[3-9]\\d{9}', text: '13800138000 12345' },
      { token: 'URL', title: 'HTTP URL', description: '匹配 http 或 https 链接。', example: 'https?://[^\\s]+', text: 'visit https://example.com now' },
      { token: '中文', title: '中文字符', description: '匹配 CJK 中文字符。', example: '[\\u4e00-\\u9fa5]+', text: 'Hello 正则表达式' },
      { token: 'HTML', title: 'HTML 标签', description: '匹配简单 HTML 标签。', example: '<([a-zA-Z][\\w-]*)(?:\\s[^>]*)?>.*?</\\1>', text: '<div>hello</div> <span>x</span>' }
    ]
  }
]

const COMMON_PATTERNS = [
  { name: '邮箱', pattern: '[\\w.-]+@[\\w.-]+\\.\\w+', flags: 'g', text: 'admin@example.com test@site.cn' },
  { name: '手机号', pattern: '1[3-9]\\d{9}', flags: 'g', text: '13800138000 10086' },
  { name: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g', text: '127.0.0.1 192.168.1.1' },
  { name: 'URL', pattern: 'https?://[^\\s]+', flags: 'g', text: 'https://example.com/path?a=1' },
  { name: '日期', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g', text: '2026-05-13 2026-12-31' },
  { name: 'HTML 标签', pattern: '<([a-zA-Z][\\w-]*)(?:\\s[^>]*)?>.*?</\\1>', flags: 'g', text: '<div>hello</div>' },
  { name: '中文', pattern: '[\\u4e00-\\u9fa5]+', flags: 'g', text: 'Hello 正则表达式 123' },
  { name: '数字开头行', pattern: '^\\d.*', flags: 'gm', text: '100 apple\nabc\n200 banana' }
]

export default {
  name: 'RegexReference',
  data() {
    return {
      categories: CATEGORIES,
      commonPatterns: COMMON_PATTERNS,
      activeCategory: 'metacharacters',
      selectedToken: CATEGORIES[0].items[0].token,
      pattern: '\\d+',
      flags: ['g'],
      testText: '订单 1001，金额 256 元；订单 1002，金额 99 元。',
      favorites: []
    }
  },
  computed: {
    activeCategoryInfo() {
      return this.categories.find(item => item.key === this.activeCategory) || this.categories[0]
    },
    selectedSyntax() {
      return this.activeCategoryInfo.items.find(item => item.token === this.selectedToken) || this.activeCategoryInfo.items[0]
    },
    flagText() {
      return this.flags.join('')
    },
    regexError() {
      try {
        this.createRegex()
        return ''
      } catch (error) {
        return error.message
      }
    },
    matches() {
      if (!this.pattern || this.regexError) {
        return []
      }

      const regex = this.createGlobalRegex()
      const result = []
      let match = regex.exec(this.testText)
      let guard = 0

      while (match && guard < 200) {
        result.push({
          id: `${match.index}-${guard}`,
          index: result.length,
          start: match.index,
          end: match.index + match[0].length,
          value: match[0],
          groups: match.slice(1).filter(value => typeof value !== 'undefined')
        })

        if (match[0] === '') {
          regex.lastIndex += 1
        }

        match = regex.exec(this.testText)
        guard += 1
      }

      return result
    },
    highlightedSegments() {
      if (!this.matches.length) {
        return [{ id: 'plain-0', text: this.testText || '测试文本会显示在这里', match: false }]
      }

      const segments = []
      let cursor = 0

      this.matches.forEach((match, index) => {
        if (match.start > cursor) {
          segments.push({
            id: `plain-${index}`,
            text: this.testText.slice(cursor, match.start),
            match: false
          })
        }

        segments.push({
          id: `match-${index}`,
          text: this.testText.slice(match.start, match.end),
          match: true
        })
        cursor = match.end
      })

      if (cursor < this.testText.length) {
        segments.push({
          id: 'plain-tail',
          text: this.testText.slice(cursor),
          match: false
        })
      }

      return segments
    }
  },
  mounted() {
    this.favorites = this.readFavorites()
  },
  methods: {
    createRegex() {
      return new RegExp(this.pattern, this.flagText)
    },
    createGlobalRegex() {
      const flags = Array.from(new Set(`${this.flagText}g`.split(''))).join('')
      return new RegExp(this.pattern, flags)
    },
    selectSyntax(item) {
      this.selectedToken = item.token
    },
    useExample(item) {
      this.pattern = item.example
      this.flags = ['g']
      this.testText = item.text
    },
    usePattern(item) {
      this.pattern = item.pattern
      this.flags = item.flags.split('')
      this.testText = item.text
      this.selectedToken = item.name
      this.activeCategory = 'patterns'
    },
    addFavorite() {
      if (!this.pattern) {
        return
      }

      const item = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: this.selectedSyntax ? this.selectedSyntax.title : '',
        pattern: this.pattern,
        flags: this.flagText,
        createdAt: Date.now()
      }

      this.favorites = [item, ...this.favorites].slice(0, 30)
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favorites))
      this.$message.success('已收藏正则')
    },
    useFavorite(item) {
      this.pattern = item.pattern
      this.flags = item.flags.split('')
    },
    removeFavorite(id) {
      this.favorites = this.favorites.filter(item => item.id !== id)
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(this.favorites))
    },
    readFavorites() {
      try {
        const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
        return Array.isArray(value) ? value : []
      } catch (error) {
        return []
      }
    },
    printCheatsheet() {
      window.print()
    }
  }
}
</script>

<style lang="scss" scoped>
.regex-reference {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.regex-reference__header {
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

.regex-reference__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.regex-layout {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

.regex-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.regex-panel + .regex-panel {
  margin-top: 18px;
}

.regex-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;

  small {
    color: var(--color-text-muted);
    font-size: 13px;
    font-weight: 500;
  }
}

.category-button,
.common-pattern,
.favorite-item button {
  width: 100%;
  border: 0;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.category-button {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 9px 10px;
  background: transparent;
  border-radius: 8px;
}

.category-button.is-active,
.category-button:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.favorite-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  gap: 8px;
  margin-bottom: 8px;
}

.favorite-item button,
.common-pattern {
  display: grid;
  gap: 4px;
  padding: 10px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.favorite-item code,
.common-pattern code,
.syntax-card code,
.syntax-example code,
.match-process code {
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.favorite-item strong,
.common-pattern code {
  min-width: 0;
  overflow-wrap: anywhere;
}

.favorite-item small,
.empty-state {
  color: var(--color-text-muted);
}

.empty-state {
  padding: 18px 0;
  text-align: center;
}

.syntax-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.syntax-card {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 50px;
  padding: 10px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.syntax-card.is-active,
.syntax-card:hover {
  border-color: var(--color-primary);
}

.syntax-card code {
  color: var(--color-primary);
  font-weight: 700;
}

.syntax-detail {
  margin-top: 18px;
  padding: 16px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.syntax-detail__title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;

  h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 20px;
  }

  code {
    padding: 5px 8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-primary);
    font-weight: 700;
  }
}

.syntax-detail p {
  margin: 0 0 14px;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.syntax-example {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.syntax-example span {
  color: var(--color-text-muted);
}

.syntax-example code {
  min-width: 0;
  padding: 8px 10px;
  overflow-wrap: anywhere;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
}

.common-pattern-grid,
.cheatsheet-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.common-pattern strong {
  color: var(--color-text);
}

.common-pattern code {
  color: var(--color-text-muted);
  font-size: 12px;
}

.cheatsheet-card {
  padding: 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.cheatsheet-card h3 {
  margin: 0 0 10px;
  color: var(--color-text);
  font-size: 16px;
}

.cheatsheet-card p {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 8px;
  margin: 0 0 7px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.cheatsheet-card code {
  color: var(--color-primary);
}

.regex-error {
  margin-bottom: 14px;
}

.match-preview,
.match-process {
  margin-top: 16px;
}

.match-preview__title {
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 700;
}

.highlight-box {
  min-height: 110px;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  line-height: 1.7;
}

.highlight-box mark {
  padding: 1px 3px;
  background: #fde68a;
  border-radius: 4px;
  color: #78350f;
}

.match-process ol {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 20px;
}

.match-process li {
  color: var(--color-text-muted);
  line-height: 1.6;
}

.match-process strong {
  color: var(--color-primary);
}

.match-process code {
  display: block;
  margin-top: 4px;
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.match-process small {
  display: block;
  margin-top: 2px;
}

@media (max-width: 1180px) {
  .regex-layout {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .regex-tester {
    grid-column: 1 / -1;
  }
}

@media (max-width: 860px) {
  .regex-reference__header {
    flex-direction: column;
  }

  .regex-reference__actions {
    justify-content: flex-start;
  }

  .regex-layout,
  .syntax-list,
  .common-pattern-grid,
  .cheatsheet-grid {
    grid-template-columns: 1fr;
  }
}

@media print {
  .regex-reference__header,
  .regex-sidebar,
  .regex-tester,
  .common-panel,
  .syntax-detail,
  .syntax-list {
    display: none !important;
  }

  .regex-reference,
  .regex-layout {
    display: block;
    max-width: none;
    padding: 0;
  }

  .cheatsheet-panel {
    border: 0;
  }
}
</style>
