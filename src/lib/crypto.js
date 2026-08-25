const crypto = require('crypto');

/**
 * AES-256-GCM encryption for API keys stored at rest in Firestore.
 *
 * The encryption key is read from `SETTINGS_ENCRYPTION_KEY` and must be
 * exactly 32 bytes (64 hex characters). If the variable is missing,
 * encrypt/decrypt become transparent passthroughs so existing deployments
 * keep working while the key is being provisioned.
 *
 * Ciphertext format: `enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * This prefix lets `isEncrypted()` distinguish encrypted values from
 * plaintext keys that were stored before this module was introduced.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const PREFIX = 'enc:v1:';

/**
 * Normalizes a 32-byte key string (64 hex chars or raw 32 bytes) to a Buffer.
 *
 * @param {string} raw
 * @returns {Buffer|null}
 */
function normalizeKey(raw) {
  if (!raw) return null;
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw.length === 32) {
    return Buffer.from(raw, 'utf8');
  }
  console.error('[ContextLens] Encryption key must be 32 bytes (64 hex chars). Encryption disabled.');
  return null;
}

/**
 * Returns the 32-byte encryption key derived from the env var, or null
 * if encryption is not configured.
 *
 * @returns {Buffer|null}
 */
function getEncryptionKey() {
  return normalizeKey(process.env.SETTINGS_ENCRYPTION_KEY);
}

/**
 * Returns true if the value looks like an encrypted ciphertext string.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns the ciphertext string, or the original value if encryption is
 * not configured.
 *
 * @param {string} plaintext - The value to encrypt.
 * @param {string} [keyOverride] - Optional key string to use instead of the env var.
 * @returns {string} The ciphertext (prefixed) or original value.
 */
function encrypt(plaintext, keyOverride) {
  if (!plaintext || typeof plaintext !== 'string') return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // already encrypted

  const key = keyOverride ? normalizeKey(keyOverride) : getEncryptionKey();
  if (!key) return plaintext; // passthrough when key not configured

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM ciphertext string back to plaintext.
 * Returns the original value if it's not encrypted or if decryption
 * is not configured.
 *
 * @param {string} ciphertext - The value to decrypt.
 * @param {string} [keyOverride] - Optional key string to use instead of the env var.
 * @returns {string} The decrypted plaintext or original value.
 */
function decrypt(ciphertext, keyOverride) {
  if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;
  if (!isEncrypted(ciphertext)) return ciphertext; // plaintext passthrough

  const key = keyOverride ? normalizeKey(keyOverride) : getEncryptionKey();
  if (!key) {
    console.warn('[ContextLens] Cannot decrypt: SETTINGS_ENCRYPTION_KEY not set.');
    return ciphertext; // can't decrypt without the key
  }

  try {
    // Strip prefix and split parts
    const payload = ciphertext.slice(PREFIX.length);
    const [ivHex, authTagHex, encryptedHex] = payload.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[ContextLens] Decryption failed — key may have been rotated:', err.message);
    return ciphertext; // return raw to avoid data loss
  }
}

/**
 * Re-encrypts a stored ciphertext with a new key (key rotation).
 * Decrypts with the currently configured key, then re-encrypts with
 * `newKeyValue`. Returns the value unchanged if it was never encrypted
 * or could not be decrypted.
 *
 * @param {string} value - The stored value (ciphertext or plaintext).
 * @param {string} newKeyValue - New 32-byte key (64 hex or raw string).
 * @returns {string} Re-encrypted ciphertext or original value.
 */
function rotateKey(value, newKeyValue) {
  if (!isEncrypted(value)) return value;
  const plaintext = decrypt(value);
  if (plaintext === value) return value; // could not decrypt — leave as-is
  return encrypt(plaintext, newKeyValue);
}

module.exports = { encrypt, decrypt, isEncrypted, rotateKey };
