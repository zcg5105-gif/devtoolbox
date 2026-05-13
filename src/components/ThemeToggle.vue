<template>
  <el-button
    class="theme-toggle"
    circle
    :title="isDark ? '切换到亮色主题' : '切换到暗色主题'"
    :aria-label="isDark ? '切换到亮色主题' : '切换到暗色主题'"
    @click="toggleTheme"
  >
    <span class="theme-toggle__icon">{{ isDark ? '🌙' : '🌞' }}</span>
  </el-button>
</template>

<script>
export default {
  name: 'ThemeToggle',
  computed: {
    isDark() {
      return this.$store.getters['theme/isDark']
    }
  },
  methods: {
    toggleTheme() {
      this.$store.dispatch('theme/toggleTheme')
    }
  }
}
</script>

<style lang="scss" scoped>
.theme-toggle {
  width: 36px;
  height: 36px;
  padding: 0;
}

.theme-toggle__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 17px;
  line-height: 1;
}
</style>
