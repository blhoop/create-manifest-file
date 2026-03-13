const XLSX = require('xlsx')

const COLUMN_ALIASES = {
  name: ['name', 'application', 'application name', 'app', 'app name', 'service', 'resource name'],
  type: ['type', 'resource type', 'kind', 'category'],
  'special comments': ['special comments', 'comments', 'notes', 'dependencies', 'description'],
}

function normalizeHeaders(headers) {
  const map = {}
  headers.forEach(h => {
    const lower = h.toLowerCase().trim()
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(lower)) {
        map[h] = canonical
        return
      }
    }
    map[h] = lower
  })
  return map
}

module.exports = function parseSpreadsheet(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  if (!raw.length) return []

  const headerMap = normalizeHeaders(Object.keys(raw[0]))

  return raw.map(row => {
    const out = { name: '', type: '', 'special comments': '' }
    for (const [origKey, canonical] of Object.entries(headerMap)) {
      if (canonical in out) out[canonical] = String(row[origKey] ?? '')
    }
    return out
  })
}
