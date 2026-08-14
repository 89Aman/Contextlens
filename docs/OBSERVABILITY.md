# Observability Policy

ContextLens tracks **operational metrics**, never user content. This document
defines what may be recorded, where it lives, and what is explicitly banned.

## Principles

1. Metrics describe *how the system behaves*, not *what the user did*.
2. Use hashes, IDs, sizes, counts, and event types — never raw payloads.
3. Any recorded string that could contain user content must be redacted first.

## Metrics we collect

### Local MCP server (`GET /mcp/metrics`)

Recorded by `MetricsCollector` in the VS Code extension:

| Metric | Description |
|--------|-------------|
| `totalCalls` | Total tool calls since the extension started |
| `callsToday` | Tool calls in the last 24h |
| `activeClients` | Distinct MCP client IDs seen |
| `toolUsage` | Per-tool call counts |
| `avgLatencyMs` | Average tool latency |
| `failureRate` | Fraction of tool calls that errored |
| `uptime` | Extension MCP server uptime (ms) |
| per-tool `avg`/`p95`/`max` | Latency percentiles per tool |

### Sync engine (extension)

Tracked via `SyncEngine` state (`idle | pending | syncing | synced |
retrying | offline | paused-auth | failed`) and `getMetrics()` (no user
content):

- Sync latency (`lastFlushDurationMs`, `avgFlushDurationMs`).
- Sync retry count (`totalRetries`), items synced / dropped.
- Offline queue size (pending item count).
- Token refresh failures (auth events, no token values).
- Surfaced in the VS Code status bar tooltip.

### Backend

- Request counts and error rates per route (via `auditLog` structured events:
  event type, request id, uid, path — no bodies).
- AI-analysis latency per request (`durationMs` on `explain_episode` /
  `summarize_branch` audit events) and token usage from the provider.
- Retention job run stats (`retention_run` event: archived/deleted/pruned).
- Redaction count (how many stored values matched a sensitive pattern).

## What we NEVER record

- Full AI conversations (prompt or response text).
- Raw diffs or file contents.
- API keys, access tokens, or the MCP secret.
- Complete tool arguments.
- Email/name beyond the authenticated `uid` already in audit events.

## Enforcement

- The extension's `MetricsCollector` only stores tool name, client id, duration
  and a boolean success flag.
- Backend `auditLog` writes event type + ids only; bodies are excluded.
- Sentry is configured with `sendDefaultPii: false` and `tracesSampleRate` 0.1.
- Code review checklist: any new metric must not require raw payloads; if it
  does, redact via `redactText`/`redactDeep` first.

## Storage

Metrics are in-memory per process/session. They are not persisted to Firestore
and are not transmitted to any third party.
