function columnIndexToLetter(index) {
  let value = index + 1
  let label = ''

  while (value > 0) {
    const remainder = (value - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    value = Math.floor((value - 1) / 26)
  }

  return label
}

function toDisplayValue(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

function normalizeHeader(value) {
  return toDisplayValue(value).toLowerCase()
}

function getCell(row, index) {
  if (!Array.isArray(row)) {
    return ''
  }
  return row[index]
}

function getMaxWidth(rows) {
  return rows.reduce((width, row) => Math.max(width, Array.isArray(row) ? row.length : 0), 0)
}

function hasColumnValue(rows, index) {
  return rows.some(row => toDisplayValue(getCell(row, index)) !== '')
}

function buildColumns(rows, mode) {
  const maxWidth = getMaxWidth(rows)
  const headerRow = mode === 'header' ? rows[0] || [] : []
  const columns = []

  for (let index = 0; index < maxWidth; index += 1) {
    if (!hasColumnValue(rows, index)) {
      continue
    }

    const letter = columnIndexToLetter(index)
    const header = mode === 'header' ? toDisplayValue(getCell(headerRow, index)) : letter
    const label = mode === 'header' ? header || `未命名列 ${letter}` : letter

    columns.push({
      index,
      letter,
      header,
      label,
      value: String(index)
    })
  }

  return columns
}

function groupColumnsByNormalizedHeader(columns) {
  return columns.reduce((groups, column) => {
    const key = normalizeHeader(column.header || column.label)

    if (!key) {
      return groups
    }

    if (!groups[key]) {
      groups[key] = []
    }

    groups[key].push(column)
    return groups
  }, {})
}

function buildAutoMappings(leftColumns, rightColumns, mode) {
  if (mode === 'letter') {
    const rightByIndex = rightColumns.reduce((target, column) => {
      target[column.index] = column
      return target
    }, {})

    return leftColumns
      .filter(leftColumn => rightByIndex[leftColumn.index])
      .map(leftColumn => ({
        id: `left-${leftColumn.index}`,
        leftIndex: leftColumn.index,
        rightIndex: rightByIndex[leftColumn.index].index,
        enabled: true
      }))
  }

  const rightGroups = groupColumnsByNormalizedHeader(rightColumns)
  const leftGroups = groupColumnsByNormalizedHeader(leftColumns)
  const mappings = []

  leftColumns.forEach(leftColumn => {
    const key = normalizeHeader(leftColumn.header || leftColumn.label)
    const leftMatches = leftGroups[key] || []
    const rightMatches = rightGroups[key] || []

    if (key && leftMatches.length === 1 && rightMatches.length === 1) {
      mappings.push({
        id: `left-${leftColumn.index}`,
        leftIndex: leftColumn.index,
        rightIndex: rightMatches[0].index,
        enabled: true
      })
    }
  })

  return mappings
}

function findDuplicateRightMappings(mappings) {
  const seen = {}
  const duplicates = new Set()

  mappings
    .filter(mapping => mapping.enabled && mapping.rightIndex !== null && mapping.rightIndex !== undefined && mapping.rightIndex !== '')
    .forEach(mapping => {
      const key = String(mapping.rightIndex)

      if (seen[key]) {
        duplicates.add(Number(mapping.rightIndex))
      } else {
        seen[key] = true
      }
    })

  return Array.from(duplicates)
}

function getDataRows(rows, mode) {
  const offset = mode === 'header' ? 1 : 0

  return rows.slice(offset).map((row, index) => ({
    row,
    rowNumber: offset + index + 1
  }))
}

function buildRowObject(row, columns) {
  return columns.reduce((target, column) => {
    target[column.label] = toDisplayValue(getCell(row, column.index))
    return target
  }, {})
}

function indexRowsByKey(dataRows, keyIndex, sideLabel) {
  const entries = []
  const issueRows = []
  const counts = {}

  dataRows.forEach(item => {
    const keyValue = toDisplayValue(getCell(item.row, keyIndex))

    if (!keyValue) {
      issueRows.push({
        side: sideLabel,
        issueType: `${sideLabel}空 key`,
        keyValue: '',
        rowNumber: item.rowNumber
      })
      return
    }

    entries.push({
      keyValue,
      row: item.row,
      rowNumber: item.rowNumber
    })
    counts[keyValue] = (counts[keyValue] || 0) + 1
  })

  const duplicateKeys = Object.keys(counts).filter(key => counts[key] > 1)
  const duplicateKeySet = new Set(duplicateKeys)

  entries.forEach(entry => {
    if (duplicateKeySet.has(entry.keyValue)) {
      issueRows.push({
        side: sideLabel,
        issueType: `${sideLabel}重复 key`,
        keyValue: entry.keyValue,
        rowNumber: entry.rowNumber
      })
    }
  })

  const uniqueRows = entries.reduce((target, entry) => {
    if (!duplicateKeySet.has(entry.keyValue)) {
      target[entry.keyValue] = entry
    }
    return target
  }, {})

  return {
    uniqueRows,
    duplicateKeys,
    issueRows
  }
}

function getColumnLabel(columns, index) {
  const column = columns.find(item => item.index === index)
  return column ? column.label : columnIndexToLetter(index)
}

function buildColumnLookup(columns) {
  return columns.reduce((target, column) => {
    target[column.index] = column
    return target
  }, {})
}

function buildHorizontalDiffResult(options) {
  const keyMappingId = options.keyMappingId
  const leftColumnByIndex = buildColumnLookup(options.leftColumns || [])
  const rightColumnByIndex = buildColumnLookup(options.rightColumns || [])
  const columns = (options.mappings || [])
    .filter(mapping => mapping.enabled && mapping.id !== keyMappingId)
    .map(mapping => {
      const leftColumn = leftColumnByIndex[mapping.leftIndex]
      const rightColumn = rightColumnByIndex[mapping.rightIndex]

      return {
        id: mapping.id,
        leftIndex: mapping.leftIndex,
        rightIndex: mapping.rightIndex,
        leftLabel: leftColumn ? leftColumn.label : columnIndexToLetter(mapping.leftIndex),
        rightLabel: rightColumn ? rightColumn.label : columnIndexToLetter(mapping.rightIndex),
        label: leftColumn ? leftColumn.label : columnIndexToLetter(mapping.leftIndex)
      }
    })

  const columnByLeftLabel = columns.reduce((target, column) => {
    target[column.leftLabel] = column
    return target
  }, {})
  const columnByRightLabel = columns.reduce((target, column) => {
    target[column.rightLabel] = column
    return target
  }, {})
  const changedColumnIds = new Set()
  const groups = []
  const groupByKey = {}

  ;(options.changedCells || []).forEach(cell => {
    const column = columnByLeftLabel[cell.leftColumn] || columnByRightLabel[cell.rightColumn]

    if (!column) {
      return
    }

    if (!groupByKey[cell.keyValue]) {
      groupByKey[cell.keyValue] = {
        keyValue: cell.keyValue,
        leftRowNumber: cell.leftRowNumber,
        rightRowNumber: cell.rightRowNumber,
        leftValues: {},
        rightValues: {},
        changedColumnIds: new Set()
      }
      groups.push(groupByKey[cell.keyValue])
    }

    const group = groupByKey[cell.keyValue]
    group.leftValues[column.id] = cell.leftValue
    group.rightValues[column.id] = cell.rightValue
    group.changedColumnIds.add(column.id)
    changedColumnIds.add(column.id)
  })

  const rows = []
  groups.forEach(group => {
    const groupChangedColumnIds = Array.from(group.changedColumnIds)

    rows.push({
      rowId: `${group.keyValue}-left`,
      pairId: group.keyValue,
      keyValue: group.keyValue,
      source: 'left',
      sourceLabel: '左边',
      rowNumber: group.leftRowNumber,
      values: group.leftValues,
      changedColumnIds: groupChangedColumnIds
    })
    rows.push({
      rowId: `${group.keyValue}-right`,
      pairId: group.keyValue,
      keyValue: group.keyValue,
      source: 'right',
      sourceLabel: '右边',
      rowNumber: group.rightRowNumber,
      values: group.rightValues,
      changedColumnIds: groupChangedColumnIds
    })
  })

  return {
    columns,
    defaultSelectedColumnIds: columns
      .filter(column => changedColumnIds.has(column.id))
      .map(column => column.id),
    rows
  }
}

function compareRows(options) {
  const enabledMappings = options.mappings.filter(mapping => mapping.enabled)
  const keyMapping = enabledMappings.find(mapping => mapping.id === options.keyMappingId)

  if (!keyMapping) {
    throw new Error('请选择一个已启用的 key 映射')
  }

  const leftIndexed = indexRowsByKey(
    getDataRows(options.leftRows, options.mode),
    keyMapping.leftIndex,
    '左侧'
  )
  const rightIndexed = indexRowsByKey(
    getDataRows(options.rightRows, options.mode),
    keyMapping.rightIndex,
    '右侧'
  )
  const blockedKeys = new Set(leftIndexed.duplicateKeys.concat(rightIndexed.duplicateKeys))
  const changedCells = []
  const leftOnlyRows = []
  const rightOnlyRows = []
  const changedRowKeys = new Set()

  Object.keys(leftIndexed.uniqueRows).forEach(keyValue => {
    if (blockedKeys.has(keyValue)) {
      return
    }

    const leftEntry = leftIndexed.uniqueRows[keyValue]
    const rightEntry = rightIndexed.uniqueRows[keyValue]

    if (!rightEntry) {
      leftOnlyRows.push({
        keyValue,
        rowNumber: leftEntry.rowNumber,
        values: buildRowObject(leftEntry.row, options.leftColumns)
      })
      return
    }

    enabledMappings
      .filter(mapping => mapping.id !== keyMapping.id)
      .forEach(mapping => {
        const leftValue = toDisplayValue(getCell(leftEntry.row, mapping.leftIndex))
        const rightValue = toDisplayValue(getCell(rightEntry.row, mapping.rightIndex))

        if (leftValue !== rightValue) {
          changedRowKeys.add(keyValue)
          changedCells.push({
            keyValue,
            leftRowNumber: leftEntry.rowNumber,
            rightRowNumber: rightEntry.rowNumber,
            leftColumn: getColumnLabel(options.leftColumns, mapping.leftIndex),
            rightColumn: getColumnLabel(options.rightColumns, mapping.rightIndex),
            leftValue,
            rightValue
          })
        }
      })
  })

  Object.keys(rightIndexed.uniqueRows).forEach(keyValue => {
    if (blockedKeys.has(keyValue) || leftIndexed.uniqueRows[keyValue]) {
      return
    }

    const rightEntry = rightIndexed.uniqueRows[keyValue]

    rightOnlyRows.push({
      keyValue,
      rowNumber: rightEntry.rowNumber,
      values: buildRowObject(rightEntry.row, options.rightColumns)
    })
  })

  const issueRows = leftIndexed.issueRows.concat(rightIndexed.issueRows)

  return {
    summary: {
      comparedKeys: Object.keys(leftIndexed.uniqueRows).filter(key => rightIndexed.uniqueRows[key] && !blockedKeys.has(key)).length,
      changedRows: changedRowKeys.size,
      leftOnlyRows: leftOnlyRows.length,
      rightOnlyRows: rightOnlyRows.length,
      issueRows: issueRows.length
    },
    changedCells,
    leftOnlyRows,
    rightOnlyRows,
    issueRows
  }
}

module.exports = {
  columnIndexToLetter,
  normalizeHeader,
  toDisplayValue,
  buildColumns,
  buildAutoMappings,
  findDuplicateRightMappings,
  buildHorizontalDiffResult,
  compareRows
}
