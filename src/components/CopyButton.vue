<template>
  <el-button
    size="mini"
    icon="el-icon-document-copy"
    :disabled="!text"
    @click="copyText"
  >
    复制
  </el-button>
</template>

<script>
export default {
  name: 'CopyButton',
  props: {
    text: {
      type: String,
      default: ''
    }
  },
  methods: {
    async copyText() {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.text)
        } else {
          this.copyWithFallback()
        }
        this.$message.success('复制成功')
      } catch (error) {
        this.$message.error('复制失败')
      }
    },
    copyWithFallback() {
      const textarea = document.createElement('textarea')
      textarea.value = this.text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  }
}
</script>
