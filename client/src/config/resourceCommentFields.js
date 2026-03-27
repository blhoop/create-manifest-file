/**
 * Structured comment fields per resource type, keyed to match schema-template-v1.3.0.yml
 * field names. The comment string stored on each row is "key:value, key2:value2".
 *
 * Rules:
 *   - DERIVED schema fields (id, module, instance_number, subsystem) are omitted — handled automatically.
 *   - Keys match the YAML field name from the schema exactly.
 *   - REQUIRED schema fields come first, OPTIONAL below.
 *
 * Field types:
 *   select — dropdown with fixed options array
 *   text   — free-text input with optional placeholder
 *
 * Field flags:
 *   required: true — marks the field as REQUIRED in the schema (renders * in popup)
 */

const AZURE = {
  // ── Compute ────────────────────────────────────────────────────────────

  // plan_defaults.web_app / plan_defaults.function_app
  // PlanFor is an internal routing key (not in schema) — kept to classify the ASP row
  app_service_plan: {
    label: 'App Service Plan',
    fields: [
      { key: 'PlanFor',       label: 'Plan For',      required: true, type: 'select', options: ['Web App', 'Function App'] },
      { key: 'os_type',       label: 'OS',            required: true, type: 'select', options: ['Windows', 'Linux'] },
      { key: 'sku',           label: 'SKU',           required: true, type: 'select', options: [
        'B1', 'B2', 'B3',
        'S1', 'S2', 'S3',
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'EP1', 'EP2', 'EP3',
        'Y1',
      ]},
      { key: 'plan_strategy', label: 'Plan Strategy', type: 'select', options: ['dedicated', 'shared'] },
      { key: 'apps_per_plan', label: 'Apps Per Plan', type: 'text',   placeholder: 'e.g. 4 (only when strategy = shared)' },
    ],
  },

  // compute.web_apps
  app_service: {
    label: 'App Service',
    fields: [
      { key: 'os_type',           label: 'OS',              type: 'select', options: ['Windows', 'Linux'] },
      { key: 'instance_number',   label: 'Instance Number', type: 'text',   default: '001' },
      { key: 'plan_id',           label: 'Plan ID',         type: 'text',   placeholder: 'explicit ASP id, e.g. asp_custom' },
      { key: 'share_plan_with',   label: 'Share Plan With', type: 'text',   placeholder: 'app id, e.g. web_api' },
      { key: 'plan_override_sku', label: 'Plan Override SKU', type: 'select', options: [
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'I1v2', 'I2v2', 'I3v2',
      ]},
      { key: 'mi_user_assigned',  label: 'User-Assigned MIs', type: 'mi_multiselect' },
    ],
  },
  web_app: {
    label: 'Web App',
    fields: [
      { key: 'os_type',           label: 'OS',              type: 'select', options: ['Windows', 'Linux'] },
      { key: 'instance_number',   label: 'Instance Number', type: 'text',   default: '001' },
      { key: 'plan_id',           label: 'Plan ID',         type: 'text',   placeholder: 'explicit ASP id, e.g. asp_custom' },
      { key: 'share_plan_with',   label: 'Share Plan With', type: 'text',   placeholder: 'app id, e.g. web_api' },
      { key: 'plan_override_sku', label: 'Plan Override SKU', type: 'select', options: [
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'I1v2', 'I2v2', 'I3v2',
      ]},
      { key: 'mi_user_assigned',  label: 'User-Assigned MIs', type: 'mi_multiselect' },
    ],
  },

  // compute.function_apps
  function_app: {
    label: 'Function App',
    fields: [
      { key: 'runtime',           label: 'Runtime',         required: true, type: 'select', options: ['dotnet-isolated', 'node', 'python', 'java', 'powershell', 'custom'] },
      { key: 'instance_number',   label: 'Instance Number', type: 'text',   default: '001' },
      { key: 'plan_id',           label: 'Plan ID',         type: 'text',   placeholder: 'explicit ASP id, e.g. asp_custom' },
      { key: 'share_plan_with',   label: 'Share Plan With', type: 'text',   placeholder: 'app id, e.g. func_booking-expiry' },
      { key: 'plan_override_sku', label: 'Plan Override SKU', type: 'select', options: ['EP1', 'EP2', 'EP3'] },
      { key: 'mi_user_assigned',  label: 'User-Assigned MIs', type: 'mi_multiselect' },
    ],
  },

  // compute.static_sites
  static_web_app: {
    label: 'Static Web App',
    fields: [
      { key: 'sku',      label: 'SKU', required: true, type: 'select', options: ['Standard', 'Free'] },
      { key: 'location', label: 'Location Override', type: 'text',   placeholder: 'e.g. eastasia (limited regions)' },
    ],
  },

  // compute.container_app_environment (singleton)
  container_app_environment: {
    label: 'Container App Environment',
    fields: [
      { key: 'infrastructure_subnet_id', label: 'Infra Subnet', required: true, type: 'text', placeholder: 'e.g. snet_containerenvironment' },
    ],
  },

  // compute.container_apps
  container_app: {
    label: 'Container App',
    fields: [
      { key: 'image',        label: 'Image', required: true, type: 'text',   placeholder: 'e.g. mcr.microsoft.com/hello-world:latest' },
      { key: 'cpu',          label: 'CPU',          type: 'select', options: ['0.25', '0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'] },
      { key: 'memory',       label: 'Memory (Gi)',  type: 'select', options: ['0.5', '1.0', '1.5', '2.0', '3.0', '4.0'] },
      { key: 'min_replicas', label: 'Min Replicas', type: 'select', options: ['0', '1', '2', '3'] },
      { key: 'max_replicas', label: 'Max Replicas', type: 'text',   placeholder: 'e.g. 10' },
      { key: 'target_port',  label: 'Target Port',  type: 'text',   placeholder: 'e.g. 80' },
      { key: 'transport',    label: 'Transport',    type: 'select', options: ['auto', 'http', 'http2', 'tcp'] },
    ],
  },

  // compute.aks_clusters
  aks: {
    label: 'AKS',
    fields: [
      { key: 'kubernetes_version', label: 'K8s Version',   type: 'text',   placeholder: 'e.g. 1.29' },
      { key: 'sku_tier',          label: 'SKU Tier',       type: 'select', options: ['Standard', 'Free'] },
      { key: 'vm_size',           label: 'Node VM Size', required: true, type: 'text',   placeholder: 'e.g. Standard_D4s_v5' },
      { key: 'node_count',        label: 'Node Count',     type: 'text',   placeholder: 'e.g. 3' },
      { key: 'min_count',         label: 'Min Count',      type: 'text',   placeholder: 'e.g. 1' },
      { key: 'max_count',         label: 'Max Count',      type: 'text',   placeholder: 'e.g. 10' },
      { key: 'network_plugin',    label: 'Network Plugin', type: 'select', options: ['azure-cni', 'azure-cni-overlay', 'kubenet'] },
    ],
  },

  // compute.virtual_machines
  vm: {
    label: 'Virtual Machine',
    fields: [
      { key: 'os_type',              label: 'OS',      required: true, type: 'select', options: ['Linux', 'Windows'] },
      { key: 'vm_size',              label: 'VM Size', required: true, type: 'text',   placeholder: 'e.g. Standard_D2s_v5' },
      { key: 'admin_username',       label: 'Admin User',   type: 'text',   placeholder: 'e.g. azureuser' },
      { key: 'storage_account_type', label: 'OS Disk Type', type: 'select', options: ['Premium_LRS', 'StandardSSD_LRS', 'Standard_LRS'] },
    ],
  },

  // compute.signalr
  signalr: {
    label: 'SignalR Service',
    fields: [
      { key: 'sku',          label: 'SKU', required: true, type: 'select', options: ['Free_F1', 'Standard_S1', 'Premium_P1'] },
      { key: 'service_mode', label: 'Service Mode', type: 'select', options: ['Default', 'Serverless', 'Classic'] },
    ],
  },

  // compute.apim (singleton)
  apim: {
    label: 'API Management',
    fields: [
      { key: 'sku',             label: 'SKU',             required: true, type: 'select', options: ['Developer_1', 'Basic_1', 'Standard_1', 'Premium_1'] },
      { key: 'publisher_name',  label: 'Publisher Name',  required: true, type: 'text',   placeholder: 'e.g. My Org' },
      { key: 'publisher_email', label: 'Publisher Email', required: true, type: 'text',   placeholder: 'e.g. api@example.com' },
    ],
  },

  // ── Databases ──────────────────────────────────────────────────────────

  // data.databases — type: cosmos_account
  cosmos: {
    label: 'Cosmos DB',
    fields: [
      { key: 'sku',           label: 'Tier',          required: true, type: 'select', options: ['serverless', 'provisioned'] },
      { key: 'capacity_mode', label: 'Capacity Mode', type: 'select', options: ['provisioned', 'serverless'] },
      { key: 'type',          label: 'Type',          required: true, type: 'select', options: ['cosmos_account', 'mssql_server', 'postgresql_flexible_server', 'mssql_managed_instance', 'mysql_flexible_server'] },
      { key: 'consistency',   label: 'Consistency',   type: 'select', options: ['Eventual', 'Session', 'ConsistentPrefix', 'BoundedStaleness', 'Strong'] },
    ],
  },

  // data.databases — type: mssql_server
  sql: {
    label: 'Azure SQL',
    fields: [
      { key: 'sku', label: 'SKU', required: true, type: 'text', placeholder: 'e.g. GP_Gen5_2, GP_Gen5_4, BC_Gen5_2' },
    ],
  },

  // data.databases — type: postgresql_flexible_server
  pg: {
    label: 'PostgreSQL',
    fields: [
      { key: 'sku',        label: 'SKU', required: true, type: 'select', options: [
        'GP_Standard_D2s_v3', 'GP_Standard_D4s_v3', 'GP_Standard_D8s_v3',
        'MO_Standard_E2ds_v4', 'MO_Standard_E4ds_v4',
      ]},
      { key: 'version',    label: 'Version',    type: 'select', options: ['13', '14', '15', '16'] },
      { key: 'storage_mb', label: 'Storage MB', type: 'text',   placeholder: 'e.g. 32768' },
    ],
  },

  // data.databases — type: mysql_flexible_server
  mysql: {
    label: 'MySQL',
    fields: [
      { key: 'sku',     label: 'SKU', required: true, type: 'select', options: [
        'Burstable_Standard_B1ms', 'Burstable_Standard_B2s',
        'GeneralPurpose_Standard_D2ds_v4', 'GeneralPurpose_Standard_D4ds_v4',
        'MemoryOptimized_Standard_E2ds_v4', 'MemoryOptimized_Standard_E4ds_v4',
      ]},
      { key: 'version', label: 'Version', type: 'select', options: ['5.7', '8.0'] },
    ],
  },

  // data.databases — type: mssql_managed_instance
  sqlmi: {
    label: 'SQL Managed Instance',
    fields: [
      { key: 'sku',          label: 'SKU', required: true, type: 'text',   placeholder: 'e.g. GP_Gen5_4, BC_Gen5_8' },
      { key: 'license_type', label: 'License', type: 'select', options: ['LicenseIncluded', 'BasePrice'] },
    ],
  },

  // ── Storage & Messaging ────────────────────────────────────────────────

  // data.storage_accounts
  storage_account: {
    label: 'Storage Account',
    fields: [
      { key: 'sku',  label: 'Redundancy', type: 'select', options: [
        'Standard_LRS', 'Standard_ZRS', 'Standard_GRS', 'Standard_GZRS',
        'Premium_LRS', 'Premium_ZRS',
      ]},
      { key: 'kind', label: 'Kind',       type: 'select', options: ['StorageV2', 'BlobStorage'] },
    ],
  },

  // data.messaging (service bus)
  servicebus: {
    label: 'Service Bus',
    fields: [
      { key: 'sku',    label: 'SKU', required: true, type: 'select', options: ['Basic', 'Standard', 'Premium'] },
      { key: 'queues', label: 'Queues', type: 'text',   placeholder: 'e.g. orders, notifications' },
      { key: 'topics', label: 'Topics', type: 'text',   placeholder: 'e.g. events, audit' },
    ],
  },

  // data.caching (Managed Redis)
  redis: {
    label: 'Managed Redis',
    fields: [
      { key: 'sku',      label: 'Tier', required: true, type: 'select', options: ['Balanced', 'MemoryOptimized', 'FlashOptimized'] },
      { key: 'capacity', label: 'Size', required: true, type: 'select', options: ['B0', 'B1', 'B3', 'B5', 'B10', 'B20', 'B50', 'B100', 'B250', 'B500', 'B700', 'B1000'] },
    ],
  },

  // data.search
  search: {
    label: 'AI Search',
    fields: [
      { key: 'sku',             label: 'SKU', required: true, type: 'select', options: ['basic', 'standard', 'standard2', 'standard3', 'storage_optimized_l1', 'storage_optimized_l2'] },
      { key: 'replica_count',   label: 'Replicas',   type: 'text',   placeholder: 'e.g. 1' },
      { key: 'partition_count', label: 'Partitions', type: 'text',   placeholder: 'e.g. 1' },
    ],
  },

  // data.factories
  data_factory: {
    label: 'Data Factory',
    fields: [],
  },

  // data.backup_vaults
  backup_vault: {
    label: 'Backup Vault',
    fields: [
      { key: 'redundancy', label: 'Redundancy', type: 'select', options: ['LocallyRedundant', 'GeoRedundant', 'ZoneRedundant'] },
    ],
  },

  // ── Networking ─────────────────────────────────────────────────────────

  // network.vnets
  vnet: {
    label: 'Virtual Network',
    fields: [
      { key: 'cidr',        label: 'CIDR',        required: true, type: 'text', placeholder: 'e.g. 10.3.0.0/24' },
      { key: 'dns_servers', label: 'DNS Servers',                 type: 'text', default: 'hub-inherited', placeholder: 'hub-inherited or custom IPs' },
      { key: 'peering',     label: 'Hub Peering',                 type: 'text', placeholder: 'e.g. hub-network-vnet' },
    ],
  },

  // ── Security & Identity ────────────────────────────────────────────────

  // security.key_vaults
  key_vault: {
    label: 'Key Vault',
    fields: [
      { key: 'sku',          label: 'SKU', required: true, type: 'select', options: ['standard', 'premium'] },
      { key: 'access_model', label: 'Access Model', type: 'select', options: ['RBAC', 'access_policy'] },
    ],
  },

  // security.container_registries
  container_registry: {
    label: 'Container Registry',
    fields: [
      { key: 'sku',           label: 'SKU',             type: 'select', options: ['Basic', 'Standard', 'Premium'] },
      { key: 'georeplications', label: 'Geo-replications', type: 'text', placeholder: 'e.g. eastus2, westeurope' },
    ],
  },

  // security.managed_identities
  managed_identities: {
    label: 'Managed Identity',
    fields: [
      { key: 'subsystem',       label: 'Subsystem',       required: true, type: 'select', options: ['api', 'assets', 'compute', 'config', 'frontend', 'functions', 'web', 'webjobs'] },
      { key: 'instance_number', label: 'Instance Number', type: 'text',   default: '001' },
    ],
  },

  // ── Observability ──────────────────────────────────────────────────────

  // observability.app_insights
  app_insights: {
    label: 'App Insights',
    fields: [],
  },

  // ── App Configuration ──────────────────────────────────────────────────

  app_configuration: {
    label: 'App Configuration',
    fields: [
      { key: 'sku', label: 'SKU', type: 'select', options: ['standard', 'free'] },
    ],
  },

  // ── AI ─────────────────────────────────────────────────────────────────

  // ai.foundry
  openai: {
    label: 'Azure AI Foundry',
    fields: [
      { key: 'sku',      label: 'SKU',      type: 'text', placeholder: 'e.g. S0' },
      { key: 'projects', label: 'Projects', type: 'text', placeholder: 'e.g. my-project, another-project' },
    ],
  },

  // ── Front Door ─────────────────────────────────────────────────────────

  // frontdoor.profile
  frontdoor: {
    label: 'Azure Front Door',
    fields: [
      { key: 'sku', label: 'SKU', type: 'select', options: ['Standard_AzureFrontDoor', 'Premium_AzureFrontDoor'] },
    ],
  },
}

export const RESOURCE_COMMENT_FIELDS = {
  azure: AZURE,
  aws: {},   // future
  gcp: {},   // future
}

/**
 * Returns the field config for a resource type under the given provider,
 * or null if none is defined (caller should render plain-text fallback).
 *
 * Matching order:
 *  1. Exact key match
 *  2. Case-insensitive match ignoring spaces and underscores
 *     e.g. "SQL Database" → matches "SQLDatabase", "sql_database"
 *          "App Service"  → matches "app_service"
 *          "Key Vault"    → matches "key_vault", "KeyVault"
 */
export function getCommentFields(type, provider = 'azure') {
  if (!type) return null
  const ns = RESOURCE_COMMENT_FIELDS[provider]
  if (!ns) return null
  if (ns[type]) return ns[type]
  const normalize = s => s.toLowerCase().replace(/[\s_/]+/g, '')
  const needle = normalize(type)
  const match = Object.keys(ns).find(k => normalize(k) === needle)
  return match ? ns[match] : null
}
