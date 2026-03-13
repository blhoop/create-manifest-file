# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- `App.jsx` — orchestrates file upload, loading state, preview, and CSV download
- `components/FileUpload.jsx` — drag-and-drop + click-to-browse, sends multipart POST to `/api/parse`
- `components/PreviewTable.jsx` — renders parsed rows before download
- Vite proxy: `/api/*` → `http://localhost:3001`

**Backend** (`server/`)
- `index.js` — Express entry point
- `routes/upload.js` — `POST /api/parse`: receives file via multer, dispatches to correct parser by extension, returns `{ rows }`, deletes temp file
- `parsers/` — one module per format:
  - `spreadsheet.js` — SheetJS, fuzzy-maps column headers to canonical names (`name`, `type`, `special comments`)
  - `drawio.js` — fast-xml-parser, extracts shape labels + edge source/target to build dependency strings
  - `visio.js` — unzips VSDX, parses `visio/pages/page*.xml`, extracts shape text + Connect elements
  - `svg.js` — XML parser, collects all text nodes
  - `image.js` — sends base64 image to Claude Vision API (`claude-sonnet-4-6`) with a structured prompt
  - `pdf.js` — sends base64 PDF to Claude API as a `document` content block

**CSV output columns:** `name` (application name), `type` (resource type), `special comments` (dependency connections).

## Environment

Copy `.env.example` → `.env` and set `ANTHROPIC_API_KEY`. Required for PNG, JPG, and PDF parsing (Claude Vision). XML-based formats and spreadsheets work without it.
