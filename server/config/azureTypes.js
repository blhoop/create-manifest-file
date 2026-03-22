/**
 * azureTypes.js — single source of truth for all supported Azure service types.
 *
 * To add a new type: append an entry to AZURE_TYPES. Everything else derives.
 *
 * Fields:
 *   service_type  — canonical identifier used in manifest YAML and throughout the app
 *   display_name  — human-readable label shown in the UI
 *   category      — grouping for UI display and schema ordering
 *   aliases       — alternate spellings/abbreviations that normalize to service_type
 *                   (lowercase, spaces/underscores/slashes already stripped by normalizeTypeName)
 */

const AZURE_TYPES = [
  // ── Compute ────────────────────────────────────────────────────────────────
  {
    service_type: 'app_service',
    display_name: 'App Service',
    category: 'Compute',
    aliases: ['appservice', 'appserviceslots', 'webappslots'],
  },
  {
    service_type: 'app_service_plan',
    display_name: 'App Service Plan',
    category: 'Compute',
    aliases: ['appserviceplan', 'asp'],
  },
  {
    service_type: 'web_app',
    display_name: 'Web App',
    category: 'Compute',
    aliases: ['webapp', 'linuxwebapp', 'windowswebapp'],
  },
  {
    service_type: 'function_app',
    display_name: 'Function App',
    category: 'Compute',
    aliases: ['functionapp', 'linuxfunctionapp', 'functionappslots'],
  },
  {
    service_type: 'aks',
    display_name: 'AKS',
    category: 'Compute',
    aliases: ['kubernetesservice', 'kubernetes'],
  },
  {
    service_type: 'container_app',
    display_name: 'Container App',
    category: 'Compute',
    aliases: ['containerapp'],
  },
  {
    service_type: 'container_app_environment',
    display_name: 'Container App Environment',
    category: 'Compute',
    aliases: ['containerappsenvironment', 'containerenvironment', 'cae'],
  },
  {
    service_type: 'vm',
    display_name: 'Virtual Machine',
    category: 'Compute',
    aliases: ['virtualmachine'],
  },
  {
    service_type: 'static_web_app',
    display_name: 'Static Web App',
    category: 'Compute',
    aliases: ['swa', 'staticwebapp', 'staticsite'],
  },
  {
    service_type: 'signalr',
    display_name: 'SignalR Service',
    category: 'Compute',
    aliases: ['signalrservice', 'azuresignalr'],
  },
  {
    service_type: 'apim',
    display_name: 'API Management',
    category: 'Compute',
    aliases: ['apimanagement', 'apimservice'],
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  {
    service_type: 'pg',
    display_name: 'PostgreSQL',
    category: 'Data',
    aliases: ['postgresql', 'postgresflexibleserver', 'postgres'],
  },
  {
    service_type: 'cosmos',
    display_name: 'Cosmos DB',
    category: 'Data',
    aliases: ['cosmosdb', 'cosmosdbaccount', 'cosmosaccount', 'azurecosmosdbaccount'],
  },
  {
    service_type: 'sql',
    display_name: 'Azure SQL',
    category: 'Data',
    aliases: ['sqlserver', 'sqldatabase', 'azuresql'],
  },
  {
    service_type: 'mysql',
    display_name: 'MySQL',
    category: 'Data',
    aliases: ['mysqlflexibleserver'],
  },
  {
    service_type: 'sqlmi',
    display_name: 'SQL Managed Instance',
    category: 'Data',
    aliases: ['sqlmanagedinstance'],
  },
  {
    service_type: 'redis',
    display_name: 'Redis Cache',
    category: 'Data',
    aliases: ['rediscache', 'azurecacheforredis'],
  },
  {
    service_type: 'storage_account',
    display_name: 'Storage Account',
    category: 'Data',
    aliases: ['storageaccount', 'storage'],
  },
  {
    service_type: 'data_factory',
    display_name: 'Data Factory',
    category: 'Data',
    aliases: ['datafactory', 'adf', 'factory'],
  },
  {
    service_type: 'servicebus',
    display_name: 'Service Bus',
    category: 'Data',
    aliases: ['azureservicebus'],
  },
  {
    service_type: 'backup_vault',
    display_name: 'Backup Vault',
    category: 'Data',
    aliases: ['backupvault', 'azurebackup', 'recoveryservicesvault'],
  },

  // ── Networking ─────────────────────────────────────────────────────────────
  {
    service_type: 'vnet',
    display_name: 'Virtual Network',
    category: 'Networking',
    aliases: ['virtualnetwork', 'azurevirtualnetwork'],
  },

  // ── AI & Search ────────────────────────────────────────────────────────────
  {
    service_type: 'openai',
    display_name: 'Azure OpenAI / AI Foundry',
    category: 'AI',
    aliases: ['aifoundry', 'azureopenai', 'cognitiveservicesopenai'],
  },
  {
    service_type: 'search',
    display_name: 'AI Search',
    category: 'AI',
    aliases: ['aisearch', 'azuresearch', 'cognitivesearch', 'searchservice'],
  },

  // ── Security & Identity ────────────────────────────────────────────────────
  {
    service_type: 'key_vault',
    display_name: 'Key Vault',
    category: 'Security',
    aliases: ['keyvault'],
  },
  {
    service_type: 'container_registry',
    display_name: 'Container Registry',
    category: 'Security',
    aliases: ['containerregistry', 'acr'],
  },
  {
    service_type: 'managed_identities',
    display_name: 'Managed Identity',
    category: 'Security',
    aliases: ['managedidentity', 'useridentity', 'userassignedidentity', 'userassignedidentities', 'identity', 'user_assigned_identity'],
  },

  // ── Observability ──────────────────────────────────────────────────────────
  {
    service_type: 'app_insights',
    display_name: 'Application Insights',
    category: 'Observability',
    aliases: ['appinsights', 'applicationinsights'],
  },

  // ── Platform ───────────────────────────────────────────────────────────────
  {
    service_type: 'app_configuration',
    display_name: 'App Configuration',
    category: 'Platform',
    aliases: ['appconfiguration'],
  },
  {
    service_type: 'frontdoor',
    display_name: 'Azure Front Door',
    category: 'Platform',
    aliases: ['afd', 'azurefrontdoor'],
  },
]

// ---------------------------------------------------------------------------
// Derived exports — do not edit these directly
// ---------------------------------------------------------------------------

/** Ordered list of canonical service_type strings */
const BUILDER_TYPES = AZURE_TYPES.map(t => t.service_type)

/**
 * Alias → canonical type map consumed by normalizeTypeName().
 * Keys are already normalized (lowercase, no spaces/underscores/slashes).
 */
const TYPE_REMAP = {}
for (const { service_type, aliases } of AZURE_TYPES) {
  for (const alias of aliases) {
    TYPE_REMAP[alias] = service_type
  }
}

module.exports = { AZURE_TYPES, BUILDER_TYPES, TYPE_REMAP }
