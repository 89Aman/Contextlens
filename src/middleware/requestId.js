const { randomUUID } = require('crypto');

/**
 * Assigns a unique request ID to every incoming request.
 * The ID is attached to req.id and returned in the X-Request-Id response header.
 * Supports distributed tracing by propagating an incoming X-Request-Id if present.
 */
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = { requestId };
