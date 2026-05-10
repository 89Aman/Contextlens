import * as vscode from 'vscode';

export interface Episode {
  id: string;
  name: string;
  callCount: number;
  aiOwnedFiles: string[];
  userOwnedFiles: string[];
  note: string;
}

export class EpisodeStore {
  private static instance: EpisodeStore;
  private activeEpisode: Episode | null = null;
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

  private load() {
    const data = this.context.workspaceState.get<Episode>('contextlens.activeEpisode');
    if (data) {
      this.activeEpisode = data;
    }
  }

  private save() {
    this.context.workspaceState.update('contextlens.activeEpisode', this.activeEpisode);
    this.onDidChangeEmitter.fire();
  }

  public getActiveEpisode(): Episode | null {
    return this.activeEpisode;
  }

  public createEpisode(name: string) {
    this.activeEpisode = {
      id: Date.now().toString(),
      name,
      callCount: 0,
      aiOwnedFiles: [],
      userOwnedFiles: [],
      note: ''
    };
    this.save();
  }

  public closeEpisode() {
    this.activeEpisode = null;
    this.save();
  }

  public incrementCallCount() {
    if (this.activeEpisode) {
      this.activeEpisode.callCount += 1;
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
