import * as vscode from 'vscode';
import { ApiClient } from './apiClient';
import { GitContext } from './gitContext';
import { EpisodeStore } from './episodeStore';

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'contextlens.chatView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview();

    webviewView.webview.onDidReceiveMessage(async data => {
      switch (data.type) {
        case 'sendMessage':
          {
            const episode = EpisodeStore.get().getActiveEpisode();
            const projectId = EpisodeStore.get().getProjectId();
            if (!episode || !projectId) {
              vscode.window.showErrorMessage('No active episode. Create one first.');
              this._view?.webview.postMessage({ type: 'error', value: 'No active episode' });
              return;
            }

            const gitCtx = await GitContext.getContext();
            const intentTag = data.intentTag || undefined;

            try {
              const res = await ApiClient.logCall({
                projectId,
                episodeId: episode.id,
                promptText: data.value,
                intentTag,
                source: 'extension',
                branchName: gitCtx.branch || undefined,
                activeFilePath: gitCtx.activeFile || undefined,
                relatedFiles: [],
                diffSnapshot: gitCtx.diff || null,
                todoMatches: gitCtx.markers,
              });
              EpisodeStore.get().incrementCallCount();
              if (gitCtx.activeFile) {
                EpisodeStore.get().addChangedFile(gitCtx.activeFile);
              }
              this._view?.webview.postMessage({ type: 'addResponse', value: res.modelResponse });
            } catch (e: any) {
              this._view?.webview.postMessage({ type: 'error', value: e.message || 'Failed to send' });
            }
            break;
          }
      }
    });
  }

  private _getHtmlForWebview() {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ContextLens Chat</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 10px; }
          #chat-history { height: 300px; overflow-y: auto; margin-bottom: 10px; border: 1px solid var(--vscode-panel-border); padding: 5px; }
          .message { margin-bottom: 10px; }
          .user-msg { color: var(--vscode-textLink-foreground); }
          .ai-msg { color: var(--vscode-foreground); }
          textarea { width: 100%; height: 60px; margin-bottom: 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
          button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 5px 10px; cursor: pointer; }
          button:hover { background: var(--vscode-button-hoverBackground); }
          #intent { width: 100%; margin-bottom: 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); }
        </style>
      </head>
      <body>
        <div id="chat-history"></div>
        <input type="text" id="intent" placeholder="Optional Intent Tag" />
        <textarea id="prompt" placeholder="Ask Gemini..."></textarea>
        <button id="send-btn">Send</button>
        <button id="retry-btn">Retry</button>

        <script>
          const vscode = acquireVsCodeApi();
          const sendBtn = document.getElementById('send-btn');
          const promptInput = document.getElementById('prompt');
          const chatHistory = document.getElementById('chat-history');
          let lastPrompt = '';

          sendBtn.addEventListener('click', () => {
            const text = promptInput.value;
            if (!text) return;
            lastPrompt = text;
            addMessage('You', text, 'user-msg');
            vscode.postMessage({ type: 'sendMessage', value: text });
            promptInput.value = '';
          });

          document.getElementById('retry-btn').addEventListener('click', () => {
            if (!lastPrompt) return;
            addMessage('You (Retry)', lastPrompt, 'user-msg');
            vscode.postMessage({ type: 'sendMessage', value: lastPrompt });
          });

          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'addResponse':
                addMessage('Gemini', message.value, 'ai-msg');
                break;
              case 'error':
                addMessage('Error', message.value, 'ai-msg');
                break;
            }
          });

          function addMessage(sender, text, className) {
            const div = document.createElement('div');
            div.className = 'message ' + className;
            div.innerText = sender + ': ' + text;
            chatHistory.appendChild(div);
            chatHistory.scrollTop = chatHistory.scrollHeight;
          }
        </script>
      </body>
      </html>`;
  }
}
