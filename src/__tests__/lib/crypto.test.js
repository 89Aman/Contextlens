const { encrypt, decrypt, isEncrypted, rotateKey } = require('../../lib/crypto');

const KEY_A = 'a'.repeat(64); // 64 hex chars
const KEY_B = 'b'.repeat(64);

describe('Crypto Utilities (AES-256-GCM)', () => {
  const originalKey = process.env.SETTINGS_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.SETTINGS_ENCRYPTION_KEY;
    else process.env.SETTINGS_ENCRYPTION_KEY = originalKey;
  });

  describe('encrypt / decrypt', () => {
    it('round-trips a secret with a configured key', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const secret = 'sk-openai-1234567890abcdef';
      const ciphertext = encrypt(secret);
      expect(isEncrypted(ciphertext)).toBe(true);
      expect(ciphertext).toMatch(/^enc:v1:/);
      expect(decrypt(ciphertext)).toBe(secret);
    });

    it('passes through when no key is configured', () => {
      delete process.env.SETTINGS_ENCRYPTION_KEY;
      const secret = 'plaintext-key';
      expect(encrypt(secret)).toBe(secret);
      expect(isEncrypted(secret)).toBe(false);
      expect(decrypt(secret)).toBe(secret);
    });

    it('does not re-encrypt an already-encrypted value', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const ciphertext = encrypt('some-secret');
      expect(encrypt(ciphertext)).toBe(ciphertext);
    });

    it('uses a unique IV per encryption (different ciphertexts)', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const a = encrypt('same-plaintext');
      const b = encrypt('same-plaintext');
      expect(a).not.toBe(b);
      expect(decrypt(a)).toBe('same-plaintext');
      expect(decrypt(b)).toBe('same-plaintext');
    });

    it('supports a raw 32-byte string key', () => {
      const rawKey = 'x'.repeat(32);
      const ciphertext = encrypt('raw-key-test', rawKey);
      expect(decrypt(ciphertext, rawKey)).toBe('raw-key-test');
    });

    it('fails closed on tampered ciphertext (returns original, no plaintext leak)', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const ciphertext = encrypt('tamper-me');
      // Flip one hex char inside the ciphertext payload
      const parts = ciphertext.split(':');
      const last = parts[parts.length - 1];
      const flipped = (last[0] === 'a' ? 'b' : 'a') + last.slice(1);
      const tampered = parts.slice(0, -1).join(':') + ':' + flipped;
      const result = decrypt(tampered);
      expect(result).toBe(tampered); // authentication failed → no plaintext
      expect(result).not.toContain('tamper-me');
    });

    it('fails closed when decrypted with the wrong key', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const ciphertext = encrypt('wrong-key-check');
      const result = decrypt(ciphertext, KEY_B);
      expect(result).toBe(ciphertext);
      expect(result).not.toContain('wrong-key-check');
    });
  });

  describe('rotateKey', () => {
    it('re-encrypts an encrypted value under a new key', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const ciphertext = encrypt('rotate-me');
      const rotated = rotateKey(ciphertext, KEY_B);

      expect(rotated).not.toBe(ciphertext);
      // Decryptable with the new key
      expect(decrypt(rotated, KEY_B)).toBe('rotate-me');
      // Old key can no longer decrypt it
      expect(decrypt(rotated, KEY_A)).toBe(rotated);
    });

    it('leaves plaintext values untouched', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      expect(rotateKey('not-encrypted', KEY_B)).toBe('not-encrypted');
    });

    it('leaves undecryptable values untouched', () => {
      process.env.SETTINGS_ENCRYPTION_KEY = KEY_A;
      const ciphertext = encrypt('gone');
      const tampered = ciphertext.slice(0, -4) + '0000';
      expect(rotateKey(tampered, KEY_B)).toBe(tampered);
    });
  });
});
