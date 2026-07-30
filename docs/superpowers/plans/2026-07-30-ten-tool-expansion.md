# Ten Tool Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ten browser-only developer utility tools to DevToolbox on top of `feature/excel-data-compare`.

**Architecture:** Put deterministic non-UI logic in `src/utils/toolExpansionCore.js` and verify it with `scripts/verify-tool-expansion-core.js`. Keep each tool page as a focused Vue 2 SFC under `src/views/tools`, using Element UI and scoped SCSS. Register all routes and home/sidebar cards after both batches are implemented.

**Tech Stack:** Vue 2 Options API, Element UI 2, scoped SCSS, `js-yaml`, `jsonpath-plus`, Node `assert`, existing `npm run lint` and `npm run build`.

## Global Constraints

- No backend services.
- No user data upload to external services.
- Use Vue 2 Options API.
- Use Element UI components.
- Use scoped SCSS and existing theme CSS variables.
- Keep new dependencies minimal.
- Register every tool in `src/router/index.js` and `src/config/tools.js`.
- Prefer pure utility helpers only when logic is shared or worth direct script verification.
- Keep each tool page self-contained when the logic is page-specific.
- Added dependencies are limited to `js-yaml` and `jsonpath-plus`; adding any other dependency requires updating the spec and getting review approval first.

---

## File Structure

- Create `src/utils/toolExpansionCore.js`: CommonJS utility functions for HTML entities, URL param parsing/comparison, text stats, image Base64 helpers, ID generation/parsing, JWT batch parsing, mock data, and log parsing.
- Create `scripts/verify-tool-expansion-core.js`: Node assertions for all deterministic core helpers.
- Create Batch 1 pages:
  - `src/views/tools/YamlJsonConverter.vue`
  - `src/views/tools/HtmlEntityCodec.vue`
  - `src/views/tools/UrlParamsTool.vue`
  - `src/views/tools/TextStats.vue`
  - `src/views/tools/ImageBase64.vue`
- Create Batch 2 pages:
  - `src/views/tools/PathTester.vue`
  - `src/views/tools/IdGenerator.vue`
  - `src/views/tools/JwtBatchChecker.vue`
  - `src/views/tools/MockDataGenerator.vue`
  - `src/views/tools/LogViewer.vue`
- Modify `src/router/index.js`: add lazy imports and routes for all ten tools.
- Modify `src/config/tools.js`: add all ten tool cards in the categories named in the spec.
- Modify `package.json` and `package-lock.json`: install `js-yaml` and `jsonpath-plus`.

---

### Task 1: Dependencies and Verifiable Core Helpers

**Files:**
- Create: `src/utils/toolExpansionCore.js`
- Create: `scripts/verify-tool-expansion-core.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces from `src/utils/toolExpansionCore.js`:
  - `escapeHtml(text: unknown): string`
  - `decodeHtmlEntities(text: unknown): string`
  - `encodeUnicodeEntities(text: unknown): string`
  - `parseUrlInput(text: string): ParsedUrlResult`
  - `buildUrlFromParts(parts: UrlParts, params: Array<QueryParam>): string`
  - `compareQueryParams(leftUrl: string, rightUrl: string): UrlCompareResult`
  - `analyzeText(text: string, options: TextStatsOptions): TextStatsResult`
  - `normalizeBase64Input(text: string, mimeType: string): string`
  - `generateUuidV4(): string`
  - `generateUlid(date?: Date): string`
  - `parseUlidTimestamp(ulid: string): Date | null`
  - `generateSnowflakeId(options: SnowflakeOptions): string`
  - `parseSnowflakeId(id: string, epochMs: number): SnowflakeParseResult`
  - `parseJwtBatch(text: string, nowMs?: number): Array<JwtBatchRow>`
  - `generateMockRows(options: MockOptions): Array<object>`
  - `parseLogs(text: string, options: LogParseOptions): Array<LogRow>`
  - `filterLogRows(rows: Array<LogRow>, filters: LogFilterOptions): Array<LogRow>`

- Consumes: no project-local code.

- [ ] **Step 1: Install approved dependencies**

Run:

```bash
npm install js-yaml jsonpath-plus --registry=https://registry.npmjs.org
```

Expected: command exits `0`; `package.json` contains `js-yaml` and `jsonpath-plus`.

- [ ] **Step 2: Write failing verification script**

Create `scripts/verify-tool-expansion-core.js` with assertions covering:

```js
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

  const stats = core.analyzeText('Hello hello 你好\\n123', { caseInsensitive: true, ignorePunctuation: true })
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
  const snowflake = core.generateSnowflakeId({ timestampMs: Date.parse('2024-01-02T03:04:05.000Z'), epochMs: Date.parse('2020-01-01T00:00:00.000Z'), workerId: 7, sequence: 9 })
  const parsedSnowflake = core.parseSnowflakeId(snowflake, Date.parse('2020-01-01T00:00:00.000Z'))
  assert.strictEqual(parsedSnowflake.workerId, 7)
  assert.strictEqual(parsedSnowflake.sequence, 9)

  const validJwt = [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'u1', iss: 'dev', aud: 'web', iat: 1700000000, exp: 1893456000 })).toString('base64url'),
    ''
  ].join('.')
  const jwtRows = core.parseJwtBatch(`${validJwt}\\ninvalid`, Date.parse('2024-01-01T00:00:00.000Z'))
  assert.strictEqual(jwtRows[0].status, 'valid')
  assert.strictEqual(jwtRows[1].status, 'invalid')

  const mockRows = core.generateMockRows({ count: 2, fields: ['name', 'mobile', 'email', 'uuid'] })
  assert.strictEqual(mockRows.length, 2)
  assert.ok(mockRows[0].name)
  assert.ok(mockRows[0].mobile)

  const logs = core.parseLogs('{"level":"error","message":"boom","time":"2024-01-01"}\\nINFO started\\n  at demo.App', { mode: 'auto' })
  assert.strictEqual(logs[0].level, 'error')
  assert.strictEqual(logs[1].level, 'info')
  assert.strictEqual(core.filterLogRows(logs, { keyword: 'boom', levels: ['error'] }).length, 1)
}

run()
console.log('toolExpansionCore verification passed')
```

- [ ] **Step 3: Run script and verify it fails because the module does not exist**

Run:

```bash
node scripts/verify-tool-expansion-core.js
```

Expected: fails with `Cannot find module '../src/utils/toolExpansionCore'`.

- [ ] **Step 4: Implement `src/utils/toolExpansionCore.js`**

Implement the functions listed in the Interfaces block. Use only browser/Node standard APIs and deterministic data arrays. Required implementation details:

```js
const HTML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const SNOWFLAKE_DEFAULT_EPOCH = Date.parse('2020-01-01T00:00:00.000Z')
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
```

Use CommonJS:

```js
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
```

Implementation rules:

- `decodeHtmlEntities` must decode named entities `amp`, `lt`, `gt`, `quot`, `apos`, `nbsp`, decimal entities, and hex entities without using DOM APIs so Node verification works.
- `parseUrlInput` must return `{ assumedProtocol, parts, params, errorMessage }`.
- `compareQueryParams` must compare repeated keys by `key + '\u0000' + occurrenceIndex`.
- `generateUuidV4` must prefer `crypto.getRandomValues` when available and fallback to `Math.random` only if crypto is unavailable.
- `parseJwtBatch` must never throw for malformed tokens; malformed rows return `status: 'invalid'`.
- `parseLogs` must preserve original line text and line numbers.

- [ ] **Step 5: Run verification script**

Run:

```bash
node scripts/verify-tool-expansion-core.js
```

Expected:

```text
toolExpansionCore verification passed
```

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 7: Commit**

Run:

```bash
git add package.json package-lock.json src/utils/toolExpansionCore.js scripts/verify-tool-expansion-core.js
git commit -m "feat: add shared tool expansion core"
```

---

### Task 2: Batch 1 Tool Pages

**Files:**
- Create: `src/views/tools/YamlJsonConverter.vue`
- Create: `src/views/tools/HtmlEntityCodec.vue`
- Create: `src/views/tools/UrlParamsTool.vue`
- Create: `src/views/tools/TextStats.vue`
- Create: `src/views/tools/ImageBase64.vue`

**Interfaces:**
- Consumes from Task 1:
  - `escapeHtml`, `decodeHtmlEntities`, `encodeUnicodeEntities`
  - `parseUrlInput`, `buildUrlFromParts`, `compareQueryParams`
  - `analyzeText`
  - `normalizeBase64Input`
- Consumes dependencies:
  - `import yaml from 'js-yaml'`
- Produces five Vue SFCs with `name` values:
  - `YamlJsonConverter`
  - `HtmlEntityCodec`
  - `UrlParamsTool`
  - `TextStats`
  - `ImageBase64`

- [ ] **Step 1: Create `YamlJsonConverter.vue`**

Implement a page with:

- Header title `YAML / JSON 转换器`.
- `mode` radio group values `yamlToJson` and `jsonToYaml`.
- Source textarea seeded with:

```yaml
name: DevToolbox
enabled: true
items:
  - json
  - yaml
```

- Output textarea.
- Methods:
  - `convert()`
  - `copyOutput()`
  - `clearAll()`
- `convert()` uses:

```js
const parsed = this.mode === 'yamlToJson'
  ? yaml.load(this.sourceText)
  : JSON.parse(this.sourceText)
this.outputText = this.mode === 'yamlToJson'
  ? JSON.stringify(parsed, null, 2)
  : yaml.dump(parsed, { noRefs: true })
```

- Show `errorMessage` in an `el-alert`.
- Use a two-pane responsive grid and scoped styles matching existing converter pages.

- [ ] **Step 2: Create `HtmlEntityCodec.vue`**

Implement a page with:

- Header title `HTML 实体编解码`.
- `mode` radio group values `escape`, `unescape`, `unicode`.
- Source textarea seeded with `<span title="DevToolbox">你好 & hello</span>`.
- Computed `outputText` using core helpers.
- Copy and clear buttons.
- Character count labels for source and output.

- [ ] **Step 3: Create `UrlParamsTool.vue`**

Implement a page with:

- Header title `URL 参数解析与对比`.
- Main URL input seeded with `https://example.com/api/users?page=1&size=20#list`.
- Parsed component fields.
- Query parameter table with `enabled`, `key`, `value`, delete button.
- Compare URL input seeded with `https://example.com/api/users?page=2&debug=true#list`.
- Actions:
  - `parseMainUrl()`
  - `addParam()`
  - `removeParam(index)`
  - `sortParams()`
  - `rebuildUrl()`
  - `copyBuiltUrl()`
  - `compareUrls()`
- Use `parseUrlInput`, `buildUrlFromParts`, and `compareQueryParams`.
- Preserve repeated query rows.

- [ ] **Step 4: Create `TextStats.vue`**

Implement a page with:

- Header title `文本统计分析`.
- Textarea seeded with `Hello hello DevToolbox\n你好 123`.
- Options checkboxes `caseInsensitive` and `ignorePunctuation`.
- Summary cards from `analyzeText`.
- Top word frequency table.
- Copy summary button that copies a newline-separated summary.

- [ ] **Step 5: Create `ImageBase64.vue`**

Implement a page with:

- Header title `图片 Base64 转换`.
- Upload control accepting `image/*`.
- Data URL textarea.
- Reverse input textarea.
- MIME select with `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/svg+xml`.
- Preview image for generated or pasted Data URL.
- Stats: file name, MIME, file size, Base64 length, dimensions.
- Methods:
  - `handleFileChange(file)`
  - `readImageSize(dataUrl)`
  - `normalizeReverseInput()`
  - `copyDataUrl()`
  - `downloadDecodedImage()`
  - `clearAll()`

- [ ] **Step 6: Verify Batch 1**

Run:

```bash
node scripts/verify-tool-expansion-core.js
npm run lint
npm run build
```

Expected:

- Core script prints `toolExpansionCore verification passed`.
- Lint exits `0`.
- Build exits `0`; asset-size warnings are acceptable.

- [ ] **Step 7: Commit Batch 1**

Run:

```bash
git add src/views/tools/YamlJsonConverter.vue src/views/tools/HtmlEntityCodec.vue src/views/tools/UrlParamsTool.vue src/views/tools/TextStats.vue src/views/tools/ImageBase64.vue
git commit -m "feat: add first batch utility tools"
```

---

### Task 3: Batch 2 Tool Pages

**Files:**
- Create: `src/views/tools/PathTester.vue`
- Create: `src/views/tools/IdGenerator.vue`
- Create: `src/views/tools/JwtBatchChecker.vue`
- Create: `src/views/tools/MockDataGenerator.vue`
- Create: `src/views/tools/LogViewer.vue`

**Interfaces:**
- Consumes from Task 1:
  - `generateUuidV4`, `generateUlid`, `parseUlidTimestamp`, `generateSnowflakeId`, `parseSnowflakeId`
  - `parseJwtBatch`
  - `generateMockRows`
  - `parseLogs`, `filterLogRows`
- Consumes dependency:
  - `import { JSONPath } from 'jsonpath-plus'`
- Produces five Vue SFCs with `name` values:
  - `PathTester`
  - `IdGenerator`
  - `JwtBatchChecker`
  - `MockDataGenerator`
  - `LogViewer`

- [ ] **Step 1: Create `PathTester.vue`**

Implement a page with:

- Header title `JSONPath / XPath 测试器`.
- Mode radio values `jsonpath` and `xpath`.
- Source textarea seeded with JSON sample for JSONPath mode and XML sample for XPath mode.
- Expression input seeded with `$.users[*].name` or `//user/name/text()`.
- Result pane as JSON text.
- Methods:
  - `runQuery()`
  - `runJsonPath()`
  - `runXPath()`
  - `copyResult()`
- XPath implementation uses:

```js
const parser = new DOMParser()
const doc = parser.parseFromString(this.sourceText, 'application/xml')
const result = doc.evaluate(this.expression, doc, null, XPathResult.ANY_TYPE, null)
```

- Convert XPath iterator/snapshot/string/number/boolean results to displayable values.

- [ ] **Step 2: Create `IdGenerator.vue`**

Implement a page with:

- Header title `ID 生成与解析`.
- Mode select values `uuid`, `ulid`, `snowflake`.
- Batch count input capped at 100.
- Generate button.
- Result table with copy buttons.
- Parser panel with ID input and type select.
- Default Snowflake epoch `2020-01-01T00:00:00.000Z`.
- Use core ID helpers.

- [ ] **Step 3: Create `JwtBatchChecker.vue`**

Implement a page with:

- Header title `JWT 批量检查`.
- Textarea accepting one JWT per line.
- Parse button.
- Result table with status tags.
- Detail drawer or side panel showing decoded header/payload JSON for selected row.
- Export CSV button using local Blob download.
- Use `parseJwtBatch`.
- Show disclaimer text in page description: `仅解析 Header/Payload，不验证签名。`

- [ ] **Step 4: Create `MockDataGenerator.vue`**

Implement a page with:

- Header title `Mock 数据生成器`.
- Count input capped at 1000.
- Multi-select fields seeded with `name`, `mobile`, `email`, `city`.
- Generate button.
- JSON output textarea.
- Copy and download JSON buttons.
- Use `generateMockRows`.

- [ ] **Step 5: Create `LogViewer.vue`**

Implement a page with:

- Header title `日志格式化查看器`.
- Mode select values `auto`, `jsonLines`, `plain`, `javaStack`.
- Log textarea seeded with a JSON line, an INFO line, and a Java stack continuation.
- Keyword filter input.
- Level checkbox group values `error`, `warn`, `info`, `debug`, `trace`, `other`.
- Parsed table with line number, level, time, message.
- Detail preview for selected row.
- Copy filtered logs button.
- Use `parseLogs` and `filterLogRows`.

- [ ] **Step 6: Verify Batch 2**

Run:

```bash
node scripts/verify-tool-expansion-core.js
npm run lint
npm run build
```

Expected:

- Core script prints `toolExpansionCore verification passed`.
- Lint exits `0`.
- Build exits `0`; asset-size warnings are acceptable.

- [ ] **Step 7: Commit Batch 2**

Run:

```bash
git add src/views/tools/PathTester.vue src/views/tools/IdGenerator.vue src/views/tools/JwtBatchChecker.vue src/views/tools/MockDataGenerator.vue src/views/tools/LogViewer.vue
git commit -m "feat: add second batch utility tools"
```

---

### Task 4: Route and Tool Registry Integration

**Files:**
- Modify: `src/router/index.js`
- Modify: `src/config/tools.js`

**Interfaces:**
- Consumes all ten SFCs from Tasks 2 and 3.
- Produces all ten routes and homepage/sidebar/search cards.

- [ ] **Step 1: Add route imports**

Add lazy imports to `src/router/index.js`:

```js
const YamlJsonConverter = () => import(/* webpackChunkName: "tool-yaml-json" */ '../views/tools/YamlJsonConverter.vue')
const HtmlEntityCodec = () => import(/* webpackChunkName: "tool-html-entity" */ '../views/tools/HtmlEntityCodec.vue')
const UrlParamsTool = () => import(/* webpackChunkName: "tool-url-params" */ '../views/tools/UrlParamsTool.vue')
const TextStats = () => import(/* webpackChunkName: "tool-text-stats" */ '../views/tools/TextStats.vue')
const ImageBase64 = () => import(/* webpackChunkName: "tool-image-base64" */ '../views/tools/ImageBase64.vue')
const PathTester = () => import(/* webpackChunkName: "tool-path-tester" */ '../views/tools/PathTester.vue')
const IdGenerator = () => import(/* webpackChunkName: "tool-id-generator" */ '../views/tools/IdGenerator.vue')
const JwtBatchChecker = () => import(/* webpackChunkName: "tool-jwt-batch" */ '../views/tools/JwtBatchChecker.vue')
const MockDataGenerator = () => import(/* webpackChunkName: "tool-mock-data" */ '../views/tools/MockDataGenerator.vue')
const LogViewer = () => import(/* webpackChunkName: "tool-log-viewer" */ '../views/tools/LogViewer.vue')
```

- [ ] **Step 2: Add route entries**

Add route entries to `routes`:

```js
{ path: '/tool/yaml-json', name: 'YamlJsonConverter', component: YamlJsonConverter },
{ path: '/tool/html-entity', name: 'HtmlEntityCodec', component: HtmlEntityCodec },
{ path: '/tool/url-params', name: 'UrlParamsTool', component: UrlParamsTool },
{ path: '/tool/text-stats', name: 'TextStats', component: TextStats },
{ path: '/tool/image-base64', name: 'ImageBase64', component: ImageBase64 },
{ path: '/tool/path-tester', name: 'PathTester', component: PathTester },
{ path: '/tool/id-generator', name: 'IdGenerator', component: IdGenerator },
{ path: '/tool/jwt-batch', name: 'JwtBatchChecker', component: JwtBatchChecker },
{ path: '/tool/mock-data', name: 'MockDataGenerator', component: MockDataGenerator },
{ path: '/tool/log-viewer', name: 'LogViewer', component: LogViewer }
```

- [ ] **Step 3: Add tool cards**

Add entries to `src/config/tools.js`:

```js
// 数据格式与转换
{ name: 'YAML / JSON 转换器', path: '/tool/yaml-json', icon: 'el-icon-tickets', description: 'YAML 与 JSON 双向转换，支持格式化、复制和错误提示。', tags: ['yaml', 'json', 'convert', 'format'] }
{ name: 'JSONPath / XPath 测试器', path: '/tool/path-tester', icon: 'el-icon-search', description: '对 JSON 和 XML 运行路径表达式，快速查看匹配结果。', tags: ['jsonpath', 'xpath', 'json', 'xml', 'query'] }

// 文本处理与文档
{ name: 'HTML 实体编解码', path: '/tool/html-entity', icon: 'el-icon-document', description: 'HTML 实体转义、反转义和 Unicode 数字实体编码。', tags: ['html', 'entity', 'escape', 'unicode'] }
{ name: '文本统计分析', path: '/tool/text-stats', icon: 'el-icon-data-analysis', description: '统计字符、字节、行数、词频和中英文数字构成。', tags: ['text', 'stats', 'count', 'word'] }

// 接口网络与排查
{ name: 'URL 参数解析与对比', path: '/tool/url-params', icon: 'el-icon-link', description: '解析、编辑、重组 URL 查询参数，并对比两个 URL 的参数差异。', tags: ['url', 'query', 'params', 'compare'] }
{ name: 'JWT 批量检查', path: '/tool/jwt-batch', icon: 'el-icon-key', description: '批量解析 JWT Header/Payload，检查过期时间和常见 Claims。', tags: ['jwt', 'token', 'batch', 'expire'] }
{ name: '日志格式化查看器', path: '/tool/log-viewer', icon: 'el-icon-document-copy', description: '格式化 JSON Lines 和普通日志，支持级别识别、过滤和复制。', tags: ['log', 'jsonl', 'filter', 'trace'] }

// 安全与生成
{ name: 'ID 生成与解析', path: '/tool/id-generator', icon: 'el-icon-postcard', description: '生成 UUID、ULID、Snowflake 风格 ID，并解析可用时间信息。', tags: ['uuid', 'ulid', 'snowflake', 'id'] }
{ name: 'Mock 数据生成器', path: '/tool/mock-data', icon: 'el-icon-magic-stick', description: '按字段批量生成姓名、手机号、邮箱、地址和 UUID 等 JSON Mock 数据。', tags: ['mock', 'fake', 'json', 'generator'] }

// 前端样式与媒体
{ name: '图片 Base64 转换', path: '/tool/image-base64', icon: 'el-icon-picture-outline', description: '图片转 Data URL/Base64，并支持 Base64 还原预览和下载。', tags: ['image', 'base64', 'dataurl', 'convert'] }
```

- [ ] **Step 4: Verify all routes compile**

Run:

```bash
node scripts/verify-tool-expansion-core.js
npm run lint
npm run build
```

Expected:

- Core script prints `toolExpansionCore verification passed`.
- Lint exits `0`.
- Build exits `0`.

- [ ] **Step 5: Commit integration**

Run:

```bash
git add src/router/index.js src/config/tools.js
git commit -m "feat: register ten utility tools"
```

---

### Task 5: Manual Smoke Test and Final Verification

**Files:**
- No production files expected.

**Interfaces:**
- Consumes integrated app from Tasks 1-4.
- Produces final verification evidence.

- [ ] **Step 1: Run fresh verification**

Run:

```bash
node scripts/verify-tool-expansion-core.js
npm run lint
npm run build
```

Expected:

- `toolExpansionCore verification passed`
- `DONE  No lint errors found!`
- `DONE  Build complete.`

- [ ] **Step 2: Start dev server**

Run:

```bash
npm run serve -- --port 8080
```

Expected: local server starts at `http://localhost:8080/`.

- [ ] **Step 3: Browser smoke checks**

Open these routes:

```text
http://localhost:8080/tool/yaml-json
http://localhost:8080/tool/html-entity
http://localhost:8080/tool/url-params
http://localhost:8080/tool/text-stats
http://localhost:8080/tool/image-base64
http://localhost:8080/tool/path-tester
http://localhost:8080/tool/id-generator
http://localhost:8080/tool/jwt-batch
http://localhost:8080/tool/mock-data
http://localhost:8080/tool/log-viewer
```

For each route verify:

- Page title is visible.
- Main input controls render.
- Primary action produces output from the seeded sample.
- There are no visible layout overlaps at desktop width.

- [ ] **Step 4: Stop dev server**

Stop the process started in Step 2.

- [ ] **Step 5: Commit only if smoke generated durable useful files**

If smoke testing created no useful tracked files, do not commit. If a verification helper or fixture was added, commit it with:

```bash
git add <files>
git commit -m "test: add ten tool smoke fixtures"
```

