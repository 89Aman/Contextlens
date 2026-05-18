const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate limiter for general API endpoints.
 * Allows 100 requests per 15-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'rate_limit_exceeded',
      message: 'Too many requests. Please try again later.',
    },
  },
  keyGenerator: (req, res) => req.user?.uid || ipKeyGenerator(req, res),
});

/**
 * Stricter rate limiter for authentication endpoints.
 * Allows 10 requests per 15-minute window per IP.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'rate_limit_exceeded',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

/**
 * Rate limiter for AI-calling endpoints (expensive operations).
 * Allows 30 requests per 15-minute window per user.
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'rate_limit_exceeded',
      message: 'AI request quota exceeded. Please try again later.',
    },
  },
  keyGenerator: (req, res) => req.user?.uid || ipKeyGenerator(req, res),
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
