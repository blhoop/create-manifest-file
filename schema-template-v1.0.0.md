```yaml
# =============================================================================
# Spoke Infrastructure Manifest — Schema Template v1.0.0
# =============================================================================
#
# This file documents every field the builder accepts. Copy this template,
# fill in your values, and delete sections you don't need.
#
# The builder reads this manifest and generates all Terraform files, networking,
# private endpoints, DNS zones, and resource groups automatically.
#
# Legend:
#   REQUIRED  — must be provided or the builder will fail
#   OPTIONAL  — has a sensible default or can be omitted entirely
#   $ref:     — cross-reference to another resource's id (e.g. $ref:kv.resource_id)
#
# Naming: All Azure resource names are derived automatically from ctm_properties
# and each resource's subsystem using the pattern:
#   {type}-{product}-{subsystem}-{environment}-{location_abbr}-{instance}
#   Example: app-lb-api-dev-aue-001
#
# =============================================================================

# ---------------------------------------------------------------------------
# SPOKE — Identity & metadata
# ---------------------------------------------------------------------------
spoke:
  name: my-spoke-001                    # REQUIRED — unique spoke identifier, used for repo names and TFC workspaces
  subscription: my-spoke-001            # REQUIRED — Azure subscription name (created by LZ process if new_subscription: true)
  owner: Platform Engineering           # REQUIRED — team that owns this spoke
  description: >-                       # OPTIONAL — human-readable description of what this spoke is for
    Short description of the workload.
  sku_mode: premium                     # OPTIONAL — "premium" (default) or "standard". Controls SKU tier selection.
                                        #   premium = prod-equivalent tiers at smallest size (GP postgres, P1v3 app service, etc.)
                                        #   standard = lower tiers where acceptable
  management_group_id: converge         # OPTIONAL — short management group ID (e.g. "converge", "mg-platform-prod").
                                        #   The subscription module constructs the full ARM path internally.
                                        #   Omit to leave subscription at root.
  new_subscription: true                # OPTIONAL — true = LZ process creates a new subscription. false = use existing.
                                        #   Default: true
  infra_repo: my-spoke-001-infra        # REQUIRED — GitHub repo name for generated Terraform (created by Megalodon)

# ---------------------------------------------------------------------------
# CTM PROPERTIES — Used for resource naming only
# ---------------------------------------------------------------------------
ctm_properties:
  product: myapp                        # REQUIRED — short product code used in all resource names (e.g. "lb", "gprof", "mega")
                                        #   Keep it short (2-5 chars). This appears in every resource name.

# ---------------------------------------------------------------------------
# ENVIRONMENTS — At least one required
# ---------------------------------------------------------------------------
# Each key is an environment name. Valid values: dev, test, uat, preprod, prod, lab
environments:
  dev:
    location: australiaeast             # REQUIRED — Azure region. Used for all resources in this environment.
                                        #   Common values: australiaeast, eastus, eastus2, westus3, uksouth,
                                        #   southeastasia, northcentralus, westeurope, centralus, eastasia, westus2
  # Uncomment to add more environments:
  # prod:
  #   location: australiaeast

# ---------------------------------------------------------------------------
# TAGS — Applied to all resources via the tags module
# ---------------------------------------------------------------------------
tags:
  owner: '[TBD]'                        # REQUIRED — team or person responsible
  cost_center: '[TBD]'                  # REQUIRED — for chargeback/showback
  project: my-project                   # REQUIRED — project name
  data_classification: internal         # REQUIRED — internal, confidential, public, restricted
  # Add any additional custom tags as key-value pairs:
  # business_unit: engineering

# ---------------------------------------------------------------------------
# NETWORK
# ---------------------------------------------------------------------------
network:

  # --- VNets ---
  vnets:
    - id: vnet                          # REQUIRED — unique ID within this manifest (referenced by subnets)
      cidr: 10.3.0.0/24                # REQUIRED — VNet address space. Coordinate with hub team to avoid overlap.
                                        #   /24 is typical for small spokes. /23 or /22 for larger (AKS, container apps).
      dns_servers: hub-inherited        # OPTIONAL — "hub-inherited" (default) or list of custom DNS IPs
      peering: hub-network-vnet         # OPTIONAL — hub VNet to peer with. Omit if no hub peering needed.

  # --- Subnets ---
  # Subnets are sized by compute type. Common patterns:
  #   app_service:      /26 for apps + /27 for private endpoints
  #   container_app:    /23 for container env + /27 for private endpoints
  #   aks:              /24 system + /24 user + /27 for private endpoints
  #   vm:               /26 for compute + /27 for private endpoints
  #
  # Every spoke needs at minimum a snet_privateendpoints subnet.
  subnets:
    - id: snet_appservices              # REQUIRED — unique ID, referenced by NSGs and compute resources
      vnet_id: vnet                     # REQUIRED — must match a vnet id above
      cidr: 10.3.0.0/26                # REQUIRED — must fit within the parent VNet CIDR
      delegation: Microsoft.Web/serverFarms  # OPTIONAL — subnet delegation. Required for App Service VNet integration.
                                        #   Common values:
                                        #     Microsoft.Web/serverFarms (app service / function app)
                                        #     Microsoft.App/environments (container apps)
                                        #     null (no delegation — used for private endpoints, VMs)
      purpose: App Service VNet integration  # OPTIONAL — human-readable description

    - id: snet_privateendpoints
      vnet_id: vnet
      cidr: 10.3.0.64/27
      delegation: null
      purpose: Private endpoints

  # --- NSGs ---
  # One NSG per subnet. Rules are optional — empty [] means default deny-all-inbound applies.
  nsgs:
    - id: nsg_appservices               # REQUIRED — unique ID
      subnet_id: snet_appservices       # REQUIRED — must match a subnet id above
      rules: []                         # OPTIONAL — list of custom rules (see below for format)

    - id: nsg_privateendpoints
      subnet_id: snet_privateendpoints
      rules:
        - name: allow-vnet-inbound      # REQUIRED — rule name (unique within NSG)
          priority: 100                 # REQUIRED — 100-4096, lower = higher priority
          direction: Inbound            # REQUIRED — Inbound or Outbound
          access: Allow                 # REQUIRED — Allow or Deny
          protocol: '*'                 # REQUIRED — Tcp, Udp, Icmp, * (any)
          source_address_prefix: VirtualNetwork  # REQUIRED — CIDR, service tag, or *
          destination_port_range: '*'   # REQUIRED — port number, range (e.g. "443"), or *
          description: Allow inbound from VNet only  # OPTIONAL

        - name: deny-internet-inbound
          priority: 4096
          direction: Inbound
          access: Deny
          protocol: '*'
          source_address_prefix: Internet
          destination_port_range: '*'
          description: Deny internet inbound

  # --- Private Endpoints ---
  # One per resource that needs private connectivity. The $ref: syntax links to the
  # target resource's id defined elsewhere in this manifest.
  private_endpoints:
    - id: pe_kv                         # REQUIRED — unique ID
      target_resource_id: $ref:kv.resource_id  # REQUIRED — $ref:{resource_id}.resource_id
      sub_resource: vault               # REQUIRED — Azure sub-resource type. Common values:
                                        #   vault (Key Vault), Sql (Cosmos), sqlServer (MSSQL),
                                        #   redisEnterprise (Managed Redis), searchService (Cognitive Search),
                                        #   blob/table/queue/file (Storage), sites (Web App/Function App),
                                        #   postgresqlServer (PostgreSQL Flexible Server)
      subnet_id: snet_privateendpoints  # REQUIRED — must match a subnet id above
      dns_zone: privatelink.vaultcore.azure.net  # REQUIRED — Azure private DNS zone name for this resource type

  # --- DNS Zones ---
  # One per unique private DNS zone used by your private endpoints.
  dns_zones:
    - id: dns_kv                        # REQUIRED — unique ID
      zone_name: privatelink.vaultcore.azure.net  # REQUIRED — must match dns_zone on the corresponding PE
      linked_vnets: [vnet]              # REQUIRED — list of vnet ids to link this zone to

# ---------------------------------------------------------------------------
# COMPUTE
# ---------------------------------------------------------------------------
compute:

  # --- Plan Defaults ---
  # Define the plan spec ONCE here. By default, every web app and function app
  # gets its OWN dedicated plan created from this spec automatically.
  # You do NOT list individual plans — the builder creates them per app.
  plan_defaults:
    web_app:
      os_type: Windows                  # REQUIRED — Windows or Linux
      sku: P1v3                         # REQUIRED — SKU name. Minimums:
                                        #   P1v3 (Premium required for VNet integration, slots)
                                        #   Dev environments use same tier, smallest size.
    function_app:
      os_type: Windows                  # REQUIRED — Windows or Linux
      sku: EP1                          # REQUIRED — SKU name. Minimums:
                                        #   EP1 (Elastic Premium required for VNet integration, always-ready)

  # --- Web Apps ---
  # Each app gets its own dedicated plan from plan_defaults.web_app unless overridden.
  web_apps:
    - id: web_api                       # REQUIRED — unique ID
      subsystem: api                    # REQUIRED — naming segment (becomes part of resource name)
      module: terraform-azurerm-windows-web-app  # REQUIRED — use windows-web-app or linux-web-app
      instance_number: '001'            # REQUIRED — 3-digit zero-padded string
      vnet_integration_subnet_id: snet_appservices  # OPTIONAL — subnet id for VNet integration. Omit if no VNet integration.

    - id: web_config
      subsystem: config
      module: terraform-azurerm-windows-web-app
      instance_number: '002'
      vnet_integration_subnet_id: snet_appservices

    # Example: share a plan with another app instead of getting a dedicated one
    - id: web_website
      subsystem: website
      module: terraform-azurerm-windows-web-app
      instance_number: '003'
      vnet_integration_subnet_id: snet_appservices
      share_plan_with: web_api          # OPTIONAL — use the same plan as this app's id. Omit = dedicated plan.

    # Example: custom plan spec for a single app that needs more horsepower
    - id: web_heavy
      subsystem: heavy-api
      module: terraform-azurerm-windows-web-app
      instance_number: '004'
      vnet_integration_subnet_id: snet_appservices
      plan_override:                    # OPTIONAL — override plan_defaults for this app only
        sku: P2v3                       #   Any plan_defaults field can be overridden here
        os_type: Windows

  # --- Function Apps ---
  # Each app gets its own dedicated plan from plan_defaults.function_app unless overridden.
  function_apps:
    - id: func_booking-expiry           # REQUIRED — unique ID
      subsystem: booking-expiry         # REQUIRED — naming segment
      module: terraform-azurerm-windows-function-app  # REQUIRED — use windows-function-app or linux-function-app
      runtime: dotnet-isolated          # REQUIRED — runtime stack. Common values:
                                        #   dotnet-isolated, node, python, java, powershell, custom
      instance_number: '001'            # REQUIRED — 3-digit zero-padded string
      vnet_integration_subnet_id: snet_appservices  # OPTIONAL — subnet id for VNet integration

    # Example: shared plan — these two functions run on the same plan
    - id: func_notifications
      subsystem: notifications
      module: terraform-azurerm-windows-function-app
      runtime: dotnet-isolated
      instance_number: '002'
      vnet_integration_subnet_id: snet_appservices
      share_plan_with: func_booking-expiry  # OPTIONAL — share a plan instead of dedicated

    # Example: custom plan override for a function that needs a bigger SKU
    - id: func_heavy-processor
      subsystem: heavy-processor
      module: terraform-azurerm-windows-function-app
      runtime: dotnet-isolated
      instance_number: '003'
      vnet_integration_subnet_id: snet_appservices
      plan_override:                    # OPTIONAL — override plan_defaults for this app only
        sku: EP2

  # --- Static Sites ---
  # OPTIONAL section — only if you have static web apps (React, Angular, etc.)
  static_sites:
    - id: swa_frontend
      subsystem: frontend
      module: terraform-azurerm-static-web-app
      sku: Standard                     # REQUIRED — Standard or Free
      instance_number: '001'
      location: eastasia                # OPTIONAL — override default location (Static Sites have limited region availability)

# ---------------------------------------------------------------------------
# DATA
# ---------------------------------------------------------------------------
data:

  # --- Databases ---
  # Each database type gets its own isolated resource group automatically (CTM §18).
  # OPTIONAL section — omit entirely if no databases needed.
  databases:
    - id: cosmos                        # REQUIRED — unique ID, used in $ref for private endpoints
      subsystem: cosmos                 # REQUIRED — naming segment
      type: cosmos_account              # REQUIRED — database type. Determines RG isolation. Valid values:
                                        #   cosmos_account, mssql_server, postgresql_flexible_server,
                                        #   mssql_managed_instance, mysql_flexible_server
      module: terraform-azurerm-cosmos-account  # REQUIRED — CTM module name
      sku: serverless                   # REQUIRED — type-specific SKU. Examples:
                                        #   cosmos: serverless, provisioned
                                        #   mssql_server: GP_Gen5_2, GP_Gen5_4
                                        #   postgresql_flexible_server: GP_Standard_D2s_v3 (minimum, never Burstable)
      databases:                        # OPTIONAL — informational only. Terraform does NOT create these.
        - my-db                         #   Database creation is an app team concern (CREATE DATABASE / migrations).
        - my-db-archive                 #   Listed here for documentation / schooling purposes.

  # --- Caching ---
  # OPTIONAL section — Redis lives in the compute RG (not isolated like databases).
  caching:
    - id: redis
      subsystem: compute
      module: terraform-azurerm-managed-redis
      sku: Balanced_B0                  # REQUIRED — Minimum: Balanced_B0 (supports private endpoints). Never Basic.

  # --- Search ---
  # OPTIONAL section
  search:
    - id: search
      subsystem: compute
      module: terraform-azurerm-search-service
      sku: standard                     # REQUIRED — standard, basic, free, etc.

  # --- Data Factories ---
  # OPTIONAL section
  factories:
    - id: adf
      subsystem: compute
      module: terraform-azurerm-data-factory

# ---------------------------------------------------------------------------
# SECURITY
# ---------------------------------------------------------------------------
security:

  # --- Key Vaults ---
  # Most spokes need exactly one Key Vault.
  key_vaults:
    - id: kv                            # REQUIRED — unique ID, used in $ref for private endpoints
      subsystem: myapp                  # REQUIRED — naming segment. Often same as product code.
                                        #   Key Vault names are compact (max 24 chars) — subsystem may be shortened.
      module: terraform-azurerm-key-vault  # REQUIRED
      access_model: RBAC                # REQUIRED — RBAC (recommended) or access_policy
      consumers: []                     # OPTIONAL — list of consumer references for RBAC role assignments

  # --- User-Assigned Managed Identities ---
  # OPTIONAL — create identities for workloads that need them (function apps, web apps, etc.)
  managed_identities:
    - id: mi_functions
      subsystem: functions
      module: terraform-azurerm-user-assigned-identity
      instance_number: '001'

    - id: mi_webjobs
      subsystem: webjobs
      module: terraform-azurerm-user-assigned-identity
      instance_number: '002'

# ---------------------------------------------------------------------------
# OBSERVABILITY
# ---------------------------------------------------------------------------
observability:

  # --- Log Analytics Workspace ---
  # One per spoke. Most spokes need this.
  log_analytics_workspace:
    id: law                             # REQUIRED — unique ID
    subsystem: myapp                    # REQUIRED — naming segment
    module: terraform-azurerm-log-analytics-workspace  # REQUIRED
    retention_days: 30                  # OPTIONAL — default 30. Range: 30-730.

  # --- Application Insights ---
  # OPTIONAL — one or more App Insights instances linked to the workspace.
  app_insights:
    - id: appi
      subsystem: myapp
      module: terraform-azurerm-application-insights
      workspace_id: law                 # REQUIRED — must match log_analytics_workspace id

# ---------------------------------------------------------------------------
# DEPENDENCIES — External resources this spoke connects to
# ---------------------------------------------------------------------------
# OPTIONAL section — declare external dependencies for documentation and hub peering.
dependencies:
  - name: hub-network-vnet              # REQUIRED — identifier for the dependency
    type: vnet_peering                  # REQUIRED — dependency type (vnet_peering, dns_forwarding, etc.)
    direction: bidirectional            # OPTIONAL — bidirectional (default) or outbound-only
    notes: DNS resolution, on-prem connectivity via hub VPN  # OPTIONAL — context for operators
```
