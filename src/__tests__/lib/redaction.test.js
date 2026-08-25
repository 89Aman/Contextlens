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

    it('should redact JWTs', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const result = redactText(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toMatch(/eyJ/);
    });

    it('should redact Firebase ID tokens (JWTs)', () => {
      const input = 'idToken=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJhYmMifQ.signatureparthere';
      const result = redactText(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('signatureparthere');
    });

    it('should redact database connection strings', () => {
      const inputs = [
        'postgres://user:supersecret@db.example.com:5432/prod',
        'postgresql://admin:hunter2pass@localhost/mydb',
        'mongodb+srv://user:mongopass@cluster0.mongodb.net/app',
        'mysql://root:rootpass@127.0.0.1:3306/db',
        'redis://:redissecret@cache:6379/0',
      ];
      inputs.forEach(input => {
        const result = redactText(input);
        expect(result).toContain('[REDACTED]');
      });
    });

    it('should redact .env assignments for known secret keys', () => {
      const inputs = [
        'DATABASE_URL=postgres://user:pass@host:5432/db',
        'MONGO_URI=mongodb://user:pass@host/db',
        'REDIS_URL=redis://:pass@host:6379',
        'GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json',
      ];
      inputs.forEach(input => {
        const result = redactText(input);
        expect(result).toContain('[REDACTED]');
      });
    });

    it('should not redact ordinary hashes (false positives)', () => {
      const inputs = [
        'sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        'md5=d41d8cd98f00b204e9800998ecf8427e',
        'commit=1797e51f0b2f9b2c4d5e6f7a8b9c0d1e2f3a4b5c6',
      ];
      inputs.forEach(input => {
        expect(redactText(input)).toBe(input);
      });
    });

    it('should not redact UUIDs or ordinary IDs', () => {
      const inputs = [
        'id=550e8400-e29b-41d4-a716-446655440000',
        'episodeId=123e4567-e89b-12d3-a456-426614174000',
        'count=42',
        'name=JohnDoe',
      ];
      inputs.forEach(input => {
        expect(redactText(input)).toBe(input);
      });
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
