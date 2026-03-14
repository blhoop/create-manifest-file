const { LOCATION_DEFAULTS, DEFAULT_LOCATION } = require('../config/outputSchema')

function locationForType(type) {
  if (!type) return DEFAULT_LOCATION
  for (const rule of LOCATION_DEFAULTS) {
    if (rule.types.includes(type)) return rule.location
  }
  return DEFAULT_LOCATION
}

function applyLocationDefaults(rows) {
  return rows.map(row => {
    if (row.location) return row
    return { ...row, location: locationForType(row.type) }
  })
}

module.exports = { applyLocationDefaults, locationForType }
