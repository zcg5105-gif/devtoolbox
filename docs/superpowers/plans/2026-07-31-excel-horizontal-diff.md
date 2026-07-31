# Excel Horizontal Diff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display Excel changed rows as two-row horizontal left/right pairs.

**Architecture:** Add a pure result-shaping helper to `excelCompareCore.js`, verify it with a Node script, then bind the helper output to `ExcelCompare.vue` using Element UI table columns and a field selector.

**Tech Stack:** Vue 2, Element UI, existing CommonJS core helper scripts.

## Global Constraints

- Do not change Excel parsing, mapping setup, key matching, or changed-cell detection.
- Keep `仅左侧存在`, `仅右侧存在`, and `数据问题` tabs intact.
- Default visible fields must be fields that have differences.
- Users must be able to choose visible fields from all enabled non-key mappings.
- Run `node scripts/verify-excel-horizontal-diff.js`, `node scripts/verify-excel-compare-core.js`, `npm run lint`, and `npm run build`.

---

### Task 1: Core Horizontal Diff Model

**Files:**
- Create: `scripts/verify-excel-horizontal-diff.js`
- Modify: `src/utils/excelCompareCore.js`

**Interfaces:**
- Produces: `buildHorizontalDiffResult(options)`.
- Input: `{ changedCells, mappings, keyMappingId, leftColumns, rightColumns }`.
- Output: `{ columns, defaultSelectedColumnIds, rows }`.

- [ ] Write `scripts/verify-excel-horizontal-diff.js` that imports `buildHorizontalDiffResult` and asserts two changed keys become four rows.
- [ ] Run `node scripts/verify-excel-horizontal-diff.js` and confirm it fails because the helper is missing.
- [ ] Implement `buildHorizontalDiffResult` in `src/utils/excelCompareCore.js`.
- [ ] Export the helper.
- [ ] Run `node scripts/verify-excel-horizontal-diff.js` and confirm it passes.
- [ ] Run `node scripts/verify-excel-compare-core.js`.
- [ ] Commit with `feat: add horizontal excel diff model`.

### Task 2: Excel Page Horizontal Result UI

**Files:**
- Modify: `src/views/tools/ExcelCompare.vue`

**Interfaces:**
- Consumes: `buildHorizontalDiffResult(options)`.
- Produces: `horizontalDiff`, `selectedDiffColumnIds`, `visibleHorizontalColumns`, and `horizontalDiffRows`.

- [ ] Import `buildHorizontalDiffResult`.
- [ ] Add `horizontalDiff` and `selectedDiffColumnIds` to component state.
- [ ] After `runCompare()`, build the horizontal diff model and default selected fields from changed columns.
- [ ] Replace the `字段差异` tab table with a toolbar and horizontal pair-row table.
- [ ] Add cell class highlighting for changed field cells.
- [ ] Reset horizontal state when mappings/files change and in `resetAll()`.
- [ ] Run `npm run lint`.
- [ ] Commit with `feat: show excel diffs as horizontal pairs`.

### Task 3: Final Verification

**Files:**
- No source changes expected.

- [ ] Run `node scripts/verify-excel-horizontal-diff.js`.
- [ ] Run `node scripts/verify-excel-compare-core.js`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Confirm `git status --short --branch` is clean.
