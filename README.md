# Create Manifest File

A web application that converts architecture diagrams and spreadsheets into a structured YAML manifest for cloud infrastructure automation. Upload a file, review and edit the extracted data in an interactive preview table, then download the YAML.

This tool is designed for **Project Managers, Architects, Developers, and Cloud Engineers** as part of an end-to-end Azure infrastructure provisioning pipeline — the YAML output drives downstream automation to build out cloud resources, generate Terraform, create TFC workspaces, and auto-generate CI/CD caller workflows.

## Supported File Formats

| Format | Extension(s) | Method |
|--------|-------------|--------|
| Spreadsheets | `.xlsx` `.csv` `.tsv` | ExcelJS — fuzzy-maps column headers to manifest fields |
| draw.io diagrams | `.xml` | XML parser — extracts shapes + edge connections |
| Visio diagrams | `.vsdx` | Unzip + XML parser — reads shapes and Connect elements |
| SVG diagrams | `.svg` | XML parser — collects text labels from shapes |
| Image diagrams | `.png` `.jpg` `.jpeg` | Claude Vision API (`claude-sonnet-4-6`) — identifies Azure icons and diagram semantics |
| PDF diagrams | `.pdf` | Claude API (`claude-sonnet-4-6`) — extracts resources and dependencies from design docs |
| YAML manifest | `.yaml` `.yml` | js-yaml — round-trips a previously exported manifest back into the editor |

## Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/) (required for PNG, JPG, and PDF parsing)

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/blhoop/create-manifest-file.git
cd create-manifest-file

# 2. Set environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Install dependencies
npm run install:all
```

## Running Locally

```bash
# Start both server and client in one command
npm run dev
```

| Service | URL |
|---------|-----|
| React UI | http://localhost:5173 |
| Express API | http://localhost:3001 |

```bash
# Stop all services
npm run stop-dev
```

## YAML Output

Every parsed file produces a `.yml` manifest with two sections. See [`output.md`](./output.md) for the full format specification.

### Subscription Block (once per file)

| Field | Required | Description |
|-------|----------|-------------|
| `subscription_name` | ✅ | Friendly name for the Azure subscription |
| `environment` | ✅ | Target environment (`dev` `test` `uat` `preprod` `prod` `lab`) |
| `default_location` | ✅ | Default Azure region for all resources |
| `product_code` | | Short code for Azure resource names — auto-derived if omitted |
| `vnet_cidr` | | VNet CIDR block — auto-allocated if omitted |
| `subscription_id` | | Existing Azure subscription UUID |
| `spn_client_id` | | Existing SPN client ID for OIDC auth |

### Resources Block (one entry per resource)

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Subsystem/component name (e.g. `web`, `booking-db`) |
| `type` | ✅ | Resource type — builder or inventory (see `output.md`) |
| `location` | | Azure region override — omit to use `default_location` |
| `repo` | | SCM repo (`org/repo-name`) — triggers CI/CD caller workflow generation |
| `comments` | | Free-text hints that influence the manifest (e.g. `needs pgbouncer`, `serverless`) |

## Preview & Editing

After parsing, the app displays an interactive preview before download:

- **Subscription panel** — fill in spoke identity fields (subscription name, environment, default location, and optional overrides) before downloading
- **Required field markers** — `name` and `type` are marked with a red `*`
- **Show / Hide Example** — toggles two read-only example rows so users can see the expected format
- **Inline row editing** — click any cell to edit; Tab to move between cells
- **Add / delete rows** — add blank rows or remove unwanted ones
- **Bulk column edit** — `▾` on `location` column for Set All and Find & Replace
- **Type filter** — `⊟` on `type` column filters visible rows by resource type for visual auditing
- **Parse Names** — strip unwanted text from `name` values across all rows at once (supports comma-separated terms)
- **Detach File** — clears the current session to upload a new file
- **Multi-sheet support** — `.xlsx` files with multiple tabs show a sheet picker
- **Session persistence** — data saved to `localStorage` so a page refresh restores your work
- **Audit trail** — all edits tracked; reviewed and exported as `-session-audit.txt` alongside the YAML

## Output Format Reference

See [`output.md`](./output.md) for:
- Full YAML structure with examples
- Complete resource type list (builder + inventory types)
- Location defaults and overrides
- Field-level descriptions and valid values

The machine-readable schema lives in [`server/config/outputSchema.js`](./server/config/outputSchema.js) — this is the single source of truth that drives the YAML builder, parsers, and AI prompts.

## Project Structure

```
create-manifest-file/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── FileUpload.jsx
│           └── PreviewTable.jsx
├── server/                  # Node.js + Express backend
│   ├── index.js
│   ├── routes/upload.js
│   ├── config/
│   │   └── outputSchema.js  # Single source of truth for YAML output structure
│   └── parsers/
│       ├── spreadsheet.js   # ExcelJS
│       ├── drawio.js
│       ├── visio.js
│       ├── svg.js
│       ├── image.js         # Claude Vision API (sonnet)
│       ├── pdf.js           # Claude API (sonnet)
│       ├── normalizeName.js # Normalizes resource names
│       └── locationDefaults.js
├── output.md                # YAML output format documentation
├── naming.md                # Naming conventions reference
└── .github/
    ├── workflows/
    │   ├── ci.yml           # CI on push/PR
    │   └── pr-checks.yml    # Full validation on PRs
    └── dependabot.yml       # Weekly dependency updates
```

## CI/CD

GitHub Actions runs automatically on every push and pull request to `develop` and `main`:
- Installs dependencies (`npm ci`)
- Builds the client
- Audits for high-severity vulnerabilities

Dependabot is configured to open weekly PRs for outdated npm and GitHub Actions dependencies.
