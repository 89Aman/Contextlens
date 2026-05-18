/**
 * Structured audit logger for security-relevant events.
 * Logs authentication, authorization, and data-access events
 * in a JSON format suitable for SIEM / Cloud Logging ingestion.
 */

/**
 * Logs a structured audit event to stdout (picked up by Cloud Logging).
 *
 * @param {'AUTH_SUCCESS'|'AUTH_FAILURE'|'DATA_ACCESS'|'DATA_WRITE'|'RATE_LIMIT'|'VALIDATION_ERROR'} eventType
 * @param {Object} details - Event-specific fields.
 * @param {import('express').Request} [req] - The request for context.
 */
function auditLog(eventType, details, req) {
  const entry = {
    severity: eventType.startsWith('AUTH_FAILURE') ? 'WARNING' : 'INFO',
    eventType,
    timestamp: new Date().toISOString(),
    requestId: req?.id || null,
    ip: req?.ip || null,
    uid: req?.user?.uid || null,
    method: req?.method || null,
    path: req?.originalUrl || null,
    ...details,
  };

  // Use console.log for structured JSON — Cloud Logging parses JSON stdout
  console.log(JSON.stringify(entry));
}

module.exports = { auditLog };
