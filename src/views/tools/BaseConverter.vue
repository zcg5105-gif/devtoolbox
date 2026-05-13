<template>
  <section class="base-converter">
    <div class="base-converter__header">
      <div>
        <h1>进制转换器</h1>
        <p>二进制、八进制、十进制、十六进制互转，支持负数、小数和 ASCII 十六进制转换。</p>
      </div>

      <div class="base-converter__actions">
        <el-button size="small" icon="el-icon-magic-stick" @click="loadExample">
          示例
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="clearAll">
          清空
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="errorMessage"
      class="base-converter__alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />

    <div class="base-grid">
      <el-card
        v-for="field in baseFields"
        :key="field.key"
        shadow="never"
        class="base-card"
      >
        <div slot="header" class="base-card__header">
          <span>{{ field.label }}</span>
          <small>{{ field.radix }} 进制 · {{ digitLength(values[field.key]) }} 位</small>
        </div>

        <el-input
          v-model="values[field.key]"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
          spellcheck="false"
          :placeholder="field.placeholder"
          @input="handleBaseInput(field.key)"
        />
      </el-card>
    </div>

    <div class="base-meta-grid">
      <div class="base-meta-item">
        <span>当前来源</span>
        <strong>{{ activeBaseLabel }}</strong>
      </div>
      <div class="base-meta-item">
        <span>整数位数</span>
        <strong>{{ integerDigitCount }}</strong>
      </div>
      <div class="base-meta-item">
        <span>小数精度</span>
        <strong>最多 {{ fractionPrecision }} 位</strong>
      </div>
    </div>

    <el-card shadow="never" class="ascii-card">
      <div slot="header" class="base-card__header">
        <span>ASCII / UTF-8 与十六进制互转</span>
        <small>空格会在解码时自动忽略</small>
      </div>

      <div class="ascii-grid">
        <div>
          <div class="ascii-label">
            <span>文本</span>
            <small>{{ asciiText.length }} 字符</small>
          </div>
          <el-input
            v-model="asciiText"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 10 }"
            spellcheck="false"
            placeholder="Hello DevToolbox"
            @input="handleAsciiInput"
          />
        </div>

        <div>
          <div class="ascii-label">
            <span>十六进制</span>
            <small>{{ digitLength(asciiHex) }} 位</small>
          </div>
          <el-input
            v-model="asciiHex"
            type="textarea"
            :autosize="{ minRows: 5, maxRows: 10 }"
            spellcheck="false"
            placeholder="48 65 6c 6c 6f"
            @input="handleAsciiHexInput"
          />
        </div>
      </div>
    </el-card>
  </section>
</template>

<script>
const BASE_FIELDS = [
  { key: 'bin', label: 'Bin', radix: 2, placeholder: '1010.101' },
  { key: 'oct', label: 'Oct', radix: 8, placeholder: '12.5' },
  { key: 'dec', label: 'Dec', radix: 10, placeholder: '10.625' },
  { key: 'hex', label: 'Hex', radix: 16, placeholder: 'A.A' }
]

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

export default {
  name: 'BaseConverter',
  data() {
    return {
      baseFields: BASE_FIELDS,
      values: {
        bin: '',
        oct: '',
        dec: '',
        hex: ''
      },
      activeBase: '',
      errorMessage: '',
      isSyncing: false,
      fractionPrecision: 12,
      asciiText: '',
      asciiHex: '',
      isSyncingAscii: false
    }
  },
  computed: {
    activeBaseLabel() {
      const field = this.baseFields.find(item => item.key === this.activeBase)
      return field ? `${field.label} (${field.radix} 进制)` : '-'
    },
    integerDigitCount() {
      if (!this.activeBase || !this.values[this.activeBase]) {
        return '-'
      }

      const normalized = this.values[this.activeBase].replace(/^[+-]/, '').split('.')[0]
      return normalized ? normalized.length : '0'
    }
  },
  mounted() {
    this.loadExample()
  },
  methods: {
    handleBaseInput(key) {
      if (this.isSyncing) {
        return
      }

      this.activeBase = key
      const source = this.values[key].trim()

      if (!source) {
        this.clearBaseValues(key)
        this.errorMessage = ''
        return
      }

      const field = this.baseFields.find(item => item.key === key)

      try {
        const decimalValue = this.parseBaseNumber(source, field.radix)
        this.syncBaseValues(key, decimalValue)
        this.errorMessage = ''
      } catch (error) {
        this.errorMessage = error.message
      }
    },
    syncBaseValues(sourceKey, decimalValue) {
      this.isSyncing = true

      this.baseFields.forEach(field => {
        if (field.key !== sourceKey) {
          this.values[field.key] = this.formatBaseNumber(decimalValue, field.radix)
        }
      })

      this.isSyncing = false
    },
    clearBaseValues(sourceKey) {
      this.isSyncing = true
      this.baseFields.forEach(field => {
        if (field.key !== sourceKey) {
          this.values[field.key] = ''
        }
      })
      this.isSyncing = false
    },
    parseBaseNumber(value, radix) {
      const normalized = value.toLowerCase().replace(/\s+/g, '')

      if (!/^[+-]?[0-9a-f]+(\.[0-9a-f]+)?$/.test(normalized)) {
        throw new Error('请输入合法数字，可包含一个小数点和可选正负号')
      }

      const sign = normalized.startsWith('-') ? -1 : 1
      const unsigned = normalized.replace(/^[+-]/, '')
      const parts = unsigned.split('.')
      const integerPart = parts[0] || '0'
      const fractionPart = parts[1] || ''

      this.assertDigits(integerPart + fractionPart, radix)

      const integerValue = parseInt(integerPart, radix)
      let fractionValue = 0

      for (let index = 0; index < fractionPart.length; index += 1) {
        const digitValue = DIGITS.indexOf(fractionPart[index])
        fractionValue += digitValue / Math.pow(radix, index + 1)
      }

      return sign * (integerValue + fractionValue)
    },
    assertDigits(value, radix) {
      for (let index = 0; index < value.length; index += 1) {
        const digitValue = DIGITS.indexOf(value[index])

        if (digitValue < 0 || digitValue >= radix) {
          throw new Error(`字符 "${value[index]}" 不属于 ${radix} 进制`)
        }
      }
    },
    formatBaseNumber(value, radix) {
      if (!Number.isFinite(value)) {
        return ''
      }

      const sign = value < 0 ? '-' : ''
      const absolute = Math.abs(value)
      const integerPart = Math.floor(absolute)
      let fraction = absolute - integerPart
      let result = `${sign}${integerPart.toString(radix)}`

      if (fraction === 0) {
        return result.toUpperCase()
      }

      const fractionDigits = []
      let count = 0

      while (fraction > 0 && count < this.fractionPrecision) {
        fraction *= radix
        const digit = Math.floor(fraction)
        fractionDigits.push(digit.toString(radix))
        fraction -= digit
        count += 1
      }

      return `${result}.${fractionDigits.join('')}`.toUpperCase()
    },
    handleAsciiInput() {
      if (this.isSyncingAscii) {
        return
      }

      this.isSyncingAscii = true
      const bytes = new TextEncoder().encode(this.asciiText)
      this.asciiHex = Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase()
      this.isSyncingAscii = false
    },
    handleAsciiHexInput() {
      if (this.isSyncingAscii) {
        return
      }

      const cleanHex = this.asciiHex.replace(/\s+/g, '')

      if (!cleanHex) {
        this.isSyncingAscii = true
        this.asciiText = ''
        this.isSyncingAscii = false
        return
      }

      if (!/^[0-9a-fA-F]+$/.test(cleanHex) || cleanHex.length % 2 !== 0) {
        this.errorMessage = 'ASCII 十六进制必须是偶数长度的合法 Hex 字符'
        return
      }

      try {
        const bytes = new Uint8Array(cleanHex.match(/.{2}/g).map(item => parseInt(item, 16)))
        this.isSyncingAscii = true
        this.asciiText = new TextDecoder().decode(bytes)
        this.isSyncingAscii = false
        this.errorMessage = ''
      } catch (error) {
        this.errorMessage = 'ASCII 十六进制解码失败'
      }
    },
    digitLength(value) {
      return value ? value.replace(/[^0-9a-fA-F]/g, '').length : 0
    },
    loadExample() {
      this.values.dec = '255.5'
      this.handleBaseInput('dec')
      this.asciiText = 'Hello DevToolbox'
      this.handleAsciiInput()
    },
    clearAll() {
      this.values = {
        bin: '',
        oct: '',
        dec: '',
        hex: ''
      }
      this.asciiText = ''
      this.asciiHex = ''
      this.activeBase = ''
      this.errorMessage = ''
    }
  }
}
</script>

<style lang="scss" scoped>
.base-converter {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.base-converter__header {
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

.base-converter__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.base-converter__alert,
.base-grid,
.base-meta-grid {
  margin-bottom: 18px;
}

.base-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.base-card,
.ascii-card {
  border-color: var(--color-border);
  border-radius: 8px;
}

.base-card__header,
.ascii-label {
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

.base-card ::v-deep .el-textarea__inner,
.ascii-card ::v-deep .el-textarea__inner {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  line-height: 1.7;
}

.base-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.base-meta-item {
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  span {
    display: block;
    margin-bottom: 6px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  strong {
    color: var(--color-text);
    font-size: 18px;
    line-height: 1.4;
  }
}

.ascii-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.ascii-label {
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .base-converter__header {
    flex-direction: column;
  }

  .base-converter__actions {
    justify-content: flex-start;
  }

  .base-grid,
  .base-meta-grid,
  .ascii-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .base-converter__header h1 {
    font-size: 28px;
  }

  .base-converter__actions,
  .base-converter__actions .el-button {
    width: 100%;
  }

  .base-card__header,
  .ascii-label {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
