<template>
  <section class="date-calculator">
    <div class="date-calculator__header">
      <div>
        <h1>日期计算器</h1>
        <p>计算日期差、工作日差，以及按天、周、月进行日期加减。</p>
      </div>

      <div class="date-calculator__actions">
        <el-button size="small" icon="el-icon-date" @click="useToday">
          使用今天
        </el-button>
        <el-button size="small" icon="el-icon-delete" @click="resetForm">
          重置
        </el-button>
      </div>
    </div>

    <div class="date-grid">
      <el-card shadow="never" class="date-panel">
        <div slot="header" class="date-panel__header">
          <span>日期差计算</span>
          <small>起始日期到结束日期</small>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <div class="date-form-grid">
            <el-form-item label="起始日期">
              <el-date-picker
                v-model="startDate"
                type="date"
                value-format="yyyy-MM-dd"
                placeholder="选择起始日期"
              />
            </el-form-item>

            <el-form-item label="结束日期">
              <el-date-picker
                v-model="endDate"
                type="date"
                value-format="yyyy-MM-dd"
                placeholder="选择结束日期"
              />
            </el-form-item>
          </div>
        </el-form>

        <div class="date-result-grid">
          <div class="date-result-item">
            <span>天数差</span>
            <strong>{{ dayDiff }} 天</strong>
          </div>
          <div class="date-result-item">
            <span>周数差</span>
            <strong>{{ weekDiff }} 周</strong>
          </div>
          <div class="date-result-item">
            <span>月数差</span>
            <strong>{{ monthDiff }} 月</strong>
          </div>
          <div class="date-result-item">
            <span>工作日差</span>
            <strong>{{ workdayDiff }} 天</strong>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="date-panel">
        <div slot="header" class="date-panel__header">
          <span>日期加减</span>
          <small>起始日期 + 时间量 = 目标日期</small>
        </div>

        <el-form label-position="top" @submit.native.prevent>
          <el-form-item label="起始日期">
            <el-date-picker
              v-model="calcStartDate"
              type="date"
              value-format="yyyy-MM-dd"
              placeholder="选择起始日期"
            />
          </el-form-item>

          <div class="date-add-grid">
            <el-form-item label="天数">
              <el-input-number v-model="addDays" :step="1" controls-position="right" />
            </el-form-item>
            <el-form-item label="周数">
              <el-input-number v-model="addWeeks" :step="1" controls-position="right" />
            </el-form-item>
            <el-form-item label="月数">
              <el-input-number v-model="addMonths" :step="1" controls-position="right" />
            </el-form-item>
          </div>

          <el-checkbox v-model="useWorkdays">
            天数按工作日计算（排除周末）
          </el-checkbox>
        </el-form>

        <div class="target-date">
          <span>目标日期</span>
          <strong>{{ targetDateText }}</strong>
          <small>{{ targetWeekdayText }}</small>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="date-panel relative-panel">
      <div slot="header" class="date-panel__header">
        <span>从今天起的相对时间</span>
        <small>{{ todayText }}</small>
      </div>

      <div class="relative-grid">
        <el-form label-position="top" class="relative-form" @submit.native.prevent>
          <el-form-item label="数量">
            <el-input-number v-model="relativeAmount" :step="1" controls-position="right" />
          </el-form-item>

          <el-form-item label="单位">
            <el-select v-model="relativeUnit">
              <el-option label="天" value="day" />
              <el-option label="周" value="week" />
              <el-option label="月" value="month" />
            </el-select>
          </el-form-item>
        </el-form>

        <div class="relative-result">
          <strong>{{ relativeText }}</strong>
          <span>{{ relativeDateText }}</span>
        </div>
      </div>
    </el-card>
  </section>
</template>

<script>
import dayjs from 'dayjs'

const DATE_FORMAT = 'YYYY-MM-DD'
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default {
  name: 'DateCalculator',
  data() {
    const today = dayjs().format(DATE_FORMAT)

    return {
      startDate: today,
      endDate: dayjs().add(30, 'day').format(DATE_FORMAT),
      calcStartDate: today,
      addDays: 3,
      addWeeks: 0,
      addMonths: 0,
      useWorkdays: false,
      relativeAmount: 3,
      relativeUnit: 'day'
    }
  },
  computed: {
    start() {
      return dayjs(this.startDate)
    },
    end() {
      return dayjs(this.endDate)
    },
    dayDiff() {
      return this.end.diff(this.start, 'day')
    },
    weekDiff() {
      return this.formatNumber(this.dayDiff / 7)
    },
    monthDiff() {
      return this.formatNumber(this.end.diff(this.start, 'month', true))
    },
    workdayDiff() {
      return this.calculateWorkdayDiff(this.start, this.end)
    },
    targetDate() {
      let date = dayjs(this.calcStartDate).add(this.addWeeks, 'week').add(this.addMonths, 'month')

      if (this.useWorkdays) {
        date = this.addWorkdays(date, this.addDays)
      } else {
        date = date.add(this.addDays, 'day')
      }

      return date
    },
    targetDateText() {
      return this.targetDate.format(DATE_FORMAT)
    },
    targetWeekdayText() {
      return `${this.weekdayName(this.targetDate)}，距今天 ${this.targetDate.diff(dayjs().startOf('day'), 'day')} 天`
    },
    todayText() {
      const today = dayjs()
      return `${today.format(DATE_FORMAT)} ${this.weekdayName(today)}`
    },
    relativeDate() {
      return dayjs().add(this.relativeAmount, this.relativeUnit)
    },
    relativeText() {
      const unitText = {
        day: '天',
        week: '周',
        month: '个月'
      }[this.relativeUnit]

      if (this.relativeAmount >= 0) {
        return `${this.relativeAmount}${unitText}后是${this.weekdayName(this.relativeDate)}`
      }

      return `${Math.abs(this.relativeAmount)}${unitText}前是${this.weekdayName(this.relativeDate)}`
    },
    relativeDateText() {
      return this.relativeDate.format(DATE_FORMAT)
    }
  },
  methods: {
    calculateWorkdayDiff(start, end) {
      const direction = end.isBefore(start) ? -1 : 1
      let current = direction > 0 ? start.startOf('day') : end.startOf('day')
      const target = direction > 0 ? end.startOf('day') : start.startOf('day')
      let count = 0

      while (current.isBefore(target)) {
        if (this.isWorkday(current)) {
          count += 1
        }
        current = current.add(1, 'day')
      }

      return count * direction
    },
    addWorkdays(date, days) {
      const direction = days >= 0 ? 1 : -1
      let remaining = Math.abs(days)
      let current = date

      while (remaining > 0) {
        current = current.add(direction, 'day')
        if (this.isWorkday(current)) {
          remaining -= 1
        }
      }

      return current
    },
    isWorkday(date) {
      const day = date.day()
      return day !== 0 && day !== 6
    },
    weekdayName(date) {
      return WEEKDAYS[date.day()]
    },
    formatNumber(value) {
      return Number.isInteger(value) ? String(value) : value.toFixed(2)
    },
    useToday() {
      const today = dayjs().format(DATE_FORMAT)
      this.startDate = today
      this.endDate = today
      this.calcStartDate = today
    },
    resetForm() {
      const today = dayjs().format(DATE_FORMAT)
      this.startDate = today
      this.endDate = dayjs().add(30, 'day').format(DATE_FORMAT)
      this.calcStartDate = today
      this.addDays = 3
      this.addWeeks = 0
      this.addMonths = 0
      this.useWorkdays = false
      this.relativeAmount = 3
      this.relativeUnit = 'day'
    }
  }
}
</script>

<style lang="scss" scoped>
.date-calculator {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.date-calculator__header {
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

.date-calculator__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.date-panel {
  border-color: var(--color-border);
  border-radius: 8px;
}

.date-panel__header {
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

.date-form-grid,
.date-add-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.date-add-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.date-panel ::v-deep .el-date-editor,
.date-panel ::v-deep .el-input-number,
.date-panel ::v-deep .el-select {
  width: 100%;
}

.date-result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.date-result-item,
.target-date,
.relative-result {
  padding: 14px 16px;
  background: var(--color-surface-soft);
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
    font-size: 20px;
    line-height: 1.35;
  }

  small {
    display: block;
    margin-top: 6px;
    color: var(--color-text-muted);
  }
}

.target-date {
  margin-top: 18px;
}

.relative-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.5fr) minmax(0, 1fr);
  gap: 18px;
  align-items: end;
}

.relative-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.relative-result {
  min-height: 86px;
}

@media (max-width: 980px) {
  .date-calculator__header {
    flex-direction: column;
  }

  .date-calculator__actions {
    justify-content: flex-start;
  }

  .date-grid,
  .relative-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .date-calculator__header h1 {
    font-size: 28px;
  }

  .date-calculator__actions,
  .date-calculator__actions .el-button,
  .date-form-grid,
  .date-add-grid,
  .date-result-grid,
  .relative-form {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .date-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
