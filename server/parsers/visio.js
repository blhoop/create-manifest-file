const unzipper = require('unzipper')
const { XMLParser } = require('fast-xml-parser')
const path = require('path')
const { inferTypeFromVisio } = require('./resourceTypes')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['Shape', 'Connect'].includes(name),
})

module.exports = async function parseVisio(filePath) {
  const zip = await unzipper.Open.file(filePath)

  // Find page XML files
  const pageFiles = zip.files.filter(f =>
    f.path.startsWith('visio/pages/page') && f.path.endsWith('.xml')
  )

  if (!pageFiles.length) throw new Error('No pages found in VSDX file')

  const rows = []
  const seen = new Set()

  for (const pageFile of pageFiles) {
    const content = await pageFile.buffer()
    const doc = parser.parse(content.toString('utf8'))

    const pageSheet = doc?.PageContents?.Shapes
    if (!pageSheet) continue

    const shapes = pageSheet.Shape || []

    // Build id->name map and collect edges
    const idToName = {}
    const edges = []

    shapes.forEach(shape => {
      const id = shape['@_ID']
      const name = shape['@_Name'] || shape['@_NameU'] || ''
      // Try to get text from Text element
      const text = extractVisioText(shape)
      if (text) idToName[id] = text

      // Check for connections
      const connects = shape.Connect || []
      connects.forEach(c => {
        const from = c['@_FromSheet']
        const to = c['@_ToSheet']
        if (from && to) edges.push({ from, to })
      })
    })

    // Build dependency map
    const deps = {}
    edges.forEach(({ from, to }) => {
      const fromName = idToName[from]
      const toName = idToName[to]
      if (fromName && toName && fromName !== toName) {
        if (!deps[fromName]) deps[fromName] = new Set()
        deps[fromName].add(toName)
      }
    })

    shapes.forEach(shape => {
      const text = extractVisioText(shape)
      if (!text || seen.has(text)) return
      seen.add(text)

      const type = inferVisioType(shape)
      const shapeDeps = deps[text] ? [...deps[text]].join(', ') : ''

      rows.push({
        name: text,
        type,
        'special comments': shapeDeps ? `Connected to: ${shapeDeps}` : '',
      })
    })
  }

  return rows
}

function extractVisioText(shape) {
  if (typeof shape.Text === 'string') return shape.Text.trim()
  if (shape.Text?.['#text']) return shape.Text['#text'].trim()
  return ''
}

function inferVisioType(shape) {
  const master = shape['@_Master'] || ''
  const name = shape['@_Name'] || ''
  return inferTypeFromVisio(master, name)
}
