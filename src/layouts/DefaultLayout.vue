<template>
  <div class="app-layout">
    <header class="topbar">
      <div class="topbar__left">
        <el-button
          class="topbar__menu"
          type="text"
          icon="el-icon-s-fold"
          aria-label="切换侧边栏"
          @click="toggleSidebar"
        />
        <router-link class="brand" to="/" aria-label="DevToolbox 首页">
          <span class="brand__mark">D</span>
          <span class="brand__name">DevToolbox</span>
        </router-link>
      </div>

      <div class="topbar__actions">
        <el-link
          href="https://github.com/"
          target="_blank"
          rel="noopener noreferrer"
          :underline="false"
          class="github-link"
        >
          GitHub
        </el-link>
        <ThemeToggle />
      </div>
    </header>

    <div class="layout-body">
      <aside
        class="sidebar"
        :class="{
          'is-collapsed': isSidebarCollapsed && !isMobile,
          'is-mobile-open': isMobileSidebarOpen
        }"
      >
        <el-menu
          :default-active="$route.path"
          :collapse="isSidebarCollapsed && !isMobile"
          :router="true"
          class="sidebar-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/">
            <i class="el-icon-s-home"></i>
            <span slot="title">首页</span>
          </el-menu-item>

          <el-submenu
            v-for="category in toolCategories"
            :key="category.id"
            :index="category.id"
          >
            <template slot="title">
              <i :class="category.icon"></i>
              <span>{{ category.name }}</span>
            </template>
            <el-menu-item
              v-for="tool in category.tools"
              :key="tool.path"
              :index="tool.path"
            >
              <i :class="tool.icon"></i>
              <span slot="title">{{ tool.name }}</span>
            </el-menu-item>
          </el-submenu>
        </el-menu>
      </aside>

      <button
        v-if="isMobileSidebarOpen"
        class="sidebar-mask"
        aria-label="关闭侧边栏"
        @click="closeMobileSidebar"
      ></button>

      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue'
import { toolCategories } from '@/config/tools'

export default {
  name: 'DefaultLayout',
  components: {
    ThemeToggle
  },
  data() {
    return {
      isSidebarCollapsed: false,
      isMobileSidebarOpen: false,
      isMobile: false,
      toolCategories
    }
  },
  mounted() {
    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    toggleSidebar() {
      if (this.isMobile) {
        this.isMobileSidebarOpen = !this.isMobileSidebarOpen
        return
      }
      this.isSidebarCollapsed = !this.isSidebarCollapsed
    },
    closeMobileSidebar() {
      this.isMobileSidebarOpen = false
    },
    handleMenuSelect() {
      if (this.isMobile) {
        this.closeMobileSidebar()
      }
    },
    handleResize() {
      this.isMobile = window.innerWidth <= 768
      if (!this.isMobile) {
        this.isMobileSidebarOpen = false
      }
    }
  }
}
</script>
