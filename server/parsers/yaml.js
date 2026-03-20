const fs = require('fs')
const yaml = require('js-yaml')

// ---------------------------------------------------------------------------
// Old flat-format subscription keys (v1 backwards compat)
// ---------------------------------------------------------------------------
const LEGACY_SUBSCRIPTION_KEYS = [
  'subscription_name', 'environment', 'default_location',
  'product_code', 'sku_mode', 'vnet_cidr', 'subscription_id', 'spn_client_id',
]

// ---------------------------------------------------------------------------
// Parse comment string "Key:Value, Key2:Value2" → { Key: 'Value', ... }
// ---------------------------------------------------------------------------
function parseCommentFields(comments) {
  if (!comments) return {}
  const result = {}
  const pairs = String(comments).split(/[,\n]+/)
  for (const pair of pairs) {
    const idx = pair.indexOf(':')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (key) result[key] = val
  }
  return result
}

// ---------------------------------------------------------------------------
// Reconstruct comment string from known YAML entry fields
// ---------------------------------------------------------------------------
function buildCommentFromEntry(entry, commentKeys) {
  const parts = []
  for (const { commentKey, yamlKey } of commentKeys) {
    if (entry[yamlKey] != null && entry[yamlKey] !== '') {
      parts.push(`${commentKey}:${entry[yamlKey]}`)
    }
  }
  return parts.join(', ')
}

// ---------------------------------------------------------------------------
// New nested format (spoke:) parser
// ---------------------------------------------------------------------------
function parseNewFormat(doc) {
  const subscription = {}

  // spoke
  if (doc.spoke) {
    if (doc.spoke.name)                subscription.spoke_name          = String(doc.spoke.name)
    if (doc.spoke.owner)               subscription.owner               = String(doc.spoke.owner)
    if (doc.spoke.description)         subscription.description         = String(doc.spoke.description)
    if (doc.spoke.sku_mode)            subscription.sku_mode            = String(doc.spoke.sku_mode)
    if (doc.spoke.management_group_id) subscription.management_group_id = String(doc.spoke.management_group_id)
    if (doc.spoke.new_subscription != null) subscription.new_subscription = String(doc.spoke.new_subscription)
    if (doc.spoke.infra_repo)          subscription.infra_repo          = String(doc.spoke.infra_repo)
    if (doc.spoke.subscription_id)     subscription.subscription_id     = String(doc.spoke.subscription_id)
  }

  // ctm_properties
  if (doc.ctm_properties?.product) subscription.product = String(doc.ctm_properties.product)

  // environments — take first key
  if (doc.environments && typeof doc.environments === 'object') {
    const envKeys = Object.keys(doc.environments)
    if (envKeys.length > 0) {
      const envName = envKeys[0]
      subscription.environment = envName
      const envObj = doc.environments[envName]
      if (envObj?.location) subscription.default_location = String(envObj.location)
    }
  }

  // tags
  if (doc.tags) {
    if (doc.tags.cost_center)        subscription.cost_center        = String(doc.tags.cost_center)
    if (doc.tags.project)            subscription.project            = String(doc.tags.project)
    if (doc.tags.data_classification) subscription.data_classification = String(doc.tags.data_classification)
  }

  // network — vnet cidr
  if (Array.isArray(doc.network?.vnets) && doc.network.vnets[0]?.cidr) {
    subscription.vnet_cidr = String(doc.network.vnets[0].cidr)
  }

  // ---------------------------------------------------------------------------
  // Reconstruct flat rows from nested sections
  // ---------------------------------------------------------------------------
  const rows = []

  // compute.plan_defaults (v1.0.0+) — synthesise app_service_plan rows to preserve OS/SKU
  const planDefaults = doc.compute?.plan_defaults
  if (planDefaults?.web_app) {
    rows.push({
      name:     'web',
      type:     'app_service_plan',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(planDefaults.web_app, [
        { commentKey: 'OS', yamlKey: 'os_type' },
        { commentKey: 'SKU', yamlKey: 'sku' },
      ]),
    })
  }
  if (planDefaults?.function_app) {
    rows.push({
      name:     'func',
      type:     'app_service_plan',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(planDefaults.function_app, [
        { commentKey: 'OS', yamlKey: 'os_type' },
        { commentKey: 'SKU', yamlKey: 'sku' },
      ]),
    })
  }

  // compute.app_service_plans (pre-v1.0.0 format — kept for backwards compat)
  for (const entry of (doc.compute?.app_service_plans ?? [])) {
    rows.push({
      name:     entry.id ?? entry.subsystem ?? '',
      type:     'app_service_plan',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'OS', yamlKey: 'os_type' },
        { commentKey: 'SKU', yamlKey: 'sku' },
      ]),
    })
  }

  // compute.web_apps
  for (const entry of (doc.compute?.web_apps ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'web_app',
      location: '',
      repo:     entry.app_repo ?? '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'OS', yamlKey: 'os_type' },
      ]),
    })
  }

  // compute.function_apps
  for (const entry of (doc.compute?.function_apps ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'function_app',
      location: '',
      repo:     entry.app_repo ?? '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'Runtime', yamlKey: 'runtime' },
      ]),
    })
  }

  // compute.static_sites
  for (const entry of (doc.compute?.static_sites ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'static_web_app',
      location: '',
      repo:     entry.app_repo ?? '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
    })
  }

  // data.databases
  const DB_TYPE_MAP = {
    cosmos_account:              'cosmos',
    mssql_server:                'sql',
    postgresql_flexible_server:  'pg',
    mysql_flexible_server:       'mysql',
    mssql_managed_instance:      'sqlmi',
  }
  for (const entry of (doc.data?.databases ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     DB_TYPE_MAP[entry.type] ?? entry.type ?? 'sql',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
    })
  }

  // data.caching
  for (const entry of (doc.data?.caching ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'redis',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
    })
  }

  // data.search
  for (const entry of (doc.data?.search ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'search',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
    })
  }

  // data.factories
  for (const entry of (doc.data?.factories ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'data_factory',
      location: '',
      repo:     '',
      comments: '',
    })
  }

  // security.key_vaults
  for (const entry of (doc.security?.key_vaults ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'key_vault',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
    })
  }

  // security.managed_identities
  for (const entry of (doc.security?.managed_identities ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'user_assigned_identity',
      location: '',
      repo:     '',
      comments: '',
    })
  }

  // observability.app_insights
  for (const entry of (doc.observability?.app_insights ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'app_insights',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'retention', yamlKey: 'retention_days' },
      ]),
    })
  }

  return { subscription, rows }
}

// ---------------------------------------------------------------------------
// Legacy flat-format (resources:[]) parser
// ---------------------------------------------------------------------------
function parseLegacyFormat(doc) {
  const subscription = {}
  LEGACY_SUBSCRIPTION_KEYS.forEach(k => {
    if (doc[k] != null) subscription[k] = String(doc[k])
  })

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

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
module.exports = async function parseYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const doc = yaml.load(content)

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new Error('Could not parse YAML — file appears empty or invalid')
  }

  // Detect format by top-level key
  if (doc.spoke != null || doc.environments != null || doc.ctm_properties != null) {
    const result = parseNewFormat(doc)
    return result
  }

  return parseLegacyFormat(doc)
}
