<template>
  <div class="json-tree">
    <div
      v-for="item in entries"
      :key="item.key"
      class="json-tree__row"
    >
      <button
        v-if="item.isComplex"
        class="json-tree__toggle"
        type="button"
        :aria-label="isExpanded(item.key) ? '折叠节点' : '展开节点'"
        @click="toggle(item.key)"
      >
        {{ isExpanded(item.key) ? '▾' : '▸' }}
      </button>
      <span v-else class="json-tree__toggle-placeholder"></span>

      <span class="json-tree__key">{{ item.key }}</span>
      <span class="json-tree__colon">:</span>

      <template v-if="item.isComplex">
        <span class="json-tree__summary" @click="toggle(item.key)">
          {{ getSummary(item.value) }}
        </span>
        <JsonTree
          v-show="isExpanded(item.key)"
          class="json-tree__children"
          :data="item.value"
        />
      </template>

      <span
        v-else
        class="json-tree__value"
        :class="`is-${item.type}`"
      >
        {{ formatValue(item.value, item.type) }}
      </span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'JsonTree',
  props: {
    data: {
      type: [Object, Array],
      required: true
    }
  },
  data() {
    return {
      collapsedKeys: []
    }
  },
  computed: {
    entries() {
      return Object.keys(this.data).map(key => {
        const value = this.data[key]
        const type = this.getType(value)

        return {
          key,
          value,
          type,
          isComplex: type === 'object' || type === 'array'
        }
      })
    }
  },
  methods: {
    toggle(key) {
      const index = this.collapsedKeys.indexOf(key)
      if (index === -1) {
        this.collapsedKeys.push(key)
      } else {
        this.collapsedKeys.splice(index, 1)
      }
    },
    isExpanded(key) {
      return !this.collapsedKeys.includes(key)
    },
    getType(value) {
      if (Array.isArray(value)) {
        return 'array'
      }
      if (value === null) {
        return 'null'
      }
      return typeof value
    },
    getSummary(value) {
      if (Array.isArray(value)) {
        return `Array(${value.length})`
      }
      return `Object(${Object.keys(value).length})`
    },
    formatValue(value, type) {
      if (type === 'string') {
        return `"${value}"`
      }
      if (type === 'null') {
        return 'null'
      }
      return String(value)
    }
  }
}
</script>

<style lang="scss" scoped>
.json-tree {
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.8;
  text-align: left;
}

.json-tree__row {
  position: relative;
  min-height: 26px;
  padding-left: 22px;
}

.json-tree__toggle,
.json-tree__toggle-placeholder {
  position: absolute;
  top: 1px;
  left: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 24px;
}

.json-tree__toggle {
  padding: 0;
  background: transparent;
  border: 0;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 13px;
}

.json-tree__key {
  color: #7c3aed;
  font-weight: 600;
}

.json-tree__colon {
  margin: 0 6px 0 2px;
  color: var(--color-text-muted);
}

.json-tree__summary {
  color: var(--color-text-muted);
  cursor: pointer;
}

.json-tree__children {
  margin-left: 16px;
  padding-left: 12px;
  border-left: 1px solid var(--color-border);
}

.json-tree__value.is-string {
  color: #0f9f6e;
}

.json-tree__value.is-number {
  color: #2563eb;
}

.json-tree__value.is-boolean {
  color: #d97706;
}

.json-tree__value.is-null,
.json-tree__value.is-undefined {
  color: #8b5cf6;
}

[data-theme='dark'] .json-tree__key {
  color: #c084fc;
}

[data-theme='dark'] .json-tree__value.is-string {
  color: #34d399;
}

[data-theme='dark'] .json-tree__value.is-number {
  color: #60a5fa;
}

[data-theme='dark'] .json-tree__value.is-boolean {
  color: #fbbf24;
}

[data-theme='dark'] .json-tree__value.is-null,
[data-theme='dark'] .json-tree__value.is-undefined {
  color: #a78bfa;
}
</style>
