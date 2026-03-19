const fs = require('fs')
const { XMLParser } = require('fast-xml-parser')
const { inferTypeFromStyle } = require('./resourceTypes')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['mxCell', 'object', 'UserObject'].includes(name),
})

function getLabel(cell) {
  return (
    cell['@_label'] ||
    cell['@_value'] ||
    cell['@_name'] ||
    ''
  ).replace(/<[^>]+>/g, '').trim()
}

function getStyle(cell) {
  return cell['@_style'] || ''
}


module.exports = function parseDrawio(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8')
  const doc = parser.parse(xml)

  const root = doc?.mxGraphModel?.root || doc?.['mxfile']?.diagram?.mxGraphModel?.root
  if (!root) throw new Error('Could not parse draw.io XML structure')

  const cells = [
    ...(root.mxCell || []),
    ...(root.object || []),
    ...(root.UserObject || []),
  ]

  // Build edge map: source -> [target labels]
  const idToLabel = {}
  const edges = []

  cells.forEach(cell => {
    const id = cell['@_id']
    const label = getLabel(cell)
    if (id && label) idToLabel[id] = label

    const src = cell['@_source']
    const tgt = cell['@_target']
    const isEdge = cell['@_edge'] === '1' || (src && tgt)
    if (isEdge && src && tgt) edges.push({ src, tgt })
  })

  // Resolve edges to label names
  const dependencies = {}
  edges.forEach(({ src, tgt }) => {
    const srcLabel = idToLabel[src]
    const tgtLabel = idToLabel[tgt]
    if (srcLabel && tgtLabel) {
      if (!dependencies[srcLabel]) dependencies[srcLabel] = new Set()
      dependencies[srcLabel].add(tgtLabel)
    }
  })

  // Build rows from non-edge, non-empty-label cells
  const seen = new Set()
  const rows = []

  cells.forEach(cell => {
    const isEdge = cell['@_edge'] === '1' || (cell['@_source'] && cell['@_target'])
    if (isEdge) return

    const label = getLabel(cell)
    if (!label || seen.has(label)) return
    seen.add(label)

    const style = getStyle(cell)
    const type = inferTypeFromStyle(style, label)
    const deps = dependencies[label] ? [...dependencies[label]].join(', ') : ''

    rows.push({
      name: label,
      type,
      location: '',
      repo: '',
      server_name: '',
      plan_name: '',
      function_app_name: '',
      comments: deps ? `Connected to: ${deps}` : '',
    })
  })

  return rows
}
