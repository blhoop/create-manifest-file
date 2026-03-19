const fs = require('fs')
const yaml = require('js-yaml')

const SUBSCRIPTION_KEYS = [
  'subscription_name', 'environment', 'default_location',
  'product_code', 'sku_mode', 'vnet_cidr', 'subscription_id', 'spn_client_id',
]

module.exports = async function parseYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const doc = yaml.load(content)

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Could not parse YAML — file appears empty or invalid')
  }

  // Extract subscription fields
  const subscription = {}
  SUBSCRIPTION_KEYS.forEach(k => {
    if (doc[k] != null) subscription[k] = String(doc[k])
  })

  // Extract resources rows
  const resources = Array.isArray(doc.resources) ? doc.resources : []
  const rows = resources.map(r => ({
    name:     r.name     != null ? String(r.name)     : '',
    type:     r.type     != null ? String(r.type)     : '',
    location: r.location != null ? String(r.location) : '',
    repo:     r.repo     != null ? String(r.repo)     : '',
    comments: r.comments != null ? String(r.comments) : '',
  }))

  return { subscription, rows }
}
