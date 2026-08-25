/**
 * MCP HTTP request handler (pure)
 *
 * Contains the request-handling logic for the local MCP helper server.
 * All external services are injected via deps so this module has zero
 * dependency on the VS Code API and can be unit-tested in isolation.
 *
 * Security properties enforced here:
 *  - Every request requires a valid rotating token (constant-time compare).
 *  - Per-client rate limiting with per-tool limits for expensive tools.
 *  - Request ID on every request/response (echoed + logged).
 *  - Body size limit (413) and strict JSON parsing (400).
 *  - Rejections are logged without token values or secrets.
 */

import * as http from 'http';
import { randomUUID } from 'crypto';
import { validateInput, McpErrorCode } from './security/validator';
import { McpPermission } from './permissions';
import type { TokenManager } from './auth/tokenManager';
import type { ClientIdentityTracker } from './auth/clientIdentity';
import type { RateLimiter } from './security/rateLimiter';
import type { ToolRegistry } from './registry/ToolRegistry';

export const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

/** Services required by non-core endpoints. Optional; defaults are safe no-ops. */
export interface McpServerServices {
  listResources: () => Array<{ uri: string; name: string; description: string; mimeType: string }>;
  readResource: (uri: string) => Promise<{ uri: string; mimeType: string; text: string } | null>;
  listPrompts: () => Array<{ name: string; description: string; arguments?: unknown[] }>;
  getPrompt: (name: string, args: Record<string, any>) => unknown;
  getNotifications: (since?: number, limit?: number) => unknown[];
  getSessionState: () => unknown;
  runHealthCheck: () => Promise<{ overall: string; checks: unknown[] }>;
  getErrorCatalog: () => unknown[];
  getMetricsSummary: () => unknown;
  /** Legacy endpoints (pre-registry bridge versions). */
  handleLegacy: (
    req: http.IncomingMessage,
    url: URL,
    body: unknown,
    requestId: string
  ) => Promise<{ status: number; body: unknown }>;
}

export interface McpServerDeps {
  tokenManager: TokenManager;
  clientTracker: ClientIdentityTracker;
  rateLimiter: RateLimiter;
  registry: ToolRegistry;
  bodyLimitBytes?: number;
  /** Optional metrics hook fired after each tool call (pure — no secrets). */
  onToolCall?: (info: { tool: string; client: string; durationMs: number; success: boolean }) => void;
  services?: Partial<McpServerServices>;
}

/** Error that carries an HTTP status + MCP error code. */
export interface McpHttpError extends Error {
  statusCode: number;
  code?: McpErrorCode;
}

function httpError(statusCode: number, message: string, code?: McpErrorCode): McpHttpError {
  const err = new Error(message) as McpHttpError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Log a rejected/errored request without secrets or token values. */
function logRejection(event: string, requestId: string, path: string, statusCode: number): void {
  console.error(JSON.stringify({ event, requestId, path, statusCode }));
}

/**
 * Read + parse a JSON request body with a size limit.
 * On oversize, keeps draining the socket (to allow a response) but does not
 * buffer the excess. Rejects with an McpHttpError on oversize (413) or
 * malformed JSON (400).
 */
function readBody(req: http.IncomingMessage, limit: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    let oversize = false;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      if (oversize) return; // drain without buffering
      size += chunk.length;
      if (size > limit) {
        oversize = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (oversize) {
        reject(httpError(413, 'Request body too large', McpErrorCode.PAYLOAD_TOO_LARGE));
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(httpError(400, 'Malformed JSON body', McpErrorCode.INVALID_REQUEST));
      }
    });

    req.on('error', (err) => reject(err));
  });
}

export function createMcpRequestHandler(deps: McpServerDeps) {
  const { tokenManager, clientTracker, rateLimiter, registry } = deps;
  const bodyLimitBytes = deps.bodyLimitBytes ?? MAX_BODY_BYTES;

  const services: McpServerServices = {
    listResources: () => [],
    readResource: async () => null,
    listPrompts: () => [],
    getPrompt: () => null,
    getNotifications: () => [],
    getSessionState: () => ({}),
    runHealthCheck: async () => ({ overall: 'healthy', checks: [] }),
    getErrorCatalog: () => [],
    getMetricsSummary: () => ({}),
    handleLegacy: async () => ({ status: 404, body: { error: 'Not Found' } }),
    ...(deps.services || {}),
  };

  return async function mcpRequestHandler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Content-Type', 'application/json');

    // CORS headers (loopback server, permissive by design)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Secret, X-MCP-Client, X-Request-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // ── Token validation (constant-time) ────────────────────────────────────
    const requestSecret = req.headers['x-mcp-secret'] as string | undefined;
    if (!tokenManager.validate(requestSecret || '')) {
      logRejection('mcp_auth_rejected', requestId, req.url || '', 401);
      sendJson(res, 401, {
        error: 'Unauthorized — invalid or missing MCP secret',
        code: McpErrorCode.UNAUTHORIZED,
        requestId,
      });
      return;
    }

    // ── Client identity ─────────────────────────────────────────────────────
    const { clientId, version } = clientTracker.parseFromHeaders(req.headers as Record<string, string | string[] | undefined>);
    clientTracker.recordConnection(clientId, version);

    // ── Rate limiting ───────────────────────────────────────────────────────
    const rateResult = rateLimiter.checkLimit(clientId);
    res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining));
    res.setHeader('X-RateLimit-Limit', String(rateResult.limit));
    if (!rateResult.allowed) {
      const retryAfterMs = rateResult.retryAfterMs || 1000;
      res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
      logRejection('mcp_rate_limited', requestId, req.url || '', 429);
      sendJson(res, 429, {
        error: 'Rate limit exceeded',
        code: McpErrorCode.RATE_LIMITED,
        retryAfterMs,
        requestId,
      });
      return;
    }

    let url: URL;
    try {
      url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    } catch {
      sendJson(res, 400, { error: 'Invalid request URL', code: McpErrorCode.INVALID_REQUEST, requestId });
      return;
    }

    const pathname = url.pathname;

    try {
      // ── Registry-powered tool dispatch ────────────────────────────────────

      if (req.method === 'POST' && pathname === '/mcp/tools/list') {
        sendJson(res, 200, { tools: registry.listTools() });
        return;
      }

      // ── Resources ──────────────────────────────────────────────────────────

      if (req.method === 'POST' && pathname === '/mcp/resources/list') {
        sendJson(res, 200, { resources: services.listResources() });
        return;
      }

      if (req.method === 'POST' && pathname === '/mcp/resources/read') {
        const body = (await readBody(req, bodyLimitBytes)) as { uri?: string };
        const result = await services.readResource(body.uri || '');
        if (!result) {
          sendJson(res, 404, { error: `Resource not found: ${body.uri}`, requestId });
          return;
        }
        sendJson(res, 200, { contents: [result] });
        return;
      }

      // ── Prompts ────────────────────────────────────────────────────────────

      if (req.method === 'POST' && pathname === '/mcp/prompts/list') {
        sendJson(res, 200, { prompts: services.listPrompts() });
        return;
      }

      if (req.method === 'POST' && pathname === '/mcp/prompts/get') {
        const body = (await readBody(req, bodyLimitBytes)) as { name?: string; arguments?: Record<string, unknown> };
        const messages = services.getPrompt(body.name || '', body.arguments || {});
        if (!messages) {
          sendJson(res, 404, { error: `Prompt not found: ${body.name}`, requestId });
          return;
        }
        sendJson(res, 200, { description: body.name, messages });
        return;
      }

      // ── Notifications ───────────────────────────────────────────────────────

      if (req.method === 'POST' && pathname === '/mcp/notifications/recent') {
        const body = (await readBody(req, bodyLimitBytes)) as { since?: number; limit?: number };
        sendJson(res, 200, { notifications: services.getNotifications(body.since, body.limit) });
        return;
      }

      // ── Session ────────────────────────────────────────────────────────────

      if (req.method === 'GET' && pathname === '/mcp/session') {
        sendJson(res, 200, services.getSessionState());
        return;
      }

      // ── Health Check ────────────────────────────────────────────────────────

      if (req.method === 'GET' && pathname === '/mcp/health') {
        const report = await services.runHealthCheck();
        sendJson(res, (report as { overall: string }).overall === 'unhealthy' ? 503 : 200, report);
        return;
      }

      // ── Error Catalog ───────────────────────────────────────────────────────

      if (req.method === 'GET' && pathname === '/mcp/errors') {
        sendJson(res, 200, { errors: services.getErrorCatalog() });
        return;
      }

      // ── Metrics ─────────────────────────────────────────────────────────────

      if (req.method === 'GET' && pathname === '/mcp/metrics') {
        sendJson(res, 200, { metrics: services.getMetricsSummary() });
        return;
      }

      // ── Tool call ───────────────────────────────────────────────────────────

      if (req.method === 'POST' && pathname === '/mcp/tools/call') {
        const start = Date.now();
        const body = (await readBody(req, bodyLimitBytes)) as { name?: string; arguments?: Record<string, unknown> };
        const name = body.name || '';
        const args = body.arguments || {};

        // Per-tool rate limiting for expensive ops
        const toolRateResult = rateLimiter.checkLimit(clientId, name);
        if (!toolRateResult.allowed) {
          deps.onToolCall?.({ tool: name, client: clientId, durationMs: Date.now() - start, success: false });
          sendJson(res, 429, {
            error: `Rate limit exceeded for tool '${name}'`,
            code: McpErrorCode.RATE_LIMITED,
            retryAfterMs: toolRateResult.retryAfterMs,
            requestId,
          });
          return;
        }

        // Input validation against tool schema
        const tool = registry.get(name);
        if (tool) {
          const validation = validateInput(args, tool.inputSchema);
          if (!validation.valid) {
            deps.onToolCall?.({ tool: name, client: clientId, durationMs: Date.now() - start, success: false });
            logRejection('mcp_validation_error', requestId, pathname, 400);
            sendJson(res, 400, {
              error: `Validation error: ${validation.errors.join('; ')}`,
              code: McpErrorCode.VALIDATION_ERROR,
              requestId,
            });
            return;
          }
        }

        const result = await registry.callTool(name, args, {
          clientId,
          grantedPermissions: Object.values(McpPermission),
        });
        deps.onToolCall?.({ tool: name, client: clientId, durationMs: Date.now() - start, success: !result.isError });
        sendJson(res, 200, result);
        return;
      }

      // ── Legacy endpoints (backward compatibility) ───────────────────────
      // These remain so existing bridge versions continue working.

      const body = req.method === 'POST' ? await readBody(req, bodyLimitBytes) : {};
      const legacy = await services.handleLegacy(req, url, body, requestId);
      sendJson(res, legacy.status, legacy.body);
      return;
    } catch (err) {
      if ((err as McpHttpError).statusCode) {
        const httpErr = err as McpHttpError;
        logRejection('mcp_request_error', requestId, pathname, httpErr.statusCode);
        sendJson(res, httpErr.statusCode, {
          error: httpErr.message,
          code: httpErr.code,
          requestId,
        });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error(JSON.stringify({ event: 'mcp_internal_error', requestId, path: pathname, message }));
      sendJson(res, 500, { error: 'Internal error', requestId });
    }
  };
}
