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
  out.push("schema_version: '1.4.0'")
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
  const tags = sub.tags ?? {}
  out.push(...sectionHeader('TAGS'))
  out.push('tags:')
  out.push(`  CostRegion: ${q(tags.CostRegion || '[TBD]')}`)
  out.push(`  CostType: ${q(tags.CostType || '[TBD]')}`)
  if (tags.owner && tags.owner !== '[TBD]')               out.push(`  owner: ${q(tags.owner)}`)
  if (tags.cost_center && tags.cost_center !== '[TBD]')   out.push(`  cost_center: ${q(tags.cost_center)}`)
  if (tags.project)                                       out.push(`  project: ${q(tags.project)}`)
  if (tags.data_classification)                           out.push(`  data_classification: ${q(tags.data_classification)}`)

  // ── pre-scan rows for vnet, NSG rules ──────────────────────────────────
  // Collect before emitting network/security sections
  const vnetRows = (rows || []).filter(r => r.type === 'vnet')
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
  // v1.4.0 minimal mode: just vnet_cidr + optional peering.
  // Builder auto-generates subnets, NSGs, delegations, PEs, DNS zones.
  out.push(...sectionHeader('NETWORK'))
  out.push('network:')
  const vnetCidr = vnetRows.length > 0
    ? (parseCommentFields(vnetRows[0].comments).cidr || sub.vnet_cidr || '')
    : (sub.vnet_cidr || '')
  if (vnetCidr) out.push(`  vnet_cidr: ${q(vnetCidr)}`)
  out.push('  peering: hub-network-vnet')
  // Custom NSG rules — emit as override block only when rules are present
  if (dedupedNsgRules.length > 0) {
    out.push('  nsgs:')
    out.push('    - id: nsg_appservices')
    out.push('      subnet_id: snet_appservices')
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
  }

  // ── partition rows by schema section ───────────────────────────────────
  const mapped = {
    network: { vnets: [] },
    compute: {
      app_service_plans: [], web_apps: [], function_apps: [], static_sites: [],
      container_app_environment: [], container_apps: [],
      aks_clusters: [], virtual_machines: [], signalr: [], apim: [],
    },
    data: {
      databases: [], storage_accounts: [], caching: [], search: [], factories: [],
      backup_vaults: [], messaging: [],
    },
    security:     { key_vaults: [], managed_identities: [], container_registries: [] },
    observability:{ app_insights: [] },
    app_configuration: { items: [] },
    ai:           { foundry: [] },
    frontdoor:    { items: [] },
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
  // Also pull os_type from first app's comments as fallback (web_app popup has an os_type field)
  const firstWebCf  = parseCommentFields(webApps[0]?.comments)

  const webOs  = webPlanCf.os_type || webPlanCf.OS  || firstWebCf.os_type || firstWebCf.OS  || 'Windows'
  const webSku = webPlanCf.sku     || webPlanCf.SKU  || 'P1v3'
  const funcOs  = funcPlanCf.os_type || funcPlanCf.OS  || 'Windows'
  const funcSku = funcPlanCf.sku     || funcPlanCf.SKU  || 'EP1'

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
      if (webPlanRow) out.push(`    # source: ${webPlanRow.name} — set PlanFor, os_type, sku via row popup`)
      out.push('    web_app:')
      out.push(`      os_type: ${q(webOs)}`)
      out.push(`      sku: ${q(webSku)}`)
    }
    if (hasFuncApps || funcPlanRows.length > 0 || planRows.length > 0) {
      if (funcPlanRow && funcPlanRow !== webPlanRow) out.push(`    # source: ${funcPlanRow.name} — set PlanFor, os_type, sku via row popup`)
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
      out.push(`      instance_number: ${q(cf.instance_number || '001')}`)
      if (hasVnet) out.push(`      vnet_integration_subnet_id: snet_appservices`)
      if (cf.share_plan_with) out.push(`      share_plan_with: ${q(cf.share_plan_with)}`)
      // plan_override — explicit popup field takes priority, then fall back to ASP row matching
      const planOverrideSku = cf.plan_override_sku
      if (planOverrideSku) {
        out.push(`      plan_override:`)
        out.push(`        os_type: ${q(cf.os_type || webOs)}`)
        out.push(`        sku: ${q(planOverrideSku)}`)
      } else {
        // Legacy: match secondary ASP row by name
        const appNameLower = (row.name || '').toLowerCase()
        const overrideAsp = webPlanRows.slice(1).find(asp => {
          const aspName = (asp.name || '').toLowerCase()
          return aspName.includes(appNameLower) || appNameLower.includes(aspName)
        })
        if (overrideAsp) {
          const ocf = parseCommentFields(overrideAsp.comments)
          const oOs  = ocf.os_type || ocf.OS || webOs
          const oSku = ocf.sku || ocf.SKU || webSku
          if (oOs !== webOs || oSku !== webSku) {
            out.push(`      plan_override:`)
            out.push(`        os_type: ${q(oOs)}`)
            out.push(`        sku: ${q(oSku)}`)
          }
        }
      }
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
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
      const runtime = cf.runtime || cf.Runtime || 'dotnet-isolated'
      out.push(`    - id: ${q(id)}`)
      out.push(`      subsystem: ${q(row.name || 'func')}`)
      out.push(`      module: ${mod}`)
      out.push(`      runtime: ${q(runtime)}`)
      out.push(`      instance_number: ${q(cf.instance_number || '001')}`)
      if (hasVnet) out.push(`      vnet_integration_subnet_id: snet_appservices`)
      if (cf.share_plan_with) out.push(`      share_plan_with: ${q(cf.share_plan_with)}`)
      // plan_override — explicit popup field takes priority, then fall back to ASP row matching
      const planOverrideSku = cf.plan_override_sku
      if (planOverrideSku) {
        out.push(`      plan_override:`)
        out.push(`        sku: ${q(planOverrideSku)}`)
      } else {
        // Legacy: match secondary ASP row by name
        const appNameLower = (row.name || '').toLowerCase()
        const overrideAsp = funcPlanRows.slice(1).find(asp => {
          const aspName = (asp.name || '').toLowerCase()
          return aspName.includes(appNameLower) || appNameLower.includes(aspName)
        })
        if (overrideAsp) {
          const ocf = parseCommentFields(overrideAsp.comments)
          const oOs  = ocf.os_type || ocf.OS || funcOs
          const oSku = ocf.sku || ocf.SKU || funcSku
          if (oOs !== funcOs || oSku !== funcSku) {
            out.push(`      plan_override:`)
            out.push(`        os_type: ${q(oOs)}`)
            out.push(`        sku: ${q(oSku)}`)
          }
        }
      }
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
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
      const loc = row.location || cf.location
      if (loc) out.push(`      location: ${q(loc)}`)
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
    }
  }

  // container_app_environment (singleton — use first row)
  const caeRows = mapped.compute.container_app_environment
  if (caeRows.length > 0) {
    computeBlank()
    const cae = caeRows[0]
    const caeCf = parseCommentFields(cae.comments)
    out.push('  # --- Container App Environment ---')
    out.push('  container_app_environment:')
    out.push(`    subsystem: ${q(cae.name || 'compute')}`)
    out.push(`    infrastructure_subnet_id: ${q(caeCf.infrastructure_subnet_id || 'snet_containerenvironment')}`)
    out.push(`    log_analytics_workspace_id: law`)
  }

  // container_apps
  const containerApps = mapped.compute.container_apps
  if (containerApps.length > 0) {
    computeBlank()
    out.push('  # --- Container Apps ---')
    out.push('  container_apps:')
    for (const row of containerApps) {
      const cf = parseCommentFields(row.comments)
      out.push(`    - subsystem: ${q(row.name || 'app')}`)
      out.push(`      module: terraform-azurerm-container-app`)
      out.push(`      instance_number: '001'`)
      out.push(`      image: ${q(cf.image || '[TBD]')}`)
      out.push(`      cpu: ${cf.cpu || '0.5'}`)
      out.push(`      memory: ${cf.memory || '1.0'}`)
      out.push(`      min_replicas: ${cf.min_replicas || '0'}`)
      out.push(`      max_replicas: ${cf.max_replicas || '3'}`)
      out.push(`      target_port: ${cf.target_port || '80'}`)
      if (cf.transport) out.push(`      transport: ${q(cf.transport)}`)
      if (row.repo) out.push(`      # app_repo: ${row.repo}`)
    }
  }

  // aks_clusters
  const aksClusters = mapped.compute.aks_clusters
  if (aksClusters.length > 0) {
    computeBlank()
    out.push('  # --- AKS ---')
    out.push('  aks_clusters:')
    for (const row of aksClusters) {
      const cf = parseCommentFields(row.comments)
      out.push(`    - subsystem: ${q(row.name || 'compute')}`)
      out.push(`      module: terraform-azurerm-aks`)
      out.push(`      instance_number: '001'`)
      if (cf.kubernetes_version) out.push(`      kubernetes_version: '${cf.kubernetes_version}'`)
      out.push(`      sku_tier: ${q(cf.sku_tier || 'Standard')}`)
      out.push(`      default_node_pool:`)
      out.push(`        vm_size: ${q(cf.vm_size || 'Standard_D2s_v5')}`)
      out.push(`        node_count: ${cf.node_count || 2}`)
      if (cf.min_count) out.push(`        min_count: ${cf.min_count}`)
      if (cf.max_count) out.push(`        max_count: ${cf.max_count}`)
      out.push(`        vnet_subnet_id: snet_aks_system`)
    }
  }

  // virtual_machines
  const vms = mapped.compute.virtual_machines
  if (vms.length > 0) {
    computeBlank()
    out.push('  # --- Virtual Machines ---')
    out.push('  virtual_machines:')
    for (const row of vms) {
      const cf = parseCommentFields(row.comments)
      const osType = cf.os_type || 'Linux'
      const mod = resolveModule('vm', cf)
      out.push(`    - subsystem: ${q(row.name || 'vm')}`)
      out.push(`      module: ${mod}`)
      out.push(`      os_type: ${q(osType)}`)
      out.push(`      instance_number: '001'`)
      out.push(`      vm_size: ${q(cf.vm_size || 'Standard_D2s_v5')}`)
      if (cf.admin_username) out.push(`      admin_username: ${q(cf.admin_username)}`)
      out.push(`      subnet_id: snet_compute`)
      out.push(`      os_disk:`)
      out.push(`        size_gb: 128`)
      out.push(`        storage_account_type: ${q(cf.storage_account_type || 'Premium_LRS')}`)
    }
  }

  // signalr
  const signalrRows = mapped.compute.signalr
  if (signalrRows.length > 0) {
    computeBlank()
    out.push('  # --- SignalR ---')
    out.push('  signalr:')
    for (const row of signalrRows) {
      const cf = parseCommentFields(row.comments)
      out.push(`    - subsystem: ${q(row.name || 'compute')}`)
      out.push(`      module: terraform-azurerm-signalr-service`)
      out.push(`      sku: ${q(cf.sku || cf.SKU || 'Standard_S1')}`)
      out.push(`      instance_number: '001'`)
      out.push(`      service_mode: ${q(cf.service_mode || 'Default')}`)
      if (row.comments) out.push(`      # comments: ${row.comments}`)
    }
  }

  // apim (singleton — use first row)
  const apimRows = mapped.compute.apim
  if (apimRows.length > 0) {
    computeBlank()
    const apimRow = apimRows[0]
    const apimCf = parseCommentFields(apimRow.comments)
    out.push('  # --- API Management ---')
    out.push('  apim:')
    out.push(`    subsystem: ${q(apimRow.name || 'compute')}`)
    out.push(`    module: terraform-azurerm-api-management`)
    out.push(`    sku: ${q(apimCf.sku || 'Developer_1')}`)
    out.push(`    publisher_name: ${q(apimCf.publisher_name || '[TBD]')}`)
    out.push(`    publisher_email: ${q(apimCf.publisher_email || '[TBD]')}`)
    out.push(`    instance_number: '001'`)
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
        out.push(`      sku: ${q(cf.sku || cf.SKU || 'Standard_LRS')}`)
        out.push(`      kind: ${q(cf.kind || cf.Kind || 'StorageV2')}`)
        out.push(`      instance_number: '001'`)
      }
    }

    if (mapped.data.caching.length > 0) {
      dataBlank()
      out.push('  # --- Caching ---')
      out.push('  caching:')
      for (const row of mapped.data.caching) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - id: ${q(row.name || 'redis')}`)
        out.push(`      subsystem: compute`)
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
        out.push(`    - subsystem: compute`)
        out.push(`      module: terraform-azurerm-search-service`)
        if (cf.sku) out.push(`      sku: ${q(cf.sku)}`)
        if (cf.replica_count) out.push(`      replica_count: ${cf.replica_count}`)
        if (cf.partition_count) out.push(`      partition_count: ${cf.partition_count}`)
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

    if (mapped.data.backup_vaults.length > 0) {
      dataBlank()
      out.push('  # --- Backup Vaults ---')
      out.push('  backup_vaults:')
      for (const row of mapped.data.backup_vaults) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - subsystem: ${q(row.name || 'compute')}`)
        out.push(`      module: terraform-azurerm-backup-vault`)
        out.push(`      instance_number: '001'`)
        out.push(`      redundancy: ${q(cf.redundancy || 'LocallyRedundant')}`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.data.messaging.length > 0) {
      dataBlank()
      out.push('  # --- Messaging (Service Bus) ---')
      out.push('  messaging:')
      for (const row of mapped.data.messaging) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - subsystem: ${q(row.name || 'compute')}`)
        out.push(`      module: terraform-azurerm-servicebus-namespace`)
        out.push(`      sku: ${q(cf.sku || cf.SKU || 'Standard')}`)
        out.push(`      instance_number: '001'`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
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

    if (mapped.security.container_registries.length > 0) {
      secBlank()
      out.push('  # --- Container Registries ---')
      out.push('  container_registries:')
      for (const row of mapped.security.container_registries) {
        const cf = parseCommentFields(row.comments)
        out.push(`    - subsystem: ${q(row.name || 'compute')}`)
        out.push(`      module: terraform-azurerm-container-registry`)
        out.push(`      sku: ${q(cf.sku || cf.SKU || 'Premium')}`)
        out.push(`      instance_number: '001'`)
        out.push(`      consumers: []`)
        if (row.comments) out.push(`      # comments: ${row.comments}`)
      }
    }

    if (mapped.security.managed_identities.length > 0) {
      secBlank()
      out.push('  # --- Managed Identities ---')
      out.push('  managed_identities:')
      for (const row of mapped.security.managed_identities) {
        const cf = parseCommentFields(row.comments)
        const subsystem = cf.subsystem || row.name || 'identity'
        out.push(`    - id: ${q(`mi_${subsystem}`)}`)
        out.push(`      subsystem: ${q(subsystem)}`)
        out.push(`      module: terraform-azurerm-user-assigned-identity`)
        out.push(`      instance_number: ${q(cf.instance_number || '001')}`)
      }
    }
  }

  // ── observability ──────────────────────────────────────────────────────
  const appInsights = mapped.observability.app_insights
  const product = sub.product || sub.product_code || 'myapp'
  out.push(...sectionHeader('OBSERVABILITY'))
  out.push('observability:')
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
      out.push(`    - subsystem: ${q(row.name || product)}`)
      out.push(`      module: terraform-azurerm-application-insights`)
      out.push(`      workspace_id: law`)
      const retDays = cf.retention_days || cf.retention
      if (retDays) out.push(`      retention_days: ${retDays}`)
    }
  }

  // ── app_configuration ──────────────────────────────────────────────────
  const appConfigItems = mapped.app_configuration.items
  if (appConfigItems.length > 0) {
    out.push(...sectionHeader('APP CONFIGURATION'))
    out.push('app_configuration:')
    for (const row of appConfigItems) {
      const cf = parseCommentFields(row.comments)
      out.push(`  - subsystem: ${q(row.name || 'compute')}`)
      out.push(`    module: terraform-azurerm-app-configuration`)
      out.push(`    sku: ${q(cf.sku || cf.SKU || 'standard')}`)
      out.push(`    instance_number: '001'`)
      if (row.comments) out.push(`    # comments: ${row.comments}`)
    }
  }

  // ── ai ─────────────────────────────────────────────────────────────────
  const aiFoundry = mapped.ai.foundry
  if (aiFoundry.length > 0) {
    out.push(...sectionHeader('AI'))
    out.push('ai:')
    out.push('  foundry:')
    for (const row of aiFoundry) {
      const cf = parseCommentFields(row.comments)
      out.push(`    - subsystem: ${q(row.name || 'compute')}`)
      out.push(`      module: terraform-azurerm-ai-foundry`)
      out.push(`      instance_number: '001'`)
      out.push(`      sku: S0`)
      if (cf.models) out.push(`      # models: ${cf.models}`)
      if (row.comments) out.push(`      # comments: ${row.comments}`)
    }
  }

  // ── frontdoor ──────────────────────────────────────────────────────────
  const frontdoorItems = mapped.frontdoor.items
  if (frontdoorItems.length > 0) {
    out.push(...sectionHeader('FRONT DOOR'))
    out.push('frontdoor:')
    const fdRow = frontdoorItems[0]
    const fdCf = parseCommentFields(fdRow.comments)
    out.push('  profile:')
    out.push(`    subsystem: ${q(fdRow.name || 'compute')}`)
    out.push(`    module: terraform-azurerm-cdn-frontdoor-profile`)
    out.push(`    sku: ${q(fdCf.sku || fdCf.SKU || 'Standard_AzureFrontDoor')}`)
    out.push('  # endpoints, origin_groups, origins, routes — add manually')
    if (fdRow.comments) out.push(`  # comments: ${fdRow.comments}`)
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
