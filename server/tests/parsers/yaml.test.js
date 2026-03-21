const path = require('path');
const fs = require('fs');
const parseYaml = require('../../parsers/yaml');

const fixtureDir = path.join(__dirname, '..', 'fixtures', 'yamls');

function writeYamlFixture(filename, content) {
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }
  const filepath = path.join(fixtureDir, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

describe('parseYaml', () => {
  describe('Valid YAML parsing', () => {
    it('should parse valid YAML with subscription and resources', async () => {
      const yaml = `
subscription_name: my-subscription
environment: prod
default_location: eastus
product_code: ABC
vnet_cidr: 10.0.0.0/16
subscription_id: 12345678-1234-1234-1234-123456789012
spn_client_id: client-id-12345

resources:
  - name: web-api
    type: Web App
    location: eastus
    repo: org/web-api
    comments: main api
  - name: sql-db
    type: SQL Database
    location: eastus
    comments: production data
`;
      const filepath = writeYamlFixture('valid.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('rows');
      expect(result.subscription).toEqual({
        subscription_name: 'my-subscription',
        environment: 'prod',
        default_location: 'eastus',
        product_code: 'ABC',
        vnet_cidr: '10.0.0.0/16',
        subscription_id: '12345678-1234-1234-1234-123456789012',
        spn_client_id: 'client-id-12345'
      });
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].name).toBe('web-api');
      expect(result.rows[1].type).toBe('SQL Database');
    });

    it('should parse YAML with partial subscription fields', async () => {
      const yaml = `
subscription_name: minimal-sub
environment: dev
default_location: westus

resources:
  - name: app-1
    type: Function App
`;
      const filepath = writeYamlFixture('minimal.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.subscription.subscription_name).toBe('minimal-sub');
      expect(result.subscription.product_code).toBeUndefined();
      expect(result.rows).toHaveLength(1);
    });

    it('should parse YAML with multiple resources', async () => {
      const yaml = `
subscription_name: multi-resource
environment: test
default_location: australiaeast

resources:
  - name: frontend
    type: Web App
  - name: backend
    type: Function App
  - name: database
    type: SQL Database
  - name: storage
    type: Storage Account
`;
      const filepath = writeYamlFixture('multi-resource.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows).toHaveLength(4);
      expect(result.rows.map(r => r.name)).toEqual(['frontend', 'backend', 'database', 'storage']);
    });

    it('should convert all values to strings', async () => {
      const yaml = `
subscription_name: test
environment: prod
default_location: eastus

resources:
  - name: app-001
    type: app_service
`;
      const filepath = writeYamlFixture('types.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(typeof result.rows[0].name).toBe('string');
      expect(typeof result.rows[0].type).toBe('string');
    });

    it('should handle empty comments field', async () => {
      const yaml = `
subscription_name: test
environment: dev
default_location: eastus

resources:
  - name: app
    type: Web App
    comments: ""
`;
      const filepath = writeYamlFixture('empty-comments.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows[0].comments).toBe('');
    });

    it('should handle multiline comments', async () => {
      const yaml = `
subscription_name: test
environment: dev
default_location: eastus

resources:
  - name: app
    type: Web App
    comments: |
      Multiline comment
      Line 2
      Line 3
`;
      const filepath = writeYamlFixture('multiline-comments.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows[0].comments).toContain('Multiline comment');
    });

    it('should handle quoted strings with special characters', async () => {
      const yaml = `
subscription_name: "subscription-name"
default_location: eastus

resources:
  - name: "app-with-special-@-#"
    type: "Custom Type"
    comments: "Comment with 'quotes' and \\"escaped\\""
`;
      const filepath = writeYamlFixture('special-chars.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.subscription.subscription_name).toBe('subscription-name');
      expect(result.rows[0].name).toContain('special');
    });
  });

  describe('Empty/missing data handling', () => {
    it('should handle YAML with no resources', async () => {
      const yaml = `
subscription_name: no-resources
environment: dev
default_location: eastus
`;
      const filepath = writeYamlFixture('no-resources.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.subscription).toHaveProperty('subscription_name');
      expect(result.rows).toEqual([]);
    });

    it('should handle YAML with empty resources array', async () => {
      const yaml = `
subscription_name: empty-array
environment: dev
default_location: eastus
resources: []
`;
      const filepath = writeYamlFixture('empty-resources.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows).toEqual([]);
    });

    it('should handle missing fields in resources', async () => {
      const yaml = `
subscription_name: missing-fields
environment: dev
default_location: eastus

resources:
  - name: app-1
    type: Web App
  - name: app-2
`;
      const filepath = writeYamlFixture('missing-fields.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows[0].type).toBe('Web App');
      expect(result.rows[1].type).toBe('');
      expect(result.rows[1].location).toBe('');
    });

    it('should treat null values as empty strings', async () => {
      const yaml = `
subscription_name: null-values
environment: dev
default_location: eastus

resources:
  - name: app-1
    type: Web App
    location: null
    comments: null
`;
      const filepath = writeYamlFixture('null-values.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows[0].location).toBe('');
      expect(result.rows[0].comments).toBe('');
    });
  });

  describe('Error handling', () => {
    it('should throw error for empty file', async () => {
      const filepath = writeYamlFixture('empty.yaml', '');
      await expect(parseYaml(filepath)).rejects.toThrow(/parse YAML/i);
    });

    it('should throw error for invalid YAML syntax', async () => {
      const yaml = 'key: [unclosed bracket';
      const filepath = writeYamlFixture('invalid-syntax.yaml', yaml);
      await expect(parseYaml(filepath)).rejects.toThrow();
    });

    it('should throw error for YAML containing only comments', async () => {
      const yaml = `
# This is just a comment
# No actual content
`;
      const filepath = writeYamlFixture('comments-only.yaml', yaml);
      await expect(parseYaml(filepath)).rejects.toThrow(/parse YAML/i);
    });

    it('should throw error for non-object YAML', async () => {
      const yaml = '- item1\n- item2\n- item3';
      const filepath = writeYamlFixture('array-only.yaml', yaml);
      await expect(parseYaml(filepath)).rejects.toThrow(/parse YAML/i);
    });

    it('should throw error for plain string YAML', async () => {
      const filepath = writeYamlFixture('string-only.yaml', 'just a string');
      await expect(parseYaml(filepath)).rejects.toThrow(/parse YAML/i);
    });
  });

  describe('Complex YAML scenarios', () => {
    it('should handle YAML with all optional subscription fields', async () => {
      const yaml = `
subscription_name: complete
environment: uat
default_location: australiaeast
product_code: XYZ
sku_mode: premium
vnet_cidr: 10.1.0.0/16
subscription_id: 87654321-4321-4321-4321-210987654321
spn_client_id: spn-12345-67890

resources:
  - name: service-1
    type: app_service
    location: australiaeast
    repo: company/service-1
    comments: all fields populated
`;
      const filepath = writeYamlFixture('complete.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(Object.keys(result.subscription)).toHaveLength(8);
      expect(Object.keys(result.rows[0])).toHaveLength(5);
    });

    it('should handle YAML with inconsistent resource field presence', async () => {
      const yaml = `
subscription_name: inconsistent
environment: dev
default_location: eastus

resources:
  - name: app-1
    type: app_service
    repo: org/app-1
    comments: has repo
  - name: app-2
    type: app_service
    location: eastus
  - name: app-3
`;
      const filepath = writeYamlFixture('inconsistent.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].repo).toBe('org/app-1');
      expect(result.rows[1].location).toBe('eastus');
      expect(result.rows[2].name).toBe('app-3');
    });

    it('should preserve formatting of special characters in comments', async () => {
      const yaml = `
subscription_name: special
environment: dev
default_location: eastus

resources:
  - name: app
    type: Web App
    comments: "Plan:P1, OS:Windows, Runtime:.NET, Version:8.0"
`;
      const filepath = writeYamlFixture('special-format.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows[0].comments).toBe('Plan:P1, OS:Windows, Runtime:.NET, Version:8.0');
    });
  });

  describe('Subscription extraction', () => {
    it('should only extract recognized subscription fields', async () => {
      const yaml = `
subscription_name: test
environment: dev
default_location: eastus
unknown_field: should-not-appear
custom_metadata: ignored

resources: []
`;
      const filepath = writeYamlFixture('unknown-fields.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.subscription).not.toHaveProperty('unknown_field');
      expect(result.subscription).not.toHaveProperty('custom_metadata');
      expect(Object.keys(result.subscription)).toEqual(
        ['subscription_name', 'environment', 'default_location']
      );
    });
  });

  describe('New nested format (spoke:)', () => {
    it('should detect and parse new format with spoke key', async () => {
      const yaml = `
spoke:
  name: order-book-001
  subscription: order-book-001
  owner: Platform Engineering
  sku_mode: premium
  infra_repo: order-book-001-infra

ctm_properties:
  product: ob

environments:
  dev:
    location: australiaeast

tags:
  owner: Platform Engineering
  cost_center: CC-1234
  project: order-book
  data_classification: internal

network:
  vnets:
    - id: vnet
      cidr: 10.3.0.0/24
  subnets:
    - id: snet_privateendpoints
      vnet_id: vnet
      cidr: 10.3.0.64/27
      delegation: null
  nsgs: []
  private_endpoints: []
  dns_zones: []

compute:
  app_service_plans:
    - id: asp_web
      subsystem: web
      module: terraform-azurerm-app-service-plan
      os_type: Windows
      sku: P1v3
  web_apps:
    - id: web_api
      subsystem: api
      module: terraform-azurerm-windows-web-app
      asp_id: asp_web
      instance_number: '001'
  function_apps:
    - id: func_processor
      subsystem: processor
      module: terraform-azurerm-windows-function-app
      asp_id: asp_web
      runtime: dotnet-isolated
      instance_number: '001'

data:
  databases:
    - id: cosmos
      subsystem: cosmos
      type: cosmos_account
      module: terraform-azurerm-cosmos-account
      sku: serverless

security:
  key_vaults:
    - id: kv
      subsystem: ob
      module: terraform-azurerm-key-vault
      access_model: RBAC
      consumers: []

observability:
  log_analytics_workspace:
    id: law
    subsystem: ob
    module: terraform-azurerm-log-analytics-workspace
    retention_days: 30
  app_insights:
    - id: appi
      subsystem: ob
      module: terraform-azurerm-application-insights
      workspace_id: law

dependencies:
  - name: hub-network-vnet
    type: vnet_peering
    direction: bidirectional
`;
      const filepath = writeYamlFixture('new-format-full.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('rows');
      expect(result.subscription.spoke_name).toBe('order-book-001');
      expect(result.subscription.owner).toBe('Platform Engineering');
      expect(result.subscription.product).toBe('ob');
      expect(result.subscription.environment).toBe('dev');
      expect(result.subscription.default_location).toBe('australiaeast');
      expect(result.subscription.vnet_cidr).toBe('10.3.0.0/24');
      expect(result.subscription.cost_center).toBe('CC-1234');
      expect(result.subscription.sku_mode).toBe('premium');
      expect(result.subscription.infra_repo).toBe('order-book-001-infra');
    });

    it('should reconstruct rows from all compute/data/security/observability sections', async () => {
      const yaml = `
spoke:
  name: multi-001
  owner: Team

ctm_properties:
  product: multi

environments:
  prod:
    location: eastus

tags:
  owner: Team
  cost_center: CC-1
  project: multi
  data_classification: internal

network:
  vnets: []
  subnets: []
  nsgs: []
  private_endpoints: []
  dns_zones: []

compute:
  app_service_plans:
    - id: asp_web
      subsystem: web
      module: terraform-azurerm-app-service-plan
      os_type: Linux
      sku: P1v3
  web_apps:
    - id: web_api
      subsystem: api
      module: terraform-azurerm-linux-web-app
      asp_id: asp_web
      instance_number: '001'
  function_apps:
    - id: func_worker
      subsystem: worker
      module: terraform-azurerm-windows-function-app
      runtime: node
      instance_number: '001'
  static_sites:
    - id: swa_frontend
      subsystem: frontend
      module: terraform-azurerm-static-web-app
      sku: Standard
      instance_number: '001'

data:
  databases:
    - id: pg
      subsystem: pg
      type: postgresql_flexible_server
      module: terraform-azurerm-postgresql-flexible-server
      sku: GP_Standard_D2s_v3
    - id: cosmos
      subsystem: cosmos
      type: cosmos_account
      module: terraform-azurerm-cosmos-account
  caching:
    - id: redis
      subsystem: cache
      module: terraform-azurerm-managed-redis
      sku: Balanced_B0
  search:
    - id: search
      subsystem: search
      module: terraform-azurerm-search-service
      sku: standard
  factories:
    - id: adf
      subsystem: adf
      module: terraform-azurerm-data-factory

security:
  key_vaults:
    - id: kv
      subsystem: multi
      module: terraform-azurerm-key-vault
      access_model: RBAC
      consumers: []
  managed_identities:
    - id: mi_functions
      subsystem: functions
      module: terraform-azurerm-user-assigned-identity
      instance_number: '001'

observability:
  log_analytics_workspace:
    id: law
    subsystem: multi
    module: terraform-azurerm-log-analytics-workspace
  app_insights:
    - id: appi
      subsystem: multi
      module: terraform-azurerm-application-insights
      workspace_id: law

dependencies: []
`;
      const filepath = writeYamlFixture('new-format-rows.yaml', yaml);
      const result = await parseYaml(filepath);

      const types = result.rows.map(r => r.type);
      expect(types).toContain('app_service_plan');
      expect(types).toContain('web_app');
      expect(types).toContain('function_app');
      expect(types).toContain('static_web_app');
      expect(types).toContain('pg');
      expect(types).toContain('cosmos');
      expect(types).toContain('redis');
      expect(types).toContain('search');
      expect(types).toContain('data_factory');
      expect(types).toContain('key_vault');
      expect(types).toContain('user_assigned_identity');
      expect(types).toContain('app_insights');
      expect(result.rows).toHaveLength(12);
    });

    it('should map database types back to service_type values', async () => {
      const yaml = `
spoke:
  name: db-test
  owner: Team

ctm_properties:
  product: db

environments:
  dev:
    location: eastus

tags:
  owner: Team
  cost_center: CC-1
  project: db
  data_classification: internal

network:
  vnets: []
  subnets: []
  nsgs: []
  private_endpoints: []
  dns_zones: []

data:
  databases:
    - id: sql1
      subsystem: sql1
      type: mssql_server
      module: terraform-azurerm-mssql-server
    - id: pg1
      subsystem: pg1
      type: postgresql_flexible_server
      module: terraform-azurerm-postgresql-flexible-server
    - id: mi1
      subsystem: mi1
      type: mssql_managed_instance
      module: terraform-azurerm-mssql-managed-instance
    - id: mysql1
      subsystem: mysql1
      type: mysql_flexible_server
      module: terraform-azurerm-mysql-flexible-server

observability:
  log_analytics_workspace:
    id: law
    subsystem: db
    module: terraform-azurerm-log-analytics-workspace

dependencies: []
`;
      const filepath = writeYamlFixture('new-format-dbs.yaml', yaml);
      const result = await parseYaml(filepath);

      const types = result.rows.map(r => r.type);
      expect(types).toContain('sql');
      expect(types).toContain('pg');
      expect(types).toContain('sqlmi');
      expect(types).toContain('mysql');
    });

    it('should handle new format with missing optional sections gracefully', async () => {
      const yaml = `
spoke:
  name: minimal-new
  owner: Team

ctm_properties:
  product: min

environments:
  dev:
    location: australiaeast

tags:
  owner: Team
  cost_center: '[TBD]'
  project: '[TBD]'
  data_classification: internal

network:
  vnets: []
  subnets: []
  nsgs: []
  private_endpoints: []
  dns_zones: []

observability:
  log_analytics_workspace:
    id: law
    subsystem: min
    module: terraform-azurerm-log-analytics-workspace

dependencies: []
`;
      const filepath = writeYamlFixture('new-format-minimal.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.subscription.spoke_name).toBe('minimal-new');
      expect(result.rows).toEqual([]);
    });
  });

  describe('Resources extraction', () => {
    it('should handle resources as non-array gracefully', async () => {
      const yaml = `
subscription_name: test
environment: dev
default_location: eastus
resources:
  name: single-resource
  type: Web App
`;
      const filepath = writeYamlFixture('non-array-resources.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows).toEqual([]);
    });

    it('should handle resources with numeric IDs', async () => {
      const yaml = `
subscription_name: test
environment: dev
default_location: eastus

resources:
  - id: 1
    name: app-001
    type: Web App
  - id: 2
    name: app-002
    type: Function App
`;
      const filepath = writeYamlFixture('with-ids.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].name).toBe('app-001');
    });
  });
});
