function typedError(code, message, details) {
  return {
    error: {
      code,
      message,
      details: details || null,
    },
  };
}

function mapError(err) {
  const message = err && err.message ? err.message : 'Unknown error';
  if (/unauthenticated/i.test(message)) return { status: 401, code: 'unauthenticated', message };
  if (/permission/i.test(message)) return { status: 403, code: 'forbidden', message };
  if (/not[_ -]?found|missing/i.test(message)) return { status: 404, code: 'not_found', message };
  if (/timeout/i.test(message)) return { status: 504, code: 'model_timeout', message };
  if (/quota/i.test(message)) return { status: 429, code: 'quota_exceeded', message };
  return { status: 500, code: 'internal_error', message };
}

module.exports = { typedError, mapError };
