/**
 * schemaMapping.js — maps each service_type to its target section in the
 * nested spoke infrastructure manifest schema.
 *
 * section:   top-level YAML key (compute / data / security / observability / network)
 * sub_key:   array key within that section
 * module:    CTM Terraform module registry name
 * db_type:   (databases only) value of the `type` field in the YAML entry
 * unmapped:  true = no schema equivalent, emitted as a commented block
 */

export const SCHEMA_MAPPING = {
  // ── Compute ──────────────────────────────────────────────────────────────
  // app_service_plan rows feed compute.plan_defaults (not an array section)
  app_service_plan: {
    section: 'compute',
    sub_key: 'app_service_plans', // used only for partitioning in buildYaml; builder reads from this bucket to derive plan_defaults
    module: 'terraform-azurerm-app-service-plan',
  },
  app_service: {
    section: 'compute',
    sub_key: 'web_apps',
    module: 'terraform-azurerm-windows-web-app', // refined by OS comment field
  },
  web_app: {
    section: 'compute',
    sub_key: 'web_apps',
    module: 'terraform-azurerm-windows-web-app', // refined by OS comment field
  },
  function_app: {
    section: 'compute',
    sub_key: 'function_apps',
    module: 'terraform-azurerm-windows-function-app', // refined by OS comment field
  },
  static_web_app: {
    section: 'compute',
    sub_key: 'static_sites',
    module: 'terraform-azurerm-static-web-app',
  },

  // Types with no equivalent in the schema template — emitted as comments
  container_app:             { unmapped: true },
  container_app_environment: { unmapped: true },
  aks:                       { unmapped: true },
  vm:                        { unmapped: true },

  // ── Data ─────────────────────────────────────────────────────────────────
  cosmos: {
    section: 'data',
    sub_key: 'databases',
    module: 'terraform-azurerm-cosmos-account',
    db_type: 'cosmos_account',
  },
  sql: {
    section: 'data',
    sub_key: 'databases',
    module: 'terraform-azurerm-mssql-server',
    db_type: 'mssql_server',
  },
  pg: {
    section: 'data',
    sub_key: 'databases',
    module: 'terraform-azurerm-postgresql-flexible-server',
    db_type: 'postgresql_flexible_server',
  },
  mysql: {
    section: 'data',
    sub_key: 'databases',
    module: 'terraform-azurerm-mysql-flexible-server',
    db_type: 'mysql_flexible_server',
  },
  sqlmi: {
    section: 'data',
    sub_key: 'databases',
    module: 'terraform-azurerm-mssql-managed-instance',
    db_type: 'mssql_managed_instance',
  },
  redis: {
    section: 'data',
    sub_key: 'caching',
    module: 'terraform-azurerm-managed-redis',
  },
  search: {
    section: 'data',
    sub_key: 'search',
    module: 'terraform-azurerm-search-service',
  },
  data_factory: {
    section: 'data',
    sub_key: 'factories',
    module: 'terraform-azurerm-data-factory',
  },

  // No schema equivalent
  storage_account: { unmapped: true },
  servicebus:      { unmapped: true },

  // ── Security ─────────────────────────────────────────────────────────────
  key_vault: {
    section: 'security',
    sub_key: 'key_vaults',
    module: 'terraform-azurerm-key-vault',
  },
  user_assigned_identity: {
    section: 'security',
    sub_key: 'managed_identities',
    module: 'terraform-azurerm-user-assigned-identity',
  },
  container_registry: { unmapped: true },

  // ── Observability ─────────────────────────────────────────────────────────
  app_insights: {
    section: 'observability',
    sub_key: 'app_insights',
    module: 'terraform-azurerm-application-insights',
  },

  // ── Platform / AI — no schema equivalent ──────────────────────────────────
  openai:            { unmapped: true },
  app_configuration: { unmapped: true },
  frontdoor:         { unmapped: true },
  vnet:              { unmapped: true },
}

/**
 * Parse a structured comment string into a key→value map.
 * Format: "Key:Value, Key2:Value2" or "Key:Value\nKey2:Value2"
 */
export function parseCommentFields(comments) {
  if (!comments) return {}
  const result = {}
  const pairs = comments.split(/[,\n]+/)
  for (const pair of pairs) {
    const idx = pair.indexOf(':')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim()
    const val = pair.slice(idx + 1).trim()
    if (key) result[key] = val
  }
  return result
}

/**
 * Determine the CTM module name for a web_app or function_app based on OS comment field.
 * Falls back to Windows if OS is not specified.
 */
export function resolveModule(serviceType, commentFields) {
  const os = (commentFields.OS || '').toLowerCase()
  const isLinux = os === 'linux'

  if (serviceType === 'function_app') {
    return isLinux
      ? 'terraform-azurerm-linux-function-app'
      : 'terraform-azurerm-windows-function-app'
  }
  if (serviceType === 'app_service' || serviceType === 'web_app') {
    return isLinux
      ? 'terraform-azurerm-linux-web-app'
      : 'terraform-azurerm-windows-web-app'
  }
  return SCHEMA_MAPPING[serviceType]?.module ?? null
}
