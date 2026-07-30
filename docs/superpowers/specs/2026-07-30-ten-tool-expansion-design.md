# Ten Tool Expansion Design

## Goal

Add ten common developer utility tools to DevToolbox, based on the `feature/excel-data-compare` branch so the new work includes the Excel comparison tool already implemented there.

The tools should remain browser-only, follow the existing Vue 2 + Element UI single-file component style, and integrate into the current home search, sidebar, and route structure.

## Delivery Strategy

Implement in two batches of five tools.

Batch 1 focuses on low-risk, mostly zero-dependency or single-dependency tools:

1. `YAML / JSON 转换器`
2. `HTML 实体编解码`
3. `URL 参数解析与对比`
4. `文本统计分析`
5. `图片 Base64 转换`

Batch 2 focuses on more logic-heavy tools:

1. `JSONPath / XPath 测试器`
2. `ID 生成与解析`
3. `JWT 批量检查`
4. `Mock 数据生成器`
5. `日志格式化查看器`

Each batch should be independently runnable and verifiable with `npm run lint` and `npm run build`.

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

## Dependencies

Add `js-yaml` for YAML parsing and stringifying.

Add one JSONPath dependency for JSONPath evaluation. Preferred package: `jsonpath-plus`, because it is actively used in browser contexts and supports common JSONPath expressions.

No dependency is needed for XPath because browser `DOMParser` and `document.evaluate` can evaluate XPath against parsed XML documents.

No dependency is needed for UUID v4, ULID, Snowflake-style IDs, HTML entities, URL parameters, text statistics, image Base64 conversion, JWT parsing, mock data, or log formatting in the first version.

## Tool Designs

### 1. YAML / JSON 转换器

Category: `数据格式与转换`

Route: `/tool/yaml-json`

File: `src/views/tools/YamlJsonConverter.vue`

Purpose:

- Convert JSON to YAML.
- Convert YAML to JSON.
- Format output.
- Copy output.
- Clear content.

Behavior:

- Two text panes: source and output.
- Mode selector: `YAML 转 JSON` and `JSON 转 YAML`.
- YAML input uses `js-yaml.load`.
- JSON input uses `JSON.parse`.
- JSON output is `JSON.stringify(value, null, 2)`.
- YAML output is `yaml.dump(value, { noRefs: true })`.
- Parse errors show an Element UI error alert.

Out of scope:

- Multi-document YAML streams.
- YAML schema customization.
- File import/export.

### 2. HTML 实体编解码

Category: `文本处理与文档`

Route: `/tool/html-entity`

File: `src/views/tools/HtmlEntityCodec.vue`

Purpose:

- Encode text into HTML entities.
- Decode HTML entities into text.
- Encode non-ASCII characters into numeric Unicode entities.

Behavior:

- Source textarea and result textarea.
- Mode selector:
  - `HTML 转义`: encode `&`, `<`, `>`, `"`, `'`.
  - `HTML 反转义`: decode named and numeric entities through a textarea/browser parser.
  - `Unicode 实体`: convert non-ASCII characters to `&#xNNNN;`.
- Show source/result character counts.
- Provide copy and clear actions.

Out of scope:

- Full HTML sanitization.
- Security filtering.

### 3. URL 参数解析与对比

Category: `接口网络与排查`

Route: `/tool/url-params`

File: `src/views/tools/UrlParamsTool.vue`

Purpose:

- Parse URL components and query parameters.
- Edit query parameters in a table.
- Rebuild URL.
- Compare two URLs by query parameters.

Behavior:

- Main URL input.
- Parsed fields: protocol, host, path, hash.
- Query parameter table with key/value/enabled rows.
- Actions:
  - Add parameter.
  - Delete parameter.
  - Sort parameters by key.
  - Rebuild URL.
  - Copy URL.
- Compare mode with a second URL input.
- Compare results list:
  - Only in left.
  - Only in right.
  - Same key different value.

Rules:

- Use the browser `URL` and `URLSearchParams` APIs.
- If input lacks protocol, try parsing with `https://` as a temporary base and show a warning that the protocol was assumed.
- Repeated query keys are preserved as repeated rows.

Out of scope:

- Form-data comparison.
- URL template variables.

### 4. 文本统计分析

Category: `文本处理与文档`

Route: `/tool/text-stats`

File: `src/views/tools/TextStats.vue`

Purpose:

- Analyze text length, composition, line statistics, and word frequency.

Behavior:

- Text input textarea.
- Summary cards:
  - Characters.
  - Characters without whitespace.
  - UTF-8 bytes.
  - Lines.
  - Non-empty lines.
  - Words.
  - Chinese characters.
  - English letters.
  - Digits.
  - Whitespace.
- Top word frequency table.
- Options:
  - Case-insensitive word count.
  - Ignore punctuation.
- Copy summary action.

Rules:

- UTF-8 byte count uses `new Blob([text]).size`.
- English words use regex tokenization.
- Chinese character count uses CJK range matching.

Out of scope:

- Language detection.
- Readability scoring.

### 5. 图片 Base64 转换

Category: `前端样式与媒体`

Route: `/tool/image-base64`

File: `src/views/tools/ImageBase64.vue`

Purpose:

- Convert image files to Data URL/Base64.
- Convert Data URL/Base64 text back to image preview.

Behavior:

- Image upload area.
- Output textarea for Data URL.
- Stats:
  - File name.
  - MIME type.
  - Original file size.
  - Base64 length.
  - Image dimensions when loadable.
- Actions:
  - Copy Data URL.
  - Download decoded image.
  - Clear.
- Reverse panel:
  - Paste Data URL or raw Base64.
  - MIME selector for raw Base64.
  - Preview decoded image.

Rules:

- Use `FileReader.readAsDataURL`.
- If input is raw Base64, build a Data URL with selected MIME type.
- Download uses a generated object URL.

Out of scope:

- Image compression.
- Image editing.

### 6. JSONPath / XPath 测试器

Category: `数据格式与转换`

Route: `/tool/path-tester`

File: `src/views/tools/PathTester.vue`

Purpose:

- Test JSONPath expressions against JSON.
- Test XPath expressions against XML.

Behavior:

- Mode selector: `JSONPath` or `XPath`.
- Source textarea.
- Expression input.
- Result pane showing matched values.
- Result count.
- Copy result action.

Rules:

- JSONPath mode parses source with `JSON.parse`.
- JSONPath mode evaluates with `jsonpath-plus`.
- XPath mode parses XML with `DOMParser`.
- XPath mode evaluates with browser XPath APIs.
- XPath result supports string, number, boolean, and node snapshots.

Out of scope:

- XPath namespace editor.
- JSONPath expression builder.

### 7. ID 生成与解析

Category: `安全与生成`

Route: `/tool/id-generator`

File: `src/views/tools/IdGenerator.vue`

Purpose:

- Generate UUID v4, ULID, and Snowflake-style IDs.
- Parse ULID timestamp.
- Parse Snowflake-style timestamp with configurable epoch.

Behavior:

- Mode selector: UUID v4, ULID, Snowflake.
- Count input for batch generation.
- Copy one or copy all.
- Generated results table.
- Parser panel:
  - ID input.
  - Type selector.
  - Parsed timestamp where supported.

Rules:

- UUID v4 uses `crypto.getRandomValues`.
- ULID uses Crockford Base32 and current timestamp.
- Snowflake-style ID uses:
  - 41-bit timestamp delta.
  - 10-bit worker id.
  - 12-bit sequence.
- Default Snowflake epoch: `2020-01-01T00:00:00.000Z`.

Out of scope:

- Distributed coordination.
- Guaranteed uniqueness across browser tabs.

### 8. JWT 批量检查

Category: `接口网络与排查`

Route: `/tool/jwt-batch`

File: `src/views/tools/JwtBatchChecker.vue`

Purpose:

- Parse many JWTs at once.
- Show expiration and common claims.

Behavior:

- Textarea accepts one token per line.
- Parse button.
- Result table:
  - Index.
  - Valid structure.
  - Algorithm.
  - Subject.
  - Issuer.
  - Audience.
  - Issued at.
  - Expiration.
  - Status: valid, expired, not-before, missing exp, invalid.
- Row detail JSON preview.
- Export result as CSV.

Rules:

- Decode Base64URL locally.
- Do not verify signatures.
- Treat invalid JSON as invalid token.
- Use current browser time for status.

Out of scope:

- Signature verification.
- JWKS fetching.

### 9. Mock 数据生成器

Category: `安全与生成`

Route: `/tool/mock-data`

File: `src/views/tools/MockDataGenerator.vue`

Purpose:

- Generate common mock records as JSON arrays.

Behavior:

- Count input.
- Field selector:
  - Name.
  - Mobile.
  - Email.
  - City.
  - Address.
  - Date.
  - Number.
  - Boolean.
  - UUID.
- Output JSON textarea.
- Actions:
  - Generate.
  - Copy.
  - Download JSON.

Rules:

- Use built-in Chinese sample names, cities, street words, and domain names.
- Use `crypto.getRandomValues` where useful.
- Generated object keys use stable English field names.

Out of scope:

- Custom schema builder.
- Faker dependency.
- Locale switching.

### 10. 日志格式化查看器

Category: `接口网络与排查`

Route: `/tool/log-viewer`

File: `src/views/tools/LogViewer.vue`

Purpose:

- Make raw logs easier to scan, filter, and copy.

Behavior:

- Log textarea.
- Mode selector:
  - Auto.
  - JSON Lines.
  - Plain text.
  - Java stack trace.
- Filter input.
- Level filters: error, warn, info, debug, other.
- Parsed log table:
  - Line number.
  - Level.
  - Time if detected.
  - Message.
- Detail preview for selected row.
- Copy filtered logs.

Rules:

- JSON Lines mode parses each non-empty line as JSON independently.
- Auto mode treats a line as JSON if it parses as JSON, otherwise as plain text.
- Level detection is case-insensitive for `error`, `warn`, `info`, `debug`, `trace`.
- Java stack trace continuation lines are grouped under the previous error line.

Out of scope:

- Huge-file virtual scrolling.
- Remote log fetching.
- Regex capture template editor.

## Integration Plan

Update `src/router/index.js` with lazy imports and routes:

- `/tool/yaml-json`
- `/tool/html-entity`
- `/tool/url-params`
- `/tool/text-stats`
- `/tool/image-base64`
- `/tool/path-tester`
- `/tool/id-generator`
- `/tool/jwt-batch`
- `/tool/mock-data`
- `/tool/log-viewer`

Update `src/config/tools.js`:

- Add YAML/JSON and JSONPath/XPath under `数据格式与转换`.
- Add HTML Entity and Text Stats under `文本处理与文档`.
- Add URL Params, JWT Batch, and Log Viewer under `接口网络与排查`.
- Add ID Generator and Mock Data under `安全与生成`.
- Add Image Base64 under `前端样式与媒体`.

## Verification Plan

Automated verification:

- `npm run lint`
- `npm run build`

Manual checks per batch:

- Confirm all new route URLs load.
- Confirm every new tool appears on the homepage and sidebar.
- Confirm homepage search can find each new tool by Chinese name and English tag.
- For converter tools, verify sample input produces output and copy action succeeds or falls back with an error message.
- For file/image tools, verify invalid input shows an error and valid input previews or exports.

## Acceptance Criteria

- All ten tools are accessible through routes, sidebar, and home search.
- The app builds successfully.
- The linter reports no errors.
- No tool sends user data to a remote server.
- Added dependencies are limited to `js-yaml` and `jsonpath-plus`; adding any other dependency requires updating this spec and getting review approval first.
