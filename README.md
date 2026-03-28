# Create Manifest File

A web application that converts architecture diagrams, spreadsheets, and existing yaml files into a structured YAML manifest for cloud infrastructure automation. Upload a file, review and edit the extracted data in an interactive preview table, then download the YAML.

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

Every parsed file produces a spoke infrastructure manifest (schema v1.8.0). See [`output.md`](./output.md) for the full format specification and [`schema-template-v1.8.0.yml`](./schema-template-v1.8.0.yml) for the annotated reference template.

### Subscription Panel (spoke identity + config)

| Group | Field | Required | Description |
|-------|-------|----------|-------------|
| Identity | `spoke_name` | ✅ | Spoke/subscription friendly name |
| Identity | `owner` | ✅ | Owning team or individual |
| Identity | `product` | ✅ | 2–5 char product code used in all resource names |
| Identity | `spoke_id` | | Optional 2–5 char discriminator when multiple spokes share the same product code |
| Identity | `environment` | ✅ | Target environment (`dev` `test` `uat` `preprod` `prod` `lab`) |
| Identity | `default_location` | ✅ | Default Azure region for all resources |
| Tagging | `cost_center` | | Billing cost center code |
| Tagging | `project` | | Project or initiative name |
| Tagging | `data_classification` | | Data sensitivity classification |
| Tagging | `infra_repo` | | Infrastructure SCM repo (`org/repo-name`) |
| Infrastructure | `sku_mode` | | `Standard` or `Premium` — sets default SKU tier across resource types |
| Infrastructure | `vnet_cidr` | | VNet address space (size guide: `/24` app service, `/23` container apps, `/22` AKS) |
| Infrastructure | `management_group_id` | | Target management group for new subscriptions |
| Infrastructure | `new_subscription` | | `true` to provision a new subscription |
| Infrastructure | `subscription_id` | | Existing subscription UUID (shown when `new_subscription` is false) |
| Infrastructure | `description` | | Free-text description of the spoke's purpose |

### Resource Rows (one entry per resource)

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Subsystem/component name (e.g. `web`, `booking-db`) |
| `type` | ✅ | Resource type (see `output.md` for full list) |
| `location` | | Azure region override — omit to use `default_location` |
| `repo` | | SCM repo (`org/repo-name`) — triggers CI/CD caller workflow generation |
| `comments` | | Structured properties set via the popup editor (OS, SKU, consumers, NSG rules, etc.) |

## Preview & Editing

After parsing, the app displays an interactive preview before download:

- **Subscription panel** — fill in spoke identity fields (subscription name, environment, default location, and optional overrides) before downloading
- **Required field markers** — `name` and `type` are marked with a red `*`
- **Preview YAML** — opens a modal showing the full YAML output with a monospace code view; includes a validator that shows a green ✓ Valid badge or lists any issues, plus Copy to Clipboard
- **Show / Hide Example** — toggles two read-only example rows so users can see the expected format
- **Inline row editing** — click any cell to edit; Tab to move between cells
- **Cell intellisense** — typing in a cell shows a dropdown of matching values from other rows in the same column; ArrowUp/Down to navigate, Enter to accept
- **Row selection** — click a row number to select it; Shift+click for range; Ctrl+click to toggle; `⊠` button in the header clears all selections
- **Add / delete rows** — add blank rows or remove unwanted ones; new rows are always visible even when a type filter is active
- **Bulk column edit** — `▾` on `location` column for Set All, Find & Replace, and Clear All
- **Type filter** — `⊟` on `type` column filters visible rows by resource type for visual auditing
- **Parse Names** — strip unwanted text from `name` values across all rows at once (supports comma-separated terms)
- **Auto-quoting** — values containing YAML-unsafe characters (e.g. `OS: Windows` in comments) are automatically quoted in the output
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
│       ├── yaml.js          # js-yaml — round-trips existing manifests
│       ├── normalizeName.js # Normalizes resource names
│       └── locationDefaults.js
├── output.md                # YAML output format documentation
├── naming.md                # Naming conventions reference
├── networking-defaults.yml  # Canonical subnet sizes, PE DNS zones, NSG defaults
├── schema-template-v1.8.0.yml  # Annotated manifest schema reference
├── manifest-schema.json     # Machine-readable JSON schema (used by linter/validator)
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
