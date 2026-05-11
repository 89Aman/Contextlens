import * as https from 'https';
import * as http from 'http';
import { getAuthManager } from './auth';

const API_BASE = 'https://contextlens-backend-001.web.app/api';
const DASHBOARD_BASE = 'https://contextlens-backend-001.web.app';

function httpRequest(url: string, options: {
  method: string;
  headers: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || undefined,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => {
          resolve({ status: res.statusCode || 500, body: data });
        });
      }
    );

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Authenticated POST request to the backend.
 * Pulls the Bearer token from AuthManager's SecretStorage.
 * On 401, clears the session and prompts re-sign-in.
 */
async function request<T>(path: string, body?: object): Promise<T> {
  const authManager = getAuthManager();
  const token = await authManager.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const jsonBody = body ? JSON.stringify(body) : undefined;
  if (jsonBody) {
    headers['Content-Length'] = Buffer.byteLength(jsonBody).toString();
  }

  const res = await httpRequest(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: jsonBody,
  });

  // Handle expired / invalid token
  if (res.status === 401) {
    await authManager.handleSessionExpired();
    throw new Error('Session expired');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    throw new Error(`Invalid JSON response (status ${res.status})`);
  }

  if (res.status >= 400) {
    throw new Error(parsed?.error?.message || `API error: ${res.status}`);
  }

  return parsed as T;
}

// ── Project ──────────────────────────────────────────────────────────────────

export class ApiClient {
  static async createProject(body: {
    name: string;
    repoUrl?: string;
    localWorkspaceName?: string;
    defaultBranch?: string;
  }): Promise<{ projectId: string }> {
    return request('/projects/create', body);
  }

  // ── Episode ──────────────────────────────────────────────────────────────

  static async createEpisode(body: {
    projectId: string;
    label: string;
    branchName: string;
  }): Promise<{ episodeId: string }> {
    return request('/episodes/create', body);
  }

  static async closeEpisode(body: {
    projectId: string;
    episodeId: string;
  }): Promise<{ closed: boolean }> {
    return request('/episodes/close', body);
  }

  // ── Calls ────────────────────────────────────────────────────────────────

  static async logCall(body: {
    projectId: string;
    episodeId: string;
    promptText: string;
    intentTag?: string;
    source?: 'extension' | 'manual_log';
    modelName?: string;
    modelResponse?: string;
    branchName?: string;
    activeFilePath?: string;
    relatedFiles?: string[];
    diffSnapshot?: string | null;
    diffHash?: string;
    todoMatches?: string[];
  }): Promise<{
    callId: string;
    modelName: string;
    modelResponse: string;
    latencyMs: number;
    saved: boolean;
  }> {
    return request('/calls/log', body);
  }

  // ── Explain Diff ─────────────────────────────────────────────────────────

  static async explainDiff(body: {
    projectId: string;
    episodeId: string;
    diffHash: string;
    changedFiles?: string[];
  }): Promise<{
    summary: string;
    risks: string[];
    checks: string[];
    fromCache?: boolean;
  }> {
    return request('/episodes/explain', body);
  }

  // ── Branch Summary ───────────────────────────────────────────────────────

  static async summarizeBranch(body: {
    projectId: string;
    branchName: string;
    episodes?: Array<{ label?: string; episodeSummary?: string }>;
  }): Promise<{
    pr_summary: string;
    key_changes: string[];
    review_risks: string[];
  }> {
    return request('/branches/summarize', body);
  }

  // ── Dashboard URLs ───────────────────────────────────────────────────────

  static dashboardUrl(projectId: string): string {
    return `${DASHBOARD_BASE}/dashboard/${projectId}`;
  }

  static dashboardEpisodeUrl(projectId: string, episodeId: string): string {
    return `${DASHBOARD_BASE}/dashboard/${projectId}/episodes/${episodeId}`;
  }

  static dashboardBranchUrl(projectId: string, branchName: string): string {
    return `${DASHBOARD_BASE}/dashboard/${projectId}/branch/${encodeURIComponent(branchName)}`;
  }
}
