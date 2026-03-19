const { normalizeName, normalizeRows, normalizeTypeName } = require('../../parsers/normalizeName');

describe('normalizeName', () => {
  describe('Basic whitespace and hyphen normalization', () => {
    it('should collapse spaces around hyphens', () => {
      expect(normalizeName('foo - bar')).toBe('foo-bar');
      expect(normalizeName('foo  -  bar')).toBe('foo-bar');
    });

    it('should remove spaces within names', () => {
      expect(normalizeName('Failure Anomalies')).toBe('failureanomalies');
      expect(normalizeName('My App')).toBe('myapp');
    });

    it('should trim leading/trailing whitespace', () => {
      expect(normalizeName('  myapp  ')).toBe('myapp');
      expect(normalizeName('\tmyapp\t')).toBe('myapp');
    });

    it('should handle names with no changes needed', () => {
      expect(normalizeName('simple-name')).toBe('simple-name');
    });
  });

  describe('Deployment slot B filtering', () => {
    it('should return null for names ending with -b', () => {
      expect(normalizeName('app-b')).toBeNull();
      expect(normalizeName('slot-b')).toBeNull();
    });

    it('should return null for names with -b- in middle', () => {
      expect(normalizeName('app-b-001')).toBeNull();
      expect(normalizeName('my-b-service')).toBeNull();
    });

    it('should return null for names with -b/ (before sub-path)', () => {
      expect(normalizeName('app-b/path')).toBeNull();
    });

    it('should not filter -b when part of a word', () => {
      expect(normalizeName('absorb')).toBe('absorb');
      expect(normalizeName('webapi')).toBe('webapi');
      expect(normalizeName('my-absorb-app')).toBe('my-absorb-app');
    });

    it('should be case-insensitive', () => {
      expect(normalizeName('APP-B')).toBeNull();
      expect(normalizeName('App-B')).toBeNull();
    });
  });

  describe('Environment suffix stripping', () => {
    it('should strip -prod suffix', () => {
      expect(normalizeName('myapp-prod')).toBe('myapp');
      expect(normalizeName('service-prod-001')).toBe('service-001');
    });

    it('should strip bare prod at end', () => {
      expect(normalizeName('appprod')).toBe('app');
    });

    it('should protect pre-prod from prod stripping', () => {
      expect(normalizeName('app-pre-prod')).toBe('app-pre-prod');
      expect(normalizeName('service-pre-prod-001')).toBe('service-pre-prod-001');
    });

    it('should strip -uat, -staging, -stage, -test, -dev suffixes', () => {
      expect(normalizeName('app-uat')).toBe('app');
      expect(normalizeName('app-staging')).toBe('app');
      expect(normalizeName('app-stage')).toBe('app');
      expect(normalizeName('app-test')).toBe('app');
      expect(normalizeName('app-dev')).toBe('app');
    });

    it('should strip environment suffixes in middle of name', () => {
      expect(normalizeName('app-prod-001')).toBe('app-001');
      expect(normalizeName('svc-test-instance')).toBe('svc-instance');
      expect(normalizeName('api-dev-v2')).toBe('api-v2');
    });

    it('should be case-insensitive', () => {
      expect(normalizeName('APP-PROD')).toBe('app');
      expect(normalizeName('Api-Test')).toBe('api');
      expect(normalizeName('SVC-UAT')).toBe('svc');
    });

    it('should not strip environment keywords within words', () => {
      expect(normalizeName('development')).toBe('development');
      expect(normalizeName('my-product')).toBe('my-product');
    });
  });

  describe('Resource type prefix stripping', () => {
    it('should strip appinsights- prefix', () => {
      expect(normalizeName('appinsights-myapp')).toBe('myapp');
      expect(normalizeName('AppInsights-MyApp')).toBe('myapp');
    });

    it('should strip appinsights prefix without hyphen', () => {
      expect(normalizeName('appinsightsmyapp')).toBe('myapp');
    });

    it('should strip appi- prefix', () => {
      expect(normalizeName('appi-monitoring')).toBe('monitoring');
      expect(normalizeName('APPI-Insights')).toBe('insights');
    });

    it('should strip func- prefix', () => {
      expect(normalizeName('func-process')).toBe('process');
    });

    it('should strip kv- prefix', () => {
      expect(normalizeName('kv-secrets')).toBe('secrets');
    });

    it('should strip mi- prefix', () => {
      expect(normalizeName('mi-identity')).toBe('identity');
    });

    it('should not strip prefixes that are not resource types', () => {
      expect(normalizeName('my-app')).toBe('my-app');
    });

    it('should handle multiple valid prefixes (only first applies)', () => {
      expect(normalizeName('func-kv-store')).toBe('kv-store');
    });
  });

  describe('Deployment slot A suffix stripping', () => {
    it('should strip -a when followed by hyphen or end of string', () => {
      expect(normalizeName('myapp-a')).toBe('myapp');
      expect(normalizeName('slot-a-001')).toBe('slot-001');
    });

    it('should not strip -a when part of a word', () => {
      expect(normalizeName('scala')).toBe('scala');
      expect(normalizeName('data')).toBe('data');
      expect(normalizeName('my-data-service')).toBe('my-data-service');
    });

    it('should be case-insensitive', () => {
      expect(normalizeName('APP-A')).toBe('app');
    });
  });

  describe('Azure region segment removal', () => {
    it('should remove eastus region', () => {
      expect(normalizeName('orders-api-eastus')).toBe('orders-api');
      expect(normalizeName('orders-api-eastus-001')).toBe('orders-api-001');
    });

    it('should remove australiaeast region', () => {
      expect(normalizeName('app-australiaeast')).toBe('app');
    });

    it('should remove numeric ordinal segments', () => {
      expect(normalizeName('app-001')).toBe('app');
      expect(normalizeName('service-001-prod')).toBe('service');
    });

    it('should not remove segments that are region names in different context', () => {
      expect(normalizeName('eastus')).toBe('eastus'); // entire name is a region, not removed
    });

    it('should handle multiple region and ordinal removals', () => {
      expect(normalizeName('api-eastus-001-westus')).toBe('api');
    });

    it('should be case-insensitive for regions', () => {
      expect(normalizeName('api-EASTUS')).toBe('api');
      expect(normalizeName('api-EastUs')).toBe('api');
    });

    it('should support all Azure regions', () => {
      const regions = [
        'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
        'northcentralus', 'southcentralus', 'westcentralus',
        'northeurope', 'westeurope',
        'uksouth', 'ukwest',
        'southeastasia', 'eastasia',
        'australiaeast', 'australiasoutheast',
        'canadacentral', 'canadaeast',
        'brazilsouth',
        'japaneast', 'japanwest',
        'koreacentral', 'koreasouth',
        'southindia', 'centralindia', 'westindia',
        'francecentral', 'francesouth',
        'switzerlandnorth', 'switzerlandwest',
        'germanywestcentral',
        'norwayeast',
        'uaenorth',
        'southafricanorth',
      ];
      for (const region of regions) {
        expect(normalizeName(`app-${region}`)).toBe('app');
      }
    });
  });

  describe('Cleanup and deduplication', () => {
    it('should collapse consecutive hyphens', () => {
      expect(normalizeName('app--service')).toBe('app-service');
      expect(normalizeName('api---gateway')).toBe('api-gateway');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(normalizeName('-myapp')).toBe('myapp');
      expect(normalizeName('myapp-')).toBe('myapp');
      expect(normalizeName('-myapp-')).toBe('myapp');
    });

    it('should deduplicate consecutive identical segments (case-insensitive)', () => {
      expect(normalizeName('smart-smart-detector')).toBe('smart-detector');
      expect(normalizeName('api-API-gateway')).toBe('api-gateway');
      expect(normalizeName('service-Service')).toBe('service');
    });

    it('should handle complex cleanup scenarios', () => {
      expect(normalizeName('--api---service--')).toBe('api-service');
      expect(normalizeName('my-my-app-app')).toBe('my-app');
    });
  });

  describe('Lowercasing', () => {
    it('should convert to lowercase', () => {
      expect(normalizeName('MyApp')).toBe('myapp');
      expect(normalizeName('API-GATEWAY')).toBe('api-gateway');
      expect(normalizeName('HelloWorld')).toBe('helloworld');
    });

    it('should be the final step', () => {
      expect(normalizeName('APP-PROD')).toBe('app');
    });
  });

  describe('Null/invalid input handling', () => {
    it('should return input for null/undefined', () => {
      expect(normalizeName(null)).toBe(null);
      expect(normalizeName(undefined)).toBe(undefined);
    });

    it('should return input for non-string values', () => {
      expect(normalizeName(123)).toBe(123);
      expect(normalizeName({ name: 'test' })).toEqual({ name: 'test' });
    });

    it('should return null for empty strings after normalization', () => {
      expect(normalizeName('---')).toBeNull();
      expect(normalizeName('   ')).toBeNull();
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle Application Insights naming pattern', () => {
      expect(normalizeName('AppInsights-MyApp-eastus-prod')).toBe('myapp');
    });

    it('should handle multi-segment names with multiple removals', () => {
      expect(normalizeName('orders-api-eastus-001-prod')).toBe('orders-api');
    });

    it('should handle slot A with environment suffix', () => {
      expect(normalizeName('service-a-prod')).toBe('service');
    });

    it('should handle pre-prod correctly', () => {
      expect(normalizeName('app-pre-prod-eastus')).toBe('app-pre-prod');
    });

    it('should handle deployment slot B with environment', () => {
      expect(normalizeName('function-b-test')).toBeNull();
    });

    it('should handle Azure resource naming conventions', () => {
      expect(normalizeName('func-myapp-eastus-001-prod')).toBe('myapp');
    });

    it('should handle all type prefixes together', () => {
      // Only first prefix should apply
      expect(normalizeName('appinsights-kv-secrets-prod')).toBe('kv-secrets');
    });

    it('should preserve intentional dashes and content', () => {
      expect(normalizeName('billing-service-v2')).toBe('billing-service-v2');
      expect(normalizeName('api-gateway-2024')).toBe('api-gateway-2024');
    });
  });

  describe('normalizeTypeName', () => {
    it('should remap appservice variants to canonical', () => {
      expect(normalizeTypeName('appservice')).toBe('app_service');
      expect(normalizeTypeName('webapp')).toBe('app_service');
      expect(normalizeTypeName('WebApp')).toBe('app_service');
      expect(normalizeTypeName('FunctionApp')).toBe('app_service');
      expect(normalizeTypeName('AppServicePlan')).toBe('app_service');
    });

    it('should remap appservice slots variants to app_service', () => {
      expect(normalizeTypeName('appserviceslots')).toBe('app_service');
      expect(normalizeTypeName('webappslots')).toBe('app_service');
      expect(normalizeTypeName('WebAppSlots')).toBe('app_service');
    });

    it('should remap static web app variants', () => {
      expect(normalizeTypeName('swa')).toBe('static_web_app');
      expect(normalizeTypeName('StaticSite')).toBe('static_web_app');
      expect(normalizeTypeName('static_web_app')).toBe('static_web_app');
    });

    it('should remap AI and messaging types', () => {
      expect(normalizeTypeName('ai_foundry')).toBe('openai');
      expect(normalizeTypeName('ai_search')).toBe('search');
      expect(normalizeTypeName('service_bus')).toBe('servicebus');
    });

    it('should remap inventory data types', () => {
      expect(normalizeTypeName('StorageAccount')).toBe('storage_account');
      expect(normalizeTypeName('SQLServer')).toBe('sql');
      expect(normalizeTypeName('SQLDatabase')).toBe('sql');
      expect(normalizeTypeName('KeyVault')).toBe('key_vault');
    });

    it('should handle case and whitespace variations', () => {
      expect(normalizeTypeName('APP SERVICE')).toBe('app_service');
      expect(normalizeTypeName('app_service')).toBe('app_service');
      expect(normalizeTypeName('APP/SERVICE')).toBe('app_service');
    });

    it('should return original type if no mapping exists', () => {
      expect(normalizeTypeName('CustomType')).toBe('CustomType');
      expect(normalizeTypeName('sql-database')).toBe('sql-database');
    });

    it('should return null/undefined input unchanged', () => {
      expect(normalizeTypeName(null)).toBe(null);
      expect(normalizeTypeName(undefined)).toBe(undefined);
    });
  });

  describe('normalizeRows', () => {
    it('should normalize all rows in array', () => {
      const rows = [
        { name: 'MyApp-prod', type: 'webapp' },
        { name: 'Service-test', type: 'appservice' }
      ];
      const result = normalizeRows(rows);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('myapp');
      expect(result[0].type).toBe('Web App');
      expect(result[1].name).toBe('service');
      expect(result[1].type).toBe('Web App');
    });

    it('should drop rows where normalizeName returns null', () => {
      const rows = [
        { name: 'app-a', type: 'webapp' },
        { name: 'slot-b', type: 'webapp' },
        { name: 'service', type: 'webapp' }
      ];
      const result = normalizeRows(rows);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('service');
    });

    it('should preserve other row properties', () => {
      const rows = [
        { name: 'MyApp-prod', type: 'webapp', location: 'eastus', comments: 'test' }
      ];
      const result = normalizeRows(rows);
      expect(result[0]).toHaveProperty('location', 'eastus');
      expect(result[0]).toHaveProperty('comments', 'test');
    });

    it('should handle empty array', () => {
      expect(normalizeRows([])).toEqual([]);
    });
  });
});
