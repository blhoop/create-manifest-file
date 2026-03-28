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
  // ── Identity (required) ────────────────────────────────────────────────
  {
    key: 'spoke_name',
    label: 'Spoke Name',
    required: true,
    placeholder: 'e.g. order-book-001',
    hint: 'Unique spoke identifier — used for subscription name, repo names, and TFC workspaces',
    group: 'identity',
  },
  {
    key: 'owner',
    label: 'Owner',
    required: true,
    placeholder: 'e.g. Platform Engineering',
    hint: 'Team that owns this spoke — also used for the owner tag',
    group: 'identity',
  },
  {
    key: 'product',
    label: 'Product Code',
    required: true,
    placeholder: 'e.g. ob',
    hint: 'Short product code (2–5 chars) used in all resource names',
    group: 'identity',
  },
  {
    key: 'spoke_id',
    label: 'Spoke ID',
    required: false,
    placeholder: 'e.g. 01',
    hint: 'Optional 2–5 char discriminator for global uniqueness when multiple spokes share the same product code. Fused with product in names (e.g. lb + 01 → lb01). Omit for single-spoke products.',
    group: 'identity',
  },
  {
    key: 'environment',
    label: 'Environment',
    required: true,
    options: ['dev', 'test', 'uat', 'preprod', 'prod', 'lab'],
    hint: 'Target deployment environment',
    group: 'identity',
  },
  {
    key: 'default_location',
    label: 'Default Location',
    required: true,
    options: [
      'australiaeast', 'eastasia', 'eastus', 'eastus2',
      'northcentralus', 'southeastasia', 'uksouth', 'westus3',
      'westeurope', 'canadacentral', 'centralus', 'westus2',
    ],
    hint: 'Azure region for all resources in this environment',
    group: 'identity',
  },

  // ── Tagging (required for output) ─────────────────────────────────────
  {
    key: 'cost_center',
    label: 'Cost Center',
    required: false,
    placeholder: 'e.g. CC-1234',
    hint: 'For chargeback/showback — defaults to [TBD] if omitted',
    group: 'tagging',
  },
  {
    key: 'project',
    label: 'Project',
    required: false,
    placeholder: 'e.g. my-project',
    hint: 'Project name applied to all resource tags',
    group: 'tagging',
  },
  {
    key: 'data_classification',
    label: 'Data Classification',
    required: false,
    options: ['internal', 'confidential', 'public', 'restricted'],
    hint: 'Data classification applied to all resource tags',
    group: 'tagging',
  },

  // ── Infrastructure (optional) ─────────────────────────────────────────
  {
    key: 'infra_repo',
    label: 'Infra Repo',
    required: false,
    placeholder: 'e.g. my-spoke-001-infra',
    hint: 'GitHub repo name for generated Terraform (created by Megalodon)',
    group: 'infra',
  },
  {
    key: 'sku_mode',
    label: 'SKU Mode',
    required: false,
    options: ['premium', 'standard'],
    hint: 'premium (default) = smallest prod-capable SKUs; standard = lower tiers acceptable',
    group: 'infra',
  },
  {
    key: 'management_group_id',
    label: 'Management Group',
    required: false,
    placeholder: 'e.g. converge',
    hint: 'Short management group ID — pipeline constructs the full ARM path',
    group: 'infra',
  },
  {
    key: 'vnet_cidr',
    label: 'VNet CIDR',
    required: false,
    placeholder: 'e.g. 10.3.0.0/24',
    hint: 'VNet address space — coordinate with hub team to avoid overlap. Size guide: /24 for app service spokes, /23 for container apps, /22 for AKS.',
    group: 'infra',
  },
  {
    key: 'new_subscription',
    label: 'New Subscription',
    required: false,
    options: ['true', 'false'],
    hint: 'true = LZ process creates a new subscription; false = use existing',
    group: 'infra',
  },
  {
    key: 'subscription_id',
    label: 'Subscription ID',
    required: false,
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    hint: 'Existing Azure subscription UUID — only when new_subscription is false',
    group: 'infra',
  },
  {
    key: 'description',
    label: 'Description',
    required: false,
    placeholder: 'Short description of the workload',
    hint: 'Human-readable description of what this spoke is for',
    group: 'infra',
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
]

// ---------------------------------------------------------------------------
// Resource type lists
// ---------------------------------------------------------------------------

const { BUILDER_TYPES } = require('./azureTypes')

const INVENTORY_TYPES = []

const ALL_RESOURCE_TYPES = [...BUILDER_TYPES, ...INVENTORY_TYPES]

// ---------------------------------------------------------------------------
// Parent resource references — maps child resource types to parent types
// ---------------------------------------------------------------------------

const PARENT_REFERENCES = {}

// ---------------------------------------------------------------------------
// Location defaults — applied when a resource has no explicit location
// ---------------------------------------------------------------------------

const LOCATION_DEFAULTS = [
  {
    types: ['static_web_app'],
    location: 'eastasia',
    reason: 'Not available in australiaeast — workflow applies location_fallback automatically',
  },
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
