/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Auth = void 0;
class Auth {
    constructor(secretStorage) {
        this.secretStorage = secretStorage;
    }
    static initialize(context) {
        if (!Auth.instance) {
            Auth.instance = new Auth(context.secrets);
        }
    }
    static get() {
        return Auth.instance;
    }
    async getToken() {
        return this.secretStorage.get('contextlens.token');
    }
    async setToken(token) {
        await this.secretStorage.store('contextlens.token', token);
    }
    async clearToken() {
        await this.secretStorage.delete('contextlens.token');
    }
}
exports.Auth = Auth;


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EpisodeStore = void 0;
const vscode = __webpack_require__(1);
class EpisodeStore {
    constructor(context) {
        this.context = context;
        this.activeEpisode = null;
        this.onDidChangeEmitter = new vscode.EventEmitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this.load();
    }
    static initialize(context) {
        if (!EpisodeStore.instance) {
            EpisodeStore.instance = new EpisodeStore(context);
        }
    }
    static get() {
        return EpisodeStore.instance;
    }
    load() {
        const data = this.context.workspaceState.get('contextlens.activeEpisode');
        if (data) {
            this.activeEpisode = data;
        }
    }
    save() {
        this.context.workspaceState.update('contextlens.activeEpisode', this.activeEpisode);
        this.onDidChangeEmitter.fire();
    }
    getActiveEpisode() {
        return this.activeEpisode;
    }
    createEpisode(name) {
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
    closeEpisode() {
        this.activeEpisode = null;
        this.save();
    }
    incrementCallCount() {
        if (this.activeEpisode) {
            this.activeEpisode.callCount += 1;
            this.save();
        }
    }
    updateNote(note) {
        if (this.activeEpisode) {
            this.activeEpisode.note = note;
            this.save();
        }
    }
}
exports.EpisodeStore = EpisodeStore;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StateTreeProvider = void 0;
const vscode = __webpack_require__(1);
const episodeStore_1 = __webpack_require__(3);
const gitContext_1 = __webpack_require__(5);
class StateTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        episodeStore_1.EpisodeStore.get().onDidChange(() => {
            this.refresh();
        });
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        const items = [];
        const episode = episodeStore_1.EpisodeStore.get().getActiveEpisode();
        if (!episode) {
            const noEpisode = new vscode.TreeItem('No Active Episode', vscode.TreeItemCollapsibleState.None);
            noEpisode.description = 'Create one to start tracking';
            items.push(noEpisode);
            return items;
        }
        items.push(new vscode.TreeItem(`Episode: ${episode.name}`, vscode.TreeItemCollapsibleState.None));
        const gitCtx = await gitContext_1.GitContext.getContext();
        items.push(new vscode.TreeItem(`Branch: ${gitCtx.branch || 'None'}`, vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(`AI Calls: ${episode.callCount}`, vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(`AI Owned Files: ${episode.aiOwnedFiles.length}`, vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(`User Owned Files: ${episode.userOwnedFiles.length}`, vscode.TreeItemCollapsibleState.None));
        items.push(new vscode.TreeItem(`Note: ${episode.note || 'None'}`, vscode.TreeItemCollapsibleState.None));
        return items;
    }
}
exports.StateTreeProvider = StateTreeProvider;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitContext = void 0;
const vscode = __webpack_require__(1);
const child_process_1 = __webpack_require__(6);
const util_1 = __webpack_require__(7);
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitContext {
    static async getContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                branch: null,
                diff: null,
                activeFile: null,
                markers: [],
                isGitRepo: false
            };
        }
        const cwd = workspaceFolders[0].uri.fsPath;
        let isGitRepo = true;
        let branch = null;
        let diff = null;
        try {
            const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', { cwd });
            if (stdout.trim() !== 'true') {
                isGitRepo = false;
            }
        }
        catch {
            isGitRepo = false;
        }
        if (isGitRepo) {
            try {
                const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd });
                branch = branchOut.trim();
                const { stdout: diffOut } = await execAsync('git diff', { cwd });
                diff = diffOut.trim();
            }
            catch (e) {
                console.error('Git execution failed', e);
            }
        }
        let activeFile = null;
        const markers = [];
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            activeFile = editor.document.uri.fsPath;
            const text = editor.document.getText();
            const lines = text.split('\n');
            lines.forEach((line, index) => {
                if (/(TODO|FIXME|HACK)/.test(line)) {
                    markers.push(`Line ${index + 1}: ${line.trim()}`);
                }
            });
        }
        return {
            branch,
            diff,
            activeFile,
            markers,
            isGitRepo
        };
    }
}
exports.GitContext = GitContext;


/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("util");

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChatViewProvider = void 0;
const vscode = __webpack_require__(1);
const apiClient_1 = __webpack_require__(9);
const gitContext_1 = __webpack_require__(5);
const episodeStore_1 = __webpack_require__(3);
class ChatViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview();
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    {
                        const episode = episodeStore_1.EpisodeStore.get().getActiveEpisode();
                        if (!episode) {
                            vscode.window.showErrorMessage('No active episode. Create one first.');
                            this._view?.webview.postMessage({ type: 'error', value: 'No active episode' });
                            return;
                        }
                        const gitCtx = await gitContext_1.GitContext.getContext();
                        try {
                            const res = await apiClient_1.ApiClient.sendChat(data.value, episode.id, gitCtx);
                            episodeStore_1.EpisodeStore.get().incrementCallCount();
                            this._view?.webview.postMessage({ type: 'addResponse', value: res.response });
                        }
                        catch (e) {
                            this._view?.webview.postMessage({ type: 'error', value: e.message || 'Failed to send' });
                        }
                        break;
                    }
            }
        });
    }
    _getHtmlForWebview() {
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
exports.ChatViewProvider = ChatViewProvider;
ChatViewProvider.viewType = 'contextlens.chatView';


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ApiClient = void 0;
class ApiClient {
    static async sendChat(prompt, episodeId, gitContext) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ response: `Echo: ${prompt} (Context: ${gitContext?.branch || 'none'})` });
            }, 1000);
        });
    }
    static async explainDiff(diff) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ response: `Explanation for diff length ${diff.length}` });
            }, 1000);
        });
    }
    static async summarizeBranch(branch) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ response: `Summary for branch ${branch}` });
            }, 1000);
        });
    }
}
exports.ApiClient = ApiClient;


/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Telemetry = void 0;
class Telemetry {
    static log(eventName, properties) {
        console.log(`[Telemetry] ${eventName}`, properties);
    }
}
exports.Telemetry = Telemetry;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __webpack_require__(1);
const auth_1 = __webpack_require__(2);
const episodeStore_1 = __webpack_require__(3);
const stateTreeProvider_1 = __webpack_require__(4);
const chatViewProvider_1 = __webpack_require__(8);
const apiClient_1 = __webpack_require__(9);
const gitContext_1 = __webpack_require__(5);
const telemetry_1 = __webpack_require__(10);
function activate(context) {
    telemetry_1.Telemetry.log('Extension activated');
    auth_1.Auth.initialize(context);
    episodeStore_1.EpisodeStore.initialize(context);
    const stateTreeProvider = new stateTreeProvider_1.StateTreeProvider();
    vscode.window.registerTreeDataProvider('contextlens.stateTree', stateTreeProvider);
    const chatViewProvider = new chatViewProvider_1.ChatViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(chatViewProvider_1.ChatViewProvider.viewType, chatViewProvider));
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'contextlens.openDashboard';
    context.subscriptions.push(statusBarItem);
    const updateStatusBar = () => {
        const ep = episodeStore_1.EpisodeStore.get().getActiveEpisode();
        if (ep) {
            statusBarItem.text = `$(repo) ContextLens: ${ep.name} · ${ep.callCount} calls`;
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
    };
    episodeStore_1.EpisodeStore.get().onDidChange(() => {
        updateStatusBar();
    });
    updateStatusBar();
    context.subscriptions.push(vscode.commands.registerCommand('contextlens.newEpisode', async () => {
        const name = await vscode.window.showInputBox({ prompt: 'Enter episode name' });
        if (name) {
            episodeStore_1.EpisodeStore.get().createEpisode(name);
            vscode.window.showInformationMessage(`Started episode: ${name}`);
            telemetry_1.Telemetry.log('New Episode Created', { name });
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('contextlens.closeEpisode', () => {
        episodeStore_1.EpisodeStore.get().closeEpisode();
        vscode.window.showInformationMessage('Episode closed');
        telemetry_1.Telemetry.log('Episode Closed');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('contextlens.explainDiff', async () => {
        const gitCtx = await gitContext_1.GitContext.getContext();
        if (!gitCtx.diff) {
            vscode.window.showErrorMessage('No diff available to explain');
            return;
        }
        const res = await apiClient_1.ApiClient.explainDiff(gitCtx.diff);
        vscode.window.showInformationMessage(res.response);
        telemetry_1.Telemetry.log('Explain Diff executed');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('contextlens.summarizeBranch', async () => {
        const gitCtx = await gitContext_1.GitContext.getContext();
        if (!gitCtx.branch) {
            vscode.window.showErrorMessage('No branch detected');
            return;
        }
        const res = await apiClient_1.ApiClient.summarizeBranch(gitCtx.branch);
        vscode.window.showInformationMessage(res.response);
        telemetry_1.Telemetry.log('Summarize Branch executed');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('contextlens.openDashboard', () => {
        vscode.env.openExternal(vscode.Uri.parse('https://contextlens.example.com'));
        telemetry_1.Telemetry.log('Dashboard Opened');
    }));
}
function deactivate() { }

})();

var __webpack_export_target__ = exports;
for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
//# sourceMappingURL=extension.js.map