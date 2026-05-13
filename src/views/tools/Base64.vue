<template>
  <section class="base64-tool">
    <div class="base64-tool__header">
      <h1>Base64 编解码</h1>
      <p>文本与 Base64 互转，支持中文，并可上传图片编码和预览图片 Base64。</p>
    </div>

    <div class="base64-tool__grid">
      <el-card shadow="never" class="base64-panel">
        <div slot="header" class="base64-panel__header">
          <span>文本 Base64 互转</span>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="输入内容">
            <el-input
              v-model="textInput"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 12 }"
              placeholder="请输入文本或 Base64 字符串"
            />
          </el-form-item>

          <div class="base64-actions">
            <el-button type="primary" icon="el-icon-lock" @click="encodeText">
              编码
            </el-button>
            <el-button icon="el-icon-unlock" @click="decodeText">
              解码
            </el-button>
          </div>
        </el-form>

        <div v-if="textResult" class="base64-result">
          <div class="base64-result__header">
            <span>{{ textResultTitle }}</span>
            <CopyButton :text="textResult" />
          </div>
          <pre>{{ textResult }}</pre>
        </div>
      </el-card>

      <el-card shadow="never" class="base64-panel">
        <div slot="header" class="base64-panel__header">
          <span>图片 Base64 编码与预览</span>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="上传图片编码">
            <div class="base64-upload">
              <input
                ref="imageFileInput"
                class="base64-upload__input"
                type="file"
                accept="image/*"
                @change="handleImageFileChange"
              >
              <el-button icon="el-icon-upload2" @click="openImageFilePicker">
                选择图片
              </el-button>
              <span v-if="uploadedImageName" class="base64-upload__name">
                {{ uploadedImageName }}
              </span>
            </div>
          </el-form-item>

          <el-form-item label="图片 Base64">
            <el-input
              v-model="imageBase64"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 12 }"
              placeholder="请选择图片，或输入图片 Base64 / data:image/...;base64,..."
            />
          </el-form-item>

          <div class="base64-actions">
            <el-button type="primary" icon="el-icon-picture-outline" @click="previewImage">
              预览
            </el-button>
            <CopyButton :text="imageBase64.trim()" />
          </div>
        </el-form>

        <div v-if="imagePreviewSrc" class="base64-image-preview">
          <img :src="imagePreviewSrc" alt="Base64 图片预览" @error="handleImageError">
        </div>
      </el-card>
    </div>
  </section>
</template>

<script>
import CopyButton from '@/components/CopyButton.vue'

export default {
  name: 'Base64Tool',
  components: {
    CopyButton
  },
  data() {
    return {
      textInput: '',
      textResultTitle: '',
      textResult: '',
      imageBase64: '',
      imagePreviewSrc: '',
      uploadedImageName: ''
    }
  },
  methods: {
    getTextInput() {
      if (!this.textInput) {
        this.$message.warning('请输入内容')
        return ''
      }

      return this.textInput
    },
    encodeText() {
      const value = this.getTextInput()

      if (!value) {
        return
      }

      this.textResultTitle = '编码结果'
      this.textResult = btoa(encodeURIComponent(value))
    },
    decodeText() {
      const value = this.getTextInput().trim()

      if (!value) {
        return
      }

      try {
        this.textResultTitle = '解码结果'
        this.textResult = decodeURIComponent(atob(value))
      } catch (error) {
        this.$message.error('解码失败，请检查输入内容是否为合法 Base64')
      }
    },
    openImageFilePicker() {
      this.$refs.imageFileInput.click()
    },
    handleImageFileChange(event) {
      const file = event.target.files && event.target.files[0]

      if (!file) {
        return
      }

      if (!file.type.startsWith('image/')) {
        this.$message.warning('请选择图片文件')
        event.target.value = ''
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          this.$message.error('读取图片失败')
          return
        }

        this.uploadedImageName = file.name
        this.imageBase64 = reader.result
        this.imagePreviewSrc = reader.result
        this.$message.success('图片已编码为 Base64')
      }

      reader.onerror = () => {
        this.$message.error('读取图片失败')
      }

      reader.readAsDataURL(file)
      event.target.value = ''
    },
    previewImage() {
      const value = this.imageBase64.trim()

      if (!value) {
        this.$message.warning('请输入图片 Base64')
        return
      }

      this.imagePreviewSrc = this.normalizeImageBase64(value)
    },
    normalizeImageBase64(value) {
      if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value)) {
        return value
      }

      return `data:image/png;base64,${value}`
    },
    handleImageError() {
      this.imagePreviewSrc = ''
      this.$message.error('图片预览失败，请检查 Base64 内容')
    }
  }
}
</script>

<style lang="scss" scoped>
.base64-tool {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.base64-tool__header {
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

.base64-tool__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.base64-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.base64-panel__header,
.base64-result__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.base64-actions,
.base64-upload {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.base64-upload__input {
  display: none;
}

.base64-upload__name {
  min-width: 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.base64-result {
  margin-top: 18px;
}

.base64-result__header {
  margin-bottom: 10px;
}

.base64-result pre {
  min-height: 96px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.base64-image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  margin-top: 18px;
  padding: 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.base64-image-preview img {
  display: block;
  max-width: 100%;
  max-height: 420px;
  object-fit: contain;
}

@media (max-width: 900px) {
  .base64-tool__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .base64-tool__header h1 {
    font-size: 28px;
  }
}
</style>
