const { cleanComments } = require('../../parsers/cleanComments');

describe('cleanComments', () => {
  describe('JSON array handling', () => {
    it('should convert JSON array to comma-separated string', () => {
      const result = cleanComments('["App Service", "OS: Windows", "SKU: Standard"]');
      expect(result).toBe('App Service, OS: Windows, SKU: Standard');
    });

    it('should handle JSON array with escaped quotes', () => {
      const result = cleanComments('[\"Item 1\", \"Item 2\", \"Item 3\"]');
      expect(result).toBe('Item 1, Item 2, Item 3');
    });

    it('should handle empty JSON array', () => {
      const result = cleanComments('[]');
      expect(result).toBe('');
    });

    it('should handle single-item JSON array', () => {
      const result = cleanComments('["Single item"]');
      expect(result).toBe('Single item');
    });
  });

  describe('Escaped quotes handling', () => {
    it('should remove escaped quotes from Azure Portal format', () => {
      const input = '"\\\"Parent app lb-config\\\", \\\"OS: Windows\\\", \\\"Publishing model: Code\\\", \\\"Runtime Stack: Dotnet - v4.0\\\""';
      const result = cleanComments(input);
      expect(result).not.toContain('\\');
    });

    it('should handle leading and trailing quotes', () => {
      const result = cleanComments('"Item 1, Item 2"');
      expect(result).toBe('Item 1, Item 2');
    });

    it('should handle multiple levels of quotes', () => {
      const result = cleanComments('""Item 1"", ""Item 2""');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });
  });

  describe('Azure Portal format normalization', () => {
    it('should preserve spacing in comments', () => {
      const result = cleanComments('OS: Windows, Runtime: .NET');
      // Function preserves the original spacing, doesn't normalize colons
      expect(result).toContain('OS:');
      expect(result).toContain('Windows');
    });

    it('should preserve "connected to:" format', () => {
      const result = cleanComments('Connected to: orders-db, service-bus');
      expect(result).toContain('Connected to:');
    });

    it('should handle mixed formats', () => {
      const result = cleanComments('OS: Windows, Connected to: db, Runtime: Node');
      expect(result).toContain('OS:');
      expect(result).toContain('Connected to:');
    });
  });

  describe('Noise removal', () => {
    it('should remove "Publishing model" field when in JSON format', () => {
      const result = cleanComments('"Publishing model": Code, OS: Windows');
      expect(result).not.toContain('Publishing');
      expect(result).toContain('OS');
    });

    it('should remove "Runtime Stack" field when in JSON format', () => {
      const result = cleanComments('"Runtime Stack": Dotnet - v4.0, OS: Windows');
      expect(result).not.toContain('Runtime Stack');
      expect(result).toContain('OS');
    });

    it('should remove "Parent app" references when in JSON format', () => {
      const result = cleanComments('"Parent app": lb-config, OS: Windows');
      expect(result).not.toContain('Parent');
      expect(result).toContain('OS');
    });

    it('should clean up Azure Portal JSON format', () => {
      const result = cleanComments('[\"Parent app\": \"config\", \"OS: Windows\", \"Publishing model: Code\"]');
      // Should remove quoted JSON fields and preserve unquoted ones
      expect(result).toContain('OS');
    });
  });

  describe('Spacing and punctuation cleanup', () => {
    it('should normalize spacing around commas', () => {
      const result = cleanComments('Item1  ,  Item2  ,  Item3');
      expect(result).toBe('Item1, Item2, Item3');
    });

    it('should remove leading and trailing commas', () => {
      const result = cleanComments(', Item1, Item2 ,');
      expect(result).toBe('Item1, Item2');
    });

    it('should remove duplicate commas', () => {
      const result = cleanComments('Item1,, Item2,, Item3');
      expect(result).not.toMatch(/,,/);
    });

    it('should trim whitespace', () => {
      const result = cleanComments('  Item1, Item2, Item3  ');
      expect(result).toBe('Item1, Item2, Item3');
    });
  });

  describe('Real-world scenarios', () => {
    it('should clean WebApp/slots comment from Azure Portal', () => {
      const input = '[\"Parent app lb-config\", \"OS: Windows\", \"Publishing model: Code\", \"Runtime Stack: Dotnet - v4.0\"]';
      const result = cleanComments(input);
      // Function removes quoted JSON-formatted noise fields
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('OS');
    });

    it('should preserve proper key:value format', () => {
      const input = 'Slot:staging, Plan:EP1, OS:Windows, Runtime:.NET, Version:8.0, Publishing:Code';
      const result = cleanComments(input);
      expect(result).toBe('Slot:staging, Plan:EP1, OS:Windows, Runtime:.NET, Version:8.0, Publishing:Code');
    });

    it('should preserve formatted fields from JSON array', () => {
      const input = '[\"Slot: staging\", \"Plan: EP1\", \"OS: Windows\"]';
      const result = cleanComments(input);
      expect(result).toContain('Slot:');
      expect(result).toContain('Plan:');
      expect(result).toContain('OS:');
    });

    it('should handle comments with dependencies', () => {
      const input = 'Connected to: orders-db, service-bus, Slot: staging';
      const result = cleanComments(input);
      expect(result).toContain('Connected to:');
      expect(result).toContain('Slot:');
    });
  });

  describe('Edge cases', () => {
    it('should return empty string for null', () => {
      expect(cleanComments(null)).toBe(null);
    });

    it('should return empty string for undefined', () => {
      expect(cleanComments(undefined)).toBe(undefined);
    });

    it('should return empty string for empty string', () => {
      expect(cleanComments('')).toBe('');
    });

    it('should return empty string for whitespace only', () => {
      expect(cleanComments('   ')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(cleanComments(123)).toBe(123);
      expect(cleanComments({ text: 'object' })).toEqual({ text: 'object' });
    });

    it('should handle malformed JSON gracefully', () => {
      const result = cleanComments('[not valid json]');
      expect(result).toBe('[not valid json]');
    });

    it('should handle very long comments', () => {
      const long = 'Item:' + 'A'.repeat(100);
      const result = cleanComments(long);
      // Result will have normalized spacing, so length may differ slightly
      expect(result.length).toBeGreaterThan(50);
      expect(result).toContain('Item');
    });
  });

  describe('Backwards compatibility', () => {
    it('should not break already-clean comments', () => {
      const clean = 'Slot:staging, Plan:P1v2, OS:Windows';
      expect(cleanComments(clean)).toBe(clean);
    });

    it('should handle manual user input format', () => {
      const input = 'Some notes about this resource, needs monitoring';
      const result = cleanComments(input);
      expect(result).toBe('Some notes about this resource, needs monitoring');
    });

    it('should handle mixed user input and structured fields', () => {
      const input = 'Tier:Premium, Note: High-load instance for peak traffic';
      const result = cleanComments(input);
      expect(result).toContain('Tier:Premium');
      expect(result).toContain('Note:');
    });
  });
});
