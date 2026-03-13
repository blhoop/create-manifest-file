const fs = require('fs')
const { XMLParser } = require('fast-xml-parser')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: () => true,
  textNodeName: '#text',
})

module.exports = function parseSvg(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8')
  const doc = parser.parse(xml)

  // Collect all text nodes recursively
  const texts = []
  collectTexts(doc, texts)

  // Unique, non-empty, meaningful labels
  const labels = [...new Set(
    texts
      .map(t => t.trim().replace(/\s+/g, ' '))
      .filter(t => t.length > 1 && t.length < 200)
  )]

  // SVG has no explicit edge data we can reliably parse without knowing the tool
  // that generated it, so we return rows without dependency info
  return labels.map(label => ({
    spoke_name: label,
    environment: '',
    location: '',
    service_type: 'Resource',
    app_repo: '',
    special_comments: '',
    existing_app_repo: '',
    subscription_id: '',
    spn_client_id: '',
    vnet_cidr: '',
  }))
}

function collectTexts(node, out) {
  if (typeof node === 'string') {
    if (node.trim()) out.push(node.trim())
    return
  }
  if (Array.isArray(node)) {
    node.forEach(n => collectTexts(n, out))
    return
  }
  if (typeof node === 'object' && node !== null) {
    for (const [key, val] of Object.entries(node)) {
      if (key === '@_style' || key === '@_d' || key === '@_transform') continue
      collectTexts(val, out)
    }
  }
}
