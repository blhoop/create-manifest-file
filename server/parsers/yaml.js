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
// Supports dot-notation for nested keys, e.g. "plan_override.sku"
// ---------------------------------------------------------------------------
function buildCommentFromEntry(entry, commentKeys) {
  const parts = []
  for (const { commentKey, yamlKey } of commentKeys) {
    const val = yamlKey.split('.').reduce((obj, k) => obj?.[k], entry)
    if (val != null && val !== '') {
      parts.push(`${commentKey}:${val}`)
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

  // compute.plan_defaults (v1.0.0+) — synthesise app_service_plan rows to preserve os_type/sku
  const planDefaults = doc.compute?.plan_defaults
  if (planDefaults?.web_app) {
    rows.push({
      name:     'web',
      type:     'app_service_plan',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(planDefaults.web_app, [
        { commentKey: 'os_type', yamlKey: 'os_type' },
        { commentKey: 'sku',     yamlKey: 'sku' },
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
        { commentKey: 'os_type', yamlKey: 'os_type' },
        { commentKey: 'sku',     yamlKey: 'sku' },
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
        { commentKey: 'os_type',          yamlKey: 'os_type' },
        { commentKey: 'share_plan_with',  yamlKey: 'share_plan_with' },
        { commentKey: 'plan_override_sku', yamlKey: 'plan_override.sku' },
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
        { commentKey: 'runtime',          yamlKey: 'runtime' },
        { commentKey: 'share_plan_with',  yamlKey: 'share_plan_with' },
        { commentKey: 'plan_override_sku', yamlKey: 'plan_override.sku' },
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
        { commentKey: 'sku',      yamlKey: 'sku' },
        { commentKey: 'location', yamlKey: 'location' },
      ]),
    })
  }

  // compute.container_app_environment (singleton)
  if (doc.compute?.container_app_environment) {
    const cae = doc.compute.container_app_environment
    rows.push({
      name:     cae.subsystem ?? '',
      type:     'container_app_environment',
      location: '',
      repo:     '',
      comments: '',
    })
  }

  // compute.container_apps
  for (const entry of (doc.compute?.container_apps ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'container_app',
      location: '',
      repo:     entry.app_repo ?? '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'image',        yamlKey: 'image' },
        { commentKey: 'cpu',          yamlKey: 'cpu' },
        { commentKey: 'memory',       yamlKey: 'memory' },
        { commentKey: 'min_replicas', yamlKey: 'min_replicas' },
        { commentKey: 'max_replicas', yamlKey: 'max_replicas' },
        { commentKey: 'target_port',  yamlKey: 'target_port' },
        { commentKey: 'transport',    yamlKey: 'transport' },
      ]),
    })
  }

  // compute.aks_clusters
  for (const entry of (doc.compute?.aks_clusters ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'aks',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'kubernetes_version', yamlKey: 'kubernetes_version' },
        { commentKey: 'sku_tier',           yamlKey: 'sku_tier' },
        { commentKey: 'vm_size',            yamlKey: 'default_node_pool.vm_size' },
        { commentKey: 'node_count',         yamlKey: 'default_node_pool.node_count' },
        { commentKey: 'min_count',          yamlKey: 'default_node_pool.min_count' },
        { commentKey: 'max_count',          yamlKey: 'default_node_pool.max_count' },
      ]),
    })
  }

  // compute.virtual_machines
  for (const entry of (doc.compute?.virtual_machines ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'vm',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'os_type',              yamlKey: 'os_type' },
        { commentKey: 'vm_size',              yamlKey: 'vm_size' },
        { commentKey: 'admin_username',       yamlKey: 'admin_username' },
        { commentKey: 'storage_account_type', yamlKey: 'os_disk.storage_account_type' },
      ]),
    })
  }

  // compute.signalr
  for (const entry of (doc.compute?.signalr ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'signalr',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku',          yamlKey: 'sku' },
        { commentKey: 'service_mode', yamlKey: 'service_mode' },
      ]),
    })
  }

  // compute.apim (singleton)
  if (doc.compute?.apim && typeof doc.compute.apim === 'object' && !Array.isArray(doc.compute.apim)) {
    const apim = doc.compute.apim
    rows.push({
      name:     apim.subsystem ?? apim.id ?? '',
      type:     'apim',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(apim, [
        { commentKey: 'sku',             yamlKey: 'sku' },
        { commentKey: 'publisher_name',  yamlKey: 'publisher_name' },
        { commentKey: 'publisher_email', yamlKey: 'publisher_email' },
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
    // sku in schema is "Balanced_B0" — split into tier+size for popup fields
    const fullSku = entry.sku ?? ''
    const skuParts = fullSku.split('_')
    const tier = skuParts[0] || ''
    const size = skuParts[1] || ''
    const cacheParts = []
    if (tier) cacheParts.push(`sku:${tier}`)
    if (size) cacheParts.push(`capacity:${size}`)
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'redis',
      location: '',
      repo:     '',
      comments: cacheParts.join(', '),
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
        { commentKey: 'sku',             yamlKey: 'sku' },
        { commentKey: 'replica_count',   yamlKey: 'replica_count' },
        { commentKey: 'partition_count', yamlKey: 'partition_count' },
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

  // data.storage_accounts
  for (const entry of (doc.data?.storage_accounts ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'storage_account',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku',  yamlKey: 'sku' },
        { commentKey: 'kind', yamlKey: 'kind' },
      ]),
    })
  }

  // data.backup_vaults
  for (const entry of (doc.data?.backup_vaults ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'backup_vault',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'redundancy', yamlKey: 'redundancy' },
      ]),
    })
  }

  // data.messaging (service bus)
  for (const entry of (doc.data?.messaging ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'servicebus',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
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

  // security.container_registries
  for (const entry of (doc.security?.container_registries ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'container_registry',
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
        { commentKey: 'retention_days', yamlKey: 'retention_days' },
      ]),
    })
  }

  // app_configuration (top-level array)
  for (const entry of (Array.isArray(doc.app_configuration) ? doc.app_configuration : [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'app_configuration',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(entry, [
        { commentKey: 'sku', yamlKey: 'sku' },
      ]),
    })
  }

  // ai.foundry
  for (const entry of (doc.ai?.foundry ?? [])) {
    rows.push({
      name:     entry.subsystem ?? entry.id ?? '',
      type:     'openai',
      location: '',
      repo:     '',
      comments: '',
    })
  }

  // frontdoor.profile (singleton)
  if (doc.frontdoor?.profile) {
    const fd = doc.frontdoor.profile
    rows.push({
      name:     fd.subsystem ?? fd.id ?? '',
      type:     'frontdoor',
      location: '',
      repo:     '',
      comments: buildCommentFromEntry(fd, [
        { commentKey: 'sku', yamlKey: 'sku' },
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
