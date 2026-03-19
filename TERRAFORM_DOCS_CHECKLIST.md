# Terraform Documentation Checklist

## What to Look For in Your Organization's Terraform Documentation

Print this checklist and reference it while searching your org's documentation.

---

## 1. Manifest Schema

### ✅ PRIMARY: `manifest-schema.json`
**What it is**: JSON Schema that defines the exact structure of your manifest files
**Why you need it**: Ground truth for the YAML structure
**Look for**:
- [ ] File named `manifest-schema.json` or `manifest-schema.v1.json`
- [ ] Schema version number (currently v1)
- [ ] Property definitions for each top-level section
- [ ] Required vs optional fields
- [ ] Field data types (string, number, boolean, array, object)
- [ ] Enum values (valid options for SKUs, OS types, etc.)
- [ ] Examples of valid manifests
- [ ] **NEW**: environment.overrides section (per-environment field customization)
- [ ] **NEW**: network.vnet_peerings and network.cross_spoke_peerings (intra/cross-spoke peering)
- [ ] **NEW**: network.dns_zone_cross_spoke_links (conditional DNS zone linking)
- [ ] **NEW**: blockers section (issue tracking with severity/status/resolution)
- [ ] **NEW**: compute.virtual_machines resource type
- [ ] **NEW**: data.storage_accounts as separate subsection
- [ ] **NEW**: security.container_registries with georeplications and managed_identities
- [ ] **NEW**: conditional, bypass_naming_convention, location_secondary flags

**Storage locations**:
- [ ] Team documentation repo
- [ ] Terraform modules repo root
- [ ] Infrastructure-as-Code repo
- [ ] Wiki/Confluence
- [ ] Docs site

**Related files**:
- [ ] `manifest-schema.v1.schema.json` (alternative naming)
- [ ] `schemas/manifest.json`
- [ ] `docs/manifest-schema.md` (human-readable version)

---

## 2. Module Documentation

### ✅ Module Library Index
**What it is**: Catalog of all available Terraform modules
**Look for**:
- [ ] List of all `terraform-azurerm-*` modules
- [ ] Module naming conventions
- [ ] Module repository locations (GitHub, private registry, Terraform Registry)
- [ ] Module versions and version pinning strategy

### ✅ Individual Module Documentation (for each module)

**Modules from your manifest**:
- [ ] terraform-azurerm-app-service-plan
- [ ] terraform-azurerm-windows-web-app
- [ ] terraform-azurerm-windows-function-app
- [ ] terraform-azurerm-static-web-app
- [ ] terraform-azurerm-cosmos-account
- [ ] terraform-azurerm-mssql-server
- [ ] terraform-azurerm-managed-redis
- [ ] terraform-azurerm-search-service
- [ ] terraform-azurerm-data-factory
- [ ] terraform-azurerm-key-vault
- [ ] terraform-azurerm-user-assigned-identity
- [ ] terraform-azurerm-log-analytics-workspace
- [ ] terraform-azurerm-application-insights
- [ ] Network modules (VNet, Subnet, NSG, Private Endpoint, DNS Zone)
- [ ] **NEW**: terraform-azurerm-linux-vm (compute.virtual_machines)
- [ ] **NEW**: terraform-azurerm-storage-account (data.storage_accounts)
- [ ] **NEW**: terraform-azurerm-postgresql-flexible-server (data.databases[type=postgresql_flexible_server])
- [ ] **NEW**: terraform-azurerm-container-registry (security.container_registries)
- [ ] **NEW**: VNet peering modules (vnet_peerings, cross_spoke_peerings native or module-based?)
- [ ] **NEW**: DNS zone VNet link modules (dns_zone_cross_spoke_links)

**For each module, get**:
- [ ] **Module path**: `terraform-azurerm-*` or `path/to/module`
- [ ] **Input variables**: Exact names and types
  ```
  Example needed:
  - name: os_type
    type: string
    required: true
    description: Operating system type
  ```
- [ ] **Output values**: What can be referenced with `$ref:`
  ```
  Example needed:
  - name: resource_id
    description: Azure resource ID
  - name: principal_id
    description: (for identities)
  ```
- [ ] **Required fields**: Which inputs must be provided
- [ ] **Optional fields**: Which inputs can be omitted
- [ ] **Default values**: What values are used if not specified
- [ ] **Valid values**: Enum lists for dropdown fields
  ```
  Example needed:
  SKUs: [B1, B2, B3, S1, S2, S3, P1v2, P2v2, P3v2, ...]
  Runtime: [dotnet, dotnet-isolated, node, python, powershell, java]
  ```
- [ ] **Constraints**: Field combinations that aren't allowed

**Documentation format**:
- [ ] README.md in each module directory
- [ ] `inputs.tf` and `outputs.tf` files
- [ ] `variables.tf` file
- [ ] Terraform Registry documentation
- [ ] Internal wiki/Confluence pages

---

## 3. Naming Conventions

### ✅ Resource ID Naming Conventions
**Look for** (as in your example):
- [ ] VNet naming pattern (e.g., `vnet`, `vnet-hub`)
- [ ] Subnet naming pattern (e.g., `snet_{purpose}`)
- [ ] NSG naming pattern (e.g., `nsg_{purpose}`)
- [ ] App Service Plan naming (e.g., `asp_{purpose}`)
- [ ] Web App naming (e.g., `web_{subsystem}`)
- [ ] Function App naming (e.g., `func_{subsystem}`)
- [ ] Database naming (e.g., `sql`, `cosmos`)
- [ ] Identity naming (e.g., `mi_{subsystem}`)
- [ ] Key Vault naming (e.g., `kv`)
- [ ] Others (pe_, dns_, etc.)

### ✅ Subsystem/Component Naming
**Look for**:
- [ ] List of valid subsystem identifiers
- [ ] Naming convention rules (kebab-case, snake_case, camelCase?)
- [ ] Reserved subsystem names
- [ ] Subsystem categorization

---

## 4. Environment Configuration

### ✅ Environment Definitions
**Look for**:
- [ ] Valid environment names (dev, test, uat, prod, lab)
- [ ] Per-environment defaults
- [ ] Region assignments by environment
- [ ] SKU/sizing by environment

**Example needed**:
```yaml
environments:
  dev:
    location: australiaeast
    default_sku: B1
  prod:
    location: australiaeast
    default_sku: P1v3
```

---

## 5. Tags & Metadata

### ✅ Tag Definitions
**Look for**:
- [ ] Mandatory tags (must be present on all resources)
- [ ] Optional tags
- [ ] Tag naming conventions
- [ ] Allowed tag values (enums)

**Example needed**:
```yaml
tags:
  owner: [required]
  cost_center: [required]
  project: [optional]
  data_classification: [required] - enum: [public, internal, confidential]
```

---

## 6. SKU/Sizing Standards

### ✅ Pricing Tier Mappings
**Look for**:
- [ ] **App Service Plans**: Valid SKUs and their constraints
- [ ] **Function Apps**: Consumption, Premium, Dedicated plans and SKUs
- [ ] **SQL Database**: Compute tiers and sizes
- [ ] **Cosmos DB**: Modes (serverless, provisioned) and throughput
- [ ] **Redis**: Cache sizes and configurations
- [ ] **Search Service**: Tier options

---

## 7. Network Configuration Standards

### ✅ VNet Design
**Look for**:
- [ ] Default VNet CIDR block(s)
- [ ] Subnet CIDR allocation strategy
- [ ] Subnet purposes and delegation requirements
- [ ] Private endpoint requirements
- [ ] DNS zone naming conventions
- [ ] Peering strategy (hub-and-spoke?)

**Example needed**:
```yaml
network:
  default_cidr: 10.0.0.0/16
  subnets:
    - snet_appservices: 10.0.0.0/24, delegation: Microsoft.Web/serverFarms
    - snet_privateendpoints: 10.0.1.0/24, no delegation
    - snet_databases: 10.0.2.0/24, delegation: Microsoft.DBforPostgreSQL/flexibleServers
```

### ✅ NSG Rules
**Look for**:
- [ ] Common/reusable NSG rules
- [ ] Rule naming standards
- [ ] Port/protocol conventions
- [ ] Hub network connectivity rules

---

## 8. Security & Identity

### ✅ Key Vault Configuration
**Look for**:
- [ ] Access model standards (RBAC vs AccessPolicy)
- [ ] Soft delete requirements
- [ ] Purge protection requirements
- [ ] Key rotation policies

### ✅ Managed Identity Strategy
**Look for**:
- [ ] When to use system-assigned vs user-assigned
- [ ] Managed identity naming by subsystem
- [ ] RBAC role assignments
- [ ] Service principal requirements

---

## 9. Data Resource Standards

### ✅ SQL Server/Database
**Look for**:
- [ ] SQL Server SKU options
- [ ] Database naming conventions
- [ ] Backup/retention policies
- [ ] Zone redundancy requirements
- [ ] Collation standards

### ✅ Cosmos DB
**Look for**:
- [ ] API types (SQL, MongoDB, Cassandra, etc.)
- [ ] Throughput modes (provisioned vs serverless)
- [ ] Scaling policies

### ✅ Storage Accounts
**Look for**:
- [ ] Performance tiers (Standard vs Premium)
- [ ] Redundancy options (LRS, ZRS, GRS, etc.)
- [ ] Access tier strategies
- [ ] Private endpoint requirements

---

## 10. Compute Resources

### ✅ Web App Standards
**Look for**:
- [ ] OS requirements (Windows vs Linux)
- [ ] Runtime stack options
- [ ] VNet integration requirements
- [ ] Deployment slot usage
- [ ] HTTPS/TLS requirements

### ✅ Function App Standards
**Look for**:
- [ ] Plan types (Consumption, Premium, Dedicated, Flex)
- [ ] Runtime requirements
- [ ] Extension requirements (KEDA, Dapr)
- [ ] Cold start mitigation

---

## 11. Observability & Monitoring

### ✅ Log Analytics Workspace
**Look for**:
- [ ] Default retention periods by environment
- [ ] Solution deployments required
- [ ] Cost implications

### ✅ Application Insights
**Look for**:
- [ ] Sampling strategies
- [ ] Workspace linkage requirements
- [ ] Metrics/alerts standards

---

## 12. Dependencies & References

### ✅ Cross-Resource Dependencies
**Look for**:
- [ ] Reference syntax rules (confirm `$ref:` format)
- [ ] Available output references per module
- [ ] External dependencies (hub network, shared resources)
- [ ] Peering requirements

**Example needed**:
```yaml
# Available references
$ref:kv.resource_id           # Key Vault ID
$ref:cosmos.resource_id       # Cosmos DB ID
$ref:sql.resource_id          # SQL Server ID
$ref:mi_functions.principal_id # Managed Identity principal
```

---

## 13. Validation Rules

### ✅ Field Constraints
**Look for**:
- [ ] Maximum/minimum values
- [ ] String length limits
- [ ] Pattern validation (regex)
- [ ] Mutually exclusive fields
- [ ] Conditional requirements

### ✅ Resource Constraints
**Look for**:
- [ ] Resource limits (max functions per plan, etc.)
- [ ] Quota restrictions
- [ ] Region availability constraints
- [ ] Feature availability by SKU

---

## 14. Examples & Templates

### ✅ Complete Manifest Examples
**Look for**:
- [ ] Simple/basic manifest
- [ ] Full/complex manifest (like your lightning-book-001.yml)
- [ ] Per-environment examples
- [ ] Minimal manifest (required fields only)
- [ ] **NEW**: Multi-region/dual-region manifest example
- [ ] **NEW**: Cross-spoke peering/dependency example
- [ ] **NEW**: Environment overrides example
- [ ] **NEW**: Conditional resource (conditional: true) example

### ✅ Reusable Fragments
**Look for**:
- [ ] Common network configurations
- [ ] Standard subsystem patterns
- [ ] Security best-practice configurations

---

## 15. Automation & Tools

### ✅ Manifest Processing Tools
**Look for**:
- [ ] CLI tools to validate manifests
- [ ] Transformation scripts (old format → new format)
- [ ] Documentation generators
- [ ] Schema validators

---

## 16. Best Practices & Patterns

**Look for**:
- [ ] Design patterns (hub-and-spoke, multi-region, etc.)
- [ ] Security guidelines
- [ ] Cost optimization patterns
- [ ] High availability configurations
- [ ] Disaster recovery patterns

## 17. Advanced Features (Multi-Region & Cross-Spoke)

### ✅ Multi-Region Deployments
**Look for**:
- [ ] Secondary region support (location_secondary in environments)
- [ ] Resource suffixing pattern (e.g., _eastus, _aue for region-specific resources)
- [ ] Cross-region VNet peering rules and naming conventions
- [ ] Data replication/sync patterns across regions
- [ ] Zone availability constraints per region/SKU

### ✅ Cross-Spoke Dependencies & Variables
**Look for**:
- [ ] Variable reference patterns (e.g., csp_vnet_id_aue, csp_vnet_id_eastus)
- [ ] How external spoke VNet IDs are passed to manifests
- [ ] Cross-spoke DNS zone linking rules
- [ ] Cross-spoke peering direction (inbound, outbound, bidirectional)
- [ ] Conditional resource deployment (conditional: true) - how this translates to Terraform count/for_each

### ✅ Environment-Specific Overrides
**Look for**:
- [ ] Per-environment field overrides (sku, ha, zone, backup mode)
- [ ] How overrides are merged with base resource definitions
- [ ] Validation rules for valid override combinations (e.g., zone-redundancy constraints)
- [ ] Fallback behavior when override not specified

### ✅ Issue Tracking (Blockers Section)
**Look for**:
- [ ] Purpose and integration of blockers section
- [ ] Severity levels (LOW, MED, HIGH) and how they're used
- [ ] Status values (OPEN, RESOLVED) and resolution tracking
- [ ] Automation that parses blockers for validation warnings

### ✅ Resource-Level Flags
**Look for**:
- [ ] `conditional: true` behavior and validation
- [ ] `bypass_naming_convention: true` and custom naming rules
- [ ] `allow_forwarded_traffic` on peerings (when to set true/false)
- [ ] `system_assigned` managed identities (when to use vs. user-assigned)

---

## File Organization to Search

```
terraform/
├── modules/                    # 📍 Look here for module docs
│   ├── terraform-azurerm-app-service-plan/
│   │   ├── README.md          # 📍 Input/output variables
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── examples/
│   └── ...other modules...
├── docs/                       # 📍 Documentation
│   ├── manifest-schema.json    # 📍 PRIMARY FILE
│   ├── manifest-schema.md
│   ├── examples/
│   │   ├── lightning-book-001.yml
│   │   ├── simple.yml
│   │   └── ...more examples...
│   └── naming-conventions.md
├── examples/                   # 📍 Example manifests
│   ├── dev/
│   ├── prod/
│   └── ...
└── schema/                     # 📍 Alternative location
    └── manifest.schema.json
```

---

## Questions to Ask Your Team

When searching or asking for documentation:

1. **"Can you share the `manifest-schema.json` file?"**
2. **"Where is the module documentation located?"**
3. **"Are the modules in Terraform Registry or in a private repo?"**
4. **"What are the valid values for subsystem identifiers?"**
5. **"Can you provide the module input/output specifications?"**
6. **"What are the SKU options for [resource type]?"**
7. **"How do resource references work? (the `$ref:` syntax)"**
8. **"Are there example manifests I can reference?"**
9. **"What validation rules apply to manifest files?"**
10. **"Is there a tool to validate manifest syntax?"**

---

## Files to Request

```
MUST HAVE:
- manifest-schema.json (or manifest-schema.v1.json)
- Module documentation (README files or similar)
- Example manifests

NICE TO HAVE:
- Naming conventions guide
- Best practices documentation
- Validation tools/scripts
- Schema documentation (human-readable)
- Common patterns/templates
```

---

## Status Tracking

Use this to track what you've found:

- [ ] manifest-schema.json located at: `________________`
- [ ] Module docs located at: `________________`
- [ ] Example manifests located at: `________________`
- [ ] Naming conventions documented: Yes / No
- [ ] SKU/sizing standards found: Yes / No
- [ ] Network standards defined: Yes / No
- [ ] Validation rules documented: Yes / No
- [ ] All module specs obtained: Yes / No
- [ ] Questions answered by team: ____ / 10

---

## Notes

```
Write any important findings here:
_________________________________
_________________________________
_________________________________
_________________________________
```
