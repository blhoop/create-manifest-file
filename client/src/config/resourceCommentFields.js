/**
 * Structured comment fields per provider and resource type.
 * Used by ResourceCommentPopup to render type-aware forms.
 *
 * To add a new provider or resource type: add an entry here — no component changes needed.
 *
 * Field types:
 *   select — dropdown with fixed options array
 *   text   — free-text input with optional placeholder
 */

const AZURE = {
  // ── Compute ────────────────────────────────────────────────────────────
  app_service: {
    label: 'App Service',
    fields: [
      { key: 'OS',            label: 'OS',             type: 'select', options: ['Windows', 'Linux'] },
      { key: 'Runtime',       label: 'Runtime',        type: 'select', options: ['.NET', 'Node', 'Python', 'Java', 'PHP'] },
      { key: 'Version',       label: 'Version',        type: 'text',   placeholder: 'e.g. 8.0, 20 LTS' },
      { key: 'SKU',           label: 'SKU',            type: 'select', options: [
        'F1', 'D1',
        'B1', 'B2', 'B3',
        'S1', 'S2', 'S3',
        'P1v2', 'P2v2', 'P3v2',
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'I1v2', 'I2v2', 'I3v2',
      ]},
      { key: 'Publishing',    label: 'Publishing',     type: 'select', options: ['Code', 'Container'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  WebApp: {
    label: 'Web App',
    fields: [
      { key: 'OS',            label: 'OS',             type: 'select', options: ['Windows', 'Linux'] },
      { key: 'Runtime',       label: 'Runtime',        type: 'select', options: ['.NET', 'Node', 'Python', 'Java', 'PHP'] },
      { key: 'Version',       label: 'Version',        type: 'text',   placeholder: 'e.g. 8.0, 20 LTS' },
      { key: 'SKU',           label: 'SKU',            type: 'select', options: [
        'F1', 'D1',
        'B1', 'B2', 'B3',
        'S1', 'S2', 'S3',
        'P1v2', 'P2v2', 'P3v2',
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'I1v2', 'I2v2', 'I3v2',
      ]},
      { key: 'Publishing',    label: 'Publishing',     type: 'select', options: ['Code', 'Container'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  app_service_slots: {
    label: 'App Service / Slots',
    fields: [
      { key: 'OS',            label: 'OS',             type: 'select', options: ['Windows', 'Linux'] },
      { key: 'Runtime',       label: 'Runtime',        type: 'select', options: ['.NET', 'Node', 'Python', 'Java', 'PHP'] },
      { key: 'Version',       label: 'Version',        type: 'text',   placeholder: 'e.g. 8.0, 20 LTS' },
      { key: 'SKU',           label: 'SKU',            type: 'select', options: [
        'F1', 'D1',
        'B1', 'B2', 'B3',
        'S1', 'S2', 'S3',
        'P1v2', 'P2v2', 'P3v2',
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'I1v2', 'I2v2', 'I3v2',
      ]},
      { key: 'Publishing',    label: 'Publishing',     type: 'select', options: ['Code', 'Container'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  function_app_slots: {
    label: 'Function App / Slots',
    fields: [
      { key: 'Slot',          label: 'Slot Name',      type: 'select', options: ['staging', 'preview', 'canary', 'blue', 'green'] },
      { key: 'Plan',          label: 'Pricing Plan',   type: 'select', options: ['Flex Consumption', 'EP1', 'EP2', 'EP3', 'Consumption', 'Dedicated'] },
      { key: 'OS',            label: 'OS',             type: 'select', options: ['Windows', 'Linux'] },
      { key: 'Runtime',       label: 'Runtime',        type: 'select', options: ['.NET', 'Node', 'Python', 'Java', 'PowerShell'] },
      { key: 'Version',       label: 'Version',        type: 'text',   placeholder: 'e.g. 8.0, 20 LTS' },
      { key: 'Instances',     label: 'Instance Count', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  FunctionApp: {
    label: 'Function App',
    fields: [
      { key: 'Plan',          label: 'Pricing Plan',   type: 'select', options: ['Flex Consumption', 'EP1', 'EP2', 'EP3', 'Consumption', 'Dedicated'] },
      { key: 'OS',            label: 'OS',             type: 'select', options: ['Windows', 'Linux'] },
      { key: 'Runtime',       label: 'Runtime',        type: 'select', options: ['.NET', 'Node', 'Python', 'Java', 'PowerShell'] },
      { key: 'Version',       label: 'Version',        type: 'text',   placeholder: 'e.g. 8.0, 20 LTS' },
      { key: 'Instances',     label: 'Instance Count', type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  AppServicePlan: {
    label: 'App Service Plan',
    fields: [
      { key: 'OS',            label: 'OS',             type: 'select', options: ['Windows', 'Linux'] },
      { key: 'SKU',           label: 'SKU',            type: 'select', options: [
        'F1', 'D1',
        'B1', 'B2', 'B3',
        'S1', 'S2', 'S3',
        'P1v2', 'P2v2', 'P3v2',
        'P0v3', 'P1v3', 'P2v3', 'P3v3',
        'P0v4', 'P1v4', 'P2v4', 'P3v4',
        'EP1', 'EP2', 'EP3',
        'I1v2', 'I2v2', 'I3v2', 'I4v2', 'I5v2', 'I6v2',
      ]},
      { key: 'Instances',     label: 'Instances',      type: 'select', options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  container_app: {
    label: 'Container App',
    fields: [
      { key: 'Plan',        label: 'Plan',        type: 'select', options: ['Consumption', 'Dedicated'] },
      { key: 'DevStack',    label: 'Dev Stack',   type: 'select', options: ['.NET', 'Node', 'Python', 'Java', 'Go', 'Other'] },
      { key: 'CPU',         label: 'CPU',         type: 'select', options: ['0.25', '0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'] },
      { key: 'Memory',      label: 'Memory',      type: 'select', options: ['0.5Gi', '1Gi', '1.5Gi', '2Gi', '3Gi', '4Gi'] },
      { key: 'MinReplicas', label: 'Min Replicas', type: 'select', options: ['0', '1', '2', '3'] },
      { key: 'Dapr',        label: 'Dapr',        type: 'select', options: ['Enabled', 'Disabled'] },
    ],
  },
  container_apps_environment: {
    label: 'Container Environment',
    fields: [
      { key: 'Environment',   label: 'Environment',   type: 'select', options: ['Consumption', 'Dedicated'] },
      { key: 'VNet',          label: 'VNet',          type: 'select', options: ['Default', 'Custom'] },
      { key: 'ZoneRedundant', label: 'Zone Redundant', type: 'select', options: ['Enabled', 'Disabled'] },
      { key: 'KEDA',          label: 'KEDA Version',  type: 'text',   placeholder: 'e.g. 2.17.2' },
      { key: 'Dapr',          label: 'Dapr Version',  type: 'text',   placeholder: 'e.g. 1.13.6' },
    ],
  },
  aks: {
    label: 'AKS',
    fields: [
      { key: 'version',    label: 'K8s Version', type: 'text',   placeholder: 'e.g. 1.29' },
      { key: 'node_sku',   label: 'Node SKU',    type: 'text',   placeholder: 'e.g. Standard_D4s_v3' },
      { key: 'node_count', label: 'Node Count',  type: 'text',   placeholder: 'e.g. 3' },
      { key: 'network',    label: 'Network',     type: 'select', options: ['kubenet', 'azure-cni', 'azure-cni-overlay'] },
    ],
  },
  vm: {
    label: 'Virtual Machine',
    fields: [
      { key: 'os',   label: 'OS',   type: 'select', options: ['Windows', 'Linux'] },
      { key: 'size', label: 'Size', type: 'text',   placeholder: 'e.g. Standard_D2s_v3' },
      { key: 'disk', label: 'Disk', type: 'select', options: ['Standard_LRS', 'StandardSSD_LRS', 'Premium_LRS', 'UltraSSD_LRS'] },
    ],
  },
  swa: {
    label: 'Static Web App',
    fields: [
      { key: 'sku', label: 'SKU', type: 'select', options: ['Free', 'Standard'] },
    ],
  },
  StaticSite: {
    label: 'Static Web App',
    fields: [
      { key: 'sku', label: 'SKU', type: 'select', options: ['Free', 'Standard'] },
    ],
  },

  // ── Databases ──────────────────────────────────────────────────────────
  pg: {
    label: 'PostgreSQL',
    fields: [
      { key: 'version', label: 'Version', type: 'select', options: ['11', '12', '13', '14', '15', '16'] },
      { key: 'sku',     label: 'SKU',     type: 'select', options: ['Burstable_B1ms', 'Burstable_B2s', 'Burstable_B4ms', 'GeneralPurpose_D2s_v3', 'GeneralPurpose_D4s_v3', 'GeneralPurpose_D8s_v3', 'MemoryOptimized_E2ds_v4', 'MemoryOptimized_E4ds_v4'] },
      { key: 'storage', label: 'Storage', type: 'text',   placeholder: 'e.g. 32GB' },
      { key: 'ha',      label: 'HA',      type: 'select', options: ['Yes', 'No'] },
    ],
  },
  sql: {
    label: 'Azure SQL',
    fields: [
      { key: 'tier',    label: 'Tier',    type: 'select', options: ['Basic', 'Standard', 'Premium', 'GeneralPurpose', 'BusinessCritical', 'Hyperscale'] },
      { key: 'vcores',  label: 'vCores',  type: 'select', options: ['2', '4', '8', '16', '24', '32', '40', '80'] },
      { key: 'storage', label: 'Storage', type: 'text',   placeholder: 'e.g. 100GB' },
    ],
  },
  SQLServer: {
    label: 'SQL Server',
    fields: [
      { key: 'tier',    label: 'Tier',    type: 'select', options: ['Basic', 'Standard', 'Premium', 'GeneralPurpose', 'BusinessCritical', 'Hyperscale'] },
      { key: 'vcores',  label: 'vCores',  type: 'select', options: ['2', '4', '8', '16', '24', '32', '40', '80'] },
      { key: 'storage', label: 'Storage', type: 'text',   placeholder: 'e.g. 100GB' },
    ],
  },
  SQLDatabase: {
    label: 'SQL Database',
    fields: [
      { key: 'ComputeTier', label: 'Compute Tier', type: 'select', options: ['Provisioned', 'Serverless'] },
      { key: 'tier',        label: 'Tier',         type: 'select', options: ['Basic', 'Standard', 'Premium', 'GeneralPurpose', 'BusinessCritical', 'Hyperscale'] },
      { key: 'vcores',      label: 'vCores',       type: 'select', options: ['2', '4', '8', '12', '16', '24', '32', '40', '80'] },
      { key: 'storage',     label: 'Storage',      type: 'text',   placeholder: 'e.g. 100GB' },
    ],
  },
  mysql: {
    label: 'MySQL',
    fields: [
      { key: 'version', label: 'Version', type: 'select', options: ['5.7', '8.0'] },
      { key: 'sku',     label: 'SKU',     type: 'select', options: ['Burstable_B1ms', 'Burstable_B2s', 'GeneralPurpose_D2ds_v4', 'GeneralPurpose_D4ds_v4', 'MemoryOptimized_E2ds_v4', 'MemoryOptimized_E4ds_v4'] },
      { key: 'storage', label: 'Storage', type: 'text',   placeholder: 'e.g. 32GB' },
      { key: 'ha',      label: 'HA',      type: 'select', options: ['Yes', 'No'] },
    ],
  },
  sqlmi: {
    label: 'SQL Managed Instance',
    fields: [
      { key: 'tier',    label: 'Tier',    type: 'select', options: ['GeneralPurpose', 'BusinessCritical'] },
      { key: 'vcores',  label: 'vCores',  type: 'select', options: ['4', '8', '16', '24', '32', '40', '64', '80'] },
      { key: 'storage', label: 'Storage', type: 'text',   placeholder: 'e.g. 256GB' },
    ],
  },
  cosmos: {
    label: 'Cosmos DB',
    fields: [
      { key: 'api',         label: 'API',         type: 'select', options: ['SQL', 'MongoDB', 'Cassandra', 'Gremlin', 'Table'] },
      { key: 'tier',        label: 'Tier',        type: 'select', options: ['Serverless', 'Provisioned'] },
      { key: 'consistency', label: 'Consistency', type: 'select', options: ['Eventual', 'Session', 'ConsistentPrefix', 'BoundedStaleness', 'Strong'] },
    ],
  },

  // ── Storage & Messaging ────────────────────────────────────────────────
  StorageAccount: {
    label: 'Storage Account',
    fields: [
      { key: 'Performance', label: 'Performance', type: 'select', options: ['Standard', 'Premium'] },
      { key: 'SKU',         label: 'Redundancy',  type: 'select', options: [
        'Standard_LRS', 'Standard_ZRS', 'Standard_GRS', 'Standard_RAGRS',
        'Standard_GZRS', 'Standard_RAGZRS',
        'Premium_LRS', 'Premium_ZRS',
      ]},
      { key: 'Kind',        label: 'Kind',        type: 'select', options: ['StorageV2', 'BlockBlobStorage', 'FileStorage', 'BlobStorage'] },
      { key: 'AccessTier',  label: 'Access Tier', type: 'select', options: ['Hot', 'Cool', 'Cold', 'Archive'] },
    ],
  },
  service_bus: {
    label: 'Service Bus',
    fields: [
      { key: 'sku',      label: 'SKU',      type: 'select', options: ['Basic', 'Standard', 'Premium'] },
      { key: 'capacity', label: 'Capacity', type: 'select', options: ['1', '2', '4', '8', '16'] },
    ],
  },
  redis: {
    label: 'Redis Cache',
    fields: [
      { key: 'sku',      label: 'SKU',      type: 'select', options: ['Basic', 'Standard', 'Premium'] },
      { key: 'capacity', label: 'Capacity', type: 'select', options: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'P1', 'P2', 'P3', 'P4', 'P5'] },
    ],
  },

  // ── Security & Identity ────────────────────────────────────────────────
  key_vault: {
    label: 'Key Vault',
    fields: [
      { key: 'sku',              label: 'SKU',            type: 'select', options: ['Standard', 'Premium'] },
      { key: 'soft_delete',      label: 'Soft Delete',    type: 'select', options: ['Yes', 'No'] },
      { key: 'purge_protection', label: 'Purge Protect',  type: 'select', options: ['Yes', 'No'] },
    ],
  },
  KeyVault: {
    label: 'Key Vault',
    fields: [
      { key: 'sku',              label: 'SKU',            type: 'select', options: ['Standard', 'Premium'] },
      { key: 'soft_delete',      label: 'Soft Delete',    type: 'select', options: ['Yes', 'No'] },
      { key: 'purge_protection', label: 'Purge Protect',  type: 'select', options: ['Yes', 'No'] },
    ],
  },

  // ── DevOps & Platform ──────────────────────────────────────────────────
  container_registry: {
    label: 'Container Registry',
    fields: [
      { key: 'sku',          label: 'SKU',           type: 'select', options: ['Basic', 'Standard', 'Premium'] },
      { key: 'geo_rep',      label: 'Geo-replicated', type: 'select', options: ['Yes', 'No'] },
    ],
  },
  app_insights: {
    label: 'App Insights',
    fields: [
      { key: 'retention', label: 'Retention (days)', type: 'select', options: ['30', '60', '90', '120', '180', '270', '365', '550', '730'] },
      { key: 'sampling',  label: 'Sampling',         type: 'select', options: ['Adaptive', 'Fixed', 'Ingestion', 'None'] },
    ],
  },

  // ── AI ─────────────────────────────────────────────────────────────────
  ai_foundry: {
    label: 'AI Foundry',
    fields: [
      { key: 'sku', label: 'SKU', type: 'select', options: ['Basic', 'Standard', 'Enterprise'] },
    ],
  },
  ai_search: {
    label: 'AI Search',
    fields: [
      { key: 'sku',        label: 'SKU',        type: 'select', options: ['Free', 'Basic', 'S1', 'S2', 'S3', 'L1', 'L2'] },
      { key: 'replicas',   label: 'Replicas',   type: 'text',   placeholder: 'e.g. 1' },
      { key: 'partitions', label: 'Partitions', type: 'text',   placeholder: 'e.g. 1' },
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
