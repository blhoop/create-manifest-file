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
- `App.jsx` — orchestrates file upload, subscription panel state, loading, preview, and YAML download
- `components/FileUpload.jsx` — drag-and-drop + click-to-browse, sends multipart POST to `/api/parse`
- `components/PreviewTable.jsx` — renders parsed resource rows before download
- Vite proxy: `/api/*` → `http://localhost:3001`

**Backend** (`server/`)
- `index.js` — Express entry point
- `routes/upload.js` — `POST /api/parse`: receives file via multer, dispatches to correct parser by extension, returns `{ rows }` or `{ rows, subscription }` for YAML files, deletes temp file
- `config/outputSchema.js` — **single source of truth** for the YAML output structure; imported by parsers, location defaults, and the YAML builder
- `parsers/` — one module per format:
  - `spreadsheet.js` — ExcelJS, fuzzy-maps column headers to canonical names
  - `drawio.js` — fast-xml-parser, extracts shape labels + edge source/target to build dependency strings
  - `visio.js` — unzips VSDX, parses `visio/pages/page*.xml`, extracts shape text + Connect elements
  - `svg.js` — XML parser, collects all text nodes
  - `image.js` — sends base64 image to Claude Vision API (`claude-sonnet-4-6`) with Azure icon visual reference prompt
  - `pdf.js` — sends base64 PDF to Claude API (`claude-sonnet-4-6`) as a `document` content block
  - `yaml.js` — js-yaml, round-trips an existing `.yaml`/`.yml` manifest back into subscription + resource rows; skips normalize/locationDefaults pipeline
  - `normalizeName.js` — normalizes `name` values (strips env suffixes, type prefixes, region segments, etc.)
  - `locationDefaults.js` — applies location defaults based on resource type using rules from `outputSchema.js`

## Output Format

The app generates a `.yml` manifest file with two sections:

**Subscription block** (top-level fields, filled in via the UI subscription panel):

| Field | Required | Description |
|-------|----------|-------------|
| `subscription_name` | ✅ | Friendly name for the Azure subscription |
| `environment` | ✅ | `dev` `test` `uat` `preprod` `prod` `lab` |
| `default_location` | ✅ | Default Azure region for all resources |
| `product_code` | | Short code for resource names — auto-derived if omitted |
| `vnet_cidr` | | VNet CIDR block |
| `subscription_id` | | Existing Azure subscription UUID |
| `spn_client_id` | | Existing SPN client ID for OIDC auth |

**Resources block** (one entry per row in the preview table):

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Subsystem/component name (e.g. `web`, `booking-db`) |
| `type` | ✅ | Resource type — builder or inventory type |
| `location` | | Azure region override — omit to use `default_location` |
| `repo` | | SCM repo (`org/repo-name`) — triggers CI/CD caller workflow generation |
| `comments` | | Free-text hints (e.g. `needs pgbouncer`, `serverless`) |

See [`output.md`](./output.md) for the full format spec including all valid resource types and location values.

## Schema-Driven Design

`server/config/outputSchema.js` exports:
- `SUBSCRIPTION_FIELDS` — field definitions for the subscription block
- `RESOURCE_FIELDS` — field definitions for the resources block
- `BUILDER_TYPES` / `INVENTORY_TYPES` / `ALL_RESOURCE_TYPES` — valid type values
- `LOCATION_DEFAULTS` — type-to-location mapping rules
- `DEFAULT_LOCATION` — fallback region (`australiaeast`)

**When adding a new field:** update `outputSchema.js` + `output.md`. The rest of the app derives from the schema.

## Naming Conventions

See [`naming.md`](./naming.md) for canonical values and normalization rules for resource names.

## Environment

Copy `.env.example` → `.env` and set `ANTHROPIC_API_KEY`. Required for PNG, JPG, and PDF parsing (Claude Vision). XML-based formats and spreadsheets work without it.
