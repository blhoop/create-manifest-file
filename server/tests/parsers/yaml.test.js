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
    type: Web App
    server_name: server-1
    plan_name: P1
    function_app_name: func-1
`;
      const filepath = writeYamlFixture('types.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(typeof result.rows[0].name).toBe('string');
      expect(typeof result.rows[0].type).toBe('string');
      expect(result.rows[0].server_name).toBe('server-1');
      expect(result.rows[0].plan_name).toBe('P1');
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
      const yaml = `
subscription_name: test
  invalid indentation
    more bad stuff
`;
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
default_location: westeurope
product_code: XYZ
vnet_cidr: 10.1.0.0/16
subscription_id: 87654321-4321-4321-4321-210987654321
spn_client_id: spn-12345-67890

resources:
  - name: service-1
    type: Web App
    location: westeurope
    repo: company/service-1
    server_name: srv-1
    plan_name: P2V2
    function_app_name: fn-1
    comments: all fields populated
`;
      const filepath = writeYamlFixture('complete.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(Object.keys(result.subscription)).toHaveLength(7);
      expect(Object.keys(result.rows[0])).toHaveLength(8);
    });

    it('should handle YAML with inconsistent resource field presence', async () => {
      const yaml = `
subscription_name: inconsistent
environment: dev
default_location: eastus

resources:
  - name: app-1
    type: Web App
    repo: org/app-1
    comments: has repo
  - name: app-2
    type: Function App
    location: westus
    server_name: server-2
  - name: app-3
`;
      const filepath = writeYamlFixture('inconsistent.yaml', yaml);
      const result = await parseYaml(filepath);

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].repo).toBe('org/app-1');
      expect(result.rows[1].server_name).toBe('server-2');
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
