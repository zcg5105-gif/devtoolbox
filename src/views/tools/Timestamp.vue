<template>
  <section class="timestamp-tool">
    <div class="timestamp-tool__header">
      <h1>时间戳转换</h1>
      <p>Unix 时间戳与日期时间互转，并快速查看当前时间戳。</p>
    </div>

    <div class="timestamp-tool__grid">
      <el-card shadow="never" class="timestamp-panel">
        <div slot="header" class="timestamp-panel__header">
          <span>时间戳转日期</span>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="时间戳">
            <el-input
              v-model="timestampInput"
              clearable
              placeholder="请输入时间戳"
              @keyup.enter.native="convertTimestamp"
            >
              <el-select
                slot="append"
                v-model="timestampUnit"
                class="timestamp-unit-select"
              >
                <el-option label="秒" value="second" />
                <el-option label="毫秒" value="millisecond" />
              </el-select>
            </el-input>
          </el-form-item>

          <el-button type="primary" icon="el-icon-refresh" @click="convertTimestamp">
            转换
          </el-button>
        </el-form>

        <div v-if="timestampDateResult" class="timestamp-result">
          <span class="timestamp-result__label">日期时间</span>
          <code>{{ timestampDateResult }}</code>
          <CopyButton :text="timestampDateResult" />
        </div>
      </el-card>

      <el-card shadow="never" class="timestamp-panel">
        <div slot="header" class="timestamp-panel__header">
          <span>日期转时间戳</span>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="日期时间">
            <el-date-picker
              v-model="dateInput"
              type="datetime"
              placeholder="请选择日期时间"
              class="timestamp-date-picker"
            />
          </el-form-item>

          <el-button type="primary" icon="el-icon-refresh" @click="convertDate">
            转换
          </el-button>
        </el-form>

        <div v-if="dateTimestampSecond" class="timestamp-result-list">
          <div class="timestamp-result">
            <span class="timestamp-result__label">秒级时间戳</span>
            <code>{{ dateTimestampSecond }}</code>
            <CopyButton :text="dateTimestampSecond" />
          </div>
          <div class="timestamp-result">
            <span class="timestamp-result__label">毫秒级时间戳</span>
            <code>{{ dateTimestampMillisecond }}</code>
            <CopyButton :text="dateTimestampMillisecond" />
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="timestamp-panel timestamp-panel--current">
        <div slot="header" class="timestamp-panel__header">
          <span>当前时间</span>
          <el-button
            size="mini"
            icon="el-icon-refresh"
            @click="refreshCurrentTime"
          >
            刷新
          </el-button>
        </div>

        <div class="timestamp-result-list timestamp-result-list--current">
          <div class="timestamp-result">
            <span class="timestamp-result__label">当前日期时间</span>
            <code>{{ currentDateTime }}</code>
            <CopyButton :text="currentDateTime" />
          </div>
          <div class="timestamp-result">
            <span class="timestamp-result__label">秒级时间戳</span>
            <code>{{ currentSecond }}</code>
            <CopyButton :text="currentSecond" />
          </div>
          <div class="timestamp-result">
            <span class="timestamp-result__label">毫秒级时间戳</span>
            <code>{{ currentMillisecond }}</code>
            <CopyButton :text="currentMillisecond" />
          </div>
        </div>
      </el-card>
    </div>
  </section>
</template>

<script>
import dayjs from 'dayjs'
import CopyButton from '@/components/CopyButton.vue'

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

export default {
  name: 'TimestampTool',
  components: {
    CopyButton
  },
  data() {
    return {
      timestampInput: '',
      timestampUnit: 'second',
      timestampDateResult: '',
      dateInput: null,
      dateTimestampSecond: '',
      dateTimestampMillisecond: '',
      currentDateTime: '',
      currentSecond: '',
      currentMillisecond: ''
    }
  },
  mounted() {
    this.refreshCurrentTime()
  },
  methods: {
    convertTimestamp() {
      const value = this.timestampInput.trim()

      if (!value) {
        this.$message.warning('请输入时间戳')
        return
      }

      if (!/^-?\d+$/.test(value)) {
        this.$message.warning('时间戳只能为整数')
        return
      }

      const timestamp = Number(value)
      const millisecond = this.timestampUnit === 'second'
        ? timestamp * 1000
        : timestamp
      const date = dayjs(millisecond)

      if (!Number.isSafeInteger(millisecond) || !date.isValid()) {
        this.$message.error('无效的时间戳')
        return
      }

      this.timestampDateResult = date.format(DATE_TIME_FORMAT)
    },
    convertDate() {
      if (!this.dateInput) {
        this.$message.warning('请选择日期时间')
        return
      }

      const date = dayjs(this.dateInput)

      if (!date.isValid()) {
        this.$message.error('无效的日期时间')
        return
      }

      const millisecond = date.valueOf()
      this.dateTimestampSecond = String(Math.floor(millisecond / 1000))
      this.dateTimestampMillisecond = String(millisecond)
    },
    refreshCurrentTime() {
      const now = dayjs()
      const millisecond = now.valueOf()

      this.currentDateTime = now.format(DATE_TIME_FORMAT)
      this.currentSecond = String(Math.floor(millisecond / 1000))
      this.currentMillisecond = String(millisecond)
    }
  }
}
</script>

<style lang="scss" scoped>
.timestamp-tool {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.timestamp-tool__header {
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

.timestamp-tool__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.timestamp-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.timestamp-panel--current {
  grid-column: 1 / -1;
}

.timestamp-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-text);
  font-weight: 700;
}

.timestamp-unit-select {
  width: 96px;
}

.timestamp-date-picker {
  width: 100%;
}

.timestamp-result-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.timestamp-result-list--current {
  margin-top: 0;
}

.timestamp-result {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 10px 12px;
  background: var(--color-surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.timestamp-result__label {
  color: var(--color-text-muted);
  font-size: 13px;
  line-height: 1.4;
}

code {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
}

@media (max-width: 900px) {
  .timestamp-tool__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .timestamp-tool__header h1 {
    font-size: 28px;
  }

  .timestamp-result {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}
</style>
