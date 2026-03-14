const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const parseSpreadsheet = require('../parsers/spreadsheet')
const parseDrawio = require('../parsers/drawio')
const parseVisio = require('../parsers/visio')
const parseSvg = require('../parsers/svg')
const parseImage = require('../parsers/image')
const parsePdf = require('../parsers/pdf')
const { normalizeRows } = require('../parsers/normalizeName')
const { applyLocationDefaults } = require('../parsers/locationDefaults')

const router = express.Router()
const upload = multer({ dest: path.join(__dirname, '../uploads/') })

const PARSERS = {
  '.xlsx': parseSpreadsheet,
  '.csv': parseSpreadsheet,
  '.tsv': parseSpreadsheet,
  '.xml': parseDrawio,
  '.vsdx': parseVisio,
  '.svg': parseSvg,
  '.png': parseImage,
  '.jpg': parseImage,
  '.jpeg': parseImage,
  '.pdf': parsePdf,
}

router.post('/parse', upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'No file uploaded' })

  const ext = path.extname(file.originalname).toLowerCase()
  const parser = PARSERS[ext]

  if (!parser) {
    fs.unlinkSync(file.path)
    return res.status(400).json({ error: `Unsupported file type: ${ext}` })
  }

  try {
    const raw = await parser(file.path, file.originalname)

    if (raw?.multiSheet) {
      const sheets = raw.sheets.map(s => ({
        name: s.name,
        rows: applyLocationDefaults(normalizeRows(s.rows)),
      }))
      return res.json({ rows: sheets[0].rows, sheets })
    }

    const rows = applyLocationDefaults(normalizeRows(raw))
    res.json({ rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Failed to parse file' })
  } finally {
    fs.unlink(file.path, () => {})
  }
})

module.exports = router
