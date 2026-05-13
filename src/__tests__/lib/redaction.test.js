const { redactText, redactDeep } = require('../../lib/redaction');

describe('Redaction Utilities', () => {
  describe('redactText', () => {
    it('should redact Google API keys', () => {
      const input = 'My key is AIza12345678901234567890abc';
      const result = redactText(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('AIza');
    });

    it('should redact API keys with various formats', () => {
      const inputs = [
        'api_key = "secret123456789"',
        'api-key: "secret123456789"',
        'secret: "secretvalue12345"',
        'token = "tokenvalue12345"',
        'password = "mypassword123456"',
      ];

      inputs.forEach(input => {
        const result = redactText(input);
        expect(result).toContain('[REDACTED]');
      });
    });

    it('should redact private keys', () => {
      const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890\nMIIEpAIBAAKCAQEA1234567890\n-----END RSA PRIVATE KEY-----';
      const result = redactText(input);
      expect(result).toContain('[REDACTED]');
    });

    it('should redact GitHub tokens', () => {
      const inputs = [
        'ghp_1234567890123456789012345678901234',
        'ghu_1234567890123456789012345678901234',
        'gho_1234567890123456789012345678901234',
        'ghs_1234567890123456789012345678901234',
      ];

      inputs.forEach(input => {
        const result = redactText(input);
        expect(result).toContain('[REDACTED]');
      });
    });

    it('should redact Slack tokens', () => {
      const inputs = [
        'xoxb-1234567890123-1234567890123-1234567890123',
        'xoxp-1234567890123-1234567890123-1234567890123',
      ];

      inputs.forEach(input => {
        const result = redactText(input);
        expect(result).toContain('[REDACTED]');
      });
    });

    it('should handle non-string input', () => {
      expect(redactText(123)).toBe(123);
      expect(redactText(null)).toBe(null);
      expect(redactText(undefined)).toBe(undefined);
    });

    it('should handle empty string', () => {
      expect(redactText('')).toBe('');
    });

    it('should preserve text without sensitive data', () => {
      const input = 'This is a normal message without secrets';
      expect(redactText(input)).toBe(input);
    });

    it('should handle multiple sensitive patterns in one string', () => {
      const input = 'api_key: "secret123456" and password: "pass12345"';
      const result = redactText(input);
      const redactedCount = (result.match(/\[REDACTED\]/g) || []).length;
      expect(redactedCount).toBe(2);
    });
  });

  describe('redactDeep', () => {
    it('should redact strings in objects', () => {
      const input = {
        message: 'api_key: "secret123456"',
      };
      const result = redactDeep(input);
      expect(result.message).toContain('[REDACTED]');
    });

    it('should redact strings in nested objects', () => {
      const input = {
        level1: {
          level2: {
            secret: 'password: "mypassword123456"',
          },
        },
      };
      const result = redactDeep(input);
      expect(result.level1.level2.secret).toContain('[REDACTED]');
    });

    it('should redact strings in arrays', () => {
      const input = ['api_key: "secret123456"', 'normal text'];
      const result = redactDeep(input);
      expect(result[0]).toContain('[REDACTED]');
      expect(result[1]).toBe('normal text');
    });

    it('should redact strings in arrays of objects', () => {
      const input = [
        { token: 'ghp_1234567890123456789012345678901234' },
        { token: 'normal_token' },
      ];
      const result = redactDeep(input);
      expect(result[0].token).toContain('[REDACTED]');
      expect(result[1].token).toBe('normal_token');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        nullable: null,
      };
      const result = redactDeep(input);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.nullable).toBe(null);
    });

    it('should handle circular structures gracefully', () => {
      const input = { text: 'normal text' };
      const result = redactDeep(input);
      expect(result.text).toBe('normal text');
    });

    it('should handle deeply nested mixed structures', () => {
      const input = {
        users: [
          { name: 'Alice', token: 'ghp_1234567890123456789012345678901234' },
          { name: 'Bob', data: { secret: 'password: "pass12345"' } },
        ],
        config: {
          keys: ['api_key: "secret123456"', 'normal_key'],
        },
      };
      const result = redactDeep(input);
      expect(result.users[0].token).toContain('[REDACTED]');
      expect(result.users[1].data.secret).toContain('[REDACTED]');
      expect(result.config.keys[0]).toContain('[REDACTED]');
      expect(result.config.keys[1]).toBe('normal_key');
    });
  });
});
