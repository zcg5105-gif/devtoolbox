<template>
  <section class="jwt-parser">
    <div class="jwt-parser__header">
      <div>
        <h1>JWT Token 解析</h1>
        <p>纯前端解析 JWT Header、Payload 和 Signature，并可选验证常见算法签名。</p>
      </div>

      <div class="jwt-parser__actions">
        <el-button size="small" icon="el-icon-magic-stick" @click="generateSampleJwt">
          生成示例 JWT
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearToken">
          清空
        </el-button>
      </div>
    </div>

    <el-card shadow="never" class="jwt-input-card">
      <div slot="header" class="jwt-card-header">
        <span>Token 输入</span>
        <el-tag
          size="small"
          :type="isTokenShapeValid ? 'success' : 'danger'"
          effect="plain"
        >
          {{ isTokenShapeValid ? '三段式 JWT' : '格式未识别' }}
        </el-tag>
      </div>

      <el-input
        v-model.trim="token"
        type="textarea"
        :autosize="{ minRows: 5, maxRows: 10 }"
        spellcheck="false"
        placeholder="请输入形如 header.payload.signature 的 JWT Token"
      />

      <el-alert
        v-if="parseError"
        class="jwt-alert"
        :title="parseError"
        type="error"
        :closable="false"
        show-icon
      />
    </el-card>

    <div class="jwt-meta-grid">
      <div class="jwt-meta-item">
        <span>算法</span>
        <strong>{{ algorithm || '-' }}</strong>
      </div>
      <div class="jwt-meta-item">
        <span>过期时间 exp</span>
        <strong :class="{ 'is-expired': isExpired, 'is-valid': isExpired === false }">
          {{ expText }}
        </strong>
      </div>
      <div class="jwt-meta-item">
        <span>签发时间 iat</span>
        <strong>{{ iatText }}</strong>
      </div>
    </div>

    <el-card shadow="never" class="jwt-verify-card">
      <div slot="header" class="jwt-card-header">
        <span>签名验证</span>
        <el-tag v-if="verifyStatus" size="small" :type="verifyTagType" effect="plain">
          {{ verifyStatus }}
        </el-tag>
      </div>

      <div class="jwt-verify-row">
        <el-input
          v-model="secret"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 6 }"
          spellcheck="false"
          placeholder="HS256/384/512 输入 secret；RS256/384/512 输入 PEM 公钥"
        />
        <el-button
          type="primary"
          icon="el-icon-check"
          :disabled="!canVerify"
          :loading="isVerifying"
          @click="verifySignature"
        >
          验证签名
        </el-button>
      </div>
      <p class="jwt-verify-hint">
        解析不等于可信。只有使用正确 secret 或公钥验证通过后，才能确认 Token 未被篡改。
      </p>
    </el-card>

    <div class="jwt-result-grid">
      <el-card shadow="never" class="jwt-result-card">
        <div slot="header" class="jwt-card-header">
          <span>Header</span>
          <el-button
            size="mini"
            icon="el-icon-document-copy"
            :disabled="!headerJson"
            @click="copyText(headerJson)"
          >
            复制
          </el-button>
        </div>
        <pre><code>{{ headerJson || 'Header 会显示在这里' }}</code></pre>
      </el-card>

      <el-card shadow="never" class="jwt-result-card">
        <div slot="header" class="jwt-card-header">
          <span>Payload</span>
          <el-button
            size="mini"
            icon="el-icon-document-copy"
            :disabled="!payloadJson"
            @click="copyText(payloadJson)"
          >
            复制
          </el-button>
        </div>
        <pre><code>{{ payloadJson || 'Payload 会显示在这里' }}</code></pre>
      </el-card>
    </div>

    <el-card shadow="never" class="jwt-result-card jwt-signature-card">
      <div slot="header" class="jwt-card-header">
        <span>Signature</span>
        <el-button
          size="mini"
          icon="el-icon-document-copy"
          :disabled="!signature"
          @click="copyText(signature)"
        >
          复制
        </el-button>
      </div>
      <pre><code>{{ signature || 'Signature 会显示在这里' }}</code></pre>
    </el-card>
  </section>
</template>

<script>
const SAMPLE_SECRET = 'devtoolbox-secret'

const HASH_BY_ALG = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
  RS256: 'SHA-256',
  RS384: 'SHA-384',
  RS512: 'SHA-512'
}

export default {
  name: 'JwtParser',
  data() {
    return {
      token: '',
      secret: '',
      verifyStatus: '',
      verifyError: '',
      isVerifying: false
    }
  },
  computed: {
    tokenParts() {
      return this.token ? this.token.split('.') : []
    },
    isTokenShapeValid() {
      return this.tokenParts.length === 3 && this.tokenParts.every(Boolean)
    },
    parsedHeader() {
      return this.parseJsonPart(0)
    },
    parsedPayload() {
      return this.parseJsonPart(1)
    },
    parseError() {
      if (!this.token) {
        return ''
      }

      if (!this.isTokenShapeValid) {
        return 'JWT 必须是 header.payload.signature 三段式格式'
      }

      if (this.parsedHeader.error) {
        return `Header 解析失败：${this.parsedHeader.error}`
      }

      if (this.parsedPayload.error) {
        return `Payload 解析失败：${this.parsedPayload.error}`
      }

      return ''
    },
    header() {
      return this.parsedHeader.value || null
    },
    payload() {
      return this.parsedPayload.value || null
    },
    headerJson() {
      return this.header ? JSON.stringify(this.header, null, 2) : ''
    },
    payloadJson() {
      return this.payload ? JSON.stringify(this.payload, null, 2) : ''
    },
    signature() {
      return this.isTokenShapeValid ? this.tokenParts[2] : ''
    },
    algorithm() {
      return this.header && this.header.alg ? this.header.alg : ''
    },
    expText() {
      if (!this.payload || typeof this.payload.exp === 'undefined') {
        return '未提供'
      }

      const date = this.dateFromNumericDate(this.payload.exp)

      if (!date) {
        return '字段无效'
      }

      return `${this.formatDate(date)}，${this.isExpired ? '已过期' : '未过期'}`
    },
    iatText() {
      if (!this.payload || typeof this.payload.iat === 'undefined') {
        return '未提供'
      }

      const date = this.dateFromNumericDate(this.payload.iat)
      return date ? this.formatDate(date) : '字段无效'
    },
    isExpired() {
      if (!this.payload || typeof this.payload.exp === 'undefined') {
        return null
      }

      const date = this.dateFromNumericDate(this.payload.exp)
      return date ? date.getTime() <= Date.now() : null
    },
    canVerify() {
      return Boolean(this.isTokenShapeValid && !this.parseError && this.secret.trim() && HASH_BY_ALG[this.algorithm])
    },
    verifyTagType() {
      if (this.verifyStatus === '验证通过') {
        return 'success'
      }

      if (this.verifyStatus === '验证失败' || this.verifyStatus === '不支持该算法') {
        return 'danger'
      }

      return 'warning'
    }
  },
  watch: {
    token() {
      this.verifyStatus = ''
      this.verifyError = ''
    },
    secret() {
      this.verifyStatus = ''
      this.verifyError = ''
    }
  },
  mounted() {
    this.generateSampleJwt(false)
  },
  methods: {
    parseJsonPart(index) {
      if (!this.isTokenShapeValid) {
        return { value: null, error: '' }
      }

      try {
        return {
          value: JSON.parse(this.base64UrlDecodeToString(this.tokenParts[index])),
          error: ''
        }
      } catch (error) {
        return {
          value: null,
          error: error.message || '不是合法 JSON'
        }
      }
    },
    async verifySignature() {
      if (!this.canVerify) {
        this.verifyStatus = HASH_BY_ALG[this.algorithm] ? '无法验证' : '不支持该算法'
        return
      }

      this.isVerifying = true
      this.verifyStatus = ''

      try {
        const isValid = this.algorithm.startsWith('HS')
          ? await this.verifyHmacSignature()
          : await this.verifyRsaSignature()

        this.verifyStatus = isValid ? '验证通过' : '验证失败'
      } catch (error) {
        this.verifyStatus = '验证失败'
        this.$message.error(error.message || '签名验证失败')
      } finally {
        this.isVerifying = false
      }
    },
    async verifyHmacSignature() {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(this.secret),
        {
          name: 'HMAC',
          hash: HASH_BY_ALG[this.algorithm]
        },
        false,
        ['verify']
      )

      return crypto.subtle.verify(
        'HMAC',
        key,
        this.base64UrlToUint8Array(this.signature),
        new TextEncoder().encode(this.signingInput())
      )
    },
    async verifyRsaSignature() {
      const key = await crypto.subtle.importKey(
        'spki',
        this.pemToArrayBuffer(this.secret),
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: HASH_BY_ALG[this.algorithm]
        },
        false,
        ['verify']
      )

      return crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        this.base64UrlToUint8Array(this.signature),
        new TextEncoder().encode(this.signingInput())
      )
    },
    async generateSampleJwt(showMessage = true) {
      const now = Math.floor(Date.now() / 1000)
      const header = {
        alg: 'HS256',
        typ: 'JWT'
      }
      const payload = {
        sub: '10001',
        name: 'DevToolbox',
        role: 'developer',
        iat: now,
        exp: now + 60 * 60
      }
      const encodedHeader = this.base64UrlEncodeString(JSON.stringify(header))
      const encodedPayload = this.base64UrlEncodeString(JSON.stringify(payload))
      const input = `${encodedHeader}.${encodedPayload}`
      const signature = await this.signHmac(input, SAMPLE_SECRET, 'SHA-256')

      this.token = `${input}.${signature}`
      this.secret = SAMPLE_SECRET
      this.verifyStatus = ''

      if (showMessage) {
        this.$message.success('已生成 HS256 示例 JWT')
      }
    },
    async signHmac(input, secret, hash) {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        {
          name: 'HMAC',
          hash
        },
        false,
        ['sign']
      )
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))

      return this.uint8ArrayToBase64Url(new Uint8Array(signature))
    },
    signingInput() {
      return `${this.tokenParts[0]}.${this.tokenParts[1]}`
    },
    base64UrlDecodeToString(value) {
      const bytes = this.base64UrlToUint8Array(value)
      return new TextDecoder().decode(bytes)
    },
    base64UrlToUint8Array(value) {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
      const binary = atob(padded)
      const bytes = new Uint8Array(binary.length)

      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index)
      }

      return bytes
    },
    base64UrlEncodeString(value) {
      return this.uint8ArrayToBase64Url(new TextEncoder().encode(value))
    },
    uint8ArrayToBase64Url(bytes) {
      let binary = ''

      bytes.forEach(byte => {
        binary += String.fromCharCode(byte)
      })

      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
    },
    pemToArrayBuffer(pem) {
      const body = pem
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '')

      if (!body) {
        throw new Error('请输入 PEM 格式公钥')
      }

      return this.base64UrlToUint8Array(body).buffer
    },
    dateFromNumericDate(value) {
      const numericValue = Number(value)

      if (!Number.isFinite(numericValue)) {
        return null
      }

      return new Date(numericValue * 1000)
    },
    formatDate(date) {
      const pad = value => String(value).padStart(2, '0')

      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
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
    clearToken() {
      this.token = ''
      this.secret = ''
      this.verifyStatus = ''
      this.verifyError = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.jwt-parser {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.jwt-parser__header {
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

.jwt-parser__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.jwt-input-card,
.jwt-verify-card,
.jwt-result-card {
  border-color: var(--color-border);
  border-radius: 8px;
}

.jwt-input-card,
.jwt-meta-grid,
.jwt-verify-card,
.jwt-result-grid {
  margin-bottom: 18px;
}

.jwt-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.jwt-alert {
  margin-top: 14px;
}

.jwt-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.jwt-meta-item {
  min-width: 0;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  span {
    display: block;
    margin-bottom: 8px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  strong {
    color: var(--color-text);
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  strong.is-expired {
    color: #dc2626;
  }

  strong.is-valid {
    color: #16a34a;
  }
}

.jwt-verify-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.jwt-verify-hint {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.jwt-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.jwt-result-card pre {
  min-height: 260px;
  margin: 0;
  overflow: auto;
  padding: 14px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.jwt-signature-card pre {
  min-height: 120px;
}

@media (max-width: 900px) {
  .jwt-parser__header {
    flex-direction: column;
  }

  .jwt-parser__actions {
    justify-content: flex-start;
  }

  .jwt-meta-grid,
  .jwt-result-grid,
  .jwt-verify-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .jwt-parser__header h1 {
    font-size: 28px;
  }

  .jwt-parser__actions,
  .jwt-parser__actions .el-button {
    width: 100%;
  }
}
</style>
