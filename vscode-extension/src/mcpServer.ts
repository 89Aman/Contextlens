import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { EpisodeStore } from './episodeStore';
import { getAuthManager } from './auth';
import { ApiClient } from './apiClient';
import { GitContext } from './gitContext';
import { Redaction } from './redaction';
import { ToolRegistry } from './mcp/registry/ToolRegistry';
import { TokenManager } from './mcp/auth/tokenManager';
import { ClientIdentityTracker } from './mcp/auth/clientIdentity';
import { RateLimiter } from './mcp/security/rateLimiter';
import { createMcpRequestHandler } from './mcp/serverHandler';
import { listResources, readResource } from './mcp/resources/index';
import { listPrompts, getPrompt } from './mcp/prompts/index';
import { NotificationManager } from './mcp/notifications/notificationManager';
import { SessionManager } from './mcp/session/sessionManager';
import { runHealthCheck } from './mcp/health/healthCheck';
import { getErrorCatalog } from './mcp/errors/mcpErrors';
import { MetricsCollector } from './mcp/observability/metrics';

// Import all tools — side-effect registers them into the registry
import './mcp/tools/index';

let server: http.Server | null = null;
const PORT = 3012;

// Security infrastructure
const tokenManager = new TokenManager();
const clientTracker = new ClientIdentityTracker();
const rateLimiter = new RateLimiter();

export function getMcpSecret(): string {
  return tokenManager.getToken() || '';
}

/**
 * Write current token to secret file for bridge access.
 */
function writeSecretFile(token: string): void {
  try {
    const secretPath = path.join(__dirname, '..', '.mcp-secret.json');
    fs.writeFileSync(secretPath, JSON.stringify({ secret: token }), 'utf8');
  } catch (err: any) {
    console.error('[ContextLens] Failed to save MCP secret file:', err);
  }
}

/**
 * Legacy endpoints (pre-registry bridge versions).
 * Returns { status, body }; the shared handler serializes the response.
 */
async function handleLegacy(
  req: http.IncomingMessage,
  url: URL,
  body: any,
  requestId: string
): Promise<{ status: number; body: any }> {
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/status') {
    const store = EpisodeStore.get();
    const authManager = getAuthManager();
    const isAuthenticated = authManager ? !!(await authManager.getIdToken()) : false;

    return {
      status: 200,
      body: {
        projectId: store.getProjectId(),
        episodeId: store.getActiveEpisode()?.id || null,
        projectName: store.getProjectName(),
        activeEpisodeName: store.getActiveEpisode()?.name || null,
        authenticated: isAuthenticated,
      },
    };
  }

  if (req.method === 'POST' && pathname === '/start-episode') {
    const name = body?.name || `MCP Session ${new Date().toISOString().slice(0, 10)}`;
    await EpisodeStore.get().createEpisode(name);
    return { status: 200, body: { ok: true, episode: EpisodeStore.get().getActiveEpisode() } };
  }

  if (req.method === 'POST' && pathname === '/close-episode') {
    await EpisodeStore.get().closeEpisode();
    return { status: 200, body: { ok: true } };
  }

  if (req.method === 'POST' && pathname === '/log-call') {
    if (!body?.promptText) {
      return { status: 400, body: { error: 'promptText is required', requestId } };
    }

    const gitCtx = await GitContext.getContext();
    const payload = {
      promptText: Redaction.redact(body.promptText),
      modelResponse: Redaction.redact(body.modelResponse || ''),
      source: body.source || 'chat',
      modelName: body.modelName || 'agent',
      intentTag: body.intentTag || 'developer-assistant',
      branchName: gitCtx.branch || 'main',
      activeFilePath: body.activeFilePath || '',
      relatedFiles: body.relatedFiles || [],
      diffSnapshot: gitCtx.diff ? Redaction.redact(gitCtx.diff) : null,
      diffHash: gitCtx.diff ? createHash('md5').update(gitCtx.diff).digest('hex') : null,
    };

    EpisodeStore.get().enqueueCall(payload);
    return { status: 200, body: { ok: true } };
  }

  if (req.method === 'POST' && pathname === '/explain-diff') {
    const store = EpisodeStore.get();
    const episode = store.getActiveEpisode();
    const projectId = store.getProjectId();

    if (!episode || !projectId) {
      return { status: 400, body: { error: 'No active episode or project', requestId } };
    }

    const gitCtx = await GitContext.getContext();
    if (!gitCtx.diff) {
      return { status: 200, body: { summary: 'No changes to explain.' } };
    }

    const diffHash = createHash('md5').update(gitCtx.diff).digest('hex');
    const result = await ApiClient.explainDiff({
      projectId,
      episodeId: episode.id,
      diffHash,
      changedFiles: episode.changedFiles,
    });

    return { status: 200, body: result };
  }

  if (req.method === 'POST' && pathname === '/search') {
    const store = EpisodeStore.get();
    const projectId = store.getProjectId();
    if (!projectId) {
      return { status: 400, body: { error: 'No active project', requestId } };
    }
    const result = await ApiClient.post('/search', { projectId, q: body?.q || '' });
    return { status: 200, body: result };
  }

  if (req.method === 'POST' && pathname === '/get-episode') {
    const store = EpisodeStore.get();
    const projectId = store.getProjectId();
    if (!projectId || !body?.episodeId) {
      return { status: 400, body: { error: 'projectId and episodeId are required', requestId } };
    }
    const result = await ApiClient.post('/episodes/get', { projectId, episodeId: body.episodeId });
    return { status: 200, body: result };
  }

  if (req.method === 'POST' && pathname === '/list-episodes') {
    const store = EpisodeStore.get();
    const projectId = store.getProjectId();
    if (!projectId) {
      return { status: 400, body: { error: 'No active project', requestId } };
    }
    const result = await ApiClient.post('/episodes/list', { projectId, limit: body?.limit });
    return { status: 200, body: result };
  }

  if (req.method === 'POST' && pathname === '/explain-past-changes') {
    const store = EpisodeStore.get();
    const projectId = store.getProjectId();
    if (!projectId || !body?.episodeId) {
      return { status: 400, body: { error: 'projectId and episodeId are required', requestId } };
    }
    const result = await ApiClient.post('/episodes/explain', { projectId, episodeId: body.episodeId });
    return { status: 200, body: result };
  }

  return { status: 404, body: { error: 'Not Found', requestId } };
}

export function startMcpServer() {
  if (server) return;

  // Start rotating token manager
  const initialToken = tokenManager.start();
  writeSecretFile(initialToken);

  // Update secret file on each rotation
  tokenManager.onRotate((newToken) => {
    writeSecretFile(newToken);
  });

  const registry = ToolRegistry.getInstance();

  const handler = createMcpRequestHandler({
    tokenManager,
    clientTracker,
    rateLimiter,
    registry,
    onToolCall: (info) => {
      const metrics = MetricsCollector.getInstance();
      metrics.recordCall(info.tool, info.client, info.durationMs, info.success);
    },
    services: {
      listResources,
      readResource,
      listPrompts,
      getPrompt,
      getNotifications: (since?: number, limit?: number) =>
        NotificationManager.getInstance().getRecent(since, limit),
      getSessionState: () => {
        const store = EpisodeStore.get();
        return SessionManager.getInstance().getState(
          null, // workspace
          store.getProjectId(),
          store.getActiveEpisode()?.id
        );
      },
      runHealthCheck,
      getErrorCatalog,
      getMetricsSummary: () => MetricsCollector.getInstance().getSummary(),
      handleLegacy,
    },
  });

  server = http.createServer((req, res) => {
    handler(req, res);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[ContextLens] MCP helper server running on http://127.0.0.1:${PORT}`);
  });
}

export function stopMcpServer() {
  // Stop token rotation
  tokenManager.stop();

  if (server) {
    server.close();
    server = null;
  }

  // Clean up rate limiter state
  rateLimiter.resetAll();

  try {
    const secretPath = path.join(__dirname, '..', '.mcp-secret.json');
    if (fs.existsSync(secretPath)) {
      fs.unlinkSync(secretPath);
    }
  } catch (err: any) {
    console.error('[ContextLens] Failed to delete MCP secret file:', err);
  }
}
