<template>
  <section
    class="markdown-editor"
    :class="{ 'is-fullscreen': isFullscreen, 'is-dragging': isDragging }"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div class="markdown-editor__header">
      <div>
        <h1>Markdown 编辑器</h1>
        <p>实时编辑并预览 Markdown，支持代码高亮、图片拖拽和文件导出。</p>
      </div>

      <div class="markdown-editor__actions">
        <el-button size="small" icon="el-icon-document" @click="exportMarkdown">
          导出 Markdown
        </el-button>
        <el-button size="small" icon="el-icon-download" @click="exportHtml">
          导出 HTML
        </el-button>
        <el-button
          size="small"
          :icon="isFullscreen ? 'el-icon-close' : 'el-icon-full-screen'"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="markdown-toolbar">
      <el-tooltip
        v-for="tool in toolbar"
        :key="tool.key"
        :content="tool.label"
        placement="bottom"
      >
        <el-button
          size="mini"
          :icon="tool.icon"
          @click="applyToolbar(tool.key)"
        >
          {{ tool.text || '' }}
        </el-button>
      </el-tooltip>

      <input
        ref="imageInput"
        class="markdown-editor__file-input"
        type="file"
        accept="image/*"
        @change="handleImageInput"
      >
    </el-card>

    <div v-if="isDragging" class="markdown-drop-hint">
      松开鼠标上传图片并插入 Base64 链接
    </div>

    <div class="markdown-editor__grid">
      <section class="markdown-pane">
        <div class="markdown-pane__header">
          <h2>编辑区</h2>
          <span>{{ editorStats }}</span>
        </div>
        <el-input
          ref="editorInput"
          v-model="markdownText"
          class="markdown-pane__textarea"
          type="textarea"
          :autosize="false"
          spellcheck="false"
          placeholder="请输入 Markdown 内容，或拖拽图片到页面中"
        />
      </section>

      <section class="markdown-pane">
        <div class="markdown-pane__header">
          <h2>HTML 预览</h2>
          <span>实时渲染</span>
        </div>
        <article class="markdown-preview" v-html="renderedHtml"></article>
      </section>
    </div>
  </section>
</template>

<script>
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('md', markdown)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)

const SAMPLE_MARKDOWN = [
  '# Markdown 编辑器',
  '',
  '这是一个支持 **实时预览**、*快捷插入* 和代码高亮的编辑器。',
  '',
  '## 示例代码',
  '',
  '```javascript',
  'function hello(name) {',
  '  return `Hello, ${name}!`;',
  '}',
  '```',
  '',
  '- 支持导出 Markdown',
  '- 支持导出 HTML',
  '- 支持拖拽图片转 Base64'
].join('\n')

export default {
  name: 'MarkdownEditor',
  data() {
    return {
      markdownText: SAMPLE_MARKDOWN,
      isFullscreen: false,
      isDragging: false,
      dragDepth: 0,
      toolbar: [
        { key: 'bold', label: '加粗', icon: 'el-icon-edit', text: 'B' },
        { key: 'italic', label: '斜体', icon: 'el-icon-edit-outline', text: 'I' },
        { key: 'heading', label: '标题', icon: 'el-icon-tickets', text: 'H' },
        { key: 'link', label: '链接', icon: 'el-icon-link' },
        { key: 'image', label: '图片', icon: 'el-icon-picture-outline' },
        { key: 'quote', label: '引用', icon: 'el-icon-chat-line-square' },
        { key: 'list', label: '无序列表', icon: 'el-icon-menu' },
        { key: 'orderedList', label: '有序列表', icon: 'el-icon-s-order' },
        { key: 'inlineCode', label: '行内代码', icon: 'el-icon-cpu' },
        { key: 'codeBlock', label: '代码块', icon: 'el-icon-monitor' },
        { key: 'table', label: '表格', icon: 'el-icon-s-grid' }
      ]
    }
  },
  computed: {
    renderedHtml() {
      return marked.parse(this.markdownText, {
        breaks: true,
        gfm: true,
        highlight(code, language) {
          const validLanguage = language && hljs.getLanguage(language)

          if (validLanguage) {
            return hljs.highlight(code, {
              language,
              ignoreIllegals: true
            }).value
          }

          return hljs.highlightAuto(code).value
        }
      })
    },
    editorStats() {
      const lines = this.markdownText ? this.markdownText.split('\n').length : 0
      return `${lines} 行 / ${this.markdownText.length} 字符`
    }
  },
  mounted() {
    document.addEventListener('keydown', this.handleKeydown)
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown)
  },
  methods: {
    applyToolbar(type) {
      if (type === 'image') {
        this.$refs.imageInput.click()
        return
      }

      const actions = {
        bold: () => this.wrapSelection('**', '**', '加粗文本'),
        italic: () => this.wrapSelection('*', '*', '斜体文本'),
        heading: () => this.insertBlockPrefix('## ', '标题'),
        link: () => this.wrapSelection('[', '](https://example.com)', '链接文本'),
        quote: () => this.insertBlockPrefix('> ', '引用内容'),
        list: () => this.insertBlockPrefix('- ', '列表项'),
        orderedList: () => this.insertBlockPrefix('1. ', '列表项'),
        inlineCode: () => this.wrapSelection('`', '`', 'code'),
        codeBlock: () => this.insertAtSelection('```javascript\nconsole.log("Hello");\n```\n'),
        table: () => this.insertAtSelection('| 列 A | 列 B |\n| --- | --- |\n| 内容 | 内容 |\n')
      }

      actions[type]()
    },
    getTextarea() {
      return this.$refs.editorInput.$el.querySelector('textarea')
    },
    wrapSelection(prefix, suffix, placeholder) {
      const textarea = this.getTextarea()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = this.markdownText.slice(start, end) || placeholder
      const nextText = `${prefix}${selected}${suffix}`

      this.replaceRange(start, end, nextText, start + prefix.length, start + prefix.length + selected.length)
    },
    insertBlockPrefix(prefix, placeholder) {
      const textarea = this.getTextarea()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = this.markdownText.slice(start, end) || placeholder
      const lines = selected.split('\n').map(line => `${prefix}${line}`).join('\n')

      this.replaceRange(start, end, lines, start + prefix.length, start + lines.length)
    },
    insertAtSelection(value) {
      const textarea = this.getTextarea()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      this.replaceRange(start, end, value, start, start + value.length)
    },
    replaceRange(start, end, value, selectionStart, selectionEnd) {
      this.markdownText = `${this.markdownText.slice(0, start)}${value}${this.markdownText.slice(end)}`

      this.$nextTick(() => {
        const textarea = this.getTextarea()
        textarea.focus()
        textarea.setSelectionRange(selectionStart, selectionEnd)
      })
    },
    handleImageInput(event) {
      const file = event.target.files && event.target.files[0]

      if (file) {
        this.insertImageFile(file)
      }

      event.target.value = ''
    },
    handleDragEnter(event) {
      if (!this.hasImageFile(event.dataTransfer)) {
        return
      }

      this.dragDepth += 1
      this.isDragging = true
    },
    handleDragOver(event) {
      if (this.hasImageFile(event.dataTransfer)) {
        this.isDragging = true
      }
    },
    handleDragLeave(event) {
      if (!this.hasImageFile(event.dataTransfer)) {
        return
      }

      this.dragDepth = Math.max(this.dragDepth - 1, 0)
      this.isDragging = this.dragDepth > 0
    },
    handleDrop(event) {
      this.dragDepth = 0
      this.isDragging = false

      const files = Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/'))

      if (!files.length) {
        this.$message.warning('请拖拽图片文件')
        return
      }

      files.forEach(file => {
        this.insertImageFile(file)
      })
    },
    hasImageFile(dataTransfer) {
      if (!dataTransfer || !dataTransfer.types) {
        return false
      }

      return Array.from(dataTransfer.types).includes('Files')
    },
    insertImageFile(file) {
      if (!file.type.startsWith('image/')) {
        this.$message.warning('请选择图片文件')
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          this.$message.error('图片读取失败')
          return
        }

        const alt = file.name.replace(/\.[^.]+$/, '')
        this.insertAtSelection(`![${alt}](${reader.result})\n`)
        this.$message.success('图片已插入')
      }

      reader.onerror = () => {
        this.$message.error('图片读取失败')
      }

      reader.readAsDataURL(file)
    },
    exportMarkdown() {
      this.downloadFile(`markdown_${Date.now()}.md`, this.markdownText, 'text/markdown;charset=utf-8')
    },
    exportHtml() {
      const html = [
        '<!doctype html>',
        '<html lang="zh-CN">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>Markdown Export</title>',
        '<style>body{max-width:920px;margin:40px auto;padding:0 20px;font-family:Arial,sans-serif;line-height:1.7;}pre{padding:14px;overflow:auto;background:#f6f8fa;border-radius:8px;}code{font-family:Consolas,monospace;}img{max-width:100%;}</style>',
        '</head>',
        '<body>',
        this.renderedHtml,
        '</body>',
        '</html>'
      ].join('\n')

      this.downloadFile(`markdown_${Date.now()}.html`, html, 'text/html;charset=utf-8')
    },
    downloadFile(filename, content, type) {
      const blob = new Blob([content], { type })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    },
    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen
    },
    handleKeydown(event) {
      if (event.key === 'Escape' && this.isFullscreen) {
        this.isFullscreen = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.markdown-editor {
  position: relative;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.markdown-editor.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1000;
  max-width: none;
  padding: 18px;
  overflow: auto;
  background: var(--color-bg);
}

.markdown-editor__header {
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

.markdown-editor__actions,
.markdown-toolbar ::v-deep .el-card__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.markdown-toolbar {
  margin-bottom: 18px;
  border-color: var(--color-border);
  border-radius: 8px;
}

.markdown-toolbar ::v-deep .el-card__body {
  justify-content: flex-start;
}

.markdown-toolbar .el-button {
  min-width: 32px;
  padding-right: 8px;
  padding-left: 8px;
}

.markdown-editor__file-input {
  display: none;
}

.markdown-drop-hint {
  position: fixed;
  inset: 18px;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(37, 99, 235, 0.12);
  border: 2px dashed var(--color-primary);
  border-radius: 8px;
  color: var(--color-primary);
  font-size: 20px;
  font-weight: 700;
  pointer-events: none;
}

.markdown-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  min-height: 680px;
}

.markdown-editor.is-fullscreen .markdown-editor__grid {
  min-height: calc(100vh - 172px);
}

.markdown-pane {
  display: flex;
  min-width: 0;
  min-height: 680px;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.markdown-editor.is-fullscreen .markdown-pane {
  min-height: calc(100vh - 172px);
}

.markdown-pane__header {
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

.markdown-pane__textarea {
  flex: 1;
  min-height: 0;
}

.markdown-pane__textarea ::v-deep .el-textarea__inner {
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

.markdown-editor.is-fullscreen .markdown-pane__textarea ::v-deep .el-textarea__inner {
  min-height: calc(100vh - 226px) !important;
}

.markdown-preview {
  flex: 1;
  min-height: 625px;
  padding: 16px 22px;
  overflow: auto;
  color: var(--color-text);
  line-height: 1.8;
}

.markdown-editor.is-fullscreen .markdown-preview {
  min-height: calc(100vh - 226px);
}

.markdown-preview ::v-deep h1,
.markdown-preview ::v-deep h2,
.markdown-preview ::v-deep h3 {
  margin: 1em 0 0.5em;
  color: var(--color-text);
  line-height: 1.35;
}

.markdown-preview ::v-deep p,
.markdown-preview ::v-deep ul,
.markdown-preview ::v-deep ol,
.markdown-preview ::v-deep blockquote,
.markdown-preview ::v-deep pre,
.markdown-preview ::v-deep table {
  margin: 0 0 14px;
}

.markdown-preview ::v-deep a {
  color: var(--color-primary);
}

.markdown-preview ::v-deep img {
  max-width: 100%;
  border-radius: 8px;
}

.markdown-preview ::v-deep blockquote {
  padding: 0 14px;
  border-left: 4px solid var(--color-primary);
  color: var(--color-text-muted);
}

.markdown-preview ::v-deep pre {
  padding: 14px;
  overflow: auto;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.markdown-preview ::v-deep code {
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

.markdown-preview ::v-deep :not(pre) > code {
  padding: 2px 5px;
  background: var(--color-surface-soft);
  border-radius: 4px;
}

.markdown-preview ::v-deep table {
  width: 100%;
  border-collapse: collapse;
}

.markdown-preview ::v-deep th,
.markdown-preview ::v-deep td {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
}

.markdown-preview ::v-deep th {
  background: var(--color-surface-soft);
}

.markdown-preview ::v-deep .hljs-keyword,
.markdown-preview ::v-deep .hljs-built_in,
.markdown-preview ::v-deep .hljs-title {
  color: #2563eb;
  font-weight: 700;
}

.markdown-preview ::v-deep .hljs-string,
.markdown-preview ::v-deep .hljs-attr {
  color: #15803d;
}

.markdown-preview ::v-deep .hljs-number,
.markdown-preview ::v-deep .hljs-literal {
  color: #c2410c;
}

.markdown-preview ::v-deep .hljs-comment {
  color: #6b7280;
  font-style: italic;
}

[data-theme='dark'] .markdown-pane__textarea ::v-deep .el-textarea__inner {
  background: var(--color-surface);
  color: var(--color-text);
}

[data-theme='dark'] .markdown-preview ::v-deep .hljs-keyword,
[data-theme='dark'] .markdown-preview ::v-deep .hljs-built_in,
[data-theme='dark'] .markdown-preview ::v-deep .hljs-title {
  color: #60a5fa;
}

[data-theme='dark'] .markdown-preview ::v-deep .hljs-string,
[data-theme='dark'] .markdown-preview ::v-deep .hljs-attr {
  color: #4ade80;
}

[data-theme='dark'] .markdown-preview ::v-deep .hljs-number,
[data-theme='dark'] .markdown-preview ::v-deep .hljs-literal {
  color: #fb923c;
}

[data-theme='dark'] .markdown-preview ::v-deep .hljs-comment {
  color: #9ca3af;
}

@media (max-width: 1024px) {
  .markdown-editor__header {
    flex-direction: column;
  }

  .markdown-editor__actions {
    justify-content: flex-start;
  }

  .markdown-editor__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .markdown-editor__header h1 {
    font-size: 28px;
  }

  .markdown-editor__actions {
    width: 100%;
  }

  .markdown-editor__actions .el-button {
    flex: 1 1 calc(50% - 10px);
  }

  .markdown-editor__grid,
  .markdown-pane {
    min-height: 520px;
  }

  .markdown-pane__textarea ::v-deep .el-textarea__inner,
  .markdown-preview {
    min-height: 465px !important;
  }
}
</style>
