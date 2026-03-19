/**
 * normalizeName.js
 *
 * Normalizes spoke_name values so the downstream automation rig receives
 * clean base names it can use directly as Terraform identifiers, GitHub repo
 * names, and workflow names — no further normalization needed downstream.
 *
 * Rules are applied in order. See naming.md for the full specification.
 */

// Azure region slugs — segments matching these are stripped from hyphen-delimited names
const AZURE_REGIONS = new Set([
  'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
  'northcentralus', 'southcentralus', 'westcentralus',
  'northeurope', 'westeurope',
  'uksouth', 'ukwest',
  'southeastasia', 'eastasia',
  'australiaeast', 'australiasoutheast',
  'canadacentral', 'canadaeast',
  'brazilsouth',
  'japaneast', 'japanwest',
  'koreacentral', 'koreasouth',
  'southindia', 'centralindia', 'westindia',
  'francecentral', 'francesouth',
  'switzerlandnorth', 'switzerlandwest',
  'germanywestcentral',
  'norwayeast',
  'uaenorth',
  'southafricanorth',
])

// Azure resource-type prefixes that are stripped from the front of the name.
// These appear in names from Azure Portal exports and diagram labels.
const TYPE_PREFIXES = [
  'appinsights-',
  'appinsights',
  'appi-',
  'func-',
  'kv-',
  'mi-',
]

// Canonical type names — any incoming variant is remapped to the standard value.
// Keys are the normalized form (lowercase, spaces/underscores/slashes removed).
const TYPE_REMAP = {
  // Compute — old inventory/variant names → canonical
  'appservice':       'app_service',
  'webapp':           'app_service',
  'appserviceslots':  'app_service',
  'webappslots':      'app_service',
  'functionapp':      'app_service',
  'appserviceplan':   'app_service',
  // Static web app
  'swa':              'static_web_app',
  'staticwebapp':     'static_web_app',
  'staticsite':       'static_web_app',
  // Messaging — old underscored name normalizes to canonical without underscore
  'servicebus':       'servicebus',
  // AI
  'aifoundry':        'openai',
  'aisearch':         'search',
  // Data
  'storageaccount':   'storage_account',
  'sqlserver':        'sql',
  'sqldatabase':      'sql',
  'cosmosdb':         'cosmos',
  'cosmosdbaccount':  'cosmos',
  'cosmosaccount':    'cosmos',
  'datafactory':      'data_factory',
  // Security & identity
  'keyvault':         'key_vault',
  'managedidentity':  'user_assigned_identity',
  'useridentity':     'user_assigned_identity',
  'userassignedidentity': 'user_assigned_identity',
  'identity':         'user_assigned_identity',
  // Platform
  'appconfiguration': 'app_configuration',
  'frontdoor':        'frontdoor',
  'afd':              'frontdoor',
}

function normalizeTypeName(type) {
  if (!type || typeof type !== 'string') return type
  const key = type.toLowerCase().replace(/[\s_/]+/g, '')
  return TYPE_REMAP[key] ?? type
}

// ─── Org-specific prefixes ────────────────────────────────────────────────────
// Add your organization's naming prefixes here. They are stripped from the
// front of the name (and as middle/end segments where noted).
//
// Format: plain string, e.g. 'myorg-'
// The dash is significant — 'myorg-' only strips when followed by more text.
// Without a dash (e.g. 'myorg') it strips even when directly concatenated.
//
// Example from a known org: ['ctmna-', 'ctmna', 'ctm-', 'ctm']
const ORG_PREFIXES = []
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Normalizes a single spoke_name string.
 *
 * @param {string} name - Raw spoke_name from a parser
 * @returns {string|null} Normalized name, or null if the row should be dropped
 *                        (e.g. Azure deployment slot B — duplicate of slot A)
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') return name

  // 1. Normalize whitespace: collapse spaces around hyphens, remove remaining spaces
  //    "foo - bar" → "foo-bar", "Failure Anomalies - my-app" → "FailureAnomalies-my-app"
  let s = name.trim().replace(/\s*-\s*/g, '-').replace(/\s+/g, '')

  // 2. Drop Azure deployment slot B resources — they are duplicates of slot A
  //    Matches -b- (middle), -b (end), or -b/ (before a sub-path)
  if (/-b(?:-|\/|$)/i.test(s)) return null

  // 3. Strip environment suffixes
  //    Protect "pre-prod" first so it survives the -prod strip
  s = s.replace(/pre-prod/gi, '\x00PREPROD\x00')
  s = s.replace(/-prod(?=-|\/|$)/gi, '')  // -prod as a hyphen-delimited segment
  s = s.replace(/prod$/i, '')              // bare prod at end with no hyphen
  s = s.replace(/\x00PREPROD\x00/g, 'pre-prod')
  s = s.replace(/-(uat|staging|stage|test|dev)(?=-|\/|$)/gi, '')

  // 4. Strip Azure resource-type prefixes from the front of the name
  for (const prefix of TYPE_PREFIXES) {
    const re = new RegExp('^' + escapeRegex(prefix), 'i')
    s = s.replace(re, '')
  }

  // 5. Strip org-specific prefixes from the front of the name
  for (const prefix of ORG_PREFIXES) {
    const re = new RegExp('^' + escapeRegex(prefix), 'i')
    s = s.replace(re, '')
  }

  // 6. Strip standalone deployment slot A suffix (-a as a segment, not part of a word)
  //    "myapp-a" → "myapp", "myapp-a-001" → "myapp-001"
  s = s.replace(/-a(?=-|\/|$)/gi, '')

  // 7. Strip Azure region segments and pure numeric ordinals from hyphen-delimited parts
  //    "orders-api-eastus-001" → "orders-api"
  s = s
    .split('-')
    .filter(seg => seg && !AZURE_REGIONS.has(seg.toLowerCase()) && !/^\d+$/.test(seg))
    .join('-')

  // 8. Cleanup
  s = s.replace(/--+/g, '-')    // collapse consecutive hyphens
  s = s.replace(/^-+|-+$/g, '') // trim leading/trailing hyphens

  // Deduplicate consecutive identical segments (case-insensitive)
  // "smart-smart-detector" → "smart-detector"
  const parts = s.split('-')
  s = parts
    .filter((seg, i) => i === 0 || seg.toLowerCase() !== parts[i - 1].toLowerCase())
    .join('-')

  // 9. Lowercase the result
  s = s.toLowerCase()

  return s || null
}

/**
 * Applies normalizeName to every row in a parsed result set.
 * Rows where normalizeName returns null are dropped.
 *
 * @param {Array<Object>} rows - Parser output rows
 * @returns {Array<Object>} Rows with normalized spoke_name, nulls removed
 */
function normalizeRows(rows) {
  const { cleanComments } = require('./cleanComments')
  const out = []
  for (const row of rows) {
    const normalized = normalizeName(row.name)
    if (normalized === null) continue
    out.push({
      ...row,
      name: normalized,
      type: normalizeTypeName(row.type),
      comments: cleanComments(row.comments)
    })
  }
  return out
}

module.exports = { normalizeName, normalizeRows, normalizeTypeName }
