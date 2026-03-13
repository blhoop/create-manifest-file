# Create Manifest File

A web application that converts architecture diagrams and spreadsheets into a structured CSV manifest. Upload a file, preview the extracted data, and download a CSV with three columns: **name** (application name), **type** (resource type), and **special comments** (dependency connections).

## Supported File Formats

| Format | Extension(s) | Method |
|--------|-------------|--------|
| Spreadsheets | `.xlsx` `.xls` `.ods` `.csv` `.tsv` | SheetJS — maps columns to manifest fields |
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

Open two terminals:

```bash
# Terminal 1 — Express API (http://localhost:3001)
npm run dev:server

# Terminal 2 — React UI (http://localhost:5173)
npm run dev:client
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## CSV Output

Every parsed file produces rows with the following columns:

| Column | Description |
|--------|-------------|
| `name` | Application or resource name |
| `type` | Resource type (e.g. AWS Lambda, Database, API Gateway) |
| `special comments` | Line connector dependencies (e.g. "Connected to: Orders DB, Auth Service") |

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
