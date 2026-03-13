# Create Manifest File

A web application that converts architecture diagrams and spreadsheets into a structured CSV manifest for cloud infrastructure automation. Upload a file, review and edit the extracted data in an interactive preview table, then download the CSV.

This tool is designed for **Project Managers, Architects, Developers, and Cloud Engineers** as part of an end-to-end Azure infrastructure provisioning pipeline — the CSV output drives downstream automation to build out cloud resources.

## Supported File Formats

| Format | Extension(s) | Method |
|--------|-------------|--------|
| Spreadsheets | `.xlsx` `.csv` `.tsv` | ExcelJS — fuzzy-maps column headers to manifest fields |
| draw.io diagrams | `.xml` | XML parser — extracts shapes + edge connections |
| Visio diagrams | `.vsdx` | Unzip + XML parser — reads shapes and Connect elements |
| SVG diagrams | `.svg` | XML parser — collects text labels from shapes |
| Image diagrams | `.png` `.jpg` `.jpeg` | Claude Vision API (`claude-sonnet-4-6`) — identifies Azure icons and diagram semantics |
| PDF diagrams | `.pdf` | Claude API (`claude-sonnet-4-6`) — extracts resources and dependencies from design docs |

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

## CSV Output

Every parsed file produces rows with the following 10 columns. The first 4 are required by the downstream automation pipeline:

| Column | Required | Description |
|--------|----------|-------------|
| `spoke_name` | ✅ | Resource or application instance name |
| `environment` | ✅ | Deployment environment (e.g. dev, staging, prod) |
| `location` | ✅ | Azure region (e.g. eastus, westeurope) |
| `service_type` | ✅ | Azure resource type (e.g. Function App, SQL Database, Managed Identity) |
| `app_repo` | | Application source repository |
| `special_comments` | | Dependency connections (e.g. "Connected to: Orders DB, Service Bus") |
| `existing_app_repo` | | Existing application repository if migrating |
| `subscription_id` | | Azure subscription ID |
| `spn_client_id` | | Service Principal client ID |
| `vnet_cidr` | | Virtual network CIDR block (e.g. 10.0.0.0/16) |

When parsing diagrams, the AI will populate as many columns as are visible in the source file. Remaining fields can be filled in using the interactive preview table before downloading.

## Preview & Editing

After parsing, the app displays an interactive preview table before download:

- **Required field markers** — the 4 required columns are marked with a red `*` in the header; a `(*) Required Fields` legend appears next to the Preview heading
- **Show / Hide Example** — toggles two read-only example rows at the top of the table so users can see the expected format without affecting real data
- **Inline row editing** — click any cell to edit directly; use Tab to move between cells
- **Add / delete rows** — add blank rows or remove unwanted ones
- **Detach File** — clears the current session to upload a new file without refreshing
- **Editable filename** — rename the output CSV before downloading
- **Sorted by service_type** — rows are sorted alphabetically on parse and after every edit
- **Session persistence** — rows and filename are saved to `localStorage` so a page refresh restores your work

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
│   └── parsers/
│       ├── spreadsheet.js   # ExcelJS
│       ├── drawio.js
│       ├── visio.js
│       ├── svg.js
│       ├── image.js         # Claude Vision API (sonnet)
│       └── pdf.js           # Claude API (sonnet)
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
