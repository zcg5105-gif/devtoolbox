<template>
  <section class="unit-converter">
    <div class="unit-converter__header">
      <div>
        <h1>单位换算</h1>
        <p>常用长度、重量、温度、面积、体积和存储单位实时换算。</p>
      </div>

      <div class="unit-converter__actions">
        <el-select v-model="categoryKey" @change="handleCategoryChange">
          <el-option
            v-for="category in categories"
            :key="category.key"
            :label="category.label"
            :value="category.key"
          />
        </el-select>
      </div>
    </div>

    <div class="converter-card">
      <div class="input-row">
        <el-input-number
          v-model="inputValue"
          class="value-input"
          :precision="6"
          controls-position="right"
        />
        <el-select v-model="fromUnit" class="unit-select">
          <el-option
            v-for="unit in currentCategory.units"
            :key="unit.key"
            :label="unit.label"
            :value="unit.key"
          />
        </el-select>
        <el-button icon="el-icon-sort" @click="swapWithSelected">
          交换单位
        </el-button>
      </div>

      <el-table :data="convertedRows" border stripe class="result-table">
        <el-table-column prop="label" label="单位" min-width="140" />
        <el-table-column prop="value" label="换算结果" min-width="180">
          <template slot-scope="{ row }">
            <code>{{ row.value }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="symbol" label="符号" width="100" />
        <el-table-column label="操作" width="130">
          <template slot-scope="{ row }">
            <el-button size="mini" icon="el-icon-sort" @click="setAsSource(row.key)">
              设为输入
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<script>
const STORAGE_KEY = 'devtoolbox_unit_converter_category'

const CATEGORIES = [
  {
    key: 'length',
    label: '长度',
    base: 'meter',
    units: [
      { key: 'meter', label: '米', symbol: 'm', ratio: 1 },
      { key: 'kilometer', label: '千米', symbol: 'km', ratio: 1000 },
      { key: 'mile', label: '英里', symbol: 'mi', ratio: 1609.344 },
      { key: 'foot', label: '英尺', symbol: 'ft', ratio: 0.3048 },
      { key: 'inch', label: '英寸', symbol: 'in', ratio: 0.0254 },
      { key: 'centimeter', label: '厘米', symbol: 'cm', ratio: 0.01 },
      { key: 'millimeter', label: '毫米', symbol: 'mm', ratio: 0.001 }
    ]
  },
  {
    key: 'weight',
    label: '重量',
    base: 'kilogram',
    units: [
      { key: 'kilogram', label: '千克', symbol: 'kg', ratio: 1 },
      { key: 'gram', label: '克', symbol: 'g', ratio: 0.001 },
      { key: 'pound', label: '磅', symbol: 'lb', ratio: 0.45359237 },
      { key: 'ounce', label: '盎司', symbol: 'oz', ratio: 0.028349523125 },
      { key: 'jin', label: '斤', symbol: '斤', ratio: 0.5 }
    ]
  },
  {
    key: 'temperature',
    label: '温度',
    base: 'celsius',
    units: [
      { key: 'celsius', label: '摄氏', symbol: '°C' },
      { key: 'fahrenheit', label: '华氏', symbol: '°F' },
      { key: 'kelvin', label: '开尔文', symbol: 'K' }
    ]
  },
  {
    key: 'area',
    label: '面积',
    base: 'squareMeter',
    units: [
      { key: 'squareMeter', label: '平方米', symbol: 'm²', ratio: 1 },
      { key: 'squareFoot', label: '平方英尺', symbol: 'ft²', ratio: 0.09290304 },
      { key: 'mu', label: '亩', symbol: '亩', ratio: 666.6666667 },
      { key: 'hectare', label: '公顷', symbol: 'ha', ratio: 10000 }
    ]
  },
  {
    key: 'volume',
    label: '体积',
    base: 'liter',
    units: [
      { key: 'liter', label: '升', symbol: 'L', ratio: 1 },
      { key: 'milliliter', label: '毫升', symbol: 'mL', ratio: 0.001 },
      { key: 'gallon', label: '加仑', symbol: 'gal', ratio: 3.785411784 },
      { key: 'cubicCentimeter', label: '立方厘米', symbol: 'cm³', ratio: 0.001 }
    ]
  },
  {
    key: 'storage',
    label: '存储',
    base: 'byte',
    units: [
      { key: 'byte', label: 'B', symbol: 'B', ratio: 1 },
      { key: 'kb', label: 'KB', symbol: 'KB', ratio: 1024 },
      { key: 'mb', label: 'MB', symbol: 'MB', ratio: 1024 ** 2 },
      { key: 'gb', label: 'GB', symbol: 'GB', ratio: 1024 ** 3 },
      { key: 'tb', label: 'TB', symbol: 'TB', ratio: 1024 ** 4 },
      { key: 'pb', label: 'PB', symbol: 'PB', ratio: 1024 ** 5 }
    ]
  }
]

export default {
  name: 'UnitConverter',
  data() {
    return {
      categories: CATEGORIES,
      categoryKey: localStorage.getItem(STORAGE_KEY) || 'length',
      inputValue: 1,
      fromUnit: 'meter',
      selectedUnit: ''
    }
  },
  computed: {
    currentCategory() {
      return this.categories.find(category => category.key === this.categoryKey) || this.categories[0]
    },
    fromUnitConfig() {
      return this.currentCategory.units.find(unit => unit.key === this.fromUnit) || this.currentCategory.units[0]
    },
    convertedRows() {
      return this.currentCategory.units.map(unit => ({
        key: unit.key,
        label: unit.label,
        symbol: unit.symbol,
        value: this.formatNumber(this.convertTo(unit.key))
      }))
    }
  },
  watch: {
    categoryKey() {
      this.ensureUnitForCategory()
      localStorage.setItem(STORAGE_KEY, this.categoryKey)
    }
  },
  mounted() {
    this.ensureUnitForCategory()
  },
  methods: {
    handleCategoryChange() {
      this.selectedUnit = ''
    },
    ensureUnitForCategory() {
      if (!this.currentCategory.units.some(unit => unit.key === this.fromUnit)) {
        this.fromUnit = this.currentCategory.units[0].key
      }
    },
    convertTo(targetUnitKey) {
      const value = Number(this.inputValue) || 0

      if (this.categoryKey === 'temperature') {
        return this.convertTemperature(value, this.fromUnit, targetUnitKey)
      }

      const source = this.fromUnitConfig
      const target = this.currentCategory.units.find(unit => unit.key === targetUnitKey)
      const baseValue = value * source.ratio

      return baseValue / target.ratio
    },
    convertTemperature(value, from, to) {
      let celsius = value

      if (from === 'fahrenheit') {
        celsius = (value - 32) * 5 / 9
      } else if (from === 'kelvin') {
        celsius = value - 273.15
      }

      if (to === 'fahrenheit') {
        return celsius * 9 / 5 + 32
      }
      if (to === 'kelvin') {
        return celsius + 273.15
      }
      return celsius
    },
    setAsSource(unitKey) {
      const converted = this.convertTo(unitKey)
      this.inputValue = Number(this.formatNumber(converted))
      this.fromUnit = unitKey
      this.selectedUnit = unitKey
    },
    swapWithSelected() {
      const target = this.selectedUnit || this.currentCategory.units.find(unit => unit.key !== this.fromUnit).key
      this.setAsSource(target)
    },
    formatNumber(value) {
      if (!Number.isFinite(value)) {
        return '0'
      }

      const fixed = Number(value).toFixed(4)
      return fixed.replace(/\.?0+$/, '')
    }
  }
}
</script>

<style lang="scss" scoped>
.unit-converter {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 0 36px;
}

.unit-converter__header {
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

.unit-converter__actions {
  min-width: 180px;
}

.unit-converter__actions ::v-deep .el-select {
  width: 100%;
}

.converter-card {
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.input-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 180px auto;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.value-input,
.unit-select {
  width: 100%;
}

.result-table code {
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
}

@media (max-width: 768px) {
  .unit-converter__header,
  .input-row {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .unit-converter__actions,
  .input-row .el-button {
    width: 100%;
  }

  .unit-converter__header h1 {
    font-size: 28px;
  }
}
</style>
