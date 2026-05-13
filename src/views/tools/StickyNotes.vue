<template>
  <section class="sticky-notes">
    <div class="sticky-notes__header">
      <div>
        <h1>便签板</h1>
        <p>本地保存的便签卡片，支持拖拽排序、搜索、导入导出和自动保存。</p>
      </div>

      <div class="sticky-notes__actions">
        <el-input
          v-model.trim="keyword"
          clearable
          prefix-icon="el-icon-search"
          placeholder="搜索便签"
        />
        <el-button type="primary" icon="el-icon-plus" @click="addNote">
          添加便签
        </el-button>
        <el-button icon="el-icon-download" :disabled="!notes.length" @click="exportNotes">
          导出
        </el-button>
        <el-button icon="el-icon-upload2" @click="openImport">
          导入
        </el-button>
        <input ref="fileInput" class="hidden-input" type="file" accept="application/json,.json" @change="importNotes">
      </div>
    </div>

    <div class="notes-meta">
      <el-tag size="small" effect="plain">总计 {{ notes.length }} 条</el-tag>
      <el-tag size="small" effect="plain">当前显示 {{ filteredNotes.length }} 条</el-tag>
      <span>拖动卡片可排序，修改后自动保存到 localStorage。</span>
    </div>

    <draggable
      v-model="notes"
      class="notes-grid"
      handle=".note-card__drag"
      animation="180"
      ghost-class="is-dragging"
      @end="saveNotes"
    >
      <article
        v-for="note in filteredNotes"
        :key="note.id"
        class="note-card"
        :class="`is-${note.color}`"
      >
        <div class="note-card__toolbar">
          <button class="note-card__drag" type="button" title="拖拽排序">
            <i class="el-icon-rank"></i>
          </button>
          <div class="note-card__buttons">
            <el-button size="mini" :icon="note.editing ? 'el-icon-check' : 'el-icon-edit'" @click="toggleEdit(note)">
              {{ note.editing ? '保存' : '编辑' }}
            </el-button>
            <el-button size="mini" icon="el-icon-delete" @click="deleteNote(note.id)">
              删除
            </el-button>
          </div>
        </div>

        <el-input
          v-if="note.editing"
          v-model="note.title"
          class="note-title-input"
          placeholder="标题"
          @input="scheduleSave"
        />
        <h2 v-else>{{ note.title || '未命名便签' }}</h2>

        <el-input
          v-if="note.editing"
          v-model="note.content"
          class="note-content-input"
          type="textarea"
          :autosize="false"
          placeholder="写点什么..."
          @input="scheduleSave"
        />
        <div v-else class="note-content" v-html="renderContent(note.content)"></div>

        <div class="note-card__footer">
          <div class="color-picker">
            <button
              v-for="color in colors"
              :key="color.key"
              type="button"
              :class="['color-dot', `is-${color.key}`, { 'is-active': note.color === color.key }]"
              :title="color.label"
              @click="setColor(note, color.key)"
            ></button>
          </div>
          <span>{{ formatTime(note.updatedAt) }}</span>
        </div>
      </article>
    </draggable>

    <el-empty v-if="filteredNotes.length === 0" description="没有匹配的便签" />
  </section>
</template>

<script>
import draggable from 'vuedraggable'
import { marked } from 'marked'

const STORAGE_KEY = 'devtoolbox_sticky_notes'

export default {
  name: 'StickyNotes',
  components: {
    draggable
  },
  data() {
    return {
      keyword: '',
      notes: [],
      saveTimer: null,
      colors: [
        { key: 'yellow', label: '黄' },
        { key: 'blue', label: '蓝' },
        { key: 'green', label: '绿' },
        { key: 'pink', label: '粉' },
        { key: 'purple', label: '紫' }
      ]
    }
  },
  computed: {
    filteredNotes() {
      const keyword = this.keyword.toLowerCase()

      if (!keyword) {
        return this.notes
      }

      return this.notes.filter(note => `${note.title} ${note.content}`.toLowerCase().includes(keyword))
    }
  },
  mounted() {
    this.loadNotes()
  },
  beforeDestroy() {
    window.clearTimeout(this.saveTimer)
    this.saveNotes()
  },
  methods: {
    addNote() {
      const now = Date.now()

      this.notes.unshift({
        id: `${now}-${Math.random()}`,
        title: '新便签',
        content: '',
        color: 'yellow',
        editing: true,
        createdAt: now,
        updatedAt: now
      })
      this.saveNotes()
    },
    toggleEdit(note) {
      note.editing = !note.editing
      note.updatedAt = Date.now()
      this.saveNotes()
    },
    deleteNote(id) {
      this.notes = this.notes.filter(note => note.id !== id)
      this.saveNotes()
    },
    setColor(note, color) {
      note.color = color
      note.updatedAt = Date.now()
      this.saveNotes()
    },
    scheduleSave() {
      window.clearTimeout(this.saveTimer)
      this.saveTimer = window.setTimeout(() => {
        this.notes.forEach(note => {
          if (note.editing) {
            note.updatedAt = Date.now()
          }
        })
        this.saveNotes()
      }, 350)
    },
    saveNotes() {
      const payload = this.notes.map(note => ({
        ...note,
        editing: false
      }))

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    },
    loadNotes() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        this.notes = Array.isArray(stored) ? stored.map(note => ({
          ...note,
          editing: false
        })) : []
      } catch (error) {
        this.notes = []
      }

      if (!this.notes.length) {
        this.addNote()
      }
    },
    exportNotes() {
      const blob = new Blob([JSON.stringify(this.notes.map(note => ({
        ...note,
        editing: false
      })), null, 2)], { type: 'application/json;charset=utf-8' })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `sticky_notes_${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    openImport() {
      this.$refs.fileInput.click()
    },
    importNotes(event) {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result)

          if (!Array.isArray(imported)) {
            throw new Error('备份文件必须是数组')
          }

          const now = Date.now()
          this.notes = imported.map((note, index) => ({
            id: note.id || `${now}-${index}`,
            title: note.title || '未命名便签',
            content: note.content || '',
            color: this.colors.some(color => color.key === note.color) ? note.color : 'yellow',
            editing: false,
            createdAt: note.createdAt || now,
            updatedAt: note.updatedAt || now
          }))
          this.saveNotes()
          this.$message.success('便签导入成功')
        } catch (error) {
          this.$message.error(error.message || '导入失败')
        }
      }
      reader.onerror = () => {
        this.$message.error('文件读取失败')
      }
      reader.readAsText(file)
      event.target.value = ''
    },
    renderContent(content) {
      if (!content) {
        return '<p class="note-empty">空便签</p>'
      }

      return marked.parse(content, {
        breaks: true,
        mangle: false,
        headerIds: false
      })
    },
    formatTime(value) {
      const date = new Date(value)

      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    }
  }
}
</script>

<style lang="scss" scoped>
.sticky-notes {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.sticky-notes__header {
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

.sticky-notes__actions {
  display: flex;
  flex-wrap: wrap;
  min-width: 560px;
  justify-content: flex-end;
  gap: 10px;

  .el-input {
    width: 220px;
  }

  .el-button + .el-button {
    margin-left: 0;
  }
}

.hidden-input {
  display: none;
}

.notes-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.note-card {
  display: grid;
  min-height: 280px;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);

  h2 {
    margin: 0;
    color: #202124;
    font-size: 18px;
  }
}

.note-card.is-yellow {
  background: #fff4b8;
}

.note-card.is-blue {
  background: #cfe8ff;
}

.note-card.is-green {
  background: #d8f5cf;
}

.note-card.is-pink {
  background: #ffd6e7;
}

.note-card.is-purple {
  background: #e6dcff;
}

.note-card__toolbar,
.note-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.note-card__drag {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  cursor: grab;
  background: rgba(255, 255, 255, 0.5);
  border: 0;
  border-radius: 6px;
  color: #202124;
}

.note-card__buttons {
  display: flex;
  gap: 8px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.note-title-input ::v-deep .el-input__inner,
.note-content-input ::v-deep .el-textarea__inner {
  background: rgba(255, 255, 255, 0.62);
  border-color: rgba(0, 0, 0, 0.08);
  color: #202124;
}

.note-content-input ::v-deep .el-textarea__inner {
  min-height: 150px !important;
  resize: vertical;
  line-height: 1.6;
}

.note-content {
  min-height: 150px;
  overflow-wrap: anywhere;
  color: #202124;
  line-height: 1.6;
}

.note-content ::v-deep p {
  margin: 0 0 8px;
}

.note-content ::v-deep pre {
  overflow: auto;
  padding: 8px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 6px;
}

.color-picker {
  display: flex;
  gap: 6px;
}

.color-dot {
  width: 20px;
  height: 20px;
  cursor: pointer;
  border: 2px solid rgba(0, 0, 0, 0.12);
  border-radius: 50%;
}

.color-dot.is-active {
  border-color: #202124;
}

.color-dot.is-yellow {
  background: #fff4b8;
}

.color-dot.is-blue {
  background: #cfe8ff;
}

.color-dot.is-green {
  background: #d8f5cf;
}

.color-dot.is-pink {
  background: #ffd6e7;
}

.color-dot.is-purple {
  background: #e6dcff;
}

.note-card__footer span {
  color: rgba(0, 0, 0, 0.56);
  font-size: 12px;
}

.is-dragging {
  opacity: 0.55;
}

@media (max-width: 1024px) {
  .sticky-notes__header {
    flex-direction: column;
  }

  .sticky-notes__actions {
    min-width: 0;
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .sticky-notes__header h1 {
    font-size: 28px;
  }

  .sticky-notes__actions,
  .sticky-notes__actions .el-input,
  .sticky-notes__actions .el-button {
    width: 100%;
  }

  .note-card__toolbar,
  .note-card__footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
