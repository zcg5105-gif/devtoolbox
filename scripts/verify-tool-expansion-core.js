const assert = require('assert')
const core = require('../src/utils/toolExpansionCore')

function run() {
  assert.strictEqual(core.escapeHtml('<div class="x">&</div>'), '&lt;div class=&quot;x&quot;&gt;&amp;&lt;/div&gt;')
  assert.strictEqual(core.decodeHtmlEntities('&lt;strong&gt;&#x4F60;&#22909;&lt;/strong&gt;'), '<strong>你好</strong>')
  assert.strictEqual(core.encodeUnicodeEntities('a你好'), 'a&#x4F60;&#x597D;')

  const parsed = core.parseUrlInput('example.com/path?b=2&a=1&a=3#top')
  assert.strictEqual(parsed.assumedProtocol, true)
  assert.strictEqual(parsed.parts.host, 'example.com')
  assert.deepStrictEqual(parsed.params.map(item => `${item.key}=${item.value}`), ['b=2', 'a=1', 'a=3'])
  assert.strictEqual(
    core.buildUrlFromParts(parsed.parts, parsed.params),
    'https://example.com/path?b=2&a=1&a=3#top'
  )
  assert.deepStrictEqual(core.compareQueryParams('https://a.test/?x=1&y=2', 'https://a.test/?x=9&z=3').changed.map(item => item.key), ['x'])

  const stats = core.analyzeText('Hello hello 你好\n123', { caseInsensitive: true, ignorePunctuation: true })
  assert.strictEqual(stats.characters, 18)
  assert.strictEqual(stats.lines, 2)
  assert.strictEqual(stats.chineseCharacters, 2)
  assert.strictEqual(stats.digits, 3)
  assert.strictEqual(stats.topWords[0].word, 'hello')
  assert.strictEqual(stats.topWords[0].count, 2)

  assert.strictEqual(core.normalizeBase64Input('abc', 'image/png'), 'data:image/png;base64,abc')
  assert.strictEqual(core.normalizeBase64Input('data:image/jpeg;base64,abc', 'image/png'), 'data:image/jpeg;base64,abc')

  assert.match(core.generateUuidV4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  const ulid = core.generateUlid(new Date('2024-01-02T03:04:05.000Z'))
  assert.strictEqual(core.parseUlidTimestamp(ulid).toISOString(), '2024-01-02T03:04:05.000Z')
  const snowflake = core.generateSnowflakeId({
    timestampMs: Date.parse('2024-01-02T03:04:05.000Z'),
    epochMs: Date.parse('2020-01-01T00:00:00.000Z'),
    workerId: 7,
    sequence: 9
  })
  const parsedSnowflake = core.parseSnowflakeId(snowflake, Date.parse('2020-01-01T00:00:00.000Z'))
  assert.strictEqual(parsedSnowflake.workerId, 7)
  assert.strictEqual(parsedSnowflake.sequence, 9)

  const validJwt = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'u1', iss: 'dev', aud: 'web', iat: 1700000000, exp: 1893456000 })).toString('base64url'),
    ''
  ].join('.')
  const jwtRows = core.parseJwtBatch(`${validJwt}\ninvalid`, Date.parse('2024-01-01T00:00:00.000Z'))
  assert.strictEqual(jwtRows[0].status, 'valid')
  assert.strictEqual(jwtRows[1].status, 'invalid')

  const mockRows = core.generateMockRows({ count: 2, fields: ['name', 'mobile', 'email', 'uuid'] })
  assert.strictEqual(mockRows.length, 2)
  assert.ok(mockRows[0].name)
  assert.ok(mockRows[0].mobile)

  const logs = core.parseLogs('{"level":"error","message":"boom","time":"2024-01-01"}\nINFO started\n  at demo.App', { mode: 'auto' })
  assert.strictEqual(logs[0].level, 'error')
  assert.strictEqual(logs[1].level, 'info')
  assert.strictEqual(core.filterLogRows(logs, { keyword: 'boom', levels: ['error'] }).length, 1)
}

run()
console.log('toolExpansionCore verification passed')
