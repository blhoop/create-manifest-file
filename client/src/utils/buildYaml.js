/**
 * buildYaml.js — generates the nested spoke infrastructure manifest YAML
 * from the flat row array + subscription panel state.
 */

import { SCHEMA_MAPPING, parseCommentFields, resolveModule } from '../config/schemaMapping.js'

// ---------------------------------------------------------------------------
// YAML scalar quoting
// ---------------------------------------------------------------------------
function q(val) {
  if (val == null || val === '') return ''
  const s = String(val)
  if (/[:#\{\}\[\]\n]/.test(s) || /^[-?!|>%@`&*]/.test(s.trim())) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  }
  return s
}

function line(indent, key, val) {
  if (val == null || val === '') return null
  return `${' '.repeat(indent)}${key}: ${q(val)}`
}

function sectionHeader(title) {
  return [
    '',
    '# ---------------------------------------------------------------------------',
    `# ${title}`,
    '# ---------------------------------------------------------------------------',
  ]
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------
export function buildYamlContent(rows, subscription) {
  const sub = subscription
  const out = []

  const spokeName = sub.spoke_name || 'Spoke Infrastructure'
  out.push(`# ${spokeName} -- Spoke Infrastructure Manifest`)
  out.push('# Schema: manifest-schema.json v1')

  // ── spoke ──────────────────────────────────────────────────────────────
  out.push(...sectionHeader('SPOKE — Identity & metadata'))
  out.push("schema_version: '1.1.0'")
  out.push('spoke:')
  if (sub.spoke_name)           out.push(`  name: ${q(sub.spoke_name)}`)
  if (sub.spoke_name)           out.push(`  subscription: ${q(sub.spoke_name)}`)
  if (sub.owner)                out.push(`  owner: ${q(sub.owner)}`)
  if (sub.description)          out.push(`  description: ${q(sub.description)}`)
  if (sub.sku_mode)             out.push(`  sku_mode: ${q(sub.sku_mode)}`)
  if (sub.management_group_id)  out.push(`  management_group_id: ${q(sub.management_group_id)}`)
  if (sub.new_subscription != null && sub.new_subscription !== '') {
    out.push(`  new_subscription: ${sub.new_subscription === 'false' || sub.new_subscription === false ? 'false' : 'true'}`)
  }
  if (sub.infra_repo)           out.push(`  infra_repo: ${q(sub.infra_repo)}`)

  // ── ctm_properties ─────────────────────────────────────────────────────
  out.push(...sectionHeader('CTM PROPERTIES — Used for resource naming only'))
  out.push('ctm_properties:')
  out.push(`  product: ${q(sub.product || sub.product_code || '')}`)

  // ── environments ───────────────────────────────────────────────────────
  out.push(...sectionHeader('ENVIRONMENTS'))
  out.push('environments:')
  const env = sub.environment || 'dev'
  const loc = sub.default_location || sub.location || ''
  out.push(`  ${env}:`)
  if (loc) out.push(`    location: ${q(loc)}`)

  // ── tags ───────────────────────────────────────────────────────────────
  out.push(...sectionHeader('TAGS'))
  out.push('tags:')
  out.push(`  owner: ${q(sub.owner || '[TBD]')}`)
  out.push(`  cost_center: ${q(sub.cost_center || '[TBD]')}`)
  out.push(`  project: ${q(sub.project || '[TBD]')}`)
  out.push(`  data_classification: ${q(sub.data_classification || 'internal')}`)

  // ── pre-scan rows for NSG rules and consumers ──────────────────────────
  // Collect before emitting network/security sections
  const appServicesNsgRules = []
  for (const row of (rows || [])) {
    if (['web_app', 'app_service', 'app_service_plan', 'function_app'].includes(row.type)) {
      if (Array.isArray(row.nsg_rules) && row.nsg_rules.length > 0) {
        appServicesNsgRules.push(...row.nsg_rules)
      }
    }
  }
  // Deduplicate by rule name
  const seenRuleNames = new Set()
  const dedupedNsgRules = appServicesNsgRules.filter(r => {
    if (!r.name || seenRuleNames.has(r.name)) return false
    seenRuleNames.add(r.name)
    return true
  })

  const hasAppServiceRows = (rows || []).some(r =>
    ['web_app', 'app_service', 'app_service_plan', 'function_app'].includes(r.type)
  )

  // ── network ────────────────────────────────────────────────────────────
  out.push(...sectionHeader('NETWORK'))
  out.push('network:')
  out.push('')
  out.push('  # --- VNets ---')
  out.push('  vnets:')
  out.push('    - id: vnet')
  if (sub.vnet_cidr) out.push(`      cidr: ${q(sub.vnet_cidr)}`)
  out.push('      dns_servers: hub-inherited')
  out.push('      peering: hub-network-vnet')
  out.push('')
  out.push('  # --- Subnets ---')
  out.push('  subnets:')
  if (hasAppServiceRows) {
    out.push('    - id: snet_appservices')
    out.push('      vnet_id: vnet')
    out.push('      cidr: "[TBD]"')
    out.push('      delegation: Microsoft.Web/serverFarms')
    out.push('      purpose: App Service VNet integration')
  }
  out.push('    - id: snet_privateendpoints')
  out.push('      vnet_id: vnet')
  out.push('      cidr: "[TBD]"')
  out.push('      delegation: null')
  out.push('      purpose: Private endpoints')
  out.push('')
  out.push('  # --- NSGs ---')
  out.push('  nsgs:')
  if (hasAppServiceRows) {
    out.push('    - id: nsg_appservices')
    out.push('      subnet_id: snet_appservices')
    if (dedupedNsgRules.length > 0) {
      out.push('      rules:')
      for (const rule of dedupedNsgRules) {
        out.push(`        - name: ${q(rule.name)}`)
        out.push(`          priority: ${rule.priority}`)
        out.push(`          direction: ${q(rule.direction)}`)
        out.push(`          access: ${q(rule.access)}`)
        out.push(`          protocol: ${q(rule.protocol)}`)
        out.push(`          source_address_prefix: ${q(rule.source_address_prefix)}`)
        out.push(`          destination_port_range: ${q(rule.destination_port_range)}`)
        if (rule.description) out.push(`          description: ${q(rule.description)}`)
      }
    } else {
      out.push('      rules: []')
    }
  }
  out.push('    - id: nsg_privateendpoints')
  out.push('      subnet_id: snet_privateendpoints')
  out.push('      rules: []')
  out.push('')
  out.push('  # --- Private Endpoints ---')
  out.push('  private_endpoints: []')
  out.push('')
  out.push('  # --- DNS Zones ---')
  out.push('  dns_zones: []')

  // ── partition rows by schema section ───────────────────────────────────
  const mapped = {
    compute:      { app_service_plans: [], web_apps: [], function_apps: [], static_sites: [] },
    data:         { databases: [], storage_accounts: [], caching: [], search: [], factories: [] },
    security:     { key_vaults: [], managed_identities: [] },
    observability:{ app_insights: [] },
  }
  const unmappedRows = []

  for (const row of (rows || [])) {
    const mapping = SCHEMA_MAPPING[row.type]
    if (!mapping || mapping.unmapped) {
      unmappedRows.push(row)
      continue
    }
    const { section, sub_key } = mapping
    if (mapped[section]?.[sub_key]) {
      mapped[section][sub_key].push(row)
    }
  }

  // Derive plan_defaults from app_service_plan rows (if any) or comment fields on web/func apps
  const planRows = mapped.compute.app_service_plans
  const webApps  = mapped.compute.web_apps
  const funcApps = mapped.compute.function_apps

  // Classify each ASP row as 'web' or 'func':
  //   1. PlanFor comment field takes priority  (PlanFor:Web App / PlanFor:Function App)
  //   2. Row name containing 'func' → func, otherwise → web
  const getAspType = r => {
    const cf = parseCommentFields(r.comments)
    const pf = (cf.PlanFor || '').toLowerCase()
    if (pf.includes('func')) return 'func'
    if (pf.includes('web') || pf.includes('app')) return 'web'
    return /func/i.test(r.name) ? 'func' : 'web'
  }

  const webPlanRows  = planRows.filter(r => getAspType(r) === 'web')
  const funcPlanRows = planRows.filter(r => getAspType(r) === 'func')

  // First of each type drives plan_defaults; extras can drive plan_override on matched apps
  const webPlanRow  = webPlanRows[0]  ?? planRows[0]
  const funcPlanRow = funcPlanRows[0] ?? (planRows.length > 1 ? planRows[1] : planRows[0])

  const webPlanCf  = parseCommentFields(webPlanRow?.comments)
  const funcPlanCf = parseCommentFields(funcPlanRow?.comments)
  // Also pull OS from first app's comments as fallback (web_app popup has an OS field)
  const firstWebCf  = parseCommentFields(webApps[0]?.comments)

  const webOs  = webPlanCf.OS  || firstWebCf.OS  || 'Windows'
  const webSku = webPlanCf.SKU || 'P1v3'
  const funcOs  = funcPlanCf.OS  || 'Windows'
  const funcSku = funcPlanCf.SKU || 'EP1'

  const hasWebApps  = webApps.length > 0
  const hasFuncApps = funcApps.length > 0
  const hasVnet     = !!(sub.vnet_cidr)

  // ── compute ────────────────────────────────────────────────────────────
  out.push(...sectionHeader('COMPUTE'))
  out.push('compute:')

  let firstComputeSub = true
  const computeBlank = () => { if (!firstComputeSub) out.push(''); firstComputeSub = false }

  // plan_defaults — emit whenever there are web or function apps (or explicit plan rows)
  if (hasWebApps || hasFuncApps || planRows.length > 0) {
    computeBlank()
    out.push('  # --- Plan Defaults ---')
    out.push('  # Each web app and function app gets its own dedicated plan from this spec.')
    out.push("  # Use share_plan_with on an app to reuse another app's plan.")
    out.push('  # Use plan_override on an app to override these defaults for that app only.')
    out.push('  plan_defaults:')
    if (hasWebApps || webPlanRows.length > 0 || planRows.length > 0) {
      if (webPlanRow) out.push(`    # source: ${webPlanRow.name} — set PlanFor, OS, SKU via row popup`)
      out.push('    web_app:')
      out.push(`      os_type: ${q(webOs)}`)
      out.push(`      sku: ${q(webSku)}`)
    }
    if (hasFuncApps || funcPlanRows.length > 0 || planRows.length > 0) {
      if (funcPlanRow && funcPlanRow !== webPlanRow) out.push(`    # source: ${funcPlanRow.name} — set PlanFor, OS, SKU via row popup`)
      out.push('    function_app:')
      out.push(`      os_type: ${q(funcOs)}`)
      out.push(`      sku: ${q(funcSku)}`)
    }
  }

  // web_apps
  if (hasWebApps) {
    computeBlank()
    out.push('  # --- Web Apps ---')
    out.push('  web_apps:')
    for (const row of webApps) {
      const cf = parseCommentFields(row.comments)
      const id = `web_${row.name || 'app'}`
      const mod = resolveModule(row.type, cf)
      out.push(`    - id: ${q(id)}`)
      out.push(`      subsystem: ${q(row.name || 'app')}`)
      out.push(`      module: ${mod}`)
      out.push(`      instance_number: '001'`)
      if (hasVnet) out.push(`      vnet_integration_subnet_id: snet_appservices`)
      // Check if a secondary web ASP matches this app by name → plan_override
      const appNameLower = (row.name || '').toLowerCase()
      const overrideAsp = webPlanRows.slice(1).find(asp => {
        const aspName = (asp.name || '').toLowerCase()
        return aspName.includes(appNameLower) || appNameLower.includes(aspName)
      })
      if (overrideAsp) {
        const ocf = parseCommentFields(overrideAsp.comments)
        const oOs  = ocf.OS  || webOs
        const oSku = ocf.SKU || webSku
        if (oOs !== webOs || oSku !== webSku) {
          out.push(`      plan_override:`)
          out.push(`        os_type: ${q(oOs)}`)
          out.push(`        sku: ${q(oSku)}`)
        }
      }
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
      if (row.comments) out.push(`      # comments: ${row.comments}`)
    }
  }

  // function_apps
  if (hasFuncApps) {
    computeBlank()
    out.push('  # --- Function Apps ---')
    out.push('  function_apps:')
    for (const row of funcApps) {
      const cf = parseCommentFields(row.comments)
      const id = `func_${row.name || 'func'}`
      const mod = resolveModule(row.type, cf)
      const runtime = cf.Runtime || 'dotnet-isolated'
      out.push(`    - id: ${q(id)}`)
      out.push(`      subsystem: ${q(row.name || 'func')}`)
      out.push(`      module: ${mod}`)
      out.push(`      runtime: ${q(runtime)}`)
      out.push(`      instance_number: '001'`)
      if (hasVnet) out.push(`      vnet_integration_subnet_id: snet_appservices`)
      // Check if a secondary func ASP matches this app by name → plan_override
      const appNameLower = (row.name || '').toLowerCase()
      const overrideAsp = funcPlanRows.slice(1).find(asp => {
        const aspName = (asp.name || '').toLowerCase()
        return aspName.includes(appNameLower) || appNameLower.includes(aspName)
      })
      if (overrideAsp) {
        const ocf = parseCommentFields(overrideAsp.comments)
        const oOs  = ocf.OS  || funcOs
        const oSku = ocf.SKU || funcSku
        if (oOs !== funcOs || oSku !== funcSku) {
          out.push(`      plan_override:`)
          out.push(`        os_type: ${q(oOs)}`)
          out.push(`        sku: ${q(oSku)}`)
        }
      }
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
      if (row.comments) out.push(`      # comments: ${row.comments}`)
    }
  }

  // static_sites
  const staticSites = mapped.compute.static_sites
  if (staticSites.length > 0) {
    computeBlank()
    out.push('  # --- Static Sites ---')
    out.push('  static_sites:')
    for (const row of staticSites) {
      const cf = parseCommentFields(row.comments)
      const id = `swa_${row.name || 'frontend'}`
      out.push(`    - id: ${q(id)}`)
      out.push(`      subsystem: ${q(row.name || 'frontend')}`)
      out.push(`      module: terraform-azurerm-static-web-app`)
      if (cf.sku) out.push(`      sku: ${q(cf.sku)}`)
      out.push(`      instance_number: '001'`)
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
    }
  }

  // ── data ───────────────────────────────────────────────────────────────
  const hasData = Object.values(mapped.data).some(a => a.length > 0)
  if (hasData) {
    out.push(...sectionHeader('DATA'))
    out.push('data:')

    let firstDataSub = true
    const dataBlank = () => { if (!firstDataSub) out.push(''); firstDataSub = false }

    if (mapped.data.databases.length > 0) {
      dataBlank()
      out.push('  # --- Databases ---')
      out.push('  databases:')
      for (const row of mapped.data.databases) {
        const cf = parseCommentFields(row.comments)
        const mapping = SCHEMA_MAPPING[row.type]
        const id = row.name || row.type
        out.push(`    - id: ${q(id)}`)
        out.push(`      subsystem: ${q(id)}`)
        out.push(`      type: ${mapping.db_type}`)
        out.push(`      module: ${mapping.module}`)
        // SKU — prefer comment field, fall back to tier
        const sku = cf.sku || cf.SKU || cf.tier || cf.Tier || ''
        if (sku) out.push(`      sku: ${q(sku)}`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.data.storage_accounts.length > 0) {
      dataBlank()
      out.push('  # --- Storage Accounts ---')
      out.push('  storage_accounts:')
      for (const row of mapped.data.storage_accounts) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - subsystem: ${q(row.name || 'storage')}`)
        out.push(`      module: terraform-azurerm-storage-account`)
        out.push(`      sku: ${q(cf.SKU || cf.sku || 'Standard_LRS')}`)
        out.push(`      kind: ${q(cf.Kind || cf.kind || 'StorageV2')}`)
        out.push(`      instance_number: '001'`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.data.caching.length > 0) {
      dataBlank()
      out.push('  # --- Caching ---')
      out.push('  caching:')
      for (const row of mapped.data.caching) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - id: ${q(row.name || 'redis')}`)
        out.push(`      subsystem: ${q(row.name || 'cache')}`)
        out.push(`      module: terraform-azurerm-managed-redis`)
        const sku = cf.sku || cf.SKU || ''
        const cap = cf.capacity || cf.Capacity || ''
        const fullSku = sku && cap ? `${sku}_${cap}` : (sku || cap || '')
        if (fullSku) out.push(`      sku: ${q(fullSku)}`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.data.search.length > 0) {
      dataBlank()
      out.push('  # --- Search ---')
      out.push('  search:')
      for (const row of mapped.data.search) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - id: ${q(row.name || 'search')}`)
        out.push(`      subsystem: ${q(row.name || 'search')}`)
        out.push(`      module: terraform-azurerm-search-service`)
        if (cf.sku) out.push(`      sku: ${q(cf.sku)}`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.data.factories.length > 0) {
      dataBlank()
      out.push('  # --- Data Factories ---')
      out.push('  factories:')
      for (const row of mapped.data.factories) {
        out.push(`    - id: ${q(row.name || 'adf')}`)
        out.push(`      subsystem: ${q(row.name || 'adf')}`)
        out.push(`      module: terraform-azurerm-data-factory`)
      }
    }
  }

  // ── security ───────────────────────────────────────────────────────────
  const hasSecurity = Object.values(mapped.security).some(a => a.length > 0)
  if (hasSecurity) {
    out.push(...sectionHeader('SECURITY'))
    out.push('security:')

    let firstSecSub = true
    const secBlank = () => { if (!firstSecSub) out.push(''); firstSecSub = false }

    if (mapped.security.key_vaults.length > 0) {
      secBlank()
      out.push('  # --- Key Vaults ---')
      out.push('  key_vaults:')
      for (const row of mapped.security.key_vaults) {
        const kvConsumers = Array.isArray(row.consumers) ? row.consumers.filter(c => c?.trim()) : []
        out.push(`    - id: ${q(row.name || 'kv')}`)
        out.push(`      subsystem: ${q(row.name || sub.product || sub.product_code || 'kv')}`)
        out.push(`      module: terraform-azurerm-key-vault`)
        out.push(`      access_model: RBAC`)
        if (kvConsumers.length > 0) {
          out.push(`      consumers:`)
          kvConsumers.forEach(c => out.push(`        - ${q(c)}`))
        } else {
          out.push(`      consumers: []`)
        }
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.security.managed_identities.length > 0) {
      secBlank()
      out.push('  # --- Managed Identities ---')
      out.push('  managed_identities:')
      for (const row of mapped.security.managed_identities) {
        out.push(`    - id: ${q(`mi_${row.name || 'identity'}`)}`)
        out.push(`      subsystem: ${q(row.name || 'identity')}`)
        out.push(`      module: terraform-azurerm-user-assigned-identity`)
        out.push(`      instance_number: '001'`)
      }
    }
  }

  // ── observability ──────────────────────────────────────────────────────
  const appInsights = mapped.observability.app_insights
  const product = sub.product || sub.product_code || 'myapp'
  out.push(...sectionHeader('OBSERVABILITY'))
  out.push('observability:')
  out.push('')
  out.push('  # --- Log Analytics Workspace ---')
  out.push('  log_analytics_workspace:')
  out.push('    id: law')
  out.push(`    subsystem: ${q(product)}`)
  out.push('    module: terraform-azurerm-log-analytics-workspace')
  out.push('    retention_days: 30')

  if (appInsights.length > 0) {
    out.push('')
    out.push('  # --- Application Insights ---')
    out.push('  app_insights:')
    for (const row of appInsights) {
      const cf = parseCommentFields(row.comments)
      out.push(`    - id: ${q(row.name || 'appi')}`)
      out.push(`      subsystem: ${q(row.name || product)}`)
      out.push(`      module: terraform-azurerm-application-insights`)
      out.push(`      workspace_id: law`)
      if (cf.retention) out.push(`      retention_days: ${cf.retention}`)
      if (row.comments) out.push(`      # comments: ${row.comments}`)
    }
  }

  // ── dependencies ───────────────────────────────────────────────────────
  out.push(...sectionHeader('DEPENDENCIES — External resources this spoke connects to'))
  out.push('dependencies:')
  out.push('  - name: hub-network-vnet')
  out.push('    type: vnet_peering')
  out.push('    direction: bidirectional')

  // ── unmapped resources ─────────────────────────────────────────────────
  if (unmappedRows.length > 0) {
    out.push('')
    out.push('# ---------------------------------------------------------------------------')
    out.push('# RESOURCES NOT MAPPED TO SCHEMA')
    out.push('# The following resources have no equivalent in this schema version.')
    out.push('# Add them manually or raise with the platform team.')
    out.push('# ---------------------------------------------------------------------------')
    for (const row of unmappedRows) {
      out.push(`# - name: ${row.name || ''}`)
      out.push(`#   type: ${row.type || ''}`)
      if (row.location) out.push(`#   location: ${row.location}`)
      if (row.repo)     out.push(`#   repo: ${row.repo}`)
      if (row.comments) out.push(`#   comments: ${row.comments}`)
    }
  }

  return out.join('\n')
}
