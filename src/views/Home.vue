<template>
  <section class="home-page">
    <div class="home-hero">
      <p class="home-hero__eyebrow">Developer Toolkit</p>
      <h1>DevToolbox</h1>
      <p class="home-hero__description">
        集成常用开发小工具，覆盖 JSON、时间戳、URL、Base64 与正则调试等日常场景。
      </p>
    </div>

    <div class="home-toolbar">
      <el-input
        v-model.trim="keyword"
        clearable
        prefix-icon="el-icon-search"
        placeholder="搜索工具"
        class="tool-search"
      />
    </div>

    <div
      v-for="category in filteredCategories"
      :key="category.id"
      class="tool-category"
    >
      <div class="tool-category__header">
        <div>
          <h2>{{ category.name }}</h2>
          <p>{{ category.description }}</p>
        </div>
        <span>{{ category.tools.length }} 个工具</span>
      </div>

      <div class="tool-grid">
        <el-card
          v-for="tool in category.tools"
          :key="tool.path"
          shadow="hover"
          class="tool-card"
          :body-style="{ padding: '0' }"
          @click.native="openTool(tool.path)"
        >
          <div class="tool-card__body">
            <div class="tool-card__icon">
              <i :class="tool.icon"></i>
            </div>
            <div>
              <h3>{{ tool.name }}</h3>
              <p>{{ tool.description }}</p>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <el-empty
      v-if="filteredCategories.length === 0"
      description="没有匹配的工具"
    />
  </section>
</template>

<script>
import { toolCategories } from '@/config/tools'

export default {
  name: 'HomeView',
  data() {
    return {
      keyword: '',
      toolCategories
    }
  },
  computed: {
    filteredCategories() {
      const keyword = this.keyword.toLowerCase()
      if (!keyword) {
        return this.toolCategories
      }

      return this.toolCategories
        .map(category => {
          const categorySource = [
            category.name,
            category.description
          ].join(' ').toLowerCase()

          const tools = category.tools.filter(tool => {
            const source = [
              category.name,
              tool.name,
              tool.description,
              ...tool.tags
            ].join(' ').toLowerCase()

            return source.includes(keyword)
          })

          if (tools.length > 0 || categorySource.includes(keyword)) {
            return {
              ...category,
              tools: tools.length > 0 ? tools : category.tools
            }
          }

          return null
        })
        .filter(Boolean)
    }
  },
  methods: {
    openTool(path) {
      this.$router.push(path)
    }
  }
}
</script>
