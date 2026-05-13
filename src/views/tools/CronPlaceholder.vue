<template>
  <section class="cron-tool">
    <div class="cron-tool__header">
      <h1>Cron 表达式生成器</h1>
      <p>支持可视化选择和手动输入解析，实时生成标准 5 位 Cron 表达式并预览后续执行时间。</p>
    </div>

    <el-card shadow="never" class="cron-panel">
      <div slot="header" class="cron-panel__header">
        <span>表达式</span>
        <el-tag
          size="small"
          :type="validationError ? 'danger' : 'success'"
          effect="plain"
        >
          {{ validationError ? '校验失败' : '表达式合法' }}
        </el-tag>
      </div>

      <el-form label-position="top" @submit.native.prevent>
        <el-form-item label="Cron 表达式">
          <div class="cron-input-row">
            <el-input
              v-model.trim="cronExpression"
              clearable
              placeholder="请输入 5 位 Cron 表达式，例如：0 9 * * 1"
              @input="handleManualInput"
              @keyup.enter.native="parseCron"
            />
            <el-button type="primary" icon="el-icon-refresh" @click="parseCron">
              解析
            </el-button>
            <el-button icon="el-icon-document-copy" @click="copyCron">
              复制
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="validationError"
        type="error"
        :title="validationError"
        :closable="false"
        show-icon
        class="cron-alert"
      />

      <div class="cron-presets">
        <el-button
          v-for="preset in presets"
          :key="preset.name"
          size="small"
          @click="applyPreset(preset.value)"
        >
          {{ preset.name }}
        </el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="cron-panel cron-panel--fields">
      <div slot="header" class="cron-panel__header">
        <span>可视化配置</span>
        <span class="cron-panel__hint">生成格式：分 时 日 月 周</span>
      </div>

      <div class="cron-field-grid">
        <div
          v-for="field in fieldConfigs"
          :key="field.key"
          class="cron-field"
        >
          <div class="cron-field__label">
            <span>{{ field.label }}</span>
            <small>{{ field.range }}</small>
          </div>
          <el-select
            v-model="form[field.key]"
            multiple
            filterable
            collapse-tags
            class="cron-field__select"
            placeholder="请选择"
            @change="handleFieldChange(field.key)"
          >
            <el-option
              v-for="option in field.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
      </div>
    </el-card>

    <div class="cron-result-grid">
      <el-card shadow="never" class="cron-panel">
        <div slot="header" class="cron-panel__header">
          <span>中文描述</span>
        </div>
        <div class="cron-description">
          {{ cronDescription }}
        </div>
      </el-card>

      <el-card shadow="never" class="cron-panel">
        <div slot="header" class="cron-panel__header">
          <span>下次 5 次执行时间</span>
          <span class="cron-panel__hint">由 cron-parser 计算</span>
        </div>
        <ol v-if="nextTimes.length" class="cron-next-list">
          <li v-for="time in nextTimes" :key="time">{{ time }}</li>
        </ol>
        <el-empty
          v-else
          description="暂无可预览时间"
          :image-size="80"
        />
      </el-card>
    </div>
  </section>
</template>

<script>
import cronParser from 'cron-parser'
import cronstrue from 'cronstrue'
import 'cronstrue/locales/zh_CN'

export default {
  name: 'CronGenerator',
  data() {
    return {
      cronExpression: '* * * * *',
      validationError: '',
      isSyncingFromInput: false,
      form: {
        second: ['*'],
        minute: ['*'],
        hour: ['*'],
        day: ['*'],
        month: ['*'],
        week: ['*']
      },
      presets: [
        { name: '每分钟', value: '* * * * *' },
        { name: '每小时', value: '0 * * * *' },
        { name: '每天0点', value: '0 0 * * *' },
        { name: '每周一9点', value: '0 9 * * 1' },
        { name: '每月1号', value: '0 0 1 * *' },
        { name: '每年1月1日', value: '0 0 1 1 *' }
      ]
    }
  },
  computed: {
    fieldConfigs() {
      return [
        this.createNumberField('second', '秒', '0-59', 0, 59, '秒', true),
        this.createNumberField('minute', '分', '0-59', 0, 59, '分', true),
        this.createNumberField('hour', '时', '0-23', 0, 23, '时', true),
        this.createNumberField('day', '日', '1-31', 1, 31, '日', true, [
          { label: '最后一天', value: 'L' }
        ]),
        this.createNumberField('month', '月', '1-12', 1, 12, '月', true),
        {
          key: 'week',
          label: '周',
          range: '0-6 或 1-7',
          options: [
            { label: '每周', value: '*' },
            { label: '不指定', value: '?' },
            { label: '周日', value: '0' },
            { label: '周一', value: '1' },
            { label: '周二', value: '2' },
            { label: '周三', value: '3' },
            { label: '周四', value: '4' },
            { label: '周五', value: '5' },
            { label: '周六', value: '6' },
            { label: '周日(7)', value: '7' }
          ]
        }
      ]
    },
    cronDescription() {
      if (this.validationError) {
        return '当前 Cron 表达式不合法，请修正后查看描述。'
      }

      const parts = this.getExpressionParts()

      if (!parts) {
        return '请输入标准 5 位 Cron 表达式。'
      }

      return this.describeCronExpression(this.cronExpression)
    },
    nextTimes() {
      if (this.validationError) {
        return []
      }

      return this.calculateNextTimes(this.cronExpression, 5)
    }
  },
  mounted() {
    this.parseCron()
  },
  methods: {
    createNumberField(key, label, range, min, max, unit, allowQuestion, extraOptions = []) {
      const options = [
        { label: `每${unit}`, value: '*' }
      ]

      if (allowQuestion) {
        options.push({ label: '不指定', value: '?' })
      }

      for (let step = 1; step <= max; step += 1) {
        options.push({
          label: `每 ${step} ${unit}`,
          value: `*/${step}`
        })
      }

      for (let value = min; value <= max; value += 1) {
        options.push({
          label: `${value}${unit}`,
          value: String(value)
        })
      }

      return {
        key,
        label,
        range,
        options: options.concat(extraOptions)
      }
    },
    handleManualInput() {
      this.validateExpression()
    },
    handleFieldChange(key) {
      if (this.isSyncingFromInput) {
        return
      }

      this.form[key] = this.normalizeSelectedValues(this.form[key])

      if (key !== 'second') {
        this.generateCron()
      }
    },
    normalizeSelectedValues(values) {
      if (!values || values.length === 0) {
        return ['*']
      }

      const lastValue = values[values.length - 1]

      if (this.isExclusiveValue(lastValue)) {
        return [lastValue]
      }

      return values.filter(value => !this.isExclusiveValue(value))
    },
    isExclusiveValue(value) {
      return value === '*' || value === '?' || value === 'L' || /^\*\/\d+$/.test(value)
    },
    generateCron() {
      const parts = [
        this.selectValuesToCron(this.form.minute),
        this.selectValuesToCron(this.form.hour),
        this.selectValuesToCron(this.form.day),
        this.selectValuesToCron(this.form.month),
        this.selectValuesToCron(this.form.week)
      ]

      this.cronExpression = parts.join(' ')
      this.validateExpression()
    },
    selectValuesToCron(values) {
      if (!values || values.length === 0) {
        return '*'
      }

      return values.join(',')
    },
    parseCron() {
      const parts = this.getExpressionParts()

      if (!parts) {
        this.validationError = '请输入标准 5 位 Cron 表达式：分 时 日 月 周'
        this.$message.error(this.validationError)
        return
      }

      if (!this.validateExpression()) {
        this.$message.error(this.validationError)
        return
      }

      this.isSyncingFromInput = true
      this.form.minute = this.cronPartToSelect(parts[0])
      this.form.hour = this.cronPartToSelect(parts[1])
      this.form.day = this.cronPartToSelect(parts[2])
      this.form.month = this.cronPartToSelect(parts[3])
      this.form.week = this.cronPartToSelect(parts[4])
      this.form.second = ['*']
      this.isSyncingFromInput = false

      this.$message.success('解析成功')
    },
    cronPartToSelect(part) {
      return part.split(',').filter(Boolean)
    },
    getExpressionParts() {
      const expression = this.cronExpression.trim()

      if (!expression) {
        return null
      }

      const parts = expression.split(/\s+/)

      return parts.length === 5 ? parts : null
    },
    validateExpression() {
      const parts = this.getExpressionParts()

      if (!parts) {
        this.validationError = 'Cron 表达式必须是 5 位：分 时 日 月 周'
        return false
      }

      try {
        this.createCronInterval(this.cronExpression)
        this.validationError = ''
        return true
      } catch (error) {
        this.validationError = `Cron 表达式不合法：${error.message || '请检查字段范围和语法'}`
        return false
      }
    },
    applyPreset(value) {
      this.cronExpression = value
      this.parseCron()
    },
    async copyCron() {
      if (!this.cronExpression) {
        this.$message.warning('没有可复制的 Cron 表达式')
        return
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.cronExpression)
        } else {
          this.copyWithFallback(this.cronExpression)
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
    calculateNextTimes(expression, count) {
      try {
        const interval = this.createCronInterval(expression)
        const result = []

        for (let index = 0; index < count; index += 1) {
          result.push(this.formatCronDate(interval.next()))
        }

        return result
      } catch (error) {
        return []
      }
    },
    createCronInterval(expression) {
      return cronParser.parseExpression(expression.trim(), {
        currentDate: new Date(),
        strict: false
      })
    },
    describeCronExpression(expression) {
      try {
        return cronstrue.toString(expression, {
          locale: 'zh_CN',
          throwExceptionOnParseError: true,
          verbose: true,
          use24HourTimeFormat: true
        })
      } catch (error) {
        return '当前 Cron 表达式可执行，但暂时无法生成中文描述。'
      }
    },
    formatCronDate(cronDate) {
      const date = cronDate.toDate()
      const pad = value => String(value).padStart(2, '0')

      return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
      ].join('-') + ` ${[
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
      ].join(':')}`
    }
  }
}
</script>

<style lang="scss" scoped>
.cron-tool {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.cron-tool__header {
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

.cron-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.cron-panel + .cron-panel,
.cron-panel--fields,
.cron-result-grid {
  margin-top: 18px;
}

.cron-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.cron-panel__hint {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 500;
}

.cron-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
}

.cron-alert {
  margin-bottom: 14px;
}

.cron-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cron-field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.cron-field {
  min-width: 0;
}

.cron-field__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  color: var(--color-text);
  font-weight: 600;

  small {
    color: var(--color-text-muted);
    font-size: 12px;
    font-weight: 500;
  }
}

.cron-field__select {
  width: 100%;
}

.cron-result-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.85fr);
  gap: 18px;
}

.cron-description {
  min-height: 96px;
  padding: 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  line-height: 1.8;
}

.cron-next-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 22px;
  color: var(--color-text);
  line-height: 1.7;
}

@media (max-width: 980px) {
  .cron-field-grid,
  .cron-result-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .cron-tool__header h1 {
    font-size: 28px;
  }

  .cron-input-row {
    grid-template-columns: 1fr;
  }

  .cron-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
