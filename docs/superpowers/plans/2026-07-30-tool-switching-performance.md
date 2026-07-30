# Tool Switching Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce visible stalls when switching between DevToolbox tools.

**Architecture:** Route lazy imports move into a shared registry so routing, hover preloading, and idle preloading use the same loader functions. Large page-only dependencies are moved behind async method calls so entering those pages does not synchronously evaluate heavy libraries.

**Tech Stack:** Vue 2, Vue Router 3, Vue CLI 5, Element UI, CommonJS Node verification script.

## Global Constraints

- Preserve all existing route paths and names.
- Keep lazy route chunks; do not globally eager-load all tool pages.
- Preload only a conservative allowlist on idle.
- Use hover/focus preloading for cards and sidebar menu items.
- Keep route loading UI lightweight and avoid layout shift.
- Verify with `node scripts/verify-route-preloaders.js`, `npm run lint`, and `npm run build`.

---

### Task 1: Route Preload Registry

**Files:**
- Create: `src/router/toolRoutes.js`
- Modify: `src/router/index.js`
- Create: `scripts/verify-route-preloaders.js`

**Interfaces:**
- Produces: `toolRoutes`, an array of `{ path, name, component }`.
- Produces: `preloadRoute(path: string): Promise<unknown|null>`.
- Produces: `preloadIdleRoutes(): void`.

- [ ] **Step 1: Write failing verification script**

Create `scripts/verify-route-preloaders.js`:

```js
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.join(__dirname, '../src/router/toolRoutes.js'), 'utf8')
const routerSource = fs.readFileSync(path.join(__dirname, '../src/router/index.js'), 'utf8')

const requiredExports = [
  'export const toolRoutes',
  'export function preloadRoute',
  'export function preloadIdleRoutes'
]

for (const exportText of requiredExports) {
  if (!source.includes(exportText)) {
    throw new Error(`Missing ${exportText}`)
  }
}

const expectedPaths = [
  '/tool/excel-compare',
  '/tool/yaml-json',
  '/tool/path-tester',
  '/tool/id-generator',
  '/tool/mock-data',
  '/tool/url-params',
  '/tool/jwt-batch',
  '/tool/log-viewer',
  '/tool/html-entity',
  '/tool/text-stats',
  '/tool/image-base64'
]

for (const routePath of expectedPaths) {
  if (!source.includes(`path: '${routePath}'`)) {
    throw new Error(`Missing preload route ${routePath}`)
  }
}

if (!routerSource.includes('...toolRoutes')) {
  throw new Error('Router does not consume shared toolRoutes')
}

console.log('route preloader verification passed')
```

- [ ] **Step 2: Run verification and confirm RED**

Run: `node scripts/verify-route-preloaders.js`

Expected: FAIL with missing file or missing exports.

- [ ] **Step 3: Implement route registry**

Move all `/tool/...` lazy import route records into `src/router/toolRoutes.js`. Keep webpack chunk names unchanged. Add an internal `routeLoadersByPath` map and cache promises by path:

```js
const preloadCache = new Map()

export function preloadRoute(path) {
  const loader = routeLoadersByPath[path]
  if (!loader) {
    return Promise.resolve(null)
  }
  if (!preloadCache.has(path)) {
    preloadCache.set(path, loader())
  }
  return preloadCache.get(path)
}
```

Add `preloadIdleRoutes()` with `requestIdleCallback` fallback and a small allowlist: JSON, timestamp, Base64, URL params, YAML/JSON, text stats, HTML entity, ID generator.

- [ ] **Step 4: Consume registry in router**

Modify `src/router/index.js` to keep only `Home` locally and spread `...toolRoutes` after the home route.

- [ ] **Step 5: Verify GREEN**

Run: `node scripts/verify-route-preloaders.js`

Expected: PASS with `route preloader verification passed`.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/router/toolRoutes.js src/router/index.js scripts/verify-route-preloaders.js
git commit -m "feat: add route preloading registry"
```

### Task 2: Preload Triggers and Route Loading UI

**Files:**
- Modify: `src/layouts/DefaultLayout.vue`
- Modify: `src/views/Home.vue`
- Modify: `src/styles/global.scss`

**Interfaces:**
- Consumes: `preloadRoute(path)` and `preloadIdleRoutes()` from `@/router/toolRoutes`.
- Produces: `isRouteLoading` layout state toggled by router hooks.

- [ ] **Step 1: Add route loading behavior**

In `DefaultLayout.vue`, import preload helpers. Add `isRouteLoading: false` to data. In `created()`, register `beforeEach`, `afterEach`, and `onError` hooks and store unregister callbacks when available. In `beforeDestroy()`, call unregister callbacks if they are functions.

- [ ] **Step 2: Add loading markup**

Add a fixed slim bar under the topbar:

```vue
<div v-if="isRouteLoading" class="route-loading-bar" aria-hidden="true"></div>
```

- [ ] **Step 3: Add sidebar hover/focus preloading**

On each tool `el-menu-item`, add:

```vue
@mouseenter.native="preloadTool(tool.path)"
@focus.native="preloadTool(tool.path)"
```

Implement `preloadTool(path) { preloadRoute(path) }`.

- [ ] **Step 4: Schedule idle preloading**

Call `preloadIdleRoutes()` from `mounted()` after `handleResize()`.

- [ ] **Step 5: Add home card hover/focus preloading**

In `Home.vue`, import `preloadRoute` and add `@mouseenter.native`, `@focus.native`, and `tabindex="0"` to each tool card. Add `preloadTool(path) { preloadRoute(path) }`.

- [ ] **Step 6: Add CSS**

Add `.route-loading-bar` CSS with fixed positioning below the topbar, `height: 2px`, primary color, and short transform animation.

- [ ] **Step 7: Verify**

Run:

```bash
npm run lint
node scripts/verify-route-preloaders.js
```

Expected: both pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/layouts/DefaultLayout.vue src/views/Home.vue src/styles/global.scss
git commit -m "feat: preload tools during navigation intent"
```

### Task 3: Defer Heavy Tool Dependencies

**Files:**
- Modify: `src/views/tools/ExcelCompare.vue`
- Modify: `src/views/tools/CodeObfuscator.vue`

**Interfaces:**
- Produces: `loadXlsx()` method returning the `xlsx` module.
- Produces: `loadObfuscator()` method returning the obfuscator module/class.

- [ ] **Step 1: Update ExcelCompare**

Remove the top-level `import * as XLSX from 'xlsx'`. Add `xlsxModule: null` to data and `async loadXlsx()` to cache `await import('xlsx')`. Make `readWorkbook()` and `exportResults()` async and call `const XLSX = await this.loadXlsx()` before using workbook APIs.

- [ ] **Step 2: Update CodeObfuscator**

Remove top-level `import JavaScriptObfuscator from 'javascript-obfuscator'`. Add `obfuscatorModule: null` to data and `async loadObfuscator()` that returns `module.default || module`. Make the obfuscation action async, set its existing loading state before awaiting, and call the loaded module only inside the action.

- [ ] **Step 3: Verify route chunk split**

Run: `npm run build`

Expected: build succeeds and the Excel/code-obfuscator page chunks no longer include the full third-party libraries directly; async numbered chunks may contain the deferred libraries.

- [ ] **Step 4: Run full verification**

Run:

```bash
node scripts/verify-route-preloaders.js
node scripts/verify-tool-expansion-core.js
node scripts/verify-excel-compare-core.js
npm run lint
npm run build
```

Expected: all commands exit 0; build may keep existing asset-size warnings for vendor or deferred chunks.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/views/tools/ExcelCompare.vue src/views/tools/CodeObfuscator.vue
git commit -m "perf: defer heavy tool dependencies"
```

### Task 4: Final Smoke and Branch Finish

**Files:**
- No source files expected.

**Interfaces:**
- Confirms production build and dev-server route chunks are loadable.

- [ ] **Step 1: Start dev server**

Run with Windows-safe executable:

```powershell
Start-Process -FilePath npm.cmd -ArgumentList @('run','serve','--','--port','8083','--host','127.0.0.1') -WorkingDirectory (Get-Location) -RedirectStandardOutput .\dev-server.log -RedirectStandardError .\dev-server.err.log -WindowStyle Hidden -PassThru
```

- [ ] **Step 2: Smoke request core pages and chunks**

Request `/`, selected route chunk files, and confirm HTTP 200.

- [ ] **Step 3: Stop server and clean logs**

Stop the process listening on port `8083`, then remove `dev-server.log` and `dev-server.err.log`.

- [ ] **Step 4: Final git status**

Run: `git status --short --branch`

Expected: clean branch.
