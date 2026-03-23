# Spoke Infrastructure Manifest

The manifest is the single source of truth for spoke infrastructure. One YAML file describes everything a spoke needs — compute, data, networking, security, observability. The builder reads this manifest and generates all Terraform automatically.

## Architecture

```
manifest.yml ──→ Builder (GH Workflow) ──→ .tf files ──→ terraform plan/apply ──→ Azure
     ↑                                                           │
     │                                                           ↓
  UI Tool                                                  Deployed infra
```

Each arrow is a validation gate. The manifest is human-reviewable before any infrastructure exists.

## Quick Start

1. Copy `schema-template.yml` → `{spoke-name}.yml`
2. Fill in `spoke`, `ctm_properties`, `environments`, `tags`
3. Add your compute, data, and security resources
4. Push to the spoke-onboarding repo
5. The builder generates Terraform and opens a PR

## Schema Version

Every manifest must include `schema_version` at the top:

```yaml
schema_version: '1.5.0'
```

The builder validates the version and rejects manifests it doesn't understand. Older manifests continue to work — new versions only make fields optional, never remove them.

## What the Builder Derives Automatically

These fields can be omitted — the builder fills them in:

| Field | How it's derived |
|---|---|
| `id` | Generated from resource type + subsystem (e.g. `func_booking-expiry`) |
| `module` | Inferred from resource type + OS context (e.g. `web_apps` + `os_type: Windows` → `terraform-azurerm-windows-web-app`) |
| `instance_number` | Auto-assigned sequentially per resource type (`001`, `002`, `003`...) |
| `private_endpoints` | Auto-generated for resources that need them (Key Vault, databases, Redis, Search) |
| `dns_zones` | Auto-generated to match private endpoints |
| App Service Plans | One dedicated plan per app from `plan_defaults`. Name: `asp-{product}-{subsystem}-{env}-{location}` |

## Required Fields by Resource Type

All resource types require `subsystem`. Additional required fields:

| Resource Type | Required | Everything else is DERIVED or OPTIONAL |
|---|---|---|
| `spoke` | `name`, `subscription`, `owner`, `infra_repo` | |
| `web_app` | `subsystem` | `id`, `module`, `instance_number`, `asp_id` all derived |
| `function_app` | `subsystem`, `runtime` | |
| `database` | `subsystem`, `type`, `sku` | |
| `storage_account` | `subsystem` | |
| `cache` (Redis) | `subsystem`, `sku` | |
| `key_vault` | `subsystem` | |
| `container_registry` | `subsystem`, `sku` | |
| `static_site` | `subsystem` | |
| `search_service` | `subsystem`, `sku` | |
| `signalr` | `subsystem`, `sku` | |
| `data_factory` | `subsystem` | |
| `backup_vault` | `subsystem` | |
| `messaging` | `subsystem` | |
| `managed_identity` | `subsystem` | |

Explicit values always win — if you specify `instance_number: '005'`, the builder uses `005`.

## Minimal vs Explicit

A web app can be as short as one line or fully explicit:

```yaml
# Minimal — subsystem only, everything else derived
web_apps:
  - subsystem: api

# Fully explicit — every field specified
web_apps:
  - id: web_api
    subsystem: api
    module: terraform-azurerm-windows-web-app
    instance_number: '001'
    vnet_integration_subnet_id: snet_appservices
```

Both produce the same result. Use minimal for most apps, explicit when you need control.

## Plan Behavior

Define plan specs once in `plan_defaults`. Every app gets its own dedicated plan by default.

```yaml
compute:
  plan_defaults:
    web_app:
      os_type: Windows
      sku: P1v3
    function_app:
      os_type: Windows
      sku: EP1
```

Three patterns:

| Pattern | How | When to use |
|---|---|---|
| **Dedicated plan** (default) | Just list the app — omit `share_plan_with` and `plan_override` | Most apps. Isolates scaling and restarts. |
| **Shared plan** | `share_plan_with: web_api` | Low-traffic apps that can share resources. Reduces cost. |
| **Custom plan** | `plan_override: { sku: P2v3 }` | One app needs different specs (bigger SKU, different OS). |

Plan names are always generated: `asp-{product}-{subsystem}-{env}-{location_abbr}`

## Resource Naming

All names follow the CTM naming convention:

```
{type}-{product}-{subsystem}-{environment}-{location_abbr}-{instance}
```

Examples:
- `app-lb-api-dev-aue-001` (web app)
- `func-lb-booking-expiry-dev-aue-001` (function app)
- `asp-lb-api-dev-aue` (app service plan — no instance number, singleton per app)
- `kv-lb-dev-aue` (key vault — compact name, no subsystem)
- `stlbcomputedevaue001` (storage account — no hyphens)

The user never specifies resource names. The builder handles all naming.

## Network — Auto-Carve (v1.4.0+)

Minimal network config — just the VNet CIDR:

```yaml
network:
  vnet_cidr: 10.3.0.0/24
  peering: hub-network-vnet
```

The builder reads `networking-defaults.yml` and auto-generates:
- **Subnets** sized per compute type: app_service=/26, container_app=/23, AKS=/24+/24, VM=/26, SQLMI=/27, PE=/27 (always)
- **NSGs** — one per subnet with default rules
- **Delegations** — Microsoft.Web/serverFarms, Microsoft.App/environments, Microsoft.Sql/managedInstances
- **Private endpoints** — for Key Vault, databases, Redis, Search, Storage, ACR, App Config, Service Bus, SignalR
- **DNS zones** — one per PE type, auto-linked to VNet

Override any default by declaring it explicitly in the manifest. Full explicit mode (v1.0.0 style subnets/NSGs/PEs) still works.

See `networking-defaults.yml` for the complete rule set.

## Databases

All database types use the same `data.databases` section. The `type` field determines the module and resource group isolation.

| `type` | Azure Resource | Module | RG Short Name | Example SKU |
|---|---|---|---|---|
| `mssql_server` | Azure SQL Database (logical server) | terraform-azurerm-mssql-server | `sql` | `GP_Gen5_2` |
| `postgresql_flexible_server` | PostgreSQL Flexible Server | terraform-azurerm-postgresql-flexible-server | `pg` | `GP_Standard_D2s_v3` |
| `cosmos_account` | Cosmos DB | terraform-azurerm-cosmos-account | `cosmos` | `serverless` |
| `mssql_managed_instance` | SQL Managed Instance | terraform-azurerm-mssql-managed-instance | `sqlmi` | `GP_Gen5_4` |
| `mysql_flexible_server` | MySQL Flexible Server | terraform-azurerm-mysql-flexible-server | `mysql` | `GP_Standard_D2s_v3` |

```yaml
data:
  databases:
    - subsystem: sql
      type: mssql_server
      sku: GP_Gen5_2
      databases:            # Informational — Terraform does NOT create these
        - app-db
        - app-db-archive

    - subsystem: pg
      type: postgresql_flexible_server
      sku: GP_Standard_D2s_v3
```

The `databases:` list within each entry is **informational only** — database creation (CREATE DATABASE, migrations) is an application concern. Terraform owns the server, not the databases.

## Resource Group Isolation

The builder automatically creates separate resource groups:
- **Compute RG**: `rg-{product}-compute-{env}-{location}` — web apps, function apps, Redis, search, etc.
- **Database RGs**: `rg-{product}-{db_type}-{env}-{location}` — one per database type

| Database Type | RG Example |
|---|---|
| `mssql_server` | `rg-lb-sql-dev-aue` |
| `postgresql_flexible_server` | `rg-lb-pg-dev-aue` |
| `cosmos_account` | `rg-lb-cosmos-dev-aue` |
| `mssql_managed_instance` | `rg-lb-sqlmi-dev-aue` |
| `mysql_flexible_server` | `rg-lb-mysql-dev-aue` |

This gives DBA teams isolated RBAC and backup policy scoping per database type. Redis is the exception — it stays in the compute RG (caching layer, not a primary datastore).

### Resource Group Override

Any resource can override its RG placement with `resource_group`:

```yaml
data:
  caching:
    - subsystem: compute
      sku: Balanced_B0
      resource_group: redis             # Creates rg-{product}-redis-{env}-{loc}
```

If multiple resources use the same `resource_group` value, they share the RG. If omitted, the default rules apply (databases isolate by type, everything else in compute RG).

### Location Override

All resources deploy to the environment's default location. Any resource can override:

```yaml
data:
  caching:
    - subsystem: compute
      sku: Balanced_B0
      location: eastus2                 # Deploy this Redis in a different region
```

## Sections Reference

| Section | Required | What it defines |
|---|---|---|
| `spoke` | Yes | Identity — name, subscription, owner, infra repo |
| `ctm_properties` | Yes | Product code for naming |
| `environments` | Yes | At least one (dev, test, uat, preprod, prod, lab) with location |
| `tags` | Yes | `CostRegion` and `CostType` required. All other tags optional. |
| `network` | Yes | Minimal: just `vnet_cidr`. Builder auto-carves subnets, NSGs, PEs, DNS zones. |
| `compute` | No | Plan defaults, web apps, function apps, static sites, container apps, AKS, VMs, APIM |
| `data` | No | Databases, caching, search, data factories, storage accounts, messaging (Service Bus) |
| `security` | No | Key vaults, container registries, managed identities |
| `app_configuration` | No | Centralized app settings and feature flags |
| `ai` | No | Azure AI Foundry / OpenAI resources |
| `frontdoor` | No | Global load balancing — profile, endpoints, origins, routes, WAF |
| `observability` | No | Log Analytics, Application Insights |
| `dependencies` | No | External references (hub peering, etc.) |

## Validation

The builder validates manifests against:
1. **Schema** — structural correctness (`manifest-schema.json`)
2. **Semantic lint** — CIDR overlaps, SKU minimums, duplicate subsystems, dangling references
3. **Terraform plan** — generated TF is planned before any PR is opened

## Files

| File | Purpose |
|---|---|
| `schema-template.yml` | Annotated template — copy this to start a new spoke |
| `EXAMPLE-spoke.yml` | Working example exercising all schema sections |
| `networking-defaults.yml` | Auto-carve rules — subnet sizing, PE mappings, NSG defaults |
| `manifest-README.md` | This file |
| `scripts/manifest-schema.json` | Machine-enforced JSON Schema |
| `scripts/validate-manifest.py` | Schema validator |
| `scripts/lint-manifest.py` | Semantic linter |

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-03-20 | Initial schema. Explicit fields for all resources. Plan defaults with share_plan_with and plan_override. Auto-derivation of PEs, DNS zones, instance numbers, module names. |
| 1.1.0 | 2026-03-20 | Added storage_accounts section. Added DERIVED field tier for auto-generated values. All v1.0.0 manifests remain valid. |
| 1.2.0 | 2026-03-20 | Full module coverage. Added container apps, AKS, VMs, APIM, container registries, Service Bus, App Configuration, AI Foundry, Front Door. All prior manifests remain valid. |
| 1.3.0 | 2026-03-20 | Registry sync. Added backup vaults, SignalR, AI Foundry projects. Module registry updated to 99 modules (102 repos minus template, subscription, deprecated linux-app-service). |
| 1.4.0 | 2026-03-22 | Network auto-carve. Minimal network: just `vnet_cidr` required — builder auto-generates subnets, NSGs, delegations, PEs, DNS zones from `networking-defaults.yml`. Full explicit mode still supported. Tags: only `CostRegion` and `CostType` required. |
| 1.5.0 | 2026-03-22 | Per-resource `resource_group` and `location` overrides. Any resource can isolate into a custom RG or deploy to a different region. Shared RGs when multiple resources use the same value. |
