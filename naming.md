# Naming Conventions

Canonical values for the four required CSV columns. Parsers and AI prompts must produce output consistent with these rules.

**Authoritative Microsoft sources:**
- [Resource abbreviations (CAF)](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations)
- [Naming rules & restrictions](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules)
- [Resource providers by service](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-services-resource-providers)

---

## spoke_name

The resource or application instance name as it appears in the source (diagram label, spreadsheet cell, document text).

**Rules:**
- Use the label exactly as shown — do not normalize casing or strip characters
- If a resource is unlabeled, fall back to the `service_type` value as the name
- Must be non-empty for every row

**Examples:** `orders-api`, `payments-func`, `auth-db`, `orders-web`

---

## environment

Deployment environment. Must be one of the following values (lowercase):

| Value | Meaning |
|-------|---------|
| `dev` | Development |
| `staging` | Staging / pre-prod |
| `prod` | Production |

**Rules:**
- Use empty string if not stated in the source
- Normalize common variants: `development` → `dev`, `production` → `prod`, `stage` → `staging`

---

## location

Azure region slug (lowercase, no spaces). Common values:

| Slug | Display Name |
|------|-------------|
| `eastus` | East US |
| `eastus2` | East US 2 |
| `westus` | West US |
| `westus2` | West US 2 |
| `centralus` | Central US |
| `northeurope` | North Europe |
| `westeurope` | West Europe |
| `uksouth` | UK South |
| `ukwest` | UK West |
| `southeastasia` | Southeast Asia |
| `australiaeast` | Australia East |
| `eastasia` | East Asia |
| `canadacentral` | Canada Central |
| `global` | Global (region-independent) |

**Rules:**
- Use the slug form (e.g. `eastus`, not `East US`)
- Use empty string if region is not stated in the source — `locationDefaults.js` will fill it in automatically after parsing

**Location defaults (applied in `server/parsers/locationDefaults.js`):**

Only applied when `location` is empty — explicit values are never overridden.

| Rule | location | Service types |
|------|----------|---------------|
| Global services | `global` | Front Door, Front Door (Classic), Front Door WAF Policy, CDN Profile, Traffic Manager, Action Group, Metric Alert, Entra ID, Web Application Firewall, Private DNS Zone |
| Not available in australiaeast | `eastasia` | Static Web App |
| Everything else | `australiaeast` | *(default)* |

---

## service_type

The cloud resource type. Use the canonical label from the appropriate provider below.

### Azure (Microsoft CAF abbreviations as reference)

| Canonical Label | CAF Abbr | ARM Type Segment | Category |
|----------------|----------|-----------------|----------|
| `Function App` | `func` | `sites` | Compute |
| `App Service` | `app` | `sites` | Compute |
| `App Service Plan` | `asp` | `serverfarms` | Compute |
| `App Service Environment` | `ase` | — | Compute |
| `Static Web App` | `stapp` | `staticSites` | Compute |
| `Virtual Machine` | `vm` | `virtualMachines` | Compute |
| `VM Scale Set` | `vmss` | `virtualMachineScaleSets` | Compute |
| `Managed Disk` | `disk` | `disks` | Compute |
| `Batch Account` | `ba` | — | Compute |
| `Kubernetes Service` | `aks` | `managedClusters` | Containers |
| `Container Apps` | `ca` | `containerApps` | Containers |
| `Container Apps Environment` | `cae` | `managedEnvironments` | Containers |
| `Container Instance` | `ci` | — | Containers |
| `Container Registry` | `cr` | `registries` | Containers |
| `Service Fabric` | `sf` | — | Containers |
| `Cosmos DB` | `cosmos` | `databaseAccounts` | Databases |
| `SQL Database` | `sqldb` | `databases` | Databases |
| `SQL Server` | `sql` | `servers` | Databases |
| `SQL Managed Instance` | `sqlmi` | — | Databases |
| `MySQL Database` | `mysql` | `servers` | Databases |
| `PostgreSQL Database` | `psql` | `servers` | Databases |
| `Cache for Redis` | `redis` | `Redis` | Databases |
| `Storage Account` | `st` | `storageAccounts` | Storage |
| `Data Lake Store` | `dls` | — | Storage |
| `File Share` | `share` | — | Storage |
| `Virtual Network` | `vnet` | `virtualNetworks` | Networking |
| `Subnet` | `snet` | `subnets` | Networking |
| `Network Security Group` | `nsg` | `networkSecurityGroups` | Networking |
| `Network Interface` | `nic` | `networkInterfaces` | Networking |
| `Public IP` | `pip` | `publicIPAddresses` | Networking |
| `Route Table` | `rt` | `routeTables` | Networking |
| `NAT Gateway` | `ng` | `natGateways` | Networking |
| `Application Gateway` | `agw` | `applicationGateways` | Networking |
| `Load Balancer` | `lbe` | `loadBalancers` | Networking |
| `Front Door` | `afd` | `profiles` | Networking |
| `Front Door (Classic)` | `afd-classic` | `frontDoors` | Networking |
| `Front Door WAF Policy` | `fdfp` | `frontdoorWebApplicationFirewallPolicies` | Networking |
| `CDN Profile` | `cdnp` | — | Networking |
| `Firewall` | `afw` | `azureFirewalls` | Networking |
| `Firewall Policy` | `afwp` | `firewallPolicies` | Networking |
| `Traffic Manager` | `traf` | — | Networking |
| `VPN Gateway` | `vgw` | `virtualNetworkGateways` | Networking |
| `Virtual WAN` | `vwan` | `virtualWans` | Networking |
| `Private Endpoint` | `pep` | `privateEndpoints` | Networking |
| `Private DNS Zone` | — | `privateDnsZones` | Networking |
| `Bastion` | `bas` | `bastionHosts` | Networking |
| `API Management` | `apim` | `service` | Integration |
| `Service Bus` | `sbns` | `namespaces` | Integration |
| `Event Hub` | `evhns` | `namespaces` | Integration |
| `Event Grid` | `evgt` | `topics` | Integration |
| `Logic App` | `logic` | `workflows` | Integration |
| `SignalR` | `sigr` | `signalR` | Integration |
| `Notification Hub` | `ntfns` | `namespaces` | Integration |
| `IoT Hub` | `iot` | `IotHubs` | IoT |
| `Key Vault` | `kv` | `vaults` | Security |
| `Managed Identity` | `id` | `userAssignedIdentities` | Security |
| `Entra ID` | — | — | Security |
| `Web Application Firewall` | `waf` | — | Security |
| `Application Insights` | `appi` | `components` | Monitoring |
| `Log Analytics Workspace` | `log` | `workspaces` | Monitoring |
| `Action Group` | — | `actionGroups` | Monitoring |
| `Metric Alert` | — | `metricAlerts` | Monitoring |
| `Dashboard` | `dash` | `dashboards` | Monitoring |
| `App Configuration` | `appcs` | `configurationStores` | Management |
| `Recovery Services Vault` | `rsv` | `vaults` | Management |
| `Automation Account` | `aa` | `automationAccounts` | Management |
| `OpenAI Service` | `oai` | — | AI & ML |
| `Machine Learning` | `mlw` | `workspaces` | AI & ML |
| `AI Search` | `srch` | `searchServices` | AI & ML |
| `AI Service` | `cog` | `accounts` | AI & ML |
| `Data Factory` | `adf` | `factories` | Analytics |
| `Synapse Analytics` | `synw` | `workspaces` | Analytics |
| `Databricks` | `dbw` | `workspaces` | Analytics |
| `Stream Analytics` | `asa` | `streamingjobs` | Analytics |

### ARM Namespace → Canonical Label (quick reference)

| ARM Namespace | Canonical Label(s) |
|---|---|
| `Microsoft.Web` | `App Service`, `Function App`, `App Service Plan`, `Static Web App` |
| `Microsoft.Compute` | `Virtual Machine`, `VM Scale Set`, `Managed Disk` |
| `Microsoft.ContainerService` | `Kubernetes Service` |
| `Microsoft.App` | `Container Apps`, `Container Apps Environment` |
| `Microsoft.ContainerRegistry` | `Container Registry` |
| `Microsoft.Network` | `Virtual Network`, `Subnet`, `NSG`, `NIC`, `Public IP`, `Load Balancer`, `Application Gateway`, `VPN Gateway`, `NAT Gateway`, `Route Table`, `Private Endpoint`, `Private DNS Zone`, `Firewall`, `Bastion`, `Traffic Manager`, `Front Door (Classic)` |
| `Microsoft.Cdn` | `Front Door`, `CDN Profile` |
| `Microsoft.Storage` | `Storage Account` |
| `Microsoft.Sql` | `SQL Server`, `SQL Database`, `SQL Managed Instance` |
| `Microsoft.DocumentDB` | `Cosmos DB` |
| `Microsoft.Cache` | `Cache for Redis` |
| `Microsoft.DBforPostgreSQL` | `PostgreSQL Database` |
| `Microsoft.DBforMySQL` | `MySQL Database` |
| `Microsoft.KeyVault` | `Key Vault` |
| `Microsoft.ManagedIdentity` | `Managed Identity` |
| `Microsoft.ApiManagement` | `API Management` |
| `Microsoft.ServiceBus` | `Service Bus` |
| `Microsoft.EventHub` | `Event Hub` |
| `Microsoft.EventGrid` | `Event Grid` |
| `Microsoft.Logic` | `Logic App` |
| `Microsoft.SignalRService` | `SignalR` |
| `Microsoft.Devices` | `IoT Hub` |
| `Microsoft.NotificationHubs` | `Notification Hub` |
| `Microsoft.Insights` | `Application Insights`, `Action Group`, `Metric Alert`, `Dashboard` |
| `Microsoft.OperationalInsights` | `Log Analytics Workspace` |
| `Microsoft.AppConfiguration` | `App Configuration` |
| `Microsoft.RecoveryServices` | `Recovery Services Vault` |
| `Microsoft.Automation` | `Automation Account` |
| `Microsoft.CognitiveServices` | `AI Service` |
| `Microsoft.Search` | `AI Search` |
| `Microsoft.MachineLearningServices` | `Machine Learning` |
| `Microsoft.DataFactory` | `Data Factory` |
| `Microsoft.Synapse` | `Synapse Analytics` |
| `Microsoft.Databricks` | `Databricks` |
| `Microsoft.StreamAnalytics` | `Stream Analytics` |

### AWS

Format: `AWS <Service>` — e.g. `AWS Lambda`, `AWS S3`, `AWS RDS`, `AWS ECS`, `AWS API Gateway`, `AWS EKS`, `AWS DynamoDB`, `AWS CloudFront`, `AWS SQS`, `AWS SNS`, `AWS Cognito`, `AWS CloudWatch`, `AWS IAM`, `AWS VPC`, `AWS Route 53`, `AWS ElastiCache`, `AWS Kinesis`, `AWS Glue`, `AWS Redshift`, `AWS Step Functions`, `AWS EventBridge`, `AWS Secrets Manager`

### GCP

Format: `GCP <Service>` — e.g. `GCP Cloud Run`, `GCP Pub/Sub`, `GCP BigQuery`, `GCP Cloud SQL`

### Generic (provider unknown)

Use one of: `Database`, `API Gateway`, `Queue`, `Storage`, `Load Balancer`, `Container`, `Server`, `Microservice`, `Function`, `Cloud`

---

---

## spoke_name Normalization Rules

Applied automatically in `server/parsers/normalizeName.js` after every parser runs. Rules execute in this order:

| # | Rule | Example before | Example after |
|---|------|---------------|---------------|
| 1 | Normalize whitespace around hyphens, remove spaces | `"foo - bar api"` | `"foo-bar-api"` |
| 2 | **Drop row** if name contains a B-slot segment (`-b-`, `-b` at end) | `myapp-b` | *(row dropped)* |
| 3 | Protect `pre-prod`; strip `-prod` segment and bare `prod` suffix | `orders-api-prod` | `orders-api` |
| 4 | Strip environment suffixes: `-uat`, `-staging`, `-stage`, `-test`, `-dev` | `orders-api-uat` | `orders-api` |
| 5 | Strip resource-type prefixes from front: `appi-`, `func-`, `kv-`, `mi-`, `appinsights-`, `appinsights` | `func-orders-api` | `orders-api` |
| 6 | Strip org-specific prefixes (configured in `ORG_PREFIXES` array) | — | — |
| 7 | Strip standalone A-slot suffix (`-a` as a segment) | `myapp-a` | `myapp` |
| 8 | Strip Azure region segments and numeric ordinals from hyphen parts | `orders-api-eastus-001` | `orders-api` |
| 9 | Collapse `--`, trim leading/trailing hyphens, deduplicate consecutive segments | `smart-smart-detector` | `smart-detector` |
| 10 | Lowercase | `Orders-API` | `orders-api` |

**Adding org-specific prefixes:** Edit the `ORG_PREFIXES` array in `normalizeName.js`. Example:
```js
const ORG_PREFIXES = ['myorg-', 'myorg']
```

## Notes for AI Parsers (image.js, pdf.js)

- `service_type` values in prompts must match the canonical labels in this file exactly
- `spoke_name` should be the instance label, not the type — prefer the diagram text over the icon type
- `environment` and `location` should only be populated when explicitly stated in the source; never infer or guess
