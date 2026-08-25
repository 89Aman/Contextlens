require('dotenv').config();
const Sentry = require('./sentry'); // Must be required before any other module
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { validateEnv } = require('./lib/envCheck');

// Validate environment variables on boot
validateEnv();

// ── Graceful Shutdown ──────────────────────────────────────────────────────

let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(JSON.stringify({
    severity: 'INFO',
    event: 'graceful_shutdown',
    signal,
    message: 'Shutting down gracefully...',
  }));

  setTimeout(() => {
    console.log(JSON.stringify({
      severity: 'INFO',
      event: 'shutdown_complete',
    }));
    process.exit(0);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ── Export as Firebase Cloud Functions v2 ──────────────────────────────────

/**
 * Auth Service: Handles extension authentication and token exchange.
 */
exports.authService = Sentry.wrapHttpFunction(onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 5,
  concurrency: 80,
  cors: true,
}, (req, res) => {
  const app = require('./apps/auth');
  return app(req, res);
}));

/**
 * Core Service: Handles projects, episodes metadata CRUD, search, and settings.
 */
exports.coreService = Sentry.wrapHttpFunction(onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 60,
  maxInstances: 10,
  minInstances: 1,
  concurrency: 80,
  cors: true,
}, (req, res) => {
  const app = require('./apps/core');
  return app(req, res);
}));

/**
 * AI Service: Handles AI logging, diff explanation, and branch summarization.
 */
exports.aiService = Sentry.wrapHttpFunction(onRequest({
  region: 'us-central1',
  memory: '1GiB',
  cpu: 1,
  timeoutSeconds: 300,
  maxInstances: 10,
  concurrency: 8,
  cors: true,
}, (req, res) => {
  const app = require('./apps/ai');
  return app(req, res);
}));

/**
 * Retention Service: scheduled archival/deletion of old episodes and
 * per-episode call pruning. Runs daily at 03:00 UTC by default
 * (configurable via RETENTION_SCHEDULE cron expression).
 */
exports.retentionService = onSchedule({
  schedule: process.env.RETENTION_SCHEDULE || '0 3 * * *',
  region: 'us-central1',
  memory: '512MiB',
  timeoutSeconds: 540,
  maxInstances: 1,
}, async () => {
  const { runRetention } = require('./services/retention');
  const stats = await runRetention();
  console.log(JSON.stringify({ severity: 'INFO', event: 'retention_run', stats }));
});
