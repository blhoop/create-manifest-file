# Terraform Manifest Schema - Expanded Analysis

**Sources**: `lightning-book-001.yml` + `global-profiles (manifest.yml)`

This document captures schema additions and patterns found in the second example that were absent or less detailed in the first.

---

## New Top-Level Sections

### `environment.overrides` — Per-Environment Resource Customization

**Purpose**: Override resource-specific fields on a per-environment basis without duplicating the entire resource definition.

**Structure**:
```yaml
environments:
  dev:
    location: australiaeast
    location_secondary: eastus2  # NEW: secondary region for dual-region deployments
    overrides:
      pg:                        # Resource ID (matches data.databases[].id)
        sku: B_Standard_B1ms     # Override SKU for dev
        ha: none
        zone: "2"
      pg_eastus:
        sku: GP_Standard_D2ds_v4
        ha: none
        zone: "1"

  uat:
    location: australiaeast
    overrides:
      pg:
        ha: none                 # Override HA setting for uat

  prod:
    location: australiaeast
    overrides:
      pg:
        ha: zone-redundant       # Enable HA in prod
```

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| `location_secondary` | string | Secondary region for dual-region deployments |
| `overrides` | object | Keyed by resource `id`, contains field overrides |

**Use Case**: Same Terraform module definition, different sizing per environment (dev uses small SKU, prod uses large).

---

### `network.vnet_peerings` — Intra-Spoke VNet Peering

**Purpose**: Cross-region VNet peering within the same spoke (e.g., australiaeast ↔ eastus2).

**Structure**:
```yaml
vnet_peerings:
  - id: peering_gprof_aue_to_gprof_eastus
    name: peer-gprof-aue-to-gprof-eastus
    vnet_id: vnet
    remote_vnet_id: vnet_eastus
    allow_forwarded_traffic: true
```

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Local identifier |
| `name` | string | Terraform resource name |
| `vnet_id` | string | Source VNet reference |
| `remote_vnet_id` | string | Target VNet reference (local, same spoke) |
| `allow_forwarded_traffic` | boolean | Enable traffic forwarding across peering |

---

### `network.cross_spoke_peerings` — Cross-Spoke VNet Peering

**Purpose**: Peering to VNets in other spokes, often with conditional deployment.

**Structure**:
```yaml
cross_spoke_peerings:
  - id: gprof_aue_to_csp_aue
    name: peer-gprof-aue-to-csp-aue
    vnet_id: vnet
    remote_vnet_var: csp_vnet_id_aue      # Variable reference, not local ID
    allow_forwarded_traffic: true
    conditional: true                      # Deployable only if variable provided
```

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Local identifier |
| `name` | string | Terraform resource name |
| `vnet_id` | string | Source VNet (local) |
| `remote_vnet_var` | string | **Variable reference** (e.g., `csp_vnet_id_aue`) pointing to another spoke's VNet |
| `allow_forwarded_traffic` | boolean | Enable traffic forwarding |
| `conditional` | boolean | If true, resource created only when variable is provided (count = var != null) |

**Key Difference**: Unlike `vnet_peerings` which reference local VNets by `id`, `cross_spoke_peerings` reference external VNets via **Terraform variables** for decoupled spoke dependencies.

---

### `network.dns_zone_cross_spoke_links` — Cross-Spoke DNS Zone Links

**Purpose**: Link DNS zones in this spoke to VNets in other spokes (conditional on variables).

**Structure**:
```yaml
dns_zone_cross_spoke_links:
  - dns_zone_id: dns_pg
    target_vnet_var: csp_vnet_id_aue
    link_name: link-dns-pg-csp-aue
    conditional: true
```

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| `dns_zone_id` | string | Reference to local DNS zone (matches `dns_zones[].id`) |
| `target_vnet_var` | string | Variable reference to external VNet |
| `link_name` | string | Terraform resource name |
| `conditional` | boolean | If true, created only when variable is provided |

**Context**: Azure DNS zones can only link to one zone per FQDN. The manifest includes a note: "A VNet can only link to one zone per FQDN, so gprof only links vnet_eastus (which the hub does not cover)."

---

### `blockers` — Issue Tracking & Resolution

**Purpose**: Document known issues, severity, current status, and planned resolution.

**Structure**:
```yaml
blockers:
  - id: 1
    issue: PostgreSQL SKU not specified
    severity: MED
    status: RESOLVED
    resolution: Dev-tier default B_Standard_B1ms set in manifest. Production sizing deferred to capacity planning.

  - id: 5
    issue: PostgreSQL public network access enabled (both regions)
    severity: HIGH
    status: OPEN
    resolution: >-
      Tech Debt: Both PG Flex servers have public_network_access_enabled=true.
      Migration to VNet-integrated (delegated subnet + private DNS zone) deployment
      requires new servers — PG Flex cannot toggle public access after creation.
```

**Fields**:
| Field | Type | Values | Purpose |
|-------|------|--------|---------|
| `id` | integer | Unique ID | Issue identifier |
| `issue` | string | - | Summary of the issue |
| `severity` | string | LOW / MED / HIGH | Impact level |
| `status` | string | OPEN / RESOLVED | Current state |
| `resolution` | string | - | Description of fix or workaround |

---

## New Compute Resource Type: Virtual Machines

**Module**: `terraform-azurerm-linux-vm` (or similar for Windows)

**Structure**:
```yaml
compute:
  virtual_machines:
    - id: vm_jumpbox
      subsystem: profiles
      role: jumpbox
      vm_size: Standard_D4s_v3
      os_type: Linux
      module: terraform-azurerm-linux-vm
      subnet_id: snet_compute
      zone: "1"
      public_ip: true
      purpose: Dev workstation / jump box for SSH access to peered VNets while VPN pending
```

**Fields**:
| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `id` | string | `vm_jumpbox` | Resource ID |
| `subsystem` | string | `profiles` | Logical grouping |
| `role` | string | `jumpbox` | VM role/function |
| `vm_size` | string | `Standard_D4s_v3` | Azure VM size SKU |
| `os_type` | string | `Linux` / `Windows` | Operating system |
| `module` | string | `terraform-azurerm-linux-vm` | Terraform module |
| `subnet_id` | string | `snet_compute` | Subnet placement |
| `zone` | string | `"1"` | Availability zone (as string) |
| `public_ip` | boolean | `true` | Allocate public IP |
| `purpose` | string | - | Descriptive purpose |

---

## Expanded Data Section

### New `storage_accounts` Subsection

**Structure**:
```yaml
data:
  storage_accounts:
    - id: storage
      subsystem: profiles
      module: terraform-azurerm-storage-account
      containers: [profile-images, profile-exports, cdn-assets]
      purpose: Profile photos, static assets, CDN origin (australiaeast)

    - id: storage_adminui_aue
      subsystem: adminui
      module: terraform-azurerm-storage-account
      purpose: Admin UI SPA hosting (australiaeast)
```

**Fields**:
| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `id` | string | `storage` | Resource ID |
| `subsystem` | string | `profiles` | Logical grouping |
| `module` | string | `terraform-azurerm-storage-account` | Terraform module |
| `containers` | array | `[profile-images, ...]` | Blob containers to create |
| `purpose` | string | - | Descriptive purpose |

---

### Expanded Database Fields

**PostgreSQL Flexible Server Example**:
```yaml
databases:
  - id: pg
    subsystem: profiles
    type: postgresql_flexible_server
    sku: GP_Standard_D2ds_v4
    version: "18"
    zone: "2"
    module: terraform-azurerm-postgresql-flexible-server
    extensions: [uuid-ossp, pg_trgm]
    ha: none
    backup: local
```

**New Fields**:
| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `type` | string | `postgresql_flexible_server` | Database engine type |
| `version` | string | `"18"` | Database version |
| `zone` | string | `"1"` | Availability zone (single zone or zone-redundant) |
| `extensions` | array | `[uuid-ossp, pg_trgm]` | PostgreSQL extensions to enable |
| `ha` | string | `none` / `zone-redundant` | High availability mode |
| `backup` | string | `local` / `geo-redundant` | Backup redundancy |

---

## Expanded Security Section

### New `container_registries` Subsection

**Purpose**: Docker image registry with optional geo-replication and managed identity.

**Structure**:
```yaml
security:
  container_registries:
    - id: acr
      subsystem: profiles
      sku: Premium
      module: terraform-azurerm-container-registry
      georeplications: [eastus2]
      managed_identities:
        system_assigned: true
```

**Fields**:
| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `id` | string | `acr` | Resource ID |
| `subsystem` | string | `profiles` | Logical grouping |
| `sku` | string | `Premium` | SKU tier (Basic/Standard/Premium) |
| `module` | string | `terraform-azurerm-container-registry` | Terraform module |
| `georeplications` | array | `[eastus2]` | Regions to replicate to (Premium only) |
| `managed_identities` | object | `{system_assigned: true}` | Identity configuration |

**managed_identities object**:
| Field | Type | Purpose |
|-------|------|---------|
| `system_assigned` | boolean | Enable system-assigned managed identity |

---

## New Patterns & Conventions

### 1. Region-Specific Resource Suffixing

Resources deployed to multiple regions use `_eastus`, `_aue` suffixes for clarity:
```yaml
- id: pg              # australiaeast
- id: pg_eastus       # eastus2
- id: vnet            # australiaeast
- id: vnet_eastus     # eastus2
```

### 2. Resource Field Overrides

**Pattern**: Environment-specific SKU, HA, zone overrides without redefining the resource:
```yaml
environments:
  dev:
    overrides:
      pg: { sku: "B_Standard_B1ms", ha: none }
  prod:
    overrides:
      pg: { sku: "GP_Standard_D4ds_v4", ha: "zone-redundant" }
```

**Advantage**: Single resource definition in `data.databases`, with computed values per environment in the overrides section.

### 3. `bypass_naming_convention` Flag

Some resources may need a custom name (not auto-derived from CTM pattern):
```yaml
- id: kv_eastus
  bypass_naming_convention: true
  name: kv-gprof-prof-dev-eus2  # Custom name
```

### 4. `conditional` Deployment

Resources with `conditional: true` use Terraform `count` logic (created only if variable provided):
```yaml
cross_spoke_peerings:
  - id: gprof_aue_to_csp_aue
    conditional: true            # count = var.csp_vnet_id_aue != null ? 1 : 0
```

### 5. `allowed_forwarded_traffic` on Peerings

VNet peerings may allow forwarded traffic:
```yaml
vnet_peerings:
  - id: peering_gprof_aue_to_gprof_eastus
    allow_forwarded_traffic: true
```

### 6. Variable References in Cross-Spoke Scenarios

External spoke dependencies use Terraform variables instead of local IDs:
```yaml
remote_vnet_var: csp_vnet_id_aue   # Not remote_vnet_id (local reference)
```

---

## Comments as Documentation

Throughout the manifest, strategic comments provide context:

```yaml
# DUAL-REGION: This spoke deploys to australiaeast (primary) and eastus2 (secondary).
# Resources suffixed _eastus are deployed to the secondary region.

# Tech Debt -- public_network_access_enabled=true; migrate to VNet-integrated
# (delegated subnet) deployment. Requires new server — PG Flex cannot toggle
# public access after creation.

# Cross-spoke DNS zone VNet links — conditional on csp_vnet_id variables.
# Only PG and Storage zones are linked to CSP VNets.
# ACR and KV links were removed — CSP already owns those DNS zone namespaces
```

Comments explain **why** decisions were made (tech debt, cross-spoke constraints, migration notes).

---

## New Questions for Your Organization

### Regional Deployment
1. How are multi-region manifests structured? (Separate manifests per region or single manifest with dual-region support?)
2. What variables are passed to handle cross-spoke references (csp_vnet_id_aue, etc.)?
3. Are DNS zones always hub-managed or can spokes own them?

### Container Registry
4. When is geo-replication used vs. basic ACR?
5. Are managed identities always system-assigned or sometimes user-assigned?
6. What's the naming convention for container registry IDs (always `acr` or per-subsystem)?

### Database Extensions & HA
7. What PostgreSQL extensions are commonly needed?
8. Which SKUs support zone-redundancy vs. none/local HA?
9. How are environment-specific overrides validated (SKU compatibility)?

### VNet Peering Strategy
10. Are hub-managed peerings different from cross-spoke peerings (native vs. module)?
11. How is `allow_forwarded_traffic` decided per peering?
12. What's the conditional deployment strategy (all cross-spoke peerings conditional, or only some)?

### Issue Tracking Integration
13. Is the `blockers` section part of the schema or just this manifest?
14. Does your automation parse blockers for validation warnings?

---

## Schema Stability Indicators

**Stable (found in both examples)**:
- spoke, ctm_properties, environments (basic location)
- tags
- network.vnets, subnets, nsgs, private_endpoints, dns_zones
- compute, data, security, observability structure
- dependencies
- $ref: reference system

**Expanding (new in second example)**:
- environment.overrides (custom per-resource settings)
- network.vnet_peerings, cross_spoke_peerings, dns_zone_cross_spoke_links
- data.storage_accounts (separated from caching)
- database.extensions, ha, backup, version, zone fields
- security.container_registries
- blockers section
- conditional, bypass_naming_convention, managed_identities flags
- compute.virtual_machines resource type

**Likely stable soon**: Once you confirm with official schema, the expanding section will become standard fields.

---

## Next Steps

1. **Compare against manifest-schema.json**: Check if new fields (overrides, vnet_peerings, blockers) are in the official schema
2. **Cross-spoke variable naming**: Document the pattern for csp_vnet_id_* and other external variables
3. **Module field coverage**: Ensure all new resource types (container_registries, virtual_machines) have documented inputs/outputs
4. **Conditional logic**: Understand how `conditional: true` translates to Terraform count/for_each logic in the module definitions
