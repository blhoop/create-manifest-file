# Manifest Migration Guide

## Current vs. Target Structure Comparison

### Current Manifest (Simple)
```yaml
subscription_name: my-subscription
environment: prod
default_location: eastus
product_code: ABC

resources:
  - name: web-api
    type: Web App
    location: eastus
    repo: org/web-api
    comments: "OS:Windows, Runtime:.NET, Version:8.0"
```

### Target Terraform Manifest (Comprehensive)
```yaml
schema_version: '1'

spoke:
  name: my-project-001
  subscription: my-subscription
  owner: Platform Team
  description: "..."
  sku_mode: premium
  management_group_id: root
  new_subscription: true
  infra_repo: my-subscription-infra

ctm_properties:
  product: mp

environments:
  prod:
    location: eastus

tags:
  owner: Platform Team
  cost_center: "12345"
  project: my-project
  data_classification: internal

network:
  vnets:
    - id: vnet
      cidr: 10.0.0.0/16
      dns_servers: hub-inherited
      peering: hub-network-vnet
  subnets: [...]
  nsgs: [...]
  private_endpoints: [...]
  dns_zones: [...]

compute:
  app_service_plans:
    - id: asp_web
      subsystem: compute
      module: terraform-azurerm-app-service-plan
      os_type: Windows
      sku: P1v3
  web_apps:
    - id: web_api
      subsystem: api
      module: terraform-azurerm-windows-web-app
      asp_id: asp_web
      vnet_integration_subnet_id: snet_appservices

# ... more sections ...
```

---

## Field Mapping

### Subscription Level

| Current Field | Target Location | Notes |
|---------------|-----------------|-------|
| `subscription_name` | `spoke.subscription` | Direct mapping |
| `environment` | `environments.{env_key}` | Key becomes env name |
| `default_location` | `environments.{env}.location` | Per-environment |
| `product_code` | `ctm_properties.product` | CAF naming convention |
| `vnet_cidr` | `network.vnets[0].cidr` | First VNet CIDR |

### Resource Level

| Current | Target | Transformation |
|---------|--------|-----------------|
| `name: web-api` | `web_apps[].id: web_api` | Becomes resource ID |
| `type: Web App` | `module: terraform-azurerm-windows-web-app` | Type → Module mapping |
| `location: eastus` | `environments.prod.location: eastus` | Env-specific |
| `repo: org/web-api` | Resource property (module-specific) | Per-module config |
| `comments: "OS:Windows, Runtime:.NET"` | Resource fields: `os_type`, `runtime` | Parse and map |

---

## Resource Type to Terraform Module Mapping

### Compute Resources

| Current Type | Target Module | Container | ID Pattern |
|--------------|----------------|-----------|------------|
| Web App | `terraform-azurerm-windows-web-app` | `compute.web_apps` | `web_{subsystem}` |
| Function App | `terraform-azurerm-windows-function-app` | `compute.function_apps` | `func_{subsystem}` |
| Static Site | `terraform-azurerm-static-web-app` | `compute.static_sites` | `swa_{subsystem}` |
| App Service Plan | `terraform-azurerm-app-service-plan` | `compute.app_service_plans` | `asp_{purpose}` |

### Data Resources

| Current Type | Target Module | Container | ID Pattern |
|--------------|----------------|-----------|------------|
| SQL Database | `terraform-azurerm-mssql-server` | `data.databases` | `sql` |
| Cosmos DB | `terraform-azurerm-cosmos-account` | `data.databases` | `cosmos` |
| Storage Account | `terraform-azurerm-storage-account` | `data.storage` | `sa_{purpose}` |
| Redis Cache | `terraform-azurerm-managed-redis` | `data.caching` | `redis` |

### Security Resources

| Current Type | Target Module | Container | ID Pattern |
|--------------|----------------|-----------|------------|
| Key Vault | `terraform-azurerm-key-vault` | `security.key_vaults` | `kv` |
| Managed Identity | `terraform-azurerm-user-assigned-identity` | `security.managed_identities` | `mi_{subsystem}` |

### Observability Resources

| Current Type | Target Module | Container | ID Pattern |
|--------------|----------------|-----------|------------|
| Log Analytics | `terraform-azurerm-log-analytics-workspace` | `observability.log_analytics_workspace` | `law` |
| App Insights | `terraform-azurerm-application-insights` | `observability.app_insights` | `appi` |

---

## Structured Comments Parsing

### Current Format (Key-Value in Comments)
```yaml
comments: "OS:Windows, Runtime:.NET, Version:8.0, Plan:P1v3, Publishing:Code"
```

### Transform to Resource Fields
```yaml
web_apps:
  - id: web_api
    os_type: Windows
    runtime: .NET
    version: "8.0"
    plan: P1v3
    publishing: Code
```

**Parsing Strategy**:
1. Split comments by `, `
2. For each `key:value` pair, extract key and value
3. Map to resource-specific fields:
   - `OS` → `os_type`
   - `Runtime` → `runtime`
   - `Version` → `version`
   - `Plan` → Module-dependent (asp_id for WebApp, sku for FunctionApp)
   - `Publishing` → `publishing_type` or similar
   - `Slot` → deployment slot identifier

---

## New Required Fields

### For All Resources
- **`id`** - Unique local identifier (required)
- **`subsystem`** - Logical grouping (required)
- **`module`** - Terraform module name (required)

### For Compute Resources
- **`os_type`** - OS platform (Windows/Linux)
- **`sku`** or **`plan`** - Pricing tier
- **`runtime`** - Runtime stack (for functions, web apps)
- **`vnet_integration_subnet_id`** - Subnet reference
- **`asp_id`** - App Service Plan reference (for apps)

### For Data Resources
- **`type`** - Resource type within category (cosmos_account, mssql_server)
- **`sku`** - Pricing/compute tier
- **`databases`** - Sub-resources (SQL only)

### For Network Resources
- **`cidr`** - Address space/prefix
- **`delegation`** - Service delegation (subnets)
- **`rules`** - NSG rules (name, priority, access, protocol)

---

## UI/Form Changes Required

### Current UI Structure
```
Subscription Panel:
  - subscription_name
  - environment
  - default_location
  - product_code
  - vnet_cidr (optional)
  - subscription_id (optional)
  - spn_client_id (optional)

Resource Table:
  - name
  - type
  - location
  - repo
  - comments
```

### New UI Structure (Proposed)

#### Spoke Configuration Panel
```
- Spoke Name
- Subscription Name
- Owner
- Description
- SKU Mode (dropdown)
- Management Group ID
- New Subscription (checkbox)
- Infra Repo Name
```

#### Environment Configuration
```
- Environment Name (dev, test, uat, prod)
- Default Location (dropdown)
```

#### Tags Panel
```
- Owner
- Cost Center
- Project
- Data Classification
```

#### Network Configuration
```
VNets Section:
  - ID, CIDR, DNS Servers, Peering
Subnets Section:
  - ID, VNet Reference, CIDR, Delegation, Purpose
NSGs Section:
  - ID, Subnet Reference, Rules (dynamic)
Private Endpoints Section:
  - ID, Target Resource (ref), Sub-Resource, Subnet, DNS Zone
DNS Zones Section:
  - ID, Zone Name, Linked VNets
```

#### Compute Resources
```
Grouped by type:
- App Service Plans
  - ID, Subsystem, Module, OS Type, SKU
- Web Apps
  - ID, Subsystem, Module, Plan Reference, VNet Subnet
- Function Apps
  - ID, Subsystem, Module, Plan Reference, Runtime, VNet Subnet
- Static Sites
  - ID, Subsystem, Module, SKU
```

#### Data Resources
```
- Databases
  - ID, Type, Module, SKU, Sub-databases
- Caching
  - ID, Module, SKU
- Search
  - ID, Module, SKU
- Factories
  - ID, Module
```

#### Security Resources
```
- Key Vaults
  - ID, Module, Access Model, Consumers
- Managed Identities
  - ID, Subsystem, Module, Instance Number
```

#### Observability
```
- Log Analytics Workspace
  - ID, Module, Retention Days
- Application Insights
  - ID, Module, Workspace Reference
```

#### Dependencies
```
- Name, Type, Direction, Notes
```

---

## Implementation Phases

### Phase 1: Schema & Output (2-3 weeks)
- [ ] Create new output schema matching Terraform manifest structure
- [ ] Update YAML builder to generate new format
- [ ] Create resource type → module mapping
- [ ] Add reference system (`$ref:`)

### Phase 2: Subscription/Spoke Configuration (1-2 weeks)
- [ ] Replace subscription panel with spoke configuration
- [ ] Add environment management
- [ ] Add global tags section
- [ ] Add dependencies section

### Phase 3: Network Configuration (2-3 weeks)
- [ ] Build VNet/Subnet manager
- [ ] Build NSG rule builder
- [ ] Build Private Endpoints configurator
- [ ] Build DNS Zones configurator

### Phase 4: Resource-Specific Panels (3-4 weeks)
- [ ] Build Compute resources UI (Apps, Functions, Static)
- [ ] Build Data resources UI (Databases, Caching, Search)
- [ ] Build Security resources UI (Key Vaults, Identities)
- [ ] Build Observability resources UI

### Phase 5: Integration & Testing (2-3 weeks)
- [ ] Integrate all panels
- [ ] Test reference resolution
- [ ] Test YAML output
- [ ] Migration scripts for existing manifests

---

## Comment Format Transformation Examples

### Example 1: Web App
**Current**:
```yaml
comments: "OS:Windows, Runtime:.NET, Version:8.0, Plan:P1v3, Publishing:Code"
```

**Target**:
```yaml
web_apps:
  - id: web_api
    subsystem: api
    module: terraform-azurerm-windows-web-app
    os_type: Windows
    runtime: .NET
    version: "8.0"
    asp_id: asp_web  # Plan reference
    publishing_type: Code
```

### Example 2: Function App
**Current**:
```yaml
comments: "Plan:EP1, OS:Windows, Runtime:.NET, Version:8.0, Slot:staging"
```

**Target**:
```yaml
function_apps:
  - id: func_booking
    subsystem: booking-processor
    module: terraform-azurerm-windows-function-app
    asp_id: asp_func  # EP1 plan
    os_type: Windows
    runtime: .NET
    version: "8.0"
    slot: staging
```

### Example 3: SQL Database
**Current**:
```yaml
comments: "Tier:GeneralPurpose, VCores:2, Storage:100GB"
```

**Target**:
```yaml
databases:
  - id: sql
    subsystem: sql
    type: mssql_server
    module: terraform-azurerm-mssql-server
    sku: GP_Gen5_2
    storage: "100GB"
    databases:
      - sql-db
      - sql-db-archive
```

---

## Questions for Your Org

1. **Module Registry**: Are the modules in your Terraform registry or public?
2. **Module Versions**: Are they pinned or use latest compatible?
3. **Subsystem Values**: Is there a canonical list of valid subsystems?
4. **Default Values**: What defaults should be used for each module?
5. **Validation**: Any specific validation rules for field combinations?
6. **Reference Format**: Confirm `$ref:{id}.{output}` syntax is correct?
7. **Networking Defaults**: Should network stack be auto-generated or manually configured?
8. **Module Customization**: Can module inputs be customized or are they opinionated?

---

## Files to Create/Update

```
Backend (Node.js):
- server/config/outputSchema.js (complete rewrite)
- server/routes/upload.js (update normalization)
- server/parsers/terraformBuilder.js (NEW - builds Terraform manifest)
- server/config/moduleMapping.js (NEW - type → module mapping)
- server/config/terraformModules.json (NEW - module metadata)

Frontend (React):
- client/src/config/resourceCommentFields.js (update mappings)
- client/src/components/SpokeConfiguration.jsx (NEW)
- client/src/components/EnvironmentManager.jsx (NEW)
- client/src/components/NetworkConfigurator.jsx (NEW)
- client/src/components/ComputeResourcesPanel.jsx (NEW)
- client/src/components/DataResourcesPanel.jsx (NEW)
- client/src/components/SecurityResourcesPanel.jsx (NEW)
- client/src/components/ObservabilityPanel.jsx (NEW)
- client/src/components/DependenciesManager.jsx (NEW)
- client/src/App.jsx (update layout)

Tests:
- server/tests/terraformBuilder.test.js (NEW)
- server/tests/moduleMapping.test.js (NEW)
```

---

## Backward Compatibility

### Migration Strategy for Existing Manifests
1. **Accept both formats** in parser initially
2. **Auto-convert** old format to new format on upload
3. **Detect format** by presence of `schema_version` field
4. **Provide export option** for old format (optional)

### Conversion Algorithm
```
Old format → New format:
1. subscription_name → spoke.subscription
2. environment + default_location → environments.{env}.location
3. product_code → ctm_properties.product
4. resources[] → categorize by type → appropriate section
5. Merge comments into specific fields
6. Generate default network stack (or warn if missing)
7. Create output in new format
```
