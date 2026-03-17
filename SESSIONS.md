# Sessions Log

A running log of work completed each session.

---

## 2026-03-17

### Location Column — Override Only
- Removed `applyLocationDefaults` from the parse pipeline — location column is now left empty by all parsers
- Location only populated when explicitly present in the source file; `default_location` from the subscription panel is the single source of truth for region

### Spreadsheet Parser — Column Alias Fixes
- Added `specialcomments` alias to the `comments` field mapping (old CSV exports used camelCase `SpecialComments` with no space)
- `SpecialComments` values from legacy CSV files now correctly populate the `comments` column

---

## 2026-03-14

### YAML Round-Trip
- Added `.yaml` / `.yml` upload support — parses an existing manifest back into the subscription panel and resource table
- New `server/parsers/yaml.js` using `js-yaml`; installed `js-yaml` as a server dependency
- Upload route returns `{ rows, subscription }` for YAML files; skips normalize/locationDefaults pipeline since data is already clean
- `FileUpload.jsx` passes `subscription` back through `onParsed`; `App.jsx` merges it into subscription state

### YAML Quality
- Added `yamlScalar()` helper in `App.jsx` — auto-quotes any value containing `:`, `#`, `{`, `}`, `[`, `]`, or leading YAML-special characters (fixes `comments: OS: Windows` producing invalid YAML)
- Applied `yamlScalar()` to every field in `buildYamlContent()`
- **Preview YAML modal** — new button in table header opens a popup with the full YAML in a monospace code view; includes Copy to Clipboard (2s confirmation) and Close
- Validator runs on open: shows green **✓ Valid YAML** badge or amber **⚠ N issues found** with offending lines listed

### Table UX
- **Row selection** — click row number to select (click again to deselect); Shift+click extends range; Ctrl/Cmd+click toggles; selected rows highlight in blue
- **Deselect-all button** — `⊠` icon appears in the row number column header when rows are selected; tooltip shows count; click clears all
- **Cell intellisense** — typing in any cell shows a dropdown of matching values from other rows in the same column (up to 8, case-insensitive); ArrowUp/Down to navigate, Enter to accept, click to select
- **Filter + Add Row** — new blank rows (empty `type`) always pass the type filter so they're visible and editable without clearing the filter
- **Clear All tab** — added a third tab to the location column bulk-edit menu; clears the location field on all rows and logs it to the audit trail (red button to distinguish from Set All)

### Cleanup
- Removed all internal placeholder references (CTM-Infrastructure, Lightning Book, lb) — replaced with generic examples (Order Book, ob, MyOrg)
- Removed `_manifest` suffix from default output filename — file is named after the uploaded source file only
- Updated banner: *"Upload a spreadsheet, architecture diagram, or existing yaml to generate a YAML manifest"*

---

## 2026-03-13

### Security
- Replaced `xlsx` (SheetJS) with `exceljs` to resolve two high-severity CVEs (prototype pollution + ReDoS)
- Dropped `.xls` and `.ods` support (required the vulnerable library); `.xlsx`, `.csv`, `.tsv` continue to work
- CI `npm audit --audit-level=high` now passes clean

### AI Parsers
- Upgraded image parser (`image.js`) from `claude-haiku-4-5` to `claude-sonnet-4-6` for better visual recognition accuracy
- Expanded image parser prompt with detailed Azure icon visual reference guide (identity, compute, networking, data, AI categories) — specifically addresses User Managed Identity (UMI) misidentification
- Upgraded PDF parser (`pdf.js`) from `claude-haiku-4-5` to `claude-sonnet-4-6`
- Aligned PDF parser prompt with image parser resource type list

### CSV Schema
- Expanded output from 3 columns to 10 columns to support end-to-end Azure infrastructure automation pipeline
- First 4 columns marked as required: `spoke_name`, `environment`, `location`, `service_type`
- All parsers (spreadsheet, drawio, visio, svg, image, pdf) updated to output the new schema
- Spreadsheet parser column aliases updated to fuzzy-map common header variations to new canonical names

### UI / UX
- Added **Detach File** button (right of Add Row) — clears session and returns to upload screen
- Added red `*` required field markers on table column headers
- Added `(*) Required Fields` legend next to Preview heading
- Added **Show / Hide Example** button — toggles 2 read-only example rows at top of table; example rows are kept separate from real data and never appear in CSV download
- Widened app layout to 1700px max-width
- Reduced table font to 0.78rem to accommodate 10 columns
- Narrowed upload zone to 500px centered
- Updated column widths and cell padding for 10-column layout

### Docs & Config
- Pre-authorized all standard git operations in `CLAUDE.md`
- Updated `CLAUDE.md` architecture notes with current schema and parser models
- Rewrote `README.md` to reflect current schema, target users, AI parser models, and all UI features
- Created `SESSIONS.md` (this file)
