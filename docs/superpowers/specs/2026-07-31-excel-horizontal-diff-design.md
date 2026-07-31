# Excel Horizontal Diff Result Design

## Goal

Change the Excel comparison "字段差异" result from one-difference-per-row vertical output to a two-row grouped horizontal view. For each changed key, the first row shows the left Excel values and the second row shows the right Excel values.

## Behavior

- Each changed key renders as a pair of rows:
  - Row 1: source is `左边`, row number is the left Excel row number.
  - Row 2: source is `右边`, row number is the right Excel row number.
- Columns after `Key / 来源 / 行号` are mapped fields.
- By default, only fields with differences are selected and shown.
- Users can choose visible fields from all enabled non-key mappings.
- Cells whose left/right values differ for the same key and field are highlighted on both the left and right rows.
- Existing tabs for `仅左侧存在`, `仅右侧存在`, and `数据问题` remain unchanged in this pass.

## Data Model

Add a pure helper in `src/utils/excelCompareCore.js` that converts `compareRows()` output plus enabled mappings into a horizontal result model:

- `columns`: selectable fields, including labels and mapping ids.
- `defaultSelectedColumnIds`: mapping ids that had at least one difference.
- `rows`: two rows per changed key, with source, row number, values by mapping id, and a changed field set.

## Acceptance

- A verification script proves changed fields are grouped into left/right row pairs.
- Default selected fields include only fields that differ.
- The Excel UI renders horizontal pair rows for the "字段差异" tab.
- Users can select visible fields, and the table updates accordingly.
- Existing compare/export behavior continues to work.
