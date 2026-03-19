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
// Source of truth: server/config/azureTypes.js
const { TYPE_REMAP, BUILDER_TYPES } = require('../config/azureTypes')
const { DEFAULT_LOCATION } = require('../config/outputSchema')
const CANONICAL_TYPES = new Set(BUILDER_TYPES)

function normalizeTypeName(type) {
  if (!type || typeof type !== 'string') return type
  const key = type.toLowerCase().replace(/[\s_/]+/g, '')
  // 1. Alias match (e.g. FunctionApp/slots → function_app)
  if (TYPE_REMAP[key]) return TYPE_REMAP[key]
  // 2. Already canonical but wrong case (e.g. Redis → redis)
  if (CANONICAL_TYPES.has(key)) return key
  // 3. Unknown — return as-is
  return type
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

  // 3. Strip bare env suffix without hyphen (e.g. "appprod" → "app")
  //    Protect "pre-prod" first so it survives the prod strip.
  s = s.replace(/pre-prod/gi, '\x00PREPROD\x00')
  s = s.replace(/(?<!-)prod$/i, '')  // bare prod at end, not preceded by hyphen
  s = s.replace(/\x00PREPROD\x00/g, 'pre-prod')

  // 4–7. Segment-level stripping with position tracking
  const segs = s.split('-')
  const n = segs.length

  // Identify "pre-prod" compound pairs (protected from env stripping)
  const preProdPositions = new Set()
  for (let i = 0; i < n - 1; i++) {
    if (segs[i].toLowerCase() === 'pre' && segs[i + 1].toLowerCase() === 'prod') {
      preProdPositions.add(i)
      preProdPositions.add(i + 1)
      i++ // skip 'prod' in next iteration
    }
  }

  const stripped = new Set()
  const ENV_SEGS = new Set(['prod', 'uat', 'staging', 'stage', 'test', 'dev'])

  // 4. Mark env segments (hyphen-delimited, skip pre-prod protected positions)
  for (let i = 0; i < n; i++) {
    if (!preProdPositions.has(i) && ENV_SEGS.has(segs[i].toLowerCase())) stripped.add(i)
  }

  // 5. Mark Azure region segments
  for (let i = 0; i < n; i++) {
    if (AZURE_REGIONS.has(segs[i].toLowerCase())) stripped.add(i)
  }

  // 6. Mark slot A segments (standalone -a- or trailing -a)
  for (let i = 0; i < n; i++) {
    if (!stripped.has(i) && segs[i].toLowerCase() === 'a') stripped.add(i)
  }

  // 7. Mark leading-zero numeric ordinals (e.g. "001") for removal.
  //    Rules:
  //    - Only targets segments matching /^0\d+$/ (padded ordinals, not years like "2024")
  //    - Only removes when the segment would be trailing after all other stripping
  //    - Protects originally-last ordinals that are adjacent to a stripped or pre-prod
  //      segment (they were "revealed" by stripping, not standalone suffixes)
  for (let i = 0; i < n; i++) {
    if (stripped.has(i) || !/^0\d+$/.test(segs[i])) continue

    // Would this segment be trailing after applying the stripped set?
    let wouldBeTrailing = true
    for (let j = i + 1; j < n; j++) {
      if (!stripped.has(j)) { wouldBeTrailing = false; break }
    }
    if (!wouldBeTrailing) continue

    // If the ordinal was originally the last segment, protect it when it neighbours
    // a stripped or pre-prod segment (it was exposed by stripping, not a bare suffix)
    if (i === n - 1) {
      const prevStripped = i > 0 && stripped.has(i - 1)
      const prevPreProd  = i > 0 && preProdPositions.has(i - 1)
      if (prevStripped || prevPreProd) continue  // keep it
    }

    stripped.add(i)
  }

  // Build the filtered segment list
  const kept = segs.filter((_, i) => !stripped.has(i))

  // If stripping would erase the entire name (e.g. a bare region like "eastus"),
  // return the name unchanged rather than null
  s = kept.length > 0 ? kept.join('-') : segs.join('-')

  // 8. Strip Azure resource-type prefixes from the front — first match only
  for (const prefix of TYPE_PREFIXES) {
    const re = new RegExp('^' + escapeRegex(prefix), 'i')
    if (re.test(s)) { s = s.replace(re, ''); break }
  }

  // 9. Strip org-specific prefixes from the front — first match only
  for (const prefix of ORG_PREFIXES) {
    const re = new RegExp('^' + escapeRegex(prefix), 'i')
    if (re.test(s)) { s = s.replace(re, ''); break }
  }

  // 10. Cleanup
  s = s.replace(/--+/g, '-')    // collapse consecutive hyphens
  s = s.replace(/^-+|-+$/g, '') // trim leading/trailing hyphens

  // Deduplicate consecutive identical segments (case-insensitive)
  // "smart-smart-detector" → "smart-detector"
  const parts = s.split('-')
  s = parts
    .filter((seg, i) => i === 0 || seg.toLowerCase() !== parts[i - 1].toLowerCase())
    .join('-')

  // 11. Lowercase the result
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
    // Clear location if it equals the subscription default — it's redundant as an override
    const location = (row.location || '').trim()
    out.push({
      ...row,
      name: normalized,
      type: normalizeTypeName(row.type),
      location: location.toLowerCase() === DEFAULT_LOCATION ? '' : location,
      comments: cleanComments(row.comments)
    })
  }
  return out
}

module.exports = { normalizeName, normalizeRows, normalizeTypeName }
