/* global BigInt */

const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const HTML_ENTITY_MAP = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }
const SNOWFLAKE_DEFAULT_EPOCH = Date.parse('2020-01-01T00:00:00.000Z')
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const SAMPLE_NAMES = ['张伟', '王芳', '李娜', '刘洋', '陈晨', '杨帆', '赵敏', '周杰']
const SAMPLE_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉']
const SAMPLE_STREETS = ['人民路', '中山路', '解放路', '建设路', '科技园', '软件大道']
const SAMPLE_DOMAINS = ['example.com', 'devtoolbox.test', 'mail.test']

function toText(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function escapeHtml(text) {
  return toText(text).replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char])
}

function decodeHtmlEntities(text) {
  return toText(text).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.charAt(0) === '#') {
      const isHex = entity.charAt(1).toLowerCase() === 'x'
      const codePoint = parseInt(isHex ? entity.slice(2) : entity.slice(1), isHex ? 16 : 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    }

    return Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, entity)
      ? HTML_ENTITY_MAP[entity]
      : match
  })
}

function encodeUnicodeEntities(text) {
  return Array.from(toText(text)).map(char => {
    return char.charCodeAt(0) > 127
      ? `&#x${char.codePointAt(0).toString(16).toUpperCase()};`
      : char
  }).join('')
}

function parseUrlInput(text) {
  const source = toText(text).trim()
  const assumedProtocol = !/^[a-z][a-z\d+.-]*:\/\//i.test(source)
  const parseTarget = assumedProtocol ? `https://${source}` : source

  try {
    const url = new URL(parseTarget)
    const params = []

    url.searchParams.forEach((value, key) => {
      params.push({
        id: `${key}_${params.length}`,
        enabled: true,
        key,
        value
      })
    })

    return {
      assumedProtocol,
      parts: {
        protocol: url.protocol.replace(/:$/, ''),
        host: url.host,
        pathname: url.pathname,
        hash: url.hash.replace(/^#/, '')
      },
      params,
      errorMessage: ''
    }
  } catch (error) {
    return {
      assumedProtocol,
      parts: {
        protocol: '',
        host: '',
        pathname: '',
        hash: ''
      },
      params: [],
      errorMessage: `URL 解析失败：${error.message}`
    }
  }
}

function buildUrlFromParts(parts, params) {
  const protocol = parts.protocol || 'https'
  const path = parts.pathname && parts.pathname.startsWith('/') ? parts.pathname : `/${parts.pathname || ''}`
  const searchParams = new URLSearchParams()

  params
    .filter(param => param.enabled !== false && toText(param.key).trim())
    .forEach(param => {
      searchParams.append(toText(param.key).trim(), toText(param.value))
    })

  const query = searchParams.toString()
  const hash = parts.hash ? `#${parts.hash}` : ''

  return `${protocol}://${parts.host || ''}${path}${query ? `?${query}` : ''}${hash}`
}

function indexedParams(params) {
  const counts = {}

  return params.reduce((target, param) => {
    const count = counts[param.key] || 0
    counts[param.key] = count + 1
    target[`${param.key}\u0000${count}`] = param
    return target
  }, {})
}

function compareQueryParams(leftUrl, rightUrl) {
  const left = parseUrlInput(leftUrl)
  const right = parseUrlInput(rightUrl)
  const leftMap = indexedParams(left.params)
  const rightMap = indexedParams(right.params)
  const onlyInLeft = []
  const onlyInRight = []
  const changed = []

  Object.keys(leftMap).forEach(id => {
    const leftParam = leftMap[id]
    const rightParam = rightMap[id]

    if (!rightParam) {
      onlyInLeft.push(leftParam)
      return
    }

    if (leftParam.value !== rightParam.value) {
      changed.push({
        key: leftParam.key,
        leftValue: leftParam.value,
        rightValue: rightParam.value
      })
    }
  })

  Object.keys(rightMap).forEach(id => {
    if (!leftMap[id]) {
      onlyInRight.push(rightMap[id])
    }
  })

  return {
    onlyInLeft,
    onlyInRight,
    changed,
    errors: [left.errorMessage, right.errorMessage].filter(Boolean)
  }
}

function analyzeText(text, options = {}) {
  const source = toText(text)
  const lines = source ? source.split(/\r\n|\r|\n/) : []
  const nonEmptyLines = lines.filter(line => line.trim()).length
  const withoutWhitespace = source.replace(/\s/g, '')
  const normalized = options.caseInsensitive ? source.toLowerCase() : source
  const wordSource = options.ignorePunctuation ? normalized.replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') : normalized
  const words = wordSource.match(/[a-zA-Z]+(?:'[a-zA-Z]+)?/g) || []
  const wordCounts = words.reduce((counts, word) => {
    counts[word] = (counts[word] || 0) + 1
    return counts
  }, {})
  const topWords = Object.keys(wordCounts)
    .map(word => ({ word, count: wordCounts[word] }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 20)

  return {
    characters: Array.from(source).length,
    charactersNoWhitespace: Array.from(withoutWhitespace).length,
    bytes: typeof Blob !== 'undefined' ? new Blob([source]).size : Buffer.byteLength(source, 'utf8'),
    lines: lines.length,
    nonEmptyLines,
    words: words.length,
    chineseCharacters: (source.match(/[\u4e00-\u9fa5]/g) || []).length,
    englishLetters: (source.match(/[a-zA-Z]/g) || []).length,
    digits: (source.match(/\d/g) || []).length,
    whitespace: (source.match(/\s/g) || []).length,
    topWords
  }
}

function normalizeBase64Input(text, mimeType) {
  const value = toText(text).trim()

  if (!value || /^data:[^;]+;base64,/i.test(value)) {
    return value
  }

  return `data:${mimeType || 'image/png'};base64,${value}`
}

function getRandomBytes(length) {
  const bytes = new Uint8Array(length)

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
    return bytes
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256)
  }

  return bytes
}

function getRandomInt(max) {
  return getRandomBytes(1)[0] % max
}

function generateUuidV4() {
  const bytes = getRandomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0'))

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-')
}

function encodeUlidTime(timestampMs) {
  let value = timestampMs
  const chars = Array(10)

  for (let index = 9; index >= 0; index -= 1) {
    chars[index] = CROCKFORD[value % 32]
    value = Math.floor(value / 32)
  }

  return chars.join('')
}

function decodeUlidTime(value) {
  const chars = toText(value).trim().toUpperCase().slice(0, 10)

  if (chars.length !== 10 || !Array.from(chars).every(char => CROCKFORD.includes(char))) {
    return null
  }

  return Array.from(chars).reduce((timestamp, char) => timestamp * 32 + CROCKFORD.indexOf(char), 0)
}

function generateUlid(date = new Date()) {
  const time = encodeUlidTime(date.getTime())
  const randomBytes = getRandomBytes(10)
  let random = ''

  for (let index = 0; index < 16; index += 1) {
    random += CROCKFORD[randomBytes[index % randomBytes.length] % 32]
  }

  return `${time}${random}`
}

function parseUlidTimestamp(ulid) {
  const timestamp = decodeUlidTime(ulid)
  return timestamp === null ? null : new Date(timestamp)
}

function generateSnowflakeId(options = {}) {
  const epochMs = BigInt(options.epochMs || SNOWFLAKE_DEFAULT_EPOCH)
  const timestampMs = BigInt(options.timestampMs || Date.now())
  const workerId = BigInt(options.workerId || 0) & 1023n
  const sequence = BigInt(options.sequence || 0) & 4095n

  return (((timestampMs - epochMs) << 22n) | (workerId << 12n) | sequence).toString()
}

function parseSnowflakeId(id, epochMs = SNOWFLAKE_DEFAULT_EPOCH) {
  try {
    const value = BigInt(toText(id))
    const timestampMs = Number((value >> 22n) + BigInt(epochMs))

    return {
      timestampMs,
      date: new Date(timestampMs),
      workerId: Number((value >> 12n) & 1023n),
      sequence: Number(value & 4095n),
      errorMessage: ''
    }
  } catch (error) {
    return {
      timestampMs: null,
      date: null,
      workerId: null,
      sequence: null,
      errorMessage: 'Snowflake ID 解析失败'
    }
  }
}

function decodeBase64Url(value) {
  const normalized = toText(value).replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8')
  }

  return decodeURIComponent(Array.from(atob(padded)).map(char => {
    return `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`
  }).join(''))
}

function parseJwtTime(value) {
  return typeof value === 'number' ? new Date(value * 1000).toISOString() : ''
}

function getJwtStatus(payload, nowMs) {
  if (payload.nbf && payload.nbf * 1000 > nowMs) {
    return 'not-before'
  }
  if (!payload.exp) {
    return 'missing exp'
  }
  if (payload.exp * 1000 < nowMs) {
    return 'expired'
  }
  return 'valid'
}

function parseJwtBatch(text, nowMs = Date.now()) {
  return toText(text).split(/\r\n|\r|\n/).filter(line => line.trim()).map((token, index) => {
    const parts = token.trim().split('.')

    try {
      if (parts.length < 2) {
        throw new Error('Invalid JWT structure')
      }

      const header = JSON.parse(decodeBase64Url(parts[0]))
      const payload = JSON.parse(decodeBase64Url(parts[1]))

      return {
        index: index + 1,
        token,
        validStructure: true,
        algorithm: header.alg || '',
        subject: payload.sub || '',
        issuer: payload.iss || '',
        audience: Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud || '',
        issuedAt: parseJwtTime(payload.iat),
        expiration: parseJwtTime(payload.exp),
        status: getJwtStatus(payload, nowMs),
        header,
        payload,
        errorMessage: ''
      }
    } catch (error) {
      return {
        index: index + 1,
        token,
        validStructure: false,
        algorithm: '',
        subject: '',
        issuer: '',
        audience: '',
        issuedAt: '',
        expiration: '',
        status: 'invalid',
        header: null,
        payload: null,
        errorMessage: error.message
      }
    }
  })
}

function randomFrom(list) {
  return list[getRandomInt(list.length)]
}

function generateMobile() {
  let suffix = ''

  for (let index = 0; index < 8; index += 1) {
    suffix += getRandomInt(10)
  }

  return `13${suffix}`
}

function generateMockRows(options = {}) {
  const count = Math.max(0, Math.min(Number(options.count) || 0, 1000))
  const fields = Array.isArray(options.fields) && options.fields.length ? options.fields : ['name', 'mobile', 'email', 'city']
  const rows = []

  for (let index = 0; index < count; index += 1) {
    const row = {}

    fields.forEach(field => {
      if (field === 'name') row.name = randomFrom(SAMPLE_NAMES)
      if (field === 'mobile') row.mobile = generateMobile()
      if (field === 'email') row.email = `user${index + 1}@${randomFrom(SAMPLE_DOMAINS)}`
      if (field === 'city') row.city = randomFrom(SAMPLE_CITIES)
      if (field === 'address') row.address = `${randomFrom(SAMPLE_CITIES)}${randomFrom(SAMPLE_STREETS)}${getRandomInt(200) + 1}号`
      if (field === 'date') row.date = new Date(Date.now() - getRandomInt(365) * 86400000).toISOString().slice(0, 10)
      if (field === 'number') row.number = getRandomInt(10000)
      if (field === 'boolean') row.boolean = getRandomInt(2) === 1
      if (field === 'uuid') row.uuid = generateUuidV4()
    })

    rows.push(row)
  }

  return rows
}

function detectLevel(text) {
  const match = toText(text).match(/\b(error|warn|warning|info|debug|trace)\b/i)

  if (!match) return 'other'
  return match[1].toLowerCase() === 'warning' ? 'warn' : match[1].toLowerCase()
}

function parseLogLine(line, lineNumber, mode) {
  if ((mode === 'auto' || mode === 'jsonLines') && line.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(line)
      return {
        lineNumber,
        level: detectLevel(parsed.level || parsed.severity || parsed.message || line),
        time: parsed.time || parsed.timestamp || parsed.date || '',
        message: parsed.message || parsed.msg || line,
        raw: line,
        data: parsed
      }
    } catch (error) {
      if (mode === 'jsonLines') {
        return {
          lineNumber,
          level: 'error',
          time: '',
          message: `JSON 解析失败：${error.message}`,
          raw: line,
          data: null
        }
      }
    }
  }

  return {
    lineNumber,
    level: detectLevel(line),
    time: (line.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/) || [''])[0],
    message: line.trim(),
    raw: line,
    data: null
  }
}

function parseLogs(text, options = {}) {
  const mode = options.mode || 'auto'
  const rows = []

  toText(text).split(/\r\n|\r|\n/).forEach((line, index) => {
    const isContinuation = /^\s+at\s+/.test(line) || /^\s*\.\.\.\s+\d+\s+more/.test(line)

    if ((mode === 'javaStack' || mode === 'auto') && isContinuation && rows.length) {
      const previous = rows[rows.length - 1]
      previous.message = `${previous.message}\n${line.trim()}`
      previous.raw = `${previous.raw}\n${line}`
      return
    }

    if (!line.trim()) {
      return
    }

    rows.push(parseLogLine(line, index + 1, mode))
  })

  return rows
}

function filterLogRows(rows, filters = {}) {
  const keyword = toText(filters.keyword).toLowerCase()
  const levels = Array.isArray(filters.levels) && filters.levels.length ? filters.levels : []

  return rows.filter(row => {
    const matchesKeyword = !keyword || `${row.message}\n${row.raw}`.toLowerCase().includes(keyword)
    const matchesLevel = !levels.length || levels.includes(row.level)
    return matchesKeyword && matchesLevel
  })
}

module.exports = {
  escapeHtml,
  decodeHtmlEntities,
  encodeUnicodeEntities,
  parseUrlInput,
  buildUrlFromParts,
  compareQueryParams,
  analyzeText,
  normalizeBase64Input,
  generateUuidV4,
  generateUlid,
  parseUlidTimestamp,
  generateSnowflakeId,
  parseSnowflakeId,
  parseJwtBatch,
  generateMockRows,
  parseLogs,
  filterLogRows
}
