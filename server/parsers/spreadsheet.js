const ExcelJS = require('exceljs')
const path = require('path')

const COLUMN_ALIASES = {
  spoke_name:        ['spoke_name', 'spoke name', 'name', 'application', 'application name', 'app', 'app name', 'service', 'resource name'],
  environment:       ['environment', 'env'],
  location:          ['location', 'region', 'azure region'],
  service_type:      ['service_type', 'service type', 'type', 'resource type', 'kind', 'category'],
  app_repo:          ['app_repo', 'app repo', 'repository', 'repo'],
  special_comments:  ['special_comments', 'special comments', 'comments', 'notes', 'dependencies', 'description'],
  existing_app_repo: ['existing_app_repo', 'existing app repo', 'existing repo'],
  subscription_id:   ['subscription_id', 'subscription id', 'subscription'],
  spn_client_id:     ['spn_client_id', 'spn client id', 'spn', 'client id', 'service principal'],
  vnet_cidr:         ['vnet_cidr', 'vnet cidr', 'cidr', 'vnet'],
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
    const out = {
      spoke_name: '', environment: '', location: '', service_type: '',
      app_repo: '', special_comments: '', existing_app_repo: '',
      subscription_id: '', spn_client_id: '', vnet_cidr: '',
    }
    row.eachCell((cell, colNum) => {
      const canonical = headers[colNum - 1]
      if (canonical in out) out[canonical] = String(cell.value ?? '')
    })
    if (Object.values(out).some(v => v)) rows.push(out)
  })

  return rows
}
