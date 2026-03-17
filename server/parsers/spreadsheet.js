const ExcelJS = require('exceljs')
const path = require('path')

const COLUMN_ALIASES = {
  name:     ['name', 'spoke_name', 'spoke name', 'resource name', 'application', 'application name', 'app', 'app name', 'service'],
  type:     ['type', 'service_type', 'service type', 'resource type', 'resourcetype', 'kind', 'category'],
  location: ['location', 'region', 'azure region'],
  repo:     ['repo', 'app_repo', 'app repo', 'repository'],
  comments: ['comments', 'special_comments', 'special comments', 'specialcomments', 'notes', 'dependencies', 'description'],
}

function normalizeHeader(h) {
  const lower = String(h).toLowerCase().trim()
for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(lower)) return canonical
  }
  return lower
}

module.exports = async function parseSpreadsheet(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase()
  const workbook = new ExcelJS.Workbook()

  if (ext === '.csv' || ext === '.tsv') {
    await workbook.csv.readFile(filePath, {
      parserOptions: { delimiter: ext === '.tsv' ? '\t' : ',' },
    })
  } else {
    await workbook.xlsx.readFile(filePath)
  }

  const worksheets = workbook.worksheets
  if (!worksheets.length) return []

  const parseSheet = (worksheet) => {
    const headerRow = worksheet.getRow(1)
    const headers = []
    headerRow.eachCell((cell, colNum) => {
      headers[colNum - 1] = normalizeHeader(cell.value ?? '')
    })
    if (!headers.length) return []
    const rows = []
    worksheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return
      const out = { name: '', type: '', location: '', repo: '', comments: '' }
      row.eachCell((cell, colNum) => {
        const canonical = headers[colNum - 1]
        if (canonical in out) out[canonical] = String(cell.value ?? '')
      })
      if (Object.values(out).some(v => v)) rows.push(out)
    })
    return rows
  }

  if (worksheets.length === 1) return parseSheet(worksheets[0])

  return {
    multiSheet: true,
    sheets: worksheets.map(ws => ({ name: ws.name, rows: parseSheet(ws) })),
  }
}
