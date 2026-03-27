# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authorized Operations

All standard git operations are pre-authorized — add, commit, push, pull, merge, branch, rebase — no need to ask for confirmation.

## Commands

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Start all services
npm run dev             # starts server (:3001) + client (:5173) concurrently

# Stop all services
npm run stop-dev        # kills processes on ports 3001 and 5173

# Build client for production
npm run build:client
```

## Architecture

Full-stack web app: React/Vite frontend + Node.js/Express backend.

**Frontend** (`client/src/`)
- `App.jsx` — orchestrates file upload, subscription panel state, loading, preview, and YAML download. Storage key: `manifest_session_v2`.
- `components/FileUpload.jsx` — drag-and-drop + click-to-browse, sends multipart POST to `/api/parse`. Hidden after upload; returns on detach.
- `components/PreviewTable.jsx` — renders parsed resource rows before download; includes YAML preview with line numbers and live validator
- `components/ResourceCommentPopup.jsx` — structured comment editor per resource type; tabs for Properties / NSG Rules / Consumers
- `config/resourceCommentFields.js` — field definitions per resource type for the comment popup
- `config/schemaMapping.js` — maps each resource type to its target section in the nested manifest schema; exports `parseCommentFields()` and `resolveModule()`
- `utils/buildYaml.js` — generates the nested spoke infrastructure manifest YAML from rows + subscription state
- Vite proxy: `/api/*` → `http://localhost:3001`

**Backend** (`server/`)
- `index.js` — Express entry point
- `routes/upload.js` — `POST /api/parse`: receives file via multer, dispatches to correct parser by extension, returns `{ rows }` or `{ rows, subscription }` for YAML files, deletes temp file
- `config/outputSchema.js` — field definitions for the subscription panel; imported by parsers and the UI
- `parsers/` — one module per format:
  - `spreadsheet.js` — ExcelJS, fuzzy-maps column headers to canonical names
  - `drawio.js` — fast-xml-parser, extracts shape labels + edge source/target to build dependency strings
  - `visio.js` — unzips VSDX, parses `visio/pages/page*.xml`, extracts shape text + Connect elements
  - `svg.js` — XML parser, collects all text nodes
  - `image.js` — sends base64 image to Claude Vision API (`claude-sonnet-4-6`) with Azure icon visual reference prompt
  - `pdf.js` — sends base64 PDF to Claude API (`claude-sonnet-4-6`) as a `document` content block
  - `yaml.js` — js-yaml, round-trips an existing manifest back into subscription + resource rows; auto-detects new format (`spoke:` / `environments:` / `ctm_properties:`) vs legacy (`resources:`)
  - `normalizeName.js` — normalizes `name` values (strips env suffixes, type prefixes, region segments, etc.)
  - `locationDefaults.js` — type-to-location mapping rules (no longer applied in parse pipeline; location column is override-only)

## Output Format

The app generates a nested spoke infrastructure manifest (schema v1.7.0). See [`output.md`](./output.md) for the full spec and [`schema-template-v1.7.0.yml`](./schema-template-v1.7.0.yml) for the annotated reference template.

**Subscription panel fields** (grouped in the UI):

| Group | Fields |
|-------|--------|
| Identity | `spoke_name`, `owner`, `product`, `environment`, `default_location` |
| Tagging | `cost_center`, `project`, `data_classification`, `infra_repo` |
| Infrastructure | `sku_mode`, `vnet_cidr`, `management_group_id`, `new_subscription`, `subscription_id` (conditional), `description` |

**Resource row fields:** `name`, `type`, `location`, `repo`, `comments`

Extended row data (not table columns, set via popup): `nsg_rules[]`, `consumers[]`

## Schema-Driven Design

**`client/src/config/schemaMapping.js`** — maps resource types to their target section in the manifest:
- `section` + `sub_key` route each type into the correct YAML block
- `unmapped: true` types are emitted as a commented block at the bottom
- Exports `parseCommentFields(comments)` — parses `"Key:Value, Key2:Value2"` comment strings
- Exports `resolveModule(type, commentFields)` — derives Windows vs Linux module names from OS comment

**`client/src/utils/buildYaml.js`** — main YAML builder:
- Reads subscription panel state + row array → outputs manifest string
- `app_service_plan` rows feed `plan_defaults` (not an explicit array); first web ASP = `plan_defaults.web_app`, first func ASP = `plan_defaults.function_app`
- Secondary ASPs with matching app names generate `plan_override` entries
- NSG rules collected from compute rows → deduplicated → emitted under `network.nsgs.nsg_appservices`
- `snet_appservices` + `nsg_appservices` auto-emitted when any compute rows present

**`server/config/outputSchema.js`** — subscription panel field definitions with `group` property (`identity` / `tagging` / `infra`)

**When adding a new resource type:** update `schemaMapping.js` + `resourceCommentFields.js` + `buildYaml.js` + `output.md`.

## Naming Conventions

See [`naming.md`](./naming.md) for canonical values and normalization rules for resource names.

## Environment

Copy `.env.example` → `.env` and set `ANTHROPIC_API_KEY`. Required for PNG, JPG, and PDF parsing (Claude Vision). XML-based formats and spreadsheets work without it.
