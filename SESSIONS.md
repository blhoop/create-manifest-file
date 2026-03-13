# Sessions Log

A running log of work completed each session.

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
