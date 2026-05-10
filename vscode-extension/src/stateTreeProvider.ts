import * as vscode from 'vscode';
import { EpisodeStore } from './episodeStore';
import { GitContext } from './gitContext';

export class StateTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor() {
    EpisodeStore.get().onDidChange(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) {
      return [];
    }

    const items: vscode.TreeItem[] = [];
    const episode = EpisodeStore.get().getActiveEpisode();

    if (!episode) {
      const noEpisode = new vscode.TreeItem('No Active Episode', vscode.TreeItemCollapsibleState.None);
      noEpisode.description = 'Create one to start tracking';
      items.push(noEpisode);
      return items;
    }

    items.push(new vscode.TreeItem(`Episode: ${episode.name}`, vscode.TreeItemCollapsibleState.None));
    
    const gitCtx = await GitContext.getContext();
    items.push(new vscode.TreeItem(`Branch: ${gitCtx.branch || 'None'}`, vscode.TreeItemCollapsibleState.None));
    
    items.push(new vscode.TreeItem(`AI Calls: ${episode.callCount}`, vscode.TreeItemCollapsibleState.None));
    
    items.push(new vscode.TreeItem(`AI Owned Files: ${episode.aiOwnedFiles.length}`, vscode.TreeItemCollapsibleState.None));
    items.push(new vscode.TreeItem(`User Owned Files: ${episode.userOwnedFiles.length}`, vscode.TreeItemCollapsibleState.None));
    items.push(new vscode.TreeItem(`Note: ${episode.note || 'None'}`, vscode.TreeItemCollapsibleState.None));

    return items;
  }
}
