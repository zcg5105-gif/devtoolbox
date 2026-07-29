# Excel Data Compare Tool Design

## Goal

Add a browser-only Excel data comparison tool to DevToolbox. Users upload two Excel files, choose sheets, define how columns map between the files, select one mapped column as the key, and compare all other mapped fields by key.

The first version supports `.xlsx` as the primary format and `.xls` as a compatible input. Data stays in the browser and is not uploaded to any server.

## Product Scope

The tool is a new page named `Excel 数据比对`, registered under the existing `数据格式与转换` category.

In scope:

- Upload two Excel files.
- Read workbook sheet names for each file.
- Let users choose one sheet from each workbook.
- Let users choose column identification mode:
  - First row as headers.
  - Column letters such as `A`, `B`, `C`.
- Auto-match columns by identical normalized headers when header mode is active.
- Allow users to manually adjust every mapping.
- Require one mapped column to be selected as the key.
- Compare mapped non-key fields by key.
- Report:
  - Rows that only exist in the left file.
  - Rows that only exist in the right file.
  - Field value changes for rows with the same key.
  - Duplicate or missing key data issues.
- Export the result as an Excel workbook.

Out of scope for the first version:

- Server-side parsing or persistent storage.
- Multi-sheet batch comparison.
- Saved mapping profiles.
- Advanced value normalization rules such as ignoring case, trimming punctuation, fuzzy matching, numeric tolerance, or date format coercion.
- Cell styling comparison, formulas, comments, merged cells, and hidden rows.

## User Flow

1. User opens `Excel 数据比对`.
2. User uploads the left Excel file and the right Excel file.
3. The tool parses each workbook and shows basic file status:
   - File name.
   - Sheet count.
   - Selected sheet row count and column count.
   - Parse errors when present.
4. User chooses one sheet for each side.
5. User chooses the column mode:
   - `首行作为表头` by default.
   - `按列号 A/B/C` as an alternative.
6. The tool builds column metadata for both selected sheets.
7. In header mode, the tool auto-creates mappings for columns with the same normalized header text.
8. User adjusts mappings in a table:
   - Left column.
   - Right column selector.
   - Include/exclude flag.
9. User selects one included mapping as the key.
10. User clicks `开始比对`.
11. The page shows summary counts and tabbed detail tables.
12. User can export comparison results.

## UI Structure

The page follows existing Vue 2 + Element UI patterns and uses a single scoped SFC page.

Main sections:

- Header actions:
  - Tool title and short description.
  - Reset button.
  - Export button, disabled until results exist.
- Upload and sheet selection panel:
  - Two upload controls side by side.
  - Each side has a sheet selector after parsing succeeds.
- Column mode and mapping panel:
  - Radio buttons for header mode vs column-letter mode.
  - Mapping table with manual right-column selection.
  - Key mapping selector.
- Result summary:
  - Total compared keys.
  - Changed rows.
  - Left-only rows.
  - Right-only rows.
  - Data issue count.
- Result tabs:
  - `字段差异`
  - `仅左侧存在`
  - `仅右侧存在`
  - `数据问题`

The layout should remain usable on mobile, but the target workflow is desktop-oriented because Excel mapping tables are wide.

## Dependency

Add the `xlsx` package for browser-side workbook parsing and export.

Use SheetJS APIs to:

- Read uploaded files from `ArrayBuffer`.
- Access workbook sheet names.
- Convert selected sheets into a two-dimensional array with display-oriented string values.
- Generate export workbooks from JSON rows.

## Data Model

Workbook state per side:

```js
{
  fileName: '',
  workbook: null,
  sheetNames: [],
  selectedSheetName: '',
  rows: [],
  columns: [],
  errorMessage: ''
}
```

Column metadata:

```js
{
  index: 0,
  letter: 'A',
  header: '客户编号',
  label: '客户编号',
  value: '0'
}
```

Mapping row:

```js
{
  id: 'left-0',
  leftIndex: 0,
  rightIndex: 0,
  enabled: true
}
```

Comparison result:

```js
{
  summary: {
    comparedKeys: 0,
    changedRows: 0,
    leftOnlyRows: 0,
    rightOnlyRows: 0,
    issueRows: 0
  },
  changedCells: [],
  leftOnlyRows: [],
  rightOnlyRows: [],
  issueRows: []
}
```

## Parsing Rules

Use `sheet_to_json(sheet, { header: 1, raw: false, defval: '' })` to produce a two-dimensional array.

In header mode:

- Row 1 is treated as the header row.
- Data starts at row 2.
- Empty header cells receive a fallback label based on the column letter, such as `未命名列 A`.

In column-letter mode:

- All rows are data rows.
- Column labels are `A`, `B`, `C`, etc.

For column discovery:

- Determine the maximum row width in the selected sheet.
- Create column metadata from index `0` to `maxWidth - 1`.
- Ignore completely empty trailing columns if no row has a value in that column.

## Mapping Rules

Header mode auto-mapping uses normalized header names:

- Trim whitespace.
- Convert full-width surrounding whitespace to normal trimmed text through JavaScript string trimming.
- Compare case-insensitively.

Only exact normalized matches are auto-mapped. Ambiguous duplicate headers are not auto-mapped; the page shows a mapping validation alert and leaves those columns unmapped until the user chooses manually.

Column-letter mode auto-maps by column index where both sides have that index.

Users may manually override mappings. Each right column can be used by at most one enabled mapping to keep result semantics clear.

## Key Rules

The key must be one enabled mapping. A compare action is disabled until:

- Both files are parsed.
- Both selected sheets have rows.
- At least one mapping is enabled.
- A key mapping is selected.

Key values are converted to display strings with `String(value).trim()`.

Rows with empty key values are added to `数据问题` and are excluded from field comparison.

Rows with duplicate key values on either side are added to `数据问题`. Any duplicated key is excluded from field comparison on both sides to avoid misleading matches.

## Comparison Rules

For each valid unique key:

- If the key exists only on the left side, add the source row to `仅左侧存在`.
- If the key exists only on the right side, add the source row to `仅右侧存在`.
- If the key exists on both sides, compare all enabled non-key mappings.
- A changed field is recorded when the left display value and right display value are not strictly equal as strings.

Each changed field result includes:

- Key value.
- Left row number.
- Right row number.
- Left column label.
- Right column label.
- Left value.
- Right value.

Row numbers are one-based Excel-style row numbers. In header mode, data row numbering accounts for the header row.

## Export

Export creates an `.xlsx` workbook with these sheets:

- `字段差异`
- `仅左侧存在`
- `仅右侧存在`
- `数据问题`
- `汇总`

Each sheet contains plain values. The first version does not style cells.

The export button is disabled until a comparison result exists.

## Error Handling

Show non-blocking Element UI alerts for:

- Unsupported or unreadable file.
- Workbook parse failure.
- Selected sheet is empty.
- Missing key mapping.
- Duplicate right-column mappings.
- Duplicate or empty key values.

Parsing errors should be scoped to the affected side so the other uploaded file can remain loaded.

## Integration Points

Files to add or update during implementation:

- Add `src/views/tools/ExcelCompare.vue`.
- Update `src/router/index.js` with a lazy route at `/tool/excel-compare`.
- Update `src/config/tools.js` under `数据格式与转换`.
- Update `package.json` and `package-lock.json` by installing `xlsx`.

The page should follow existing local patterns:

- Vue 2 Options API.
- Element UI components.
- Scoped SCSS.
- Existing theme CSS variables.
- No backend.

## Verification Plan

Use the existing project verification commands:

- `npm run lint`
- `npm run build`

Manual browser checks after implementation:

- Upload two `.xlsx` files with matching headers and changed values.
- Choose non-first sheets and confirm sheet switching updates columns.
- Switch to column-letter mode and compare by column letters.
- Confirm duplicate key rows appear in `数据问题`.
- Export results and verify the generated workbook has the expected sheets.
