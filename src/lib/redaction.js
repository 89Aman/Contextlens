const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z\-_]{20,}/g, // Google API keys
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[^'\"\s]{8,}['\"]?/gi,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g,
  /gh[pous]_[A-Za-z0-9_]{20,}/g, // GitHub PATs / fine-grained tokens
  /xox[baprs]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, // JWT / Firebase ID tokens
  /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|jdbc):\/\/[^\s'"<>]+/gi, // DB connection strings
  /(?:DATABASE_URL|MONGO_URI|MYSQL_URL|REDIS_URL|PG_URL|FIREBASE_(?:API_KEY|PROJECT_ID|APP_ID)|GOOGLE_APPLICATION_CREDENTIALS)\s*=\s*['\"]?[^'\"]+/gi, // .env assignments
];

/**
 * Redacts sensitive patterns (API keys, tokens, etc.) from a string.
 *
 * Note: patterns operate line by line / within a single string. A secret
 * split across multiple diff lines is not reconstructed here — the extension
 * redacts before any content is persisted or uploaded, and truncation keeps
 * diffs bounded.
 *
 * @param {string} input - The text to redact.
 * @returns {string} The redacted text.
 */
function redactText(input) {
  if (typeof input !== 'string' || input.length === 0) return input;
  return SENSITIVE_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), input);
}

/**
 * Recursively redacts sensitive information from strings within an object or array.
 * 
 * @param {*} value - The value (object, array, or string) to redact.
 * @returns {*} The redacted copy of the input.
 */
function redactDeep(value) {
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      result[key] = redactDeep(child);
    }
    return result;
  }
  return value;
}

module.exports = { redactText, redactDeep };
