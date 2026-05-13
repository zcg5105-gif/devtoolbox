<template>
  <section class="timer-page">
    <div class="timer-page__header">
      <div>
        <h1>计时器</h1>
        <p>倒计时和秒表工具，支持暂停、重置、计次、提示音和本地状态恢复。</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="timer-tabs">
      <el-tab-pane label="倒计时" name="countdown">
        <div class="timer-grid">
          <section class="timer-panel timer-panel--display">
            <div class="time-display">{{ formattedCountdown }}</div>
            <el-progress :percentage="countdownProgress" :show-text="false" />
            <div class="timer-actions">
              <el-button type="primary" icon="el-icon-video-play" :disabled="countdownRunning || countdownDuration <= 0" @click="startCountdown">
                开始
              </el-button>
              <el-button icon="el-icon-video-pause" :disabled="!countdownRunning" @click="pauseCountdown">
                暂停
              </el-button>
              <el-button icon="el-icon-refresh-left" @click="resetCountdown">
                重置
              </el-button>
            </div>
          </section>

          <section class="timer-panel">
            <div class="panel-header">
              <h2>设置时间</h2>
            </div>
            <div class="time-inputs">
              <label>
                <span>时</span>
                <el-input-number v-model="countdownInput.hours" :min="0" :max="99" controls-position="right" @change="syncCountdownInput" />
              </label>
              <label>
                <span>分</span>
                <el-input-number v-model="countdownInput.minutes" :min="0" :max="59" controls-position="right" @change="syncCountdownInput" />
              </label>
              <label>
                <span>秒</span>
                <el-input-number v-model="countdownInput.seconds" :min="0" :max="59" controls-position="right" @change="syncCountdownInput" />
              </label>
            </div>

            <div class="quick-buttons">
              <el-button v-for="item in quickDurations" :key="item.label" size="small" @click="setQuickDuration(item.seconds)">
                {{ item.label }}
              </el-button>
            </div>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane label="秒表" name="stopwatch">
        <div class="timer-grid">
          <section class="timer-panel timer-panel--display">
            <div class="time-display">{{ formattedStopwatch }}</div>
            <div class="timer-actions">
              <el-button type="primary" icon="el-icon-video-play" :disabled="stopwatchRunning" @click="startStopwatch">
                开始
              </el-button>
              <el-button icon="el-icon-video-pause" :disabled="!stopwatchRunning" @click="pauseStopwatch">
                暂停
              </el-button>
              <el-button icon="el-icon-time" :disabled="stopwatchElapsed <= 0" @click="addLap">
                计次
              </el-button>
              <el-button icon="el-icon-refresh-left" @click="resetStopwatch">
                重置
              </el-button>
            </div>
          </section>

          <section class="timer-panel">
            <div class="panel-header">
              <h2>计次记录</h2>
              <el-button size="mini" icon="el-icon-download" :disabled="!laps.length" @click="exportLaps">
                导出
              </el-button>
            </div>

            <div class="lap-summary">
              <el-tag size="small" effect="plain">最短 {{ shortestLap ? formatTime(shortestLap.duration) : '-' }}</el-tag>
              <el-tag size="small" effect="plain">最长 {{ longestLap ? formatTime(longestLap.duration) : '-' }}</el-tag>
            </div>

            <div v-if="!laps.length" class="empty-laps">
              暂无计次记录
            </div>
            <div v-else class="lap-list">
              <div v-for="lap in laps" :key="lap.index" class="lap-item">
                <span>#{{ lap.index }}</span>
                <strong>{{ formatTime(lap.duration) }}</strong>
                <code>{{ formatTime(lap.total) }}</code>
              </div>
            </div>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script>
const STORAGE_KEY = 'devtoolbox_timer_state'

export default {
  name: 'TimerTool',
  data() {
    return {
      activeTab: 'countdown',
      frameId: null,
      tickTimer: null,
      now: Date.now(),
      countdownInput: {
        hours: 0,
        minutes: 5,
        seconds: 0
      },
      countdownDuration: 5 * 60 * 1000,
      countdownRemaining: 5 * 60 * 1000,
      countdownStartedAt: 0,
      countdownRunning: false,
      countdownDone: false,
      stopwatchStartedAt: 0,
      stopwatchBaseElapsed: 0,
      stopwatchRunning: false,
      laps: []
    }
  },
  computed: {
    quickDurations() {
      return [
        { label: '1分钟', seconds: 60 },
        { label: '5分钟', seconds: 5 * 60 },
        { label: '10分钟', seconds: 10 * 60 },
        { label: '30分钟', seconds: 30 * 60 }
      ]
    },
    countdownElapsed() {
      if (!this.countdownRunning) {
        return this.countdownDuration - this.countdownRemaining
      }

      return this.now - this.countdownStartedAt
    },
    currentCountdownRemaining() {
      if (!this.countdownRunning) {
        return Math.max(0, this.countdownRemaining)
      }

      return Math.max(0, this.countdownDuration - this.countdownElapsed)
    },
    formattedCountdown() {
      return this.formatTime(this.currentCountdownRemaining)
    },
    countdownProgress() {
      if (!this.countdownDuration) {
        return 0
      }

      return Math.min(100, Math.round(((this.countdownDuration - this.currentCountdownRemaining) / this.countdownDuration) * 100))
    },
    stopwatchElapsed() {
      if (!this.stopwatchRunning) {
        return this.stopwatchBaseElapsed
      }

      return this.stopwatchBaseElapsed + (this.now - this.stopwatchStartedAt)
    },
    formattedStopwatch() {
      return this.formatTime(this.stopwatchElapsed, true)
    },
    shortestLap() {
      return this.laps.reduce((best, lap) => !best || lap.duration < best.duration ? lap : best, null)
    },
    longestLap() {
      return this.laps.reduce((best, lap) => !best || lap.duration > best.duration ? lap : best, null)
    }
  },
  watch: {
    activeTab() {
      this.persistState()
    }
  },
  mounted() {
    this.restoreState()
    this.startTicker()
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  },
  beforeDestroy() {
    this.stopTicker()
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    this.persistState()
  },
  methods: {
    startTicker() {
      this.stopTicker()

      if (document.hidden) {
        this.tickTimer = window.setInterval(() => {
          this.handleTick()
        }, 1000)
        return
      }

      const tick = () => {
        this.handleTick()
        this.frameId = window.requestAnimationFrame(tick)
      }

      this.frameId = window.requestAnimationFrame(tick)
    },
    stopTicker() {
      if (this.frameId) {
        window.cancelAnimationFrame(this.frameId)
        this.frameId = null
      }
      if (this.tickTimer) {
        window.clearInterval(this.tickTimer)
        this.tickTimer = null
      }
    },
    handleTick() {
      this.now = Date.now()

      if (this.countdownRunning && this.currentCountdownRemaining <= 0) {
        this.countdownRunning = false
        this.countdownRemaining = 0
        if (!this.countdownDone) {
          this.countdownDone = true
          this.playAlarm()
          this.$message.success('倒计时结束')
        }
        this.persistState()
      }
    },
    handleVisibilityChange() {
      this.startTicker()
      this.now = Date.now()
    },
    syncCountdownInput() {
      if (this.countdownRunning) {
        return
      }

      const seconds = this.countdownInput.hours * 3600 + this.countdownInput.minutes * 60 + this.countdownInput.seconds
      this.countdownDuration = seconds * 1000
      this.countdownRemaining = this.countdownDuration
      this.countdownDone = false
      this.persistState()
    },
    setQuickDuration(seconds) {
      if (this.countdownRunning) {
        return
      }

      this.countdownInput = {
        hours: Math.floor(seconds / 3600),
        minutes: Math.floor((seconds % 3600) / 60),
        seconds: seconds % 60
      }
      this.syncCountdownInput()
    },
    startCountdown() {
      if (this.currentCountdownRemaining <= 0) {
        return
      }

      this.countdownDuration = this.currentCountdownRemaining
      this.countdownRemaining = this.currentCountdownRemaining
      this.countdownStartedAt = Date.now()
      this.countdownRunning = true
      this.countdownDone = false
      this.persistState()
    },
    pauseCountdown() {
      this.countdownRemaining = this.currentCountdownRemaining
      this.countdownRunning = false
      this.persistState()
    },
    resetCountdown() {
      this.syncCountdownInput()
      this.countdownRunning = false
      this.countdownDone = false
      this.persistState()
    },
    startStopwatch() {
      this.stopwatchStartedAt = Date.now()
      this.stopwatchRunning = true
      this.persistState()
    },
    pauseStopwatch() {
      this.stopwatchBaseElapsed = this.stopwatchElapsed
      this.stopwatchRunning = false
      this.persistState()
    },
    resetStopwatch() {
      this.stopwatchStartedAt = 0
      this.stopwatchBaseElapsed = 0
      this.stopwatchRunning = false
      this.laps = []
      this.persistState()
    },
    addLap() {
      const total = this.stopwatchElapsed
      const previousTotal = this.laps.length ? this.laps[0].total : 0

      this.laps = [
        {
          index: this.laps.length + 1,
          total,
          duration: total - previousTotal
        },
        ...this.laps
      ]
      this.persistState()
    },
    exportLaps() {
      const lines = [
        'Lap\tDuration\tTotal',
        ...this.laps.slice().reverse().map(lap => `${lap.index}\t${this.formatTime(lap.duration, true)}\t${this.formatTime(lap.total, true)}`)
      ]
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
      const link = document.createElement('a')

      link.href = URL.createObjectURL(blob)
      link.download = `laps_${Date.now()}.txt`
      link.click()
      URL.revokeObjectURL(link.href)
    },
    playAlarm() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const context = new AudioContext()
        const oscillator = context.createOscillator()
        const gain = context.createGain()

        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, context.currentTime)
        oscillator.frequency.setValueAtTime(660, context.currentTime + 0.18)
        gain.gain.setValueAtTime(0.001, context.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.8)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.85)
      } catch (error) {
        // Audio is optional; browsers may block it without user activation.
      }
    },
    formatTime(milliseconds, showMs = false) {
      const safe = Math.max(0, Math.floor(milliseconds))
      const totalSeconds = Math.floor(safe / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      const ms = Math.floor((safe % 1000) / 10)
      const base = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':')

      return showMs ? `${base}.${String(ms).padStart(2, '0')}` : base
    },
    persistState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeTab: this.activeTab,
        countdownInput: this.countdownInput,
        countdownDuration: this.countdownDuration,
        countdownRemaining: this.currentCountdownRemaining,
        countdownStartedAt: this.countdownStartedAt,
        countdownRunning: this.countdownRunning,
        countdownDone: this.countdownDone,
        stopwatchStartedAt: this.stopwatchStartedAt,
        stopwatchBaseElapsed: this.stopwatchRunning ? this.stopwatchElapsed : this.stopwatchBaseElapsed,
        stopwatchRunning: this.stopwatchRunning,
        laps: this.laps,
        savedAt: Date.now()
      }))
    },
    restoreState() {
      try {
        const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')

        if (!state || !state.savedAt) {
          return
        }

        this.activeTab = state.activeTab || 'countdown'
        this.countdownInput = state.countdownInput || this.countdownInput
        this.countdownDuration = state.countdownDuration || this.countdownDuration
        this.countdownRemaining = state.countdownRemaining || this.countdownRemaining
        this.countdownStartedAt = state.countdownRunning
          ? Date.now() - (this.countdownDuration - this.countdownRemaining)
          : state.countdownStartedAt || 0
        this.countdownRunning = Boolean(state.countdownRunning && this.countdownRemaining > 0)
        this.countdownDone = Boolean(state.countdownDone)
        this.stopwatchBaseElapsed = state.stopwatchBaseElapsed || 0
        this.stopwatchStartedAt = state.stopwatchRunning ? Date.now() : 0
        this.stopwatchRunning = Boolean(state.stopwatchRunning)
        this.laps = Array.isArray(state.laps) ? state.laps : []
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.timer-page {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.timer-page__header {
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

.timer-tabs ::v-deep .el-tabs__content {
  overflow: visible;
}

.timer-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.05fr);
  gap: 18px;
  align-items: start;
}

.timer-panel {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.timer-panel--display {
  display: grid;
  gap: 22px;
  padding: 30px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 54px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    margin: 0;
    color: var(--color-text);
    font-size: 16px;
  }
}

.time-display {
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 64px;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
}

.timer-actions,
.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.time-inputs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 18px;

  label {
    display: grid;
    gap: 8px;
    color: var(--color-text-muted);
    font-size: 13px;
  }

  ::v-deep .el-input-number {
    width: 100%;
  }
}

.quick-buttons {
  justify-content: flex-start;
  padding: 0 18px 18px;
}

.lap-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.empty-laps {
  padding: 40px 16px;
  color: var(--color-text-muted);
  text-align: center;
}

.lap-list {
  display: grid;
  gap: 10px;
  max-height: 420px;
  overflow: auto;
  padding: 16px;
}

.lap-item {
  display: grid;
  grid-template-columns: 64px 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;

  span {
    color: var(--color-text-muted);
  }

  strong,
  code {
    color: var(--color-text);
    font-family: Consolas, Monaco, 'Courier New', monospace;
  }
}

@media (max-width: 1024px) {
  .timer-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .timer-page__header h1 {
    font-size: 28px;
  }

  .timer-panel--display {
    padding: 22px 16px;
  }

  .time-display {
    font-size: 42px;
  }

  .time-inputs,
  .lap-item {
    grid-template-columns: 1fr;
  }

  .timer-actions .el-button,
  .quick-buttons .el-button {
    width: 100%;
  }
}
</style>
