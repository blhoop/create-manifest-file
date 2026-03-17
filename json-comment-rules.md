# JSON Comment Extraction Rules

Defines how Azure portal JSON is parsed when pasted into the **JSON Comment Import** popup for a resource row.
The goal is a concise, human-readable hint string — not a full JSON dump.

The machine-readable version of these rules lives in `server/config/jsonCommentRules.js`.
**When adding, removing, or changing rules — update both files.**

---

## Purpose

When a user opens the JSON Comment Import popup and pastes Azure resource JSON, the app extracts
a short comment string (e.g. `sku:Standard_LRS, kind:StorageV2`) and appends it to the row's
existing comments. The user can paste multiple times in one session to accumulate hints from
different portal blades.

This is primarily useful for **Lift and Optimize** scenarios where existing resource configuration
needs to be captured as deployment hints.

---

## Popup Behavior

1. A small icon button on the comments cell opens the popup.
2. The popup shows the **current comments** as a read-only preview at the top.
3. A paste area below accepts Azure portal JSON.
4. Clicking **Extract & Append** runs extraction and appends the result to the current comments.
5. The paste area clears so the user can paste again from a different portal blade.
6. Clicking **Done** closes the popup and commits all changes to the cell.
7. If extraction yields no useful fields, the paste area shows an inline message —
   the comments field is left unchanged.

---

## Append Format

Each extraction result is appended to existing comments using ` | ` as a separator between sessions.

```
# First paste (storage overview blade)
sku:Standard_LRS, kind:StorageV2

# Second paste (configuration blade)
sku:Standard_LRS, kind:StorageV2 | httpsOnly, minTls:TLS1_2, publicAccess:Disabled
```

- If comments are currently empty, the first extraction result is written directly (no leading separator).
- If comments already contain manually typed text, append with ` | ` before the extracted string.
- Boolean `true` fields are written as the label only (e.g. `httpsOnly`, `zoneRedundant`).
- Boolean `false` fields are omitted entirely — absence implies false.

---

## Always Exclude — Security & Privacy

These fields must **never** appear in comments regardless of resource type.
Match against the full key path (case-insensitive).

| Pattern | Reason |
|---------|--------|
| `*id` | Resource IDs, subscription IDs, tenant IDs, object IDs |
| `*key*` | Access keys, API keys, encryption keys |
| `*secret*` | Client secrets, shared secrets |
| `*token*` | SAS tokens, bearer tokens, refresh tokens |
| `*password*` | Any password field |
| `*connectionstring*` | Storage / Service Bus / SQL connection strings |
| `*sasurl*` | Shared Access Signature URLs |
| `*primaryendpoint*` | Storage primary endpoints (contain account URLs) |
| `*secondaryendpoint*` | Storage secondary endpoints |
| `*uri*` | URIs often contain account names and keys |
| `*url*` | Same as URI — may expose sensitive endpoints |
| `*certificate*` | TLS/SSL certificate data |
| `*thumbprint*` | Certificate thumbprints |
| `*principalid*` | Service principal / managed identity IDs |
| `*clientid*` | Application / SPN client IDs |
| `*tenantid*` | AAD tenant IDs |

---

## Always Exclude — Noise & Redundancy

These fields are operational metadata or already captured elsewhere in the manifest.

| Key | Reason |
|-----|--------|
| `location` | Captured in the dedicated **location** column |
| `tags` | Not relevant to deployment hints |
| `provisioningState` | Runtime state — not useful for planning |
| `createdTime` | Audit metadata |
| `lastModifiedTime` | Audit metadata |
| `etag` | Cache metadata |
| `type` | Captured in the dedicated **type** column |
| `name` | Captured in the dedicated **name** column |
| `resourceGroup` | Captured at subscription level |
| `subscriptionId` | Captured at subscription level |
| `apiVersion` | ARM plumbing, not a deployment hint |
| `dependsOn` | ARM template plumbing |

---

## Value Filters

Even if a key passes the above rules, skip the value if it:

- Is an empty object `{}`
- Is an empty array `[]`
- Is `null` or `undefined`
- Is a string longer than **60 characters** (likely an ID, path, or encoded value)
- Matches a UUID pattern: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Starts with `/subscriptions/` (full resource ID path)
- Is an ISO 8601 timestamp: `2024-01-01T00:00:00Z`

---

## Flattening Rules

Azure JSON is often nested. Flatten one level deep using dot notation, then apply key/value filters.

```
{ "sku": { "name": "Standard_LRS", "tier": "Standard" } }
→ sku.name = Standard_LRS
→ sku.tier = Standard
```

Prefer the leaf key name as the label when it is unambiguous:
- `sku.name` → label as `sku`
- `sku.tier` → label as `tier`
- `properties.accessTier` → label as `accessTier`

Do not flatten deeper than two levels — discard anything nested beyond `properties.*`.

---

## Always Include — If Present and Non-Empty

These fields are broadly useful across resource types and should always be extracted if they survive
the exclude and value filters above.

| Key / Path | Example Value | Comment Label |
|------------|--------------|---------------|
| `sku.name` | `Standard_LRS` | `sku` |
| `sku.tier` | `Premium` | `tier` |
| `sku.size` | `P1v3` | `size` |
| `sku.capacity` | `2` | `capacity` |
| `kind` | `StorageV2` | `kind` |
| `properties.accessTier` | `Hot` | `accessTier` |
| `properties.replicaCount` | `3` | `replicaCount` |
| `properties.zoneRedundant` | `true` | `zoneRedundant` |
| `properties.httpsOnly` | `true` | `httpsOnly` |
| `properties.minimumTlsVersion` | `TLS1_2` | `minTls` |
| `properties.publicNetworkAccess` | `Disabled` | `publicAccess` |
| `properties.addressPrefix` | `/25` | `addressPrefix` |

> **Note on addressPrefix:** store only the mask notation (e.g. `/25`), not the full CIDR block
> (e.g. `10.0.1.0/25`), as IP ranges are environment-specific and should not be hardcoded.

---

## Per Resource Type — Additional Fields

Fields that are only meaningful for specific resource types.

### Storage Account (`Microsoft.Storage/storageAccounts`)
| Path | Comment Label |
|------|--------------|
| `properties.supportsHttpsTrafficOnly` | `httpsOnly` |
| `properties.allowBlobPublicAccess` | `publicBlob` |
| `properties.largeFileSharesState` | `largeFileShares` |
| `properties.isHnsEnabled` | `hns` |

### App Service / Function App (`Microsoft.Web/sites`)
| Path | Comment Label |
|------|--------------|
| `properties.reserved` | `linux` (true = Linux) |
| `properties.siteConfig.numberOfWorkers` | `workers` |
| `properties.siteConfig.use32BitWorkerProcess` | `32bit` |

### Service Bus (`Microsoft.ServiceBus/namespaces`)
| Path | Comment Label |
|------|--------------|
| `sku.capacity` | `capacity` |
| `properties.zoneRedundant` | `zoneRedundant` |

### SQL / PostgreSQL / MySQL
| Path | Comment Label |
|------|--------------|
| `sku.tier` | `tier` |
| `sku.capacity` | `vCores` |
| `properties.storageProfile.storageMB` | `storageMB` |
| `properties.version` | `version` |

### Virtual Network (`Microsoft.Network/virtualNetworks`)
| Path | Comment Label |
|------|--------------|
| `properties.addressSpace.addressPrefixes` | omit full CIDR — skip |

### Subnet (`Microsoft.Network/virtualNetworks/subnets`)
| Path | Comment Label |
|------|--------------|
| `properties.addressPrefix` | mask only, e.g. `/25` |

### Key Vault (`Microsoft.KeyVault/vaults`)
| Path | Comment Label |
|------|--------------|
| `properties.sku.name` | `sku` |
| `properties.enableSoftDelete` | `softDelete` |
| `properties.enablePurgeProtection` | `purgeProtection` |

---

## Output Format

Extracted fields are joined as a comma-separated `label:value` string.

```
sku:Standard_LRS, kind:StorageV2, accessTier:Hot
```

- Max output length per extraction: **120 characters** — truncate with `…` if exceeded
- Boolean `true` values: include the label only (e.g. `zoneRedundant`, `httpsOnly`)
- Boolean `false` values: omit entirely
- Omit the label if the value is self-describing (e.g. `StorageV2` alone is clear without `kind:`)

---

## Resources That Don't Benefit

Not all resource types have meaningful config to extract. If extraction yields zero fields after
filtering, show an inline message in the popup — do not modify the comments field.

Examples where extraction is unlikely to yield useful output:
- Resource Groups
- Management Groups
- Role Assignments
- Policy Definitions
- Action Groups
