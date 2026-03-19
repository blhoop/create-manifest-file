# Terraform Manifest Schema — Key Findings

**Extracted from**: lightning-book-001.yml + global-profiles (manifest.yml)

---

## Confirmed Schema Patterns

### 1. Top-Level Structure (Stable)
```yaml
schema_version: "1"
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

All examples follow this structure. Likely required top-level sections.

---

### 2. Spoke Configuration (Stable)

**Required fields**:
- `name` — spoke identifier
- `subscription` — Azure subscription name

**Optional fields**:
- `repo` — infrastructure repo name (e.g., "global-profiles-infra")
- `owner` — team/owner name
- `description` — free-form description
- `sku_mode` — subscription tier (observed: "premium", "standard"?)
- `management_group_id` — Azure management group
- `new_subscription` — boolean (true if new Azure subscription)
- `infra_repo` — alias for repo?

---

### 3. Environments Section (Expanding)

**Basic structure** (both examples):
```yaml
environments:
  dev:
    location: australiaeast
  prod:
    location: australiaeast
```

**Expanded structure** (global-profiles only):
```yaml
environments:
  dev:
    location: australiaeast
    location_secondary: eastus2              # NEW: dual-region support
    overrides:                               # NEW: per-resource customization
      pg:
        sku: B_Standard_B1ms
        ha: none
        zone: "2"
```

**Status**: `location` is stable. `location_secondary` and `overrides` are NEW and need official validation.

---

### 4. Network Section (Expanding)

**Stable** (both examples):
- `vnets` — list of virtual networks with cidr, dns_servers, peering
- `subnets` — list with vnet_id, cidr, delegation, purpose
- `nsgs` — list with rules (priority, direction, access, protocol, address_prefix, port_range)
- `private_endpoints` — list with target_resource_id ($ref: syntax), sub_resource, subnet_id, dns_zone
- `dns_zones` — list with zone_name, linked_vnets

**NEW** (global-profiles only):
- `vnet_peerings` — intra-spoke peering (same region or cross-region)
- `cross_spoke_peerings` — peering to external spokes with variable references
- `dns_zone_cross_spoke_links` — DNS zone links across spokes with conditional deployment

**Pattern observation**: The first example shows hub-managed peering (spoke→hub). The second shows additional intra-spoke and cross-spoke peering. Likely different patterns for different scenarios.

---

### 5. Compute Section (Expanding)

**Stable** (both examples):
- `app_service_plans` — with os_type, sku
- `web_apps` — with asp_id (plan reference), vnet_integration_subnet_id
- `function_apps` — with asp_id, runtime, vnet_integration_subnet_id
- `static_sites` — with sku

**NEW** (global-profiles only):
- `virtual_machines` — with vm_size, os_type, zone, public_ip, subnet_id, role, purpose

---

### 6. Data Section (Expanding)

**Stable** (both examples):
- `databases` — with type, sku, module

**More detailed in global-profiles**:
```yaml
databases:
  - id: pg
    type: postgresql_flexible_server
    sku: GP_Standard_D2ds_v4
    version: "18"
    zone: "2"
    extensions: [uuid-ossp, pg_trgm]     # NEW: PostgreSQL extensions
    ha: none / zone-redundant            # NEW: HA mode
    backup: local / geo-redundant        # NEW: backup redundancy
```

**NEW** (global-profiles only):
- `storage_accounts` — separated into own subsection with containers array
- **Container registries were in second example data section; moved to security in expansion**

---

### 7. Security Section (Expanding)

**Stable** (both examples):
- `key_vaults` — with access_model, consumers

**NEW** (global-profiles only):
- `container_registries` — with sku, georeplications, managed_identities
- Enhanced key_vaults with `purge_protection_enabled`, `bypass_naming_convention`, custom `name`

---

### 8. Observability Section (Stable)

Both examples show identical structure:
- `log_analytics_workspace` — singular object (not array)
- `app_insights` — array of objects with workspace_id reference

---

### 9. Dependencies Section (Stable)

Both examples use same structure:
```yaml
dependencies:
  - name: hub-network-vnet
    type: vnet_peering / cross_spoke / external_dependency
    direction: bidirectional / inbound / outbound
    notes: free-form text explaining the dependency
```

---

## Critical Unknowns (Awaiting Official Schema)

### 1. **Environment Overrides Validation**
- How are override values validated? (e.g., is "zone-redundant" valid for all SKUs?)
- Can overrides add fields not in the base resource? (e.g., add "version" override to a resource that didn't specify it)
- What's the merge strategy? (deep merge, shallow, field-level override only?)

### 2. **Conditional Deployment Logic**
- How does `conditional: true` translate to Terraform? (count, for_each, dynamic block?)
- What's the validation rule? (must have a corresponding variable name?)
- Are there other ways to express conditions?

### 3. **Cross-Spoke Variable Naming Convention**
- Pattern for variable names: `csp_vnet_id_aue`, `csp_vnet_id_eastus` — is this enforced?
- How are these variables passed to the modules?
- Documentation of all standard cross-spoke variable names?

### 4. **Module Reference System**
- How does `$ref:kv.resource_id` resolve to actual module outputs?
- What outputs are guaranteed to exist on each module?
- Can you reference non-existent outputs (validation error)?

### 5. **Naming Convention Rules**
- Are ID names (e.g., `vnet`, `snet_appservices`, `asp_web`) enforced patterns or free-form?
- What triggers `bypass_naming_convention: true`? (only for cross-spoke resources?)
- When is custom `name` field used vs. auto-derived from ID?

### 6. **Zone Redundancy & Availability**
- Which SKUs support `ha: zone-redundant`?
- How does `zone: "2"` interact with zone-redundancy?
- Region-specific zone availability constraints?

---

## Resource Type to Module Mapping (Inferred)

| Resource Type | Module | Container | ID Pattern |
|---------------|--------|-----------|-----------|
| App Service Plan | terraform-azurerm-app-service-plan | compute.app_service_plans | `asp_*` |
| Web App | terraform-azurerm-windows-web-app | compute.web_apps | `web_*` |
| Function App | terraform-azurerm-windows-function-app | compute.function_apps | `func_*` |
| Static Site | terraform-azurerm-static-web-app | compute.static_sites | `swa_*` |
| Linux VM | terraform-azurerm-linux-vm | compute.virtual_machines | `vm_*` |
| Cosmos DB | terraform-azurerm-cosmos-account | data.databases | `cosmos` |
| SQL Server | terraform-azurerm-mssql-server | data.databases | `sql` |
| PostgreSQL Flex | terraform-azurerm-postgresql-flexible-server | data.databases | `pg` / `pg_eastus` |
| Storage Account | terraform-azurerm-storage-account | data.storage_accounts | `storage` / `storage_*` |
| Redis | terraform-azurerm-managed-redis | data.caching | `redis` |
| Search | terraform-azurerm-search-service | data.search | `search` |
| Data Factory | terraform-azurerm-data-factory | data.factories | `adf` |
| Key Vault | terraform-azurerm-key-vault | security.key_vaults | `kv` / `kv_eastus` |
| Container Registry | terraform-azurerm-container-registry | security.container_registries | `acr` |
| Managed Identity | terraform-azurerm-user-assigned-identity | security.managed_identities | `mi_*` |
| Log Analytics | terraform-azurerm-log-analytics-workspace | observability.log_analytics_workspace | `law` |
| Application Insights | terraform-azurerm-application-insights | observability.app_insights | `appi` |

---

## Field Requirements Summary

### Always Required
- `schema_version` (both examples use "1")
- `spoke.name`
- `spoke.subscription`
- `environments.*.location`
- `tags`
- `network.vnets`
- `network.subnets`
- Resources must have: `id`, `subsystem`, `module`

### Usually Present
- `ctm_properties.product`
- `dependencies` (at least one, often hub or cross-spoke)
- `observability.log_analytics_workspace`

### Optional / Advanced
- `spoke.repo` / `spoke.infra_repo`
- `spoke.owner`, `spoke.description`
- `environment.overrides`
- `network.vnet_peerings`, `network.cross_spoke_peerings`, `network.dns_zone_cross_spoke_links`
- `blockers` (issue tracking)
- `resources.conditional`, `resources.bypass_naming_convention`, `resources.name` (custom naming)

---

## Implementation Roadmap

### Phase 1: Validate Core Schema
1. Confirm official `manifest-schema.json` matches reverse-engineered structure
2. Document which fields are required vs. optional
3. Identify any fields not in either example
4. Get validation rules (field length, patterns, enum constraints)

### Phase 2: Module Field Coverage
1. For each `terraform-azurerm-*` module:
   - Document input variables
   - Document output values (especially resource_id, principal_id)
   - Note required vs. optional inputs
   - List valid SKU/size values per module
2. Update `TERRAFORM_MANIFEST_ANALYSIS_EXPANDED.md` with exact field signatures

### Phase 3: Advanced Features
1. Confirm environment.overrides merge behavior
2. Document conditional deployment logic (count/for_each translation)
3. Define cross-spoke variable naming standard
4. Validate $ref: resolution rules

### Phase 4: Tooling & Validation
1. Build JSON Schema for UI form generation
2. Create validation rules engine (SKU compatibility, zone redundancy, etc.)
3. Implement environment overrides merge logic
4. Add conditional flag support to Terraform generation

---

## Questions to Ask Your Organization

**Schema & Versions**:
1. Is `manifest-schema.json` v1 the current version? Any v2 planned?
2. Are there schema breaking changes between versions?

**Multi-Region & Cross-Spoke**:
3. What's the standard pattern for multi-region manifests? (Single manifest with location_secondary, or separate manifests per region?)
4. How are cross-spoke variables (csp_vnet_id_*) typically provided? (Via terraform.tfvars, module variables, environment variables?)
5. Which resources typically have conditional deployment? (All cross-spoke resources, or specific types?)

**Environment Overrides**:
6. Which resources typically need environment-specific overrides? (Just databases, or compute, storage, etc.?)
7. What's the validation strategy for override compatibility? (E.g., warn if zone-redundancy requested for SKU that doesn't support it?)

**Naming & Conventions**:
8. Are resource IDs (e.g., `asp_web`, `func_booking`) enforced patterns or just conventions?
9. When is `bypass_naming_convention: true` used in practice? (Only cross-spoke resources?)

**Blockers Section**:
10. Is the blockers section part of the official schema or just your organization's addition?
11. Does your automation parse blockers for validation/warnings?

---

## Documentation Sources to Find

- [ ] Official `manifest-schema.json` (v1 or latest)
- [ ] Terraform module documentation for all `terraform-azurerm-*` modules
- [ ] Multi-region deployment guide
- [ ] Cross-spoke peering & variable reference guide
- [ ] Environment override validation rules
- [ ] Naming conventions & ID patterns guide
- [ ] Conditional resource deployment patterns
- [ ] Examples of complex manifests (multi-region, cross-spoke, with overrides)
