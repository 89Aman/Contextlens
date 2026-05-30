import * as http from 'http';
import { EpisodeStore } from './episodeStore';
import { getAuthManager } from './auth';
import { ApiClient } from './apiClient';
import { GitContext } from './gitContext';
import { createHash } from 'crypto';

let server: http.Server | null = null;
const PORT = 3012;

export function startMcpServer() {
  if (server) return;

  server = http.createServer(async (req, res) => {
    // Enable JSON responses
    res.setHeader('Content-Type', 'application/json');

    // CORS headers for safety
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);

    try {
      if (req.method === 'GET' && url.pathname === '/status') {
        const store = EpisodeStore.get();
        const authManager = getAuthManager();
        const token = authManager ? await authManager.getIdToken() : null;

        res.writeHead(200);
        res.end(JSON.stringify({
          projectId: store.getProjectId(),
          episodeId: store.getActiveEpisode()?.id || null,
          projectName: store.getProjectName(),
          activeEpisodeName: store.getActiveEpisode()?.name || null,
          token: token
        }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/start-episode') {
        const body = await getBody(req);
        const name = body.name || `MCP Session ${new Date().toISOString().slice(0, 10)}`;
        await EpisodeStore.get().createEpisode(name);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, episode: EpisodeStore.get().getActiveEpisode() }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/close-episode') {
        await EpisodeStore.get().closeEpisode();
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/log-call') {
        const body = await getBody(req);
        if (!body.promptText) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'promptText is required' }));
          return;
        }

        const gitCtx = await GitContext.getContext();
        const payload = {
          promptText: body.promptText,
          modelResponse: body.modelResponse || '',
          source: body.source || 'chat',
          modelName: body.modelName || 'agent',
          intentTag: body.intentTag || 'developer-assistant',
          branchName: gitCtx.branch || 'main',
          activeFilePath: body.activeFilePath || '',
          relatedFiles: body.relatedFiles || [],
          diffSnapshot: gitCtx.diff || null,
          diffHash: gitCtx.diff ? createHash('md5').update(gitCtx.diff).digest('hex') : null
        };

        EpisodeStore.get().enqueueCall(payload);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/explain-diff') {
        const store = EpisodeStore.get();
        const episode = store.getActiveEpisode();
        const projectId = store.getProjectId();

        if (!episode || !projectId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'No active episode or project' }));
          return;
        }

        const gitCtx = await GitContext.getContext();
        if (!gitCtx.diff) {
          res.writeHead(200);
          res.end(JSON.stringify({ summary: 'No changes to explain.' }));
          return;
        }

        const diffHash = createHash('md5').update(gitCtx.diff).digest('hex');
        const result = await ApiClient.explainDiff({
          projectId,
          episodeId: episode.id,
          diffHash,
          changedFiles: episode.changedFiles
        });

        res.writeHead(200);
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (err: any) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[ContextLens] MCP helper server running on http://127.0.0.1:${PORT}`);
  });
}

export function stopMcpServer() {
  if (server) {
    server.close();
    server = null;
  }
}

function getBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}
