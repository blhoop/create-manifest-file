# Terraform Manifest Schema - Reverse Engineering

## Overview
Analyzed from: `lightning-book-001.yml`

This is a comprehensive Infrastructure-as-Code manifest that maps to Terraform Azure RM modules with explicit resource organization, networking, compute, data, security, and observability layers.

---

## Top-Level Structure

```yaml
schema_version: '1'
spoke: {...}
ctm_properties: {...}
environments: {...}
tags: {...}
network: {...}
compute: {...}
data: {...}
security: {...}
observability: {...}
dependencies: [...]
```

---

## Section 1: `spoke` (Spoke Configuration)

**Purpose**: Core subscription and spoke metadata

**Fields**:
| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `name` | string | "lightning-book-001" | Spoke identifier |
| `subscription` | string | "lightning-book-001" | Azure subscription name |
| `owner` | string | "Platform Engineering" | Team/owner responsible |
| `description` | string | "Lightning Book travel booking..." | Full description |
| `sku_mode` | string | "premium" | Subscription tier (premium/standard/basic?) |
| `management_group_id` | string | "converge" | Azure management group |
| `new_subscription` | boolean | true | Is this a new Azure subscription? |
| `infra_repo` | string | "lightning-book-001-infra" | Git repo name for IaC |

**Mapping to Current Manifest**:
```
subscription_name → spoke.subscription
environment → (separate in environments section)
default_location → (in environments.{env}.location)
```

---

## Section 2: `ctm_properties` (CTM/CAF Properties)

**Purpose**: Naming and organization conventions

**Fields**:
| Field | Type | Example |
|-------|------|---------|
| `product` | string | "lb" | Product code (used in resource naming) |

---

## Section 3: `environments` (Environment Configuration)

**Purpose**: Per-environment settings

**Structure**:
```yaml
environments:
  dev:
    location: australiaeast
  # Other environments: test, uat, prod, etc.
```

**Fields per environment**:
| Field | Type | Example |
|-------|------|---------|
| `location` | string | "australiaeast" | Azure region |

---

## Section 4: `tags` (Global Tags)

**Purpose**: Azure resource tags applied to all resources

**Fields**: Key-value pairs
```yaml
tags:
  owner: '[TBD]'
  cost_center: '[TBD]'
  project: lightning-book
  data_classification: internal
```

---

## Section 5: `network` (Network Configuration)

### 5.1 VNets

**Structure**:
```yaml
vnets:
  - id: vnet
    cidr: 192.168.0.0/24
    dns_servers: hub-inherited
    peering: hub-network-vnet
```

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | "vnet" | Resource identifier (local reference) |
| `cidr` | string | "192.168.0.0/24" | VNet address space |
| `dns_servers` | string | "hub-inherited" | DNS configuration |
| `peering` | string | "hub-network-vnet" | VNet peering target |

### 5.2 Subnets

**Structure**:
```yaml
subnets:
  - id: snet_appservices
    vnet_id: vnet
    cidr: 192.168.0.0/26
    delegation: Microsoft.Web/serverFarms
    purpose: App Service VNet integration
```

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | "snet_appservices" | Subnet identifier |
| `vnet_id` | string | "vnet" | Reference to parent VNet |
| `cidr` | string | "192.168.0.0/26" | Subnet address space |
| `delegation` | string | "Microsoft.Web/serverFarms" | Azure service delegation (nullable) |
| `purpose` | string | "App Service VNet integration" | Descriptive purpose |

### 5.3 NSGs (Network Security Groups)

**Structure**:
```yaml
nsgs:
  - id: nsg_appservices
    subnet_id: snet_appservices
    rules:
      - name: allow-vnet-inbound
        priority: 100
        direction: Inbound
        access: Allow
        protocol: '*'
        source_address_prefix: VirtualNetwork
        destination_port_range: '*'
        description: Allow inbound from VNet only
```

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | NSG identifier |
| `subnet_id` | string | Associated subnet reference |
| `rules` | array | NSG rules (can be empty) |

**NSG Rule Fields**:
| Field | Type | Values |
|-------|------|--------|
| `name` | string | Rule name |
| `priority` | integer | 100-4096 |
| `direction` | string | "Inbound" or "Outbound" |
| `access` | string | "Allow" or "Deny" |
| `protocol` | string | '*', 'TCP', 'UDP', etc. |
| `source_address_prefix` | string | 'VirtualNetwork', 'Internet', CIDR, etc. |
| `destination_port_range` | string | '*' or port number |
| `description` | string | Rule description |

### 5.4 Private Endpoints

**Structure**:
```yaml
private_endpoints:
  - id: pe_kv
    target_resource_id: $ref:kv.resource_id
    sub_resource: vault
    subnet_id: snet_privateendpoints
    dns_zone: privatelink.vaultcore.azure.net
```

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | "pe_kv" | Private endpoint identifier |
| `target_resource_id` | string | "$ref:kv.resource_id" | **Reference syntax** |
| `sub_resource` | string | "vault", "Sql", "sqlServer" | Azure service sub-resource |
| `subnet_id` | string | "snet_privateendpoints" | Subnet for PE |
| `dns_zone` | string | "privatelink.vaultcore.azure.net" | Private DNS zone |

### 5.5 DNS Zones

**Structure**:
```yaml
dns_zones:
  - id: dns_kv
    zone_name: privatelink.vaultcore.azure.net
    linked_vnets: [vnet]
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "dns_kv" |
| `zone_name` | string | "privatelink.vaultcore.azure.net" |
| `linked_vnets` | array | ["vnet", "other-vnet"] |

---

## Section 6: `compute` (Compute Resources)

### 6.1 App Service Plans

**Structure**:
```yaml
app_service_plans:
  - id: asp_web
    subsystem: compute
    module: terraform-azurerm-app-service-plan
    os_type: Windows
    sku: P1v3
```

**Standard Terraform Module Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Resource identifier (local) |
| `subsystem` | string | Logical grouping ("compute", "api", "functions") |
| `module` | string | Terraform module name |

**ASP-Specific Fields**:
| Field | Type | Example |
|-------|------|---------|
| `os_type` | string | "Windows" or "Linux" |
| `sku` | string | "P1v3", "EP1", "B1", "S1" |

### 6.2 Web Apps

**Structure**:
```yaml
web_apps:
  - id: web_api
    subsystem: api
    module: terraform-azurerm-windows-web-app
    asp_id: asp_web
    vnet_integration_subnet_id: snet_appservices
```

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | "web_api" | Local identifier |
| `subsystem` | string | "api", "config", "website" | Functional grouping |
| `module` | string | "terraform-azurerm-windows-web-app" | Module reference |
| `asp_id` | string | "asp_web" | App Service Plan reference |
| `vnet_integration_subnet_id` | string | "snet_appservices" | VNet integration subnet |

### 6.3 Function Apps

**Structure**:
```yaml
function_apps:
  - id: func_booking-expiry
    subsystem: booking-expiry
    module: terraform-azurerm-windows-function-app
    asp_id: asp_func
    runtime: dotnet-isolated
    vnet_integration_subnet_id: snet_appservices
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "func_booking-expiry" |
| `subsystem` | string | "booking-expiry" |
| `module` | string | "terraform-azurerm-windows-function-app" |
| `asp_id` | string | "asp_func" |
| `runtime` | string | "dotnet-isolated", "python", "node" |
| `vnet_integration_subnet_id` | string | "snet_appservices" |

### 6.4 Static Web Apps

**Structure**:
```yaml
static_sites:
  - id: swa_config-website-react
    subsystem: config-website-react
    module: terraform-azurerm-static-web-app
    sku: Standard
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "swa_config-website-react" |
| `subsystem` | string | "config-website-react" |
| `module` | string | "terraform-azurerm-static-web-app" |
| `sku` | string | "Standard" or "Free" |

---

## Section 7: `data` (Data Resources)

### 7.1 Databases

**Structure**:
```yaml
databases:
  - id: cosmos
    subsystem: cosmos
    type: cosmos_account
    module: terraform-azurerm-cosmos-account
    sku: serverless
```

**SQL Databases** (with sub-resources):
```yaml
  - id: sql
    subsystem: sql
    type: mssql_server
    module: terraform-azurerm-mssql-server
    sku: GP_Gen5_2
    databases:
      - sql-db
      - sql-db-archive
      - sql-db-hotels
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "cosmos", "sql" |
| `subsystem` | string | "cosmos", "sql" |
| `type` | string | "cosmos_account", "mssql_server" |
| `module` | string | Terraform module |
| `sku` | string | "serverless", "GP_Gen5_2" |
| `databases` | array | Sub-databases (SQL only) |

### 7.2 Caching (Redis)

```yaml
caching:
  - id: redis
    subsystem: compute
    module: terraform-azurerm-managed-redis
    sku: Balanced_B0
```

### 7.3 Search

```yaml
search:
  - id: search
    subsystem: compute
    module: terraform-azurerm-search-service
    sku: standard
```

### 7.4 Data Factories

```yaml
factories:
  - id: adf
    subsystem: compute
    module: terraform-azurerm-data-factory
```

---

## Section 8: `security` (Security Resources)

### 8.1 Key Vaults

**Structure**:
```yaml
key_vaults:
  - id: kv
    subsystem: lb
    module: terraform-azurerm-key-vault
    access_model: RBAC
    consumers: []
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "kv" |
| `subsystem` | string | "lb" |
| `module` | string | "terraform-azurerm-key-vault" |
| `access_model` | string | "RBAC" or "AccessPolicy" |
| `consumers` | array | Resources that access this KV |

### 8.2 Managed Identities

**Structure**:
```yaml
managed_identities:
  - id: mi_azure-functions
    subsystem: azure-functions
    module: terraform-azurerm-user-assigned-identity
    instance_number: '001'
```

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `id` | string | "mi_azure-functions" | |
| `subsystem` | string | "azure-functions" | |
| `module` | string | "terraform-azurerm-user-assigned-identity" | |
| `instance_number` | string | "001" | Numbered instance suffix |

---

## Section 9: `observability` (Monitoring & Logging)

### 9.1 Log Analytics Workspace

**Structure** (Note: singular, not array):
```yaml
log_analytics_workspace:
  id: law
  subsystem: lb
  module: terraform-azurerm-log-analytics-workspace
  retention_days: 30
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "law" |
| `subsystem` | string | "lb" |
| `module` | string | "terraform-azurerm-log-analytics-workspace" |
| `retention_days` | integer | 30 |

### 9.2 Application Insights

**Structure** (array):
```yaml
app_insights:
  - id: appi
    subsystem: lb
    module: terraform-azurerm-application-insights
    workspace_id: law
```

| Field | Type | Example |
|-------|------|---------|
| `id` | string | "appi" |
| `subsystem` | string | "lb" |
| `module` | string | "terraform-azurerm-application-insights" |
| `workspace_id` | string | "law" | Reference to LAW |

---

## Section 10: `dependencies` (Cross-Resource Dependencies)

**Structure**:
```yaml
dependencies:
  - name: hub-network-vnet
    type: vnet_peering
    direction: bidirectional
    notes: DNS resolution, on-prem connectivity via hub VPN
```

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `name` | string | "hub-network-vnet" | Dependency name/identifier |
| `type` | string | "vnet_peering" | Dependency type |
| `direction` | string | "bidirectional", "inbound", "outbound" | Direction |
| `notes` | string | Free-form notes | Purpose/description |

---

## Reference System: `$ref:` Syntax

**Pattern**: `$ref:{resource_id}.{output_field}`

**Examples from manifest**:
```yaml
target_resource_id: $ref:kv.resource_id
target_resource_id: $ref:cosmos.resource_id
target_resource_id: $ref:sql.resource_id
workspace_id: law
```

**How it works**:
- `$ref:kv.resource_id` = Reference the output `resource_id` from resource with `id: kv`
- `$ref:cosmos.resource_id` = Reference the Cosmos DB's resource ID
- Plain `id` reference (e.g., `asp_id: asp_web`) = Local reference within section

**Terraform module outputs that are likely referenced**:
- `.resource_id` - Azure resource ID
- `.principal_id` - Managed Identity principal ID
- `.workspace_id` - Log Analytics workspace ID

---

## Patterns & Conventions

### ID Naming Conventions
- **VNets**: `vnet`, `other-vnet`
- **Subnets**: `snet_{purpose}` (snet_appservices, snet_privateendpoints)
- **NSGs**: `nsg_{purpose}` (nsg_appservices)
- **App Service Plans**: `asp_{purpose}` (asp_web, asp_func)
- **Web Apps**: `web_{subsystem}` (web_api, web_config)
- **Function Apps**: `func_{subsystem}` (func_booking-expiry)
- **Static Sites**: `swa_{subsystem}` (swa_website-react)
- **Key Vaults**: `kv`
- **Managed Identities**: `mi_{subsystem}`
- **Databases**: `cosmos`, `sql`
- **Others**: `redis`, `search`, `adf`, `law`, `appi`

### Module Field Pattern (Common Across All Resources)
```yaml
- id: {identifier}
  subsystem: {logical_grouping}
  module: terraform-azurerm-{resource-type}
  {resource-specific fields...}
```

### Subsystem Examples
- `compute`, `api`, `config`, `website` (web apps)
- `booking-expiry`, `notifications`, `functions` (function apps)
- `cosmos`, `sql` (databases)
- `azure-functions`, `webjobs` (identities)
- `lb` (product-level resources)

---

## Key Differences from Current Manifest

| Aspect | Current | New Terraform Manifest |
|--------|---------|----------------------|
| **Structure** | Flat resource list | Organized by category (network, compute, etc.) |
| **Resource Definition** | Minimal (name, type, comments) | Comprehensive (id, subsystem, module, specific fields) |
| **References** | None | Explicit `$ref:` syntax for cross-resource deps |
| **Networking** | None | Full network stack (VNets, subnets, NSGs, PEs) |
| **Module Mapping** | Type string only | Full Terraform module path |
| **Environment Config** | Single default_location | Multi-environment settings |
| **Global Tags** | None | Top-level tags section |
| **Dependencies** | Comments field | Structured dependencies section |

---

## Questions for Your Org Documentation

1. **Module inputs**: What fields does each `terraform-azurerm-*` module expect?
2. **Output references**: What outputs are available from each module?
3. **Subsystem values**: Is there a canonical list of valid subsystem identifiers?
4. **SKU values**: What are valid SKU values per resource type?
5. **Runtime values**: What are valid runtime options for function apps?
6. **Naming constraints**: Any organization naming conventions for IDs?
7. **Validation rules**: Any constraints on field combinations?
8. **Module versioning**: Are modules pinned to specific versions?

---

## Next Steps

1. Confirm schema structure against official `manifest-schema.json`
2. Get module-specific input variable requirements
3. Map current manifest fields to new structure
4. Design resource type → module name mapping
5. Build Terraform module field collection in UI
