const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const parseSpreadsheet = require('../../parsers/spreadsheet');

// Helper to create test Excel files
async function createTestExcel(filename, sheets) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name || 'Sheet1');
    if (sheet.headers) {
      ws.addRow(sheet.headers);
    }
    if (sheet.rows) {
      sheet.rows.forEach(row => ws.addRow(row));
    }
  }

  const filepath = path.join(__dirname, '..', 'fixtures', 'spreadsheets', filename);
  await workbook.xlsx.writeFile(filepath);
  return filepath;
}

// Helper to create test CSV
function createTestCsv(filename, headers, rows) {
  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${v}"`).join(','))
  ].join('\n');

  const filepath = path.join(__dirname, '..', 'fixtures', 'spreadsheets', filename);
  fs.writeFileSync(filepath, csv);
  return filepath;
}

describe('parseSpreadsheet', () => {
  beforeAll(() => {
    const dir = path.join(__dirname, '..', 'fixtures', 'spreadsheets');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  describe('XLSX parsing', () => {
    it('should parse valid XLSX with standard headers', async () => {
      const filepath = await createTestExcel('valid.xlsx', [{
        headers: ['name', 'type', 'location', 'repo', 'comments'],
        rows: [
          ['web-api', 'app service', 'eastus', 'org/web-api', 'primary api'],
          ['sql-db', 'sql database', 'eastus', '', 'production database']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'valid.xlsx');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'web-api',
        type: 'app service',
        location: 'eastus',
        repo: 'org/web-api',
        server_name: '',
        plan_name: '',
        function_app_name: '',
        comments: 'primary api'
      });
    });

    it('should handle fuzzy header matching', async () => {
      const filepath = await createTestExcel('fuzzy-headers.xlsx', [{
        headers: ['application name', 'service type', 'azure region', 'repository', 'special comments'],
        rows: [
          ['auth-service', 'function app', 'westus', 'org/auth', 'uses keyvault']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'fuzzy-headers.xlsx');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('auth-service');
      expect(result[0].type).toBe('function app');
      expect(result[0].location).toBe('westus');
    });

    it('should handle multi-sheet XLSX', async () => {
      const filepath = await createTestExcel('multi-sheet.xlsx', [
        {
          name: 'Frontend',
          headers: ['name', 'type'],
          rows: [['ui-app', 'app service']]
        },
        {
          name: 'Backend',
          headers: ['name', 'type'],
          rows: [['api-service', 'function app']]
        }
      ]);

      const result = await parseSpreadsheet(filepath, 'multi-sheet.xlsx');
      expect(result.multiSheet).toBe(true);
      expect(result.sheets).toHaveLength(2);
      expect(result.sheets[0].name).toBe('Frontend');
      expect(result.sheets[0].rows[0].name).toBe('ui-app');
      expect(result.sheets[1].name).toBe('Backend');
      expect(result.sheets[1].rows[0].name).toBe('api-service');
    });

    it('should skip empty rows', async () => {
      const filepath = await createTestExcel('empty-rows.xlsx', [{
        headers: ['name', 'type'],
        rows: [
          ['app1', 'service'],
          ['', ''],
          ['app2', 'service']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'empty-rows.xlsx');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.name)).toEqual(['app1', 'app2']);
    });

    it('should handle missing or empty headers', async () => {
      const filepath = await createTestExcel('sparse-headers.xlsx', [{
        headers: ['name', '', 'type', null],
        rows: [
          ['myapp', 'unused', 'service', 'also-unused']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'sparse-headers.xlsx');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('myapp');
      expect(result[0].type).toBe('service');
    });

    it('should handle non-ASCII characters', async () => {
      const filepath = await createTestExcel('unicode.xlsx', [{
        headers: ['name', 'type', 'comments'],
        rows: [
          ['café-service', 'service', '数据库连接'],
          ['résumé-api', 'api', 'München']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'unicode.xlsx');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('café-service');
      expect(result[1].comments).toBe('München');
    });

    it('should handle partial data', async () => {
      const filepath = await createTestExcel('partial-data.xlsx', [{
        headers: ['name', 'type', 'location', 'repo', 'comments'],
        rows: [
          ['app1', 'service', '', '', ''],
          ['', 'database', 'eastus', 'org/db', 'clustered']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'partial-data.xlsx');
      expect(result).toHaveLength(2);
      expect(result[0].location).toBe('');
      expect(result[1].name).toBe('');
    });

    it('should handle numeric values and convert to strings', async () => {
      const filepath = await createTestExcel('numeric.xlsx', [{
        headers: ['name', 'type', 'comments'],
        rows: [
          ['app-001', 'service-2', '123 instances'],
          [42, 'type', 99]
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'numeric.xlsx');
      expect(result[0].name).toBe('app-001');
      expect(result[1].name).toBe('42');
      expect(result[1].comments).toBe('99');
    });
  });

  describe('CSV parsing', () => {
    it('should parse valid CSV with comma delimiter', () => {
      const filepath = createTestCsv('valid.csv',
        ['name', 'type', 'location', 'comments'],
        [
          ['web-api', 'service', 'eastus', 'main api'],
          ['db-instance', 'database', 'westus', 'primary']
        ]
      );

      const result = parseSpreadsheet(filepath, 'valid.csv');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('web-api');
    });

    it('should handle CSV with quoted values and commas', () => {
      const filepath = createTestCsv('quoted.csv',
        ['name', 'type', 'comments'],
        [
          ['app-1', 'service', 'comment with, comma'],
          ['app-2', 'database', 'another, description']
        ]
      );

      const result = parseSpreadsheet(filepath, 'quoted.csv');
      expect(result).toHaveLength(2);
      expect(result[0].comments).toContain('comma');
    });
  });

  describe('TSV parsing', () => {
    it('should parse tab-delimited files', () => {
      const tsv = 'name\ttype\tlocation\nweb-app\tservice\teastus\ndb\tdatabase\twestus';
      const filepath = path.join(__dirname, '..', 'fixtures', 'spreadsheets', 'data.tsv');
      fs.writeFileSync(filepath, tsv);

      const result = parseSpreadsheet(filepath, 'data.tsv');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('web-app');
      expect(result[0].location).toBe('eastus');
    });
  });

  describe('Header normalization', () => {
    it('should normalize headers with whitespace and case', async () => {
      const filepath = await createTestExcel('case-variants.xlsx', [{
        headers: ['NAME', 'Service Type', 'AZURE REGION', 'App Repo'],
        rows: [
          ['myapp', 'service', 'eastus', 'org/repo']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'case-variants.xlsx');
      expect(result[0].name).toBe('myapp');
      expect(result[0].type).toBe('service');
      expect(result[0].location).toBe('eastus');
      expect(result[0].repo).toBe('org/repo');
    });

    it('should handle underscores in header names', async () => {
      const filepath = await createTestExcel('underscore-headers.xlsx', [{
        headers: ['spoke_name', 'service_type', 'special_comments'],
        rows: [
          ['api-service', 'function app', 'needs kv']
        ]
      }]);

      const result = await parseSpreadsheet(filepath, 'underscore-headers.xlsx');
      expect(result[0].name).toBe('api-service');
      expect(result[0].type).toBe('function app');
      expect(result[0].comments).toBe('needs kv');
    });
  });

  describe('Single vs multi-sheet detection', () => {
    it('should return array for single sheet', async () => {
      const filepath = await createTestExcel('single.xlsx', [{
        headers: ['name', 'type'],
        rows: [['app', 'service']]
      }]);

      const result = await parseSpreadsheet(filepath, 'single.xlsx');
      expect(Array.isArray(result)).toBe(true);
      expect(!result.multiSheet).toBe(true);
    });

    it('should return multiSheet object for multiple sheets', async () => {
      const filepath = await createTestExcel('multiple.xlsx', [
        { headers: ['name', 'type'], rows: [['app1', 'service']] },
        { headers: ['name', 'type'], rows: [['app2', 'service']] }
      ]);

      const result = await parseSpreadsheet(filepath, 'multiple.xlsx');
      expect(result.multiSheet).toBe(true);
      expect(result.sheets).toHaveLength(2);
    });
  });

  describe('Empty file handling', () => {
    it('should return empty array for empty workbook', async () => {
      const filepath = await createTestExcel('empty.xlsx', []);
      const result = await parseSpreadsheet(filepath, 'empty.xlsx');
      expect(result).toEqual([]);
    });

    it('should return empty array for sheet with only headers', async () => {
      const filepath = await createTestExcel('headers-only.xlsx', [{
        headers: ['name', 'type', 'location'],
        rows: []
      }]);

      const result = await parseSpreadsheet(filepath, 'headers-only.xlsx');
      expect(result).toEqual([]);
    });
  });
});
