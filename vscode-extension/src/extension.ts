import * as vscode from 'vscode';
import { Auth } from './auth';
import { EpisodeStore } from './episodeStore';
import { StateTreeProvider } from './stateTreeProvider';
import { ChatViewProvider } from './chatViewProvider';
import { ApiClient } from './apiClient';
import { GitContext } from './gitContext';
import { Telemetry } from './telemetry';

export function activate(context: vscode.ExtensionContext) {
  Telemetry.log('Extension activated');

  Auth.initialize(context);
  EpisodeStore.initialize(context);

  const stateTreeProvider = new StateTreeProvider();
  vscode.window.registerTreeDataProvider('contextlens.stateTree', stateTreeProvider);

  const chatViewProvider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatViewProvider)
  );

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'contextlens.openDashboard';
  context.subscriptions.push(statusBarItem);

  const updateStatusBar = () => {
    const ep = EpisodeStore.get().getActiveEpisode();
    if (ep) {
      statusBarItem.text = `$(repo) ContextLens: ${ep.name} · ${ep.callCount} calls`;
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  EpisodeStore.get().onDidChange(() => {
    updateStatusBar();
  });
  updateStatusBar();

  context.subscriptions.push(vscode.commands.registerCommand('contextlens.newEpisode', async () => {
    const name = await vscode.window.showInputBox({ prompt: 'Enter episode name' });
    if (name) {
      EpisodeStore.get().createEpisode(name);
      vscode.window.showInformationMessage(`Started episode: ${name}`);
      Telemetry.log('New Episode Created', { name });
    }
  }));

  context.subscriptions.push(vscode.commands.registerCommand('contextlens.closeEpisode', () => {
    EpisodeStore.get().closeEpisode();
    vscode.window.showInformationMessage('Episode closed');
    Telemetry.log('Episode Closed');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('contextlens.explainDiff', async () => {
    const gitCtx = await GitContext.getContext();
    if (!gitCtx.diff) {
      vscode.window.showErrorMessage('No diff available to explain');
      return;
    }
    const res = await ApiClient.explainDiff(gitCtx.diff);
    vscode.window.showInformationMessage(res.response);
    Telemetry.log('Explain Diff executed');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('contextlens.summarizeBranch', async () => {
    const gitCtx = await GitContext.getContext();
    if (!gitCtx.branch) {
      vscode.window.showErrorMessage('No branch detected');
      return;
    }
    const res = await ApiClient.summarizeBranch(gitCtx.branch);
    vscode.window.showInformationMessage(res.response);
    Telemetry.log('Summarize Branch executed');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('contextlens.openDashboard', () => {
    vscode.env.openExternal(vscode.Uri.parse('https://contextlens.example.com'));
    Telemetry.log('Dashboard Opened');
  }));
}

export function deactivate() {}
