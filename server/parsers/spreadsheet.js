const ExcelJS = require('exceljs')
const path = require('path')

const COLUMN_ALIASES = {
  name: ['name', 'application', 'application name', 'app', 'app name', 'service', 'resource name'],
  type: ['type', 'resource type', 'kind', 'category'],
  'special comments': ['special comments', 'comments', 'notes', 'dependencies', 'description'],
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

  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headerRow = worksheet.getRow(1)
  const headers = []
  headerRow.eachCell((cell, colNum) => {
    headers[colNum - 1] = normalizeHeader(cell.value ?? '')
  })

  if (!headers.length) return []

  const rows = []
  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return
    const out = { name: '', type: '', 'special comments': '' }
    row.eachCell((cell, colNum) => {
      const canonical = headers[colNum - 1]
      if (canonical in out) out[canonical] = String(cell.value ?? '')
    })
    if (out.name || out.type || out['special comments']) rows.push(out)
  })

  return rows
}
