import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient } from './apiClient';
import { GitContext } from './gitContext';
import { getAuthManager } from './auth';
import { SyncEngine } from './syncEngine';
import { GraphStore } from './graph/graphStore';
import { randomUUID } from 'crypto';

/**
 * Represents a single development episode or task tracked by ContextLens.
 */
export interface Episode {
  /** Unique identifier for the episode (can be a temporary ID before sync). */
  id: string;
  /** Human-readable label for the task. */
  name: string;
  /** Number of AI calls logged during this episode. */
  callCount: number;
  /** List of file paths modified during this episode. */
  changedFiles: string[];
  /** Optional notes or metadata associated with the episode. */
  note: string;
  /** The branch this episode is associated with. */
  branchName: string;
  /** Timestamp (ms) when this episode was created. */
  startedAt: number;
  /** Timestamp (ms) of the last recorded activity (save, commit, call). */
  lastActivityAt: number;
}

/**
 * Manages the state of "episodes" (development tasks) within the VS Code workspace.
 * Handles persistence, project auto-resolution, and interaction with the SyncEngine.
 * Implements a Singleton pattern.
 */
export class EpisodeStore {
  private static instance: EpisodeStore;
  private activeEpisodes: Record<string, Episode> = {};
  private projectIds: Record<string, string> = {};
  private projectNames: Record<string, string> = {};
  private syncEngine: SyncEngine | null = null;
  private onDidChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  private constructor(private context: vscode.ExtensionContext) {
    this.load();
    this.syncEngine = new SyncEngine({
      context,
      apiClient: ApiClient
    });

    // Fix 12: Resume sync queue after successful re-authentication
    try {
      const authManager = getAuthManager();
      authManager.onDidSignIn(() => {
        this.syncEngine?.resumeAfterAuth();
      });
    } catch { /* AuthManager not yet initialized — will be wired later */ }
  }

  /**
   * Initializes the singleton instance of EpisodeStore.
   * @param context The VS Code extension context for storage and disposal.
   */
  static initialize(context: vscode.ExtensionContext) {
    if (!EpisodeStore.instance) {
      EpisodeStore.instance = new EpisodeStore(context);
    }
  }

  /**
   * Returns the singleton instance of EpisodeStore.
   */
  static get(): EpisodeStore {
    return EpisodeStore.instance;
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  /**
   * Loads state from the VS Code workspaceState.
   */
  private load() {
    this.activeEpisodes = this.context.workspaceState.get<Record<string, Episode>>('contextlens.activeEpisodes') ?? {};
    this.projectIds = this.context.workspaceState.get<Record<string, string>>('contextlens.projectIds') ?? {};
    this.projectNames = this.context.workspaceState.get<Record<string, string>>('contextlens.projectNames') ?? {};

    // For backwards compatibility:
    const legacyEpisode = this.context.workspaceState.get<Episode>('contextlens.activeEpisode');
    const legacyProjId = this.context.workspaceState.get<string>('contextlens.projectId');
    const legacyProjName = this.context.workspaceState.get<string>('contextlens.projectName');
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const root = folders[0].uri.fsPath;
      if (legacyEpisode && !this.activeEpisodes[root]) this.activeEpisodes[root] = legacyEpisode;
      if (legacyProjId && !this.projectIds[root]) this.projectIds[root] = legacyProjId;
      if (legacyProjName && !this.projectNames[root]) this.projectNames[root] = legacyProjName;
    }
  }

  private isLocalMode(): boolean {
    return vscode.workspace.getConfiguration('contextlens').get<boolean>('localOnly', true);
  }

  private saveToLocalJson(root: string): void {
    try {
      const dir = path.join(root, '.contextlens');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = path.join(dir, 'episodes.json');
      let data: any = { activeEpisode: null, history: [] };
      if (fs.existsSync(filePath)) {
        try {
          data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {}
      }
      data.activeEpisode = this.activeEpisodes[root] || null;
      data.updatedAt = Date.now();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[ContextLens] Failed to save local episodes.json:', err);
    }
  }

  private appendEpisodeHistory(root: string, ep: Episode): void {
    try {
      const dir = path.join(root, '.contextlens');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const filePath = path.join(dir, 'episodes.json');
      let data: any = { activeEpisode: null, history: [] };
      if (fs.existsSync(filePath)) {
        try {
          data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {}
      }
      if (!Array.isArray(data.history)) data.history = [];
      data.history.push({ ...ep, closedAt: Date.now(), status: 'closed' });
      data.activeEpisode = null;
      data.updatedAt = Date.now();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('[ContextLens] Failed to append episode history:', err);
    }
  }

  private save() {
    this.context.workspaceState.update('contextlens.activeEpisodes', this.activeEpisodes);
    this.context.workspaceState.update('contextlens.projectIds', this.projectIds);
    this.context.workspaceState.update('contextlens.projectNames', this.projectNames);

    const root = this.getActiveWorkspaceRoot();
    if (root) {
      this.saveToLocalJson(root);
    }
    this.onDidChangeEmitter.fire();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  /**
   * Helper to get active workspace root folder path based on active editor or first folder.
   */
  public getActiveWorkspaceRoot(): string | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (folder) return folder.uri.fsPath;
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  }

  /**
   * Returns the currently active development episode, or null if none.
   */
  public getActiveEpisode(workspaceRoot?: string): Episode | null {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    return root ? (this.activeEpisodes[root] || null) : null;
  }

  /**
   * Returns the resolved project ID for the current workspace.
   */
  public getProjectId(workspaceRoot?: string): string | null {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    return root ? (this.projectIds[root] || null) : null;
  }

  /**
   * Returns the display name of the current project.
   */
  public getProjectName(workspaceRoot?: string): string | null {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    return root ? (this.projectNames[root] || null) : null;
  }

  /**
   * Returns the current synchronization status from the SyncEngine.
   */
  public getSyncStatus() {
    return this.syncEngine?.getStatus() ?? { pending: 0, isOnline: false };
  }

  /**
   * Returns operational sync metrics (no user content).
   */
  public getSyncMetrics() {
    return this.syncEngine?.getMetrics() ?? null;
  }

  /**
   * Manually triggers a flush of all pending operations in the SyncEngine.
   */
  public async forceSync(): Promise<void> {
    await this.syncEngine?.forceFlush();
  }

  /**
   * Returns a human-readable string of how long the active episode has been running.
   * E.g. "2h 15m", "45m", "3d 1h".
   */
  public getElapsedTime(workspaceRoot?: string): string | null {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return null;
    const ep = this.activeEpisodes[root];
    if (!ep?.startedAt) return null;
    const ms = Date.now() - ep.startedAt;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  /**
   * Checks if the active episode is stale (open >24h with no recent activity).
   * "No recent activity" means no file saves, commits, or AI calls in the last 24h.
   */
  public isStale(workspaceRoot?: string): boolean {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return false;
    const ep = this.activeEpisodes[root];
    if (!ep?.lastActivityAt) return false;
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    return (Date.now() - ep.lastActivityAt) > STALE_THRESHOLD_MS;
  }

  // ── Project auto-resolve ───────────────────────────────────────────────────

  /**
   * Ensures a project exists for the current workspace by checking git remotes.
   * If no project is found, it attempts to create one on the backend.
   * Gates on authentication.
   * @returns The project ID if resolved/created, otherwise null.
   */
  public async ensureProject(workspaceRoot?: string): Promise<string | null> {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return null;

    if (this.projectIds[root]) {
      return this.projectIds[root];
    }

    const folder = vscode.workspace.workspaceFolders?.find(f => f.uri.fsPath === root);
    if (!folder) return null;
    const folderName = folder.name;

    if (this.isLocalMode()) {
      const localId = `local_${folderName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      this.projectIds[root] = localId;
      this.projectNames[root] = folderName;
      this.save();
      return localId;
    }

    // ── Auth gate (cloud mode only) ──
    const authManager = getAuthManager();
    const authState = await authManager.loadAuthState();
    if (!authState) {
      // Not signed in yet — fallback to local ID instead of failing
      const localId = `local_${folderName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      this.projectIds[root] = localId;
      this.projectNames[root] = folderName;
      this.save();
      return localId;
    }

    let repoUrl: string | undefined;
    try {
      const gitCtx = await GitContext.getContext(root);
      if (gitCtx.isGitRepo) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync('git remote get-url origin', {
          cwd: root,
        });
        repoUrl = stdout.trim();
      }
    } catch {
      // no remote — that's fine
    }

    try {
      const res = await ApiClient.createProject({
        name: folderName,
        repoUrl,
        localWorkspaceName: folderName,
      });
      this.projectIds[root] = res.projectId;
      this.projectNames[root] = folderName;
      this.save();
      return res.projectId;
    } catch (err: any) {
      console.warn(`ContextLens: Backend createProject failed, using local: ${err.message}`);
      const localId = `local_${folderName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      this.projectIds[root] = localId;
      this.projectNames[root] = folderName;
      this.save();
      return localId;
    }
  }

  // ── Episode lifecycle ──────────────────────────────────────────────────────

  /**
   * Creates a new episode on the backend and sets it as the active one.
   * This is a blocking call typically triggered by a user action.
   * @param name The descriptive label for the episode.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public async createEpisode(name: string, workspaceRoot?: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      vscode.window.showErrorMessage('ContextLens: Episode name cannot be empty.');
      return;
    }

    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;

    let branchName = 'main';
    try {
      const gitCtx = await GitContext.getContext(root);
      if (gitCtx.branch) branchName = gitCtx.branch;
    } catch {}

    const now = Date.now();

    if (this.isLocalMode()) {
      await this.ensureProject(root);
      const localEpisodeId = `ep_${now}_${Math.random().toString(36).slice(2, 7)}`;
      this.activeEpisodes[root] = {
        id: localEpisodeId,
        name: trimmedName,
        callCount: 0,
        changedFiles: [],
        note: '',
        branchName,
        startedAt: now,
        lastActivityAt: now,
      };

      const graphStore = GraphStore.get(root);
      graphStore.addNode({
        id: localEpisodeId,
        label: trimmedName,
        type: 'episode',
        timestamp: now,
        metadata: { branchName }
      });
      graphStore.save();

      this.save();
      return;
    }

    // ── Cloud path (fallback if localOnly is explicitly set to false) ──
    let projectId = await this.ensureProject(root);
    if (!projectId) {
      vscode.window.showErrorMessage('ContextLens: No project. Open a workspace first.');
      return;
    }

    try {
      const res = await ApiClient.createEpisode({
        projectId,
        label: trimmedName,
        branchName,
      });

      this.activeEpisodes[root] = {
        id: res.episodeId,
        name: trimmedName,
        callCount: 0,
        changedFiles: [],
        note: '',
        branchName,
        startedAt: now,
        lastActivityAt: now,
      };
      this.save();
    } catch (err: any) {
      // Local fallback on cloud failure
      console.warn('[ContextLens] Cloud createEpisode failed, using local:', err);
      const localEpisodeId = `ep_${now}_${Math.random().toString(36).slice(2, 7)}`;
      this.activeEpisodes[root] = {
        id: localEpisodeId,
        name: trimmedName,
        callCount: 0,
        changedFiles: [],
        note: '',
        branchName,
        startedAt: now,
        lastActivityAt: now,
      };
      this.save();
    }
  }

  /**
   * Closes the currently active episode.
   * Sends a blocking request to the backend.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public async closeEpisode(workspaceRoot?: string): Promise<void> {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;
    const ep = this.activeEpisodes[root];
    const projId = this.projectIds[root];

    if (!ep) {
      delete this.activeEpisodes[root];
      this.save();
      return;
    }

    this.appendEpisodeHistory(root, ep);

    try {
      GraphStore.get(root).compactEpisodeSymbols(ep.id);
    } catch (err) {
      console.warn('[ContextLens] Symbol compaction failed:', err);
    }

    if (!this.isLocalMode() && projId) {
      try {
        await ApiClient.closeEpisode({
          projectId: projId,
          episodeId: ep.id,
        });
      } catch (err: any) {
        console.warn('[ContextLens] Cloud close episode failed:', err.message);
      }
    }

    delete this.activeEpisodes[root];
    this.save();
  }

  /**
   * Closes the active episode asynchronously via the SyncEngine.
   * Useful for automatic triggers where blocking is undesirable.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public async closeEpisodeSilent(workspaceRoot?: string): Promise<void> {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;
    const ep = this.activeEpisodes[root];
    const projId = this.projectIds[root];

    if (!ep) {
      delete this.activeEpisodes[root];
      this.save();
      return;
    }

    // ENH-003: Capture context snapshot before closing
    this.captureContextSnapshot(ep.branchName);
    this.appendEpisodeHistory(root, ep);

    try {
      GraphStore.get(root).compactEpisodeSymbols(ep.id);
    } catch (err) {
      console.warn('[ContextLens] Symbol compaction failed:', err);
    }

    if (!this.isLocalMode() && projId) {
      this.syncEngine?.enqueue({
        type: 'episode_close',
        endpoint: '/episodes/close',
        projectId: projId,
        episodeId: ep.id,
        payload: {
          projectId: projId,
          episodeId: ep.id,
        }
      });
    }

    delete this.activeEpisodes[root];
    this.save();
  }

  /**
   * Auto-creates an episode asynchronously via the SyncEngine.
   * Assigns a temporary ID locally which is reconciled on the backend.
   * @param name The label for the episode.
   * @param branchName The branch name to associate.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public async autoCreateEpisode(name: string, branchName: string, workspaceRoot?: string): Promise<void> {
    const trimmedName = name.trim();
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root || !trimmedName) return;

    const projId = await this.ensureProject(root);
    if (!projId) return;

    const localEpisodeId = randomUUID();
    const now = Date.now();

    if (!this.isLocalMode()) {
      this.syncEngine?.enqueue({
        type: 'episode_create',
        endpoint: '/episodes/create',
        projectId: projId,
        episodeId: localEpisodeId,
        payload: {
          projectId: projId,
          episodeId: localEpisodeId,
          label: trimmedName,
          branchName: branchName || 'main',
        }
      });
    }

    this.activeEpisodes[root] = {
      id: localEpisodeId,
      name: trimmedName,
      callCount: 0,
      changedFiles: [],
      note: '',
      branchName: branchName || 'main',
      startedAt: now,
      lastActivityAt: now,
    };

    const graphStore = GraphStore.get(root);
    graphStore.addNode({
      id: localEpisodeId,
      label: trimmedName,
      type: 'episode',
      timestamp: now,
      metadata: { branchName: branchName || 'main' }
    });
    graphStore.save();

    this.save();
    this.restoreContextSnapshot(branchName || 'main');
  }

  /**
   * Enqueues an AI call log or git action to the SyncEngine.
   * Automatically injects project and episode context.
   * @param payload The data to be logged.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public enqueueCall(payload: any, workspaceRoot?: string): void {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;
    const ep = this.activeEpisodes[root];
    const projId = this.projectIds[root];
    if (!ep || !projId) return;

    this.syncEngine?.enqueue({
      type: 'call',
      endpoint: '/calls/log',
      projectId: projId,
      episodeId: ep.id,
      payload: {
        ...payload,
        projectId: projId,
        episodeId: ep.id,
      }
    });

    this.incrementCallCount(root);
  }

  /**
   * Increments the call counter for the active episode and persists the state.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public incrementCallCount(workspaceRoot?: string) {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;
    const ep = this.activeEpisodes[root];
    if (ep) {
      ep.callCount += 1;
      ep.lastActivityAt = Date.now();
      this.save();
    }
  }

  /**
   * Adds a file path to the list of changed files for the current episode.
   * Prevents duplicates and triggers persistence.
   * @param filePath Workspace-relative or absolute path.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public addChangedFile(filePath: string, workspaceRoot?: string) {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;
    const ep = this.activeEpisodes[root];
    if (ep && !ep.changedFiles.includes(filePath)) {
      ep.changedFiles.push(filePath);
      ep.lastActivityAt = Date.now();

      const relativePath = path.isAbsolute(filePath) ? path.relative(root, filePath) : filePath;
      const graphStore = GraphStore.get(root);
      const fileNodeId = `file:${relativePath}`;
      graphStore.addNode({
        id: fileNodeId,
        label: relativePath,
        type: 'file',
        sourceEpisode: ep.id,
        timestamp: Date.now()
      });
      graphStore.addEdge({
        source: ep.id,
        target: fileNodeId,
        relation: 'modifies',
        confidence: 'EXTRACTED',
        confidenceScore: 1.0,
        sourceEpisode: ep.id
      });
      graphStore.save();

      this.save();
    }
  }

  /**
   * Updates the note or metadata for the active episode.
   * @param note The new note string.
   * @param workspaceRoot Optional workspace root folder path.
   */
  public updateNote(note: string, workspaceRoot?: string) {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (!root) return;
    const ep = this.activeEpisodes[root];
    if (ep) {
      ep.note = note.trim();
      this.save();
    }
  }

  /**
   * Clears the cached project ID and name for the workspace, allowing re-resolution.
   */
  public clearProjectCache(workspaceRoot?: string): void {
    const root = workspaceRoot || this.getActiveWorkspaceRoot();
    if (root) {
      delete this.projectIds[root];
      delete this.projectNames[root];
      delete this.activeEpisodes[root];
      this.save();
    }
  }

  // ── ENH-003: Context Snapshot ────────────────────────────────────────────

  /**
   * Captures current editor state: open file paths and cursor positions.
   * Stored in workspaceState keyed by branch name.
   */
  private captureContextSnapshot(branchName: string): void {
    try {
      const editors = vscode.window.visibleTextEditors;
      const snapshot = editors.map(editor => ({
        filePath: editor.document.uri.fsPath,
        cursorLine: editor.selection.active.line,
        cursorChar: editor.selection.active.character,
      }));

      const snapshots = this.context.workspaceState.get<Record<string, any[]>>('contextlens.snapshots') || {};
      snapshots[branchName] = snapshot;
      this.context.workspaceState.update('contextlens.snapshots', snapshots);
    } catch { /* non-critical */ }
  }

  /**
   * Restores editor state from a previously captured snapshot for the given branch.
   * Opens files and sets cursor positions.
   */
  private async restoreContextSnapshot(branchName: string): Promise<void> {
    try {
      const snapshots = this.context.workspaceState.get<Record<string, any[]>>('contextlens.snapshots') || {};
      const snapshot = snapshots[branchName];
      if (!snapshot || snapshot.length === 0) return;

      for (const entry of snapshot) {
        try {
          const uri = vscode.Uri.file(entry.filePath);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
          const pos = new vscode.Position(entry.cursorLine || 0, entry.cursorChar || 0);
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        } catch { /* file may no longer exist */ }
      }

      // Clear snapshot after restore (one-time use)
      delete snapshots[branchName];
      this.context.workspaceState.update('contextlens.snapshots', snapshots);
    } catch { /* non-critical */ }
  }
}
