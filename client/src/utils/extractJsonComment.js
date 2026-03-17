/**
 * Extracts a concise comment string from Azure portal JSON.
 * Rules defined in json-comment-rules.md — update both files together.
 */

// Key segments that must never appear in comments (security/privacy)
const SECURITY_PATTERNS = [
  /id$/i, /key/i, /secret/i, /token/i, /password/i, /connectionstring/i,
  /sasurl/i, /primaryendpoint/i, /secondaryendpoint/i, /^uri$/i, /url/i,
  /certificate/i, /thumbprint/i, /principalid/i, /clientid/i, /tenantid/i,
]

// Exact top-level keys to skip (noise / already captured in other columns)
const NOISE_KEYS = new Set([
  'location', 'tags', 'provisioningstate', 'createdtime', 'lastmodifiedtime',
  'etag', 'type', 'name', 'resourcegroup', 'subscriptionid', 'apiversion', 'dependson',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
const CIDR_RE = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})$/

// Known field paths → comment labels, checked in priority order.
// The first match for a given label wins (prevents duplicates).
const FIELD_LABELS = [
  // Universal
  { path: 'sku.name',                               label: 'sku' },
  { path: 'sku.tier',                               label: 'tier' },
  { path: 'sku.size',                               label: 'size' },
  { path: 'sku.capacity',                           label: 'capacity' },
  { path: 'kind',                                   label: 'kind' },
  { path: 'properties.accessTier',                  label: 'accessTier' },
  { path: 'properties.replicaCount',                label: 'replicaCount' },
  { path: 'properties.zoneRedundant',               label: 'zoneRedundant' },
  { path: 'properties.httpsOnly',                   label: 'httpsOnly' },
  { path: 'properties.minimumTlsVersion',           label: 'minTls' },
  { path: 'properties.publicNetworkAccess',         label: 'publicAccess' },
  { path: 'properties.addressPrefix',               label: 'addressPrefix' },
  // Storage Account
  { path: 'properties.supportsHttpsTrafficOnly',    label: 'httpsOnly' },
  { path: 'properties.allowBlobPublicAccess',       label: 'publicBlob' },
  { path: 'properties.largeFileSharesState',        label: 'largeFileShares' },
  { path: 'properties.isHnsEnabled',               label: 'hns' },
  // App Service / Function App
  { path: 'properties.reserved',                   label: 'linux' },
  { path: 'properties.siteConfig.numberOfWorkers', label: 'workers' },
  { path: 'properties.siteConfig.use32BitWorkerProcess', label: '32bit' },
  // SQL / PostgreSQL / MySQL
  { path: 'properties.storageProfile.storageMB',   label: 'storageMB' },
  { path: 'properties.version',                    label: 'version' },
  // Key Vault (sku nested under properties)
  { path: 'properties.sku.name',                   label: 'sku' },
  { path: 'properties.enableSoftDelete',            label: 'softDelete' },
  { path: 'properties.enablePurgeProtection',       label: 'purgeProtection' },
]

function getByPath(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj)
}

function isSecurityKey(key) {
  return SECURITY_PATTERNS.some(re => re.test(key))
}

function isUsableValue(val) {
  if (val == null) return false
  if (typeof val === 'object') return false
  const str = String(val)
  if (str.length === 0) return false
  if (str.length > 60) return false
  if (UUID_RE.test(str)) return false
  if (str.startsWith('/subscriptions/')) return false
  if (ISO_DATE_RE.test(str)) return false
  return true
}

/**
 * Parse Azure portal JSON and return a short comment string, or null if
 * no useful fields were found (caller should leave comments unchanged).
 */
export function extractJsonComment(jsonText) {
  let parsed
  try {
    parsed = JSON.parse(jsonText.trim())
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed) || !parsed) return null

  const seen = new Set()
  const parts = []

  for (const { path, label } of FIELD_LABELS) {
    if (seen.has(label)) continue

    const leafKey = path.split('.').pop()
    if (isSecurityKey(leafKey)) continue

    const val = getByPath(parsed, path)
    if (val == null) continue

    // addressPrefix: extract mask notation only, skip full CIDR IPs
    if (label === 'addressPrefix') {
      const str = String(val)
      const maskMatch = str.match(/\/(\d{1,2})$/)
      if (maskMatch) {
        parts.push(`addressPrefix:/${maskMatch[1]}`)
        seen.add(label)
      }
      continue
    }

    // Booleans: true → label only; false → skip
    if (typeof val === 'boolean') {
      if (val === true) {
        parts.push(label)
        seen.add(label)
      }
      continue
    }

    if (!isUsableValue(val)) continue

    parts.push(`${label}:${val}`)
    seen.add(label)
  }

  if (parts.length === 0) return null

  const result = parts.join(', ')
  return result.length > 120 ? result.slice(0, 119) + '…' : result
}

/**
 * Append an extracted comment string to existing comments using ' | ' as separator.
 */
export function appendComment(existing, extracted) {
  const base = (existing ?? '').trim()
  return base ? `${base} | ${extracted}` : extracted
}
