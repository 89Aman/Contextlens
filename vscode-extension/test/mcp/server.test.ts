/**
 * Integration tests for the local MCP HTTP server security boundary.
 *
 * Spins up the pure request handler (serverHandler) on an ephemeral port and
 * exercises: token auth (missing/invalid/expired/rotated), rate limiting
 * (global + expensive-tool exhaustion), body limits, malformed JSON,
 * invalid tool arguments, request IDs, and a valid request.
 */

import * as http from 'http';
import { AddressInfo } from 'net';
import { TokenManager } from '../../src/mcp/auth/tokenManager';
import { ClientIdentityTracker } from '../../src/mcp/auth/clientIdentity';
import { RateLimiter } from '../../src/mcp/security/rateLimiter';
import { ToolRegistry, McpToolDefinition, ToolContext } from '../../src/mcp/registry/ToolRegistry';
import { McpPermission } from '../../src/mcp/permissions';
import { createMcpRequestHandler } from '../../src/mcp/serverHandler';

interface TestServer {
  port: number;
  close: () => Promise<void>;
}

async function startServer(
  tokenManager: TokenManager,
  rateLimiter: RateLimiter,
  overrides?: { bodyLimitBytes?: number }
): Promise<TestServer> {
  const handler = createMcpRequestHandler({
    tokenManager,
    clientTracker: new ClientIdentityTracker(),
    rateLimiter,
    registry: ToolRegistry.getInstance(),
    ...(overrides?.bodyLimitBytes ? { bodyLimitBytes: overrides.bodyLimitBytes } : {}),
  });

  const server = http.createServer((req, res) => { handler(req, res); });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  return {
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function request(
  port: number,
  path: string,
  options: { method?: string; token?: string; client?: string; headers?: Record<string, string>; rawBody?: string | Buffer } = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const body = options.rawBody ?? '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.token ? { 'X-MCP-Secret': options.token } : {}),
      ...(options.client ? { 'X-MCP-Client': options.client } : {}),
      ...(options.headers || {}),
      'Content-Length': String(Buffer.byteLength(body)),
    };

    const req = http.request(
      { hostname: '127.0.0.1', port, path, method: options.method || 'POST', headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed: any = text;
          try { parsed = JSON.parse(text); } catch { /* keep raw */ }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('MCP Server — token authentication', () => {
  it('rejects a request with no token (401)', async () => {
    const tm = new TokenManager(60_000);
    tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/tools/list');
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
      if (res.body.code !== -32001) throw new Error(`Expected UNAUTHORIZED code, got ${res.body.code}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('rejects a request with an invalid token (401)', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/tools/list', { token: 'wrong-token' });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('rejects a rotated-out token once past the grace period (401)', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    tm.regenerate(); // old token becomes previous; grace = 60s

    const srv = await startServer(tm, new RateLimiter());
    try {
      // Within grace period the previous token is still accepted
      const withinGrace = await request(srv.port, '/mcp/tools/list', { token });
      if (withinGrace.status !== 200) throw new Error(`Expected 200 within grace, got ${withinGrace.status}`);

      // Advance time past the grace period (expiresAt + 60s grace), then the old token is rejected
      const realNow = Date.now;
      let now = realNow() + 121_000;
      Date.now = () => now;

      const expired = await request(srv.port, '/mcp/tools/list', { token });
      if (expired.status !== 401) throw new Error(`Expected 401 after grace, got ${expired.status}`);

      Date.now = realNow;
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('accepts a valid token and echoes the request ID (200)', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/tools/list', { token, headers: { 'X-Request-Id': 'req-123' } });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (res.headers['x-request-id'] !== 'req-123') throw new Error('Request ID was not echoed');
      if (!Array.isArray(res.body.tools)) throw new Error('Expected tools array');
    } finally {
      tm.stop();
      await srv.close();
    }
  });
});

describe('MCP Server — rate limiting', () => {
  it('exhausts the global limit and returns 429', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000, burstLimit: 0 });
    const srv = await startServer(tm, limiter);
    try {
      const first = await request(srv.port, '/mcp/tools/list', { token, client: 'test-client' });
      if (first.status !== 200) throw new Error(`Expected 200 first, got ${first.status}`);
      const second = await request(srv.port, '/mcp/tools/list', { token, client: 'test-client' });
      if (second.status !== 429) throw new Error(`Expected 429, got ${second.status}`);
      if (!second.headers['retry-after']) throw new Error('Expected Retry-After header');
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('exhausts the expensive-tool limit and returns 429', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const limiter = new RateLimiter(undefined, { maxRequests: 1, windowMs: 60_000, burstLimit: 0 });
    const srv = await startServer(tm, limiter);
    try {
      const first = await request(srv.port, '/mcp/tools/call', {
        token,
        client: 'test-client',
        rawBody: JSON.stringify({ name: 'explain_diff', arguments: {} }),
      });
      if (first.status === 401) throw new Error('Unexpected auth failure');

      const second = await request(srv.port, '/mcp/tools/call', {
        token,
        client: 'test-client',
        rawBody: JSON.stringify({ name: 'explain_diff', arguments: {} }),
      });
      if (second.status !== 429) throw new Error(`Expected 429 on expensive tool, got ${second.status}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });
});

describe('MCP Server — input handling', () => {
  it('rejects an oversized request body (413)', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter(), { bodyLimitBytes: 100 });
    try {
      const big = JSON.stringify({ name: 'x', arguments: { payload: 'a'.repeat(1000) } });
      const res = await request(srv.port, '/mcp/tools/call', { token, rawBody: big });
      if (res.status !== 413) throw new Error(`Expected 413, got ${res.status}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('rejects malformed JSON (400)', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/tools/call', { token, rawBody: 'this is not json' });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('rejects invalid tool arguments (400)', async () => {
    const registry = ToolRegistry.getInstance();
    const testTool: McpToolDefinition = {
      name: '__test_validate',
      description: 'test tool',
      version: '1.0.0',
      category: 'system',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      permissions: [McpPermission.READ],
      handler: async (): Promise<string> => 'ok',
    };
    registry.register(testTool);

    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/tools/call', {
        token,
        rawBody: JSON.stringify({ name: '__test_validate', arguments: {} }),
      });
      if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
      if (res.body.code !== -32005) throw new Error(`Expected VALIDATION_ERROR, got ${res.body.code}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('returns an isError result for an unknown tool (200)', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/tools/call', {
        token,
        rawBody: JSON.stringify({ name: 'does_not_exist', arguments: {} }),
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (res.body.isError !== true) throw new Error('Expected isError for unknown tool');
    } finally {
      tm.stop();
      await srv.close();
    }
  });

  it('returns 404 for an unknown endpoint', async () => {
    const tm = new TokenManager(60_000);
    const token = tm.start();
    const srv = await startServer(tm, new RateLimiter());
    try {
      const res = await request(srv.port, '/mcp/nope', { token });
      if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
    } finally {
      tm.stop();
      await srv.close();
    }
  });
});
