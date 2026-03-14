// Location defaults applied after parsing.
// Only fills in rows where location is empty — never overrides an explicit value.

// Resources that are region-independent in Azure
const GLOBAL_SERVICES = new Set([
  'Front Door',
  'Front Door (Classic)',
  'Front Door WAF Policy',
  'CDN Profile',
  'Traffic Manager',
  'Action Group',
  'Metric Alert',
  'Entra ID',
  'Web Application Firewall',
  'Private DNS Zone',
])

// Resources not available in australiaeast — fall back to eastasia
const EASTASIA_SERVICES = new Set([
  'Static Web App',
])

const DEFAULT_REGION = 'australiaeast'

function locationForType(serviceType) {
  if (!serviceType) return DEFAULT_REGION
  if (GLOBAL_SERVICES.has(serviceType)) return 'global'
  if (EASTASIA_SERVICES.has(serviceType)) return 'eastasia'
  return DEFAULT_REGION
}

function applyLocationDefaults(rows) {
  return rows.map(row => {
    if (row.location) return row  // already set — don't override
    return { ...row, location: locationForType(row.service_type) }
  })
}

module.exports = { applyLocationDefaults, locationForType }
