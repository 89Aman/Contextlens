import * as vscode from 'vscode';
import { ApiClient } from './apiClient';
import { GitContext } from './gitContext';
import { getAuthManager } from './auth';

export interface Episode {
  id: string;
  name: string;
  callCount: number;
  changedFiles: string[];
  note: string;
  branchName: string;
}

export class EpisodeStore {
  private static instance: EpisodeStore;
  private activeEpisode: Episode | null = null;
  private projectId: string | null = null;
  private projectName: string | null = null;
  private onDidChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChange = this.onDidChangeEmitter.event;

  private constructor(private context: vscode.ExtensionContext) {
    this.load();
  }

  static initialize(context: vscode.ExtensionContext) {
    if (!EpisodeStore.instance) {
      EpisodeStore.instance = new EpisodeStore(context);
    }
  }

  static get(): EpisodeStore {
    return EpisodeStore.instance;
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private load() {
    this.activeEpisode = this.context.workspaceState.get<Episode>('contextlens.activeEpisode') ?? null;
    this.projectId = this.context.workspaceState.get<string>('contextlens.projectId') ?? null;
    this.projectName = this.context.workspaceState.get<string>('contextlens.projectName') ?? null;
  }

  private save() {
    this.context.workspaceState.update('contextlens.activeEpisode', this.activeEpisode);
    this.context.workspaceState.update('contextlens.projectId', this.projectId);
    this.context.workspaceState.update('contextlens.projectName', this.projectName);
    this.onDidChangeEmitter.fire();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  public getActiveEpisode(): Episode | null {
    return this.activeEpisode;
  }

  public getProjectId(): string | null {
    return this.projectId;
  }

  public getProjectName(): string | null {
    return this.projectName;
  }

  // ── Project auto-resolve ───────────────────────────────────────────────────

  /**
   * Ensures a project exists for the current workspace.
   * Gates on auth — will trigger sign-in if not authenticated.
   */
  public async ensureProject(): Promise<string | null> {
    if (this.projectId) {
      return this.projectId;
    }

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return null;
    }

    // ── Auth gate ──
    const authManager = getAuthManager();
    const authState = await authManager.loadAuthState();
    if (!authState) {
      // Not signed in yet — don't block activation. User will sign in later.
      return null;
    }

    const folderName = folders[0].name;
    let repoUrl: string | undefined;
    try {
      const gitCtx = await GitContext.getContext();
      if (gitCtx.isGitRepo) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        const { stdout } = await execAsync('git remote get-url origin', {
          cwd: folders[0].uri.fsPath,
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
      this.projectId = res.projectId;
      this.projectName = folderName;
      this.save();
      return this.projectId;
    } catch (err: any) {
      vscode.window.showErrorMessage(`ContextLens: Failed to create project — ${err.message}`);
      return null;
    }
  }

  // ── Episode lifecycle ──────────────────────────────────────────────────────

  /**
   * Create a new episode via the backend, store the result locally.
   * Gates on auth — will trigger sign-in if not authenticated.
   */
  public async createEpisode(name: string): Promise<void> {
    // ── Auth gate ──
    await getAuthManager().ensureSignedIn();

    const projectId = await this.ensureProject();
    if (!projectId) {
      vscode.window.showErrorMessage('ContextLens: No project. Open a workspace first.');
      return;
    }

    const gitCtx = await GitContext.getContext();
    const branchName = gitCtx.branch || 'main';

    try {
      const res = await ApiClient.createEpisode({
        projectId,
        label: name,
        branchName,
      });

      this.activeEpisode = {
        id: res.episodeId,
        name,
        callCount: 0,
        changedFiles: [],
        note: '',
        branchName,
      };
      this.save();
    } catch (err: any) {
      vscode.window.showErrorMessage(`ContextLens: Failed to create episode — ${err.message}`);
    }
  }

  /**
   * Close the active episode via the backend.
   */
  public async closeEpisode(): Promise<void> {
    if (!this.activeEpisode || !this.projectId) {
      this.activeEpisode = null;
      this.save();
      return;
    }

    try {
      await ApiClient.closeEpisode({
        projectId: this.projectId,
        episodeId: this.activeEpisode.id,
      });
    } catch (err: any) {
      vscode.window.showWarningMessage(`ContextLens: Could not close episode on server — ${err.message}`);
    }

    this.activeEpisode = null;
    this.save();
  }

  public incrementCallCount() {
    if (this.activeEpisode) {
      this.activeEpisode.callCount += 1;
      this.save();
    }
  }

  public addChangedFile(filePath: string) {
    if (this.activeEpisode && !this.activeEpisode.changedFiles.includes(filePath)) {
      this.activeEpisode.changedFiles.push(filePath);
      this.save();
    }
  }

  public updateNote(note: string) {
    if (this.activeEpisode) {
      this.activeEpisode.note = note;
      this.save();
    }
  }
}
