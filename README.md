# Create Manifest File

A web application that converts architecture diagrams and spreadsheets into a structured CSV manifest. Upload a file, preview the extracted data, and download a CSV with three columns: **name** (application name), **type** (resource type), and **special comments** (dependency connections).

## Supported File Formats

| Format | Extension(s) | Method |
|--------|-------------|--------|
| Spreadsheets | `.xlsx` `.csv` `.tsv` | ExcelJS — maps columns to manifest fields |
| draw.io diagrams | `.xml` | XML parser — extracts shapes + edge connections |
| Visio diagrams | `.vsdx` | Unzip + XML parser — reads shapes and Connect elements |
| SVG diagrams | `.svg` | XML parser — collects text labels from shapes |
| Image diagrams | `.png` `.jpg` `.jpeg` | Claude Vision API — interprets diagram semantics |
| PDF diagrams | `.pdf` | Claude API (document) — extracts resources and dependencies |

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

Every parsed file produces rows with the following columns:

| Column | Description |
|--------|-------------|
| `name` | Application or resource name |
| `type` | Resource type using [Microsoft CAF abbreviations](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations) (e.g. `appsvc`, `sqldb`, `kv`) |
| `special comments` | Line connector dependencies (e.g. "Connected to: Orders DB, Auth Service") |

## Preview & Editing

After parsing, the app displays an interactive preview table before download:

- **Inline row editing** — click any cell to edit `name`, `type`, or `special comments` directly; use Tab to move between cells
- **Editable filename** — click the filename above the table to rename the output CSV before downloading
- **Sorted by type** — rows are sorted alphabetically by type on parse and kept sorted after every edit
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
│       ├── spreadsheet.js
│       ├── drawio.js
│       ├── visio.js
│       ├── svg.js
│       ├── image.js         # Claude Vision API
│       └── pdf.js           # Claude API
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
