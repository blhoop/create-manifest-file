/**
 * Output schema — single source of truth for the YAML manifest structure.
 * Human-readable documentation lives in output.md — keep both in sync.
 *
 * Adding a field:
 *   1. Add it to the correct section below (subscription or resources)
 *   2. Update output.md
 *   Everything else (YAML builder, table columns, subscription panel,
 *   parsers, AI prompts) derives from this file automatically.
 */

// ---------------------------------------------------------------------------
// Subscription block — appears once at the top of the YAML file
// ---------------------------------------------------------------------------

const SUBSCRIPTION_FIELDS = [
  {
    key: 'subscription_name',
    label: 'Subscription Name',
    required: true,
    placeholder: 'e.g. Order Book',
    hint: 'Normalized to kebab-case for repos; initials for resource names',
  },
  {
    key: 'environment',
    label: 'Environment',
    required: true,
    options: ['dev', 'test', 'uat', 'preprod', 'prod', 'lab'],
    hint: 'Target deployment environment',
  },
  {
    key: 'default_location',
    label: 'Default Location',
    required: true,
    options: [
      'australiaeast', 'eastasia', 'global',
      'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
      'northeurope', 'westeurope', 'uksouth',
      'southeastasia', 'canadacentral',
    ],
    hint: 'Default Azure region — individual resources can override',
  },
  {
    key: 'product_code',
    label: 'Product Code',
    required: false,
    placeholder: 'e.g. ob',
    hint: 'Short code for Azure resource names. Auto-derived from subscription_name initials if omitted',
  },
  {
    key: 'vnet_cidr',
    label: 'VNet CIDR',
    required: false,
    placeholder: 'e.g. 10.3.0.0/22',
    hint: 'VNet CIDR block. Auto-allocated if omitted',
  },
  {
    key: 'subscription_id',
    label: 'Subscription ID',
    required: false,
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'Existing Azure subscription UUID. If set, pipeline skips landing zone creation',
  },
  {
    key: 'spn_client_id',
    label: 'SPN Client ID',
    required: false,
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'Required when subscription_id is set',
  },
]

// ---------------------------------------------------------------------------
// Resources block — each entry in the resources: array
// ---------------------------------------------------------------------------

const RESOURCE_FIELDS = [
  {
    key: 'name',
    label: 'name',
    required: true,
    hint: 'Component name used in CAF resource naming (e.g. web, booking-db)',
  },
  {
    key: 'type',
    label: 'type',
    required: true,
    hint: 'Resource type — builder or inventory',
  },
  {
    key: 'location',
    label: 'location',
    required: false,
    hint: 'Azure region override. Omit to use default_location',
  },
  {
    key: 'repo',
    label: 'repo',
    required: false,
    hint: 'org/repo-name — triggers CI/CD workflow generation',
  },
  {
    key: 'comments',
    label: 'comments',
    required: false,
    hint: 'Free-text hints (e.g. needs pgbouncer, serverless, zone redundant ha)',
  },
  {
    key: 'server_name',
    label: 'server_name',
    required: false,
    hint: 'Parent SQL Server name — for SQLDatabase resources',
  },
  {
    key: 'plan_name',
    label: 'plan_name',
    required: false,
    hint: 'Parent App Service Plan name — for slot resources',
  },
  {
    key: 'function_app_name',
    label: 'function_app_name',
    required: false,
    hint: 'Parent Function App name — for functionappslots resources',
  },
]

// ---------------------------------------------------------------------------
// Resource type lists
// ---------------------------------------------------------------------------

const BUILDER_TYPES = [
  'app_service',
  'app_service_slots',
  'pg',
  'cosmos',
  'sql',
  'mysql',
  'sqlmi',
  'aks',
  'container_app',
  'vm',
  'redis',
  'swa',
  'key_vault',
  'app_insights',
  'container_registry',
  'service_bus',
  'ai_foundry',
  'ai_search',
]

const INVENTORY_TYPES = [
  'WebApp',
  'FunctionApp',
  'AppServicePlan',
  'StorageAccount',
  'SQLServer',
  'SQLDatabase',
  'KeyVault',
  'StaticSite',
]

const ALL_RESOURCE_TYPES = [...BUILDER_TYPES, ...INVENTORY_TYPES]

// ---------------------------------------------------------------------------
// Parent resource references — maps child resource types to parent types
// ---------------------------------------------------------------------------

const PARENT_REFERENCES = {
  'SQLDatabase': {
    field: 'server_name',
    parentTypes: ['SQLServer', 'sql'],
    label: 'SQL Server',
  },
  'appserviceslots': {
    field: 'plan_name',
    parentTypes: ['AppServicePlan'],
    label: 'App Service Plan',
  },
  'webappslots': {
    field: 'plan_name',
    parentTypes: ['AppServicePlan'],
    label: 'App Service Plan',
  },
  'functionappslots': {
    field: 'function_app_name',
    parentTypes: ['FunctionApp'],
    label: 'Function App',
  },
}

// ---------------------------------------------------------------------------
// Location defaults — applied when a resource has no explicit location
// ---------------------------------------------------------------------------

const LOCATION_DEFAULTS = [
  {
    types: ['swa', 'StaticSite'],
    location: 'eastasia',
    reason: 'Not available in australiaeast',
  },
  // Add more overrides here as needed
]

const DEFAULT_LOCATION = 'australiaeast'

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  SUBSCRIPTION_FIELDS,
  RESOURCE_FIELDS,
  BUILDER_TYPES,
  INVENTORY_TYPES,
  ALL_RESOURCE_TYPES,
  PARENT_REFERENCES,
  LOCATION_DEFAULTS,
  DEFAULT_LOCATION,
}
