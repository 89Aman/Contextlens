# ContextLens VS Code Extension

ContextLens is a powerful AI-driven developer companion that captures your coding intent and context as you work, providing seamless integration with the ContextLens Dashboard for deep project insights, active file context tracking, and automated summarization.

---

## 🎨 VS Code UI & Integration

The extension integrates tightly into your VS Code workspace to provide a distraction-free context tracking environment:

- **Dedicated Sidebar Panel (`contextlens-explorer`):** Easily accessible from the Activity Bar, this sidebar consolidates your entire tracking workflow.
- **State Header Tree View (`contextlens.stateTree`):** Provides real-time visibility into your active project, current tracking episode, the current branch, and your overall sync status.
- **AI Chat Webview (`contextlens.chatView`):** An integrated interactive chat interface that leverages your preferred AI models to answer questions, write diffs, and explain file differences in real-time.
- **Interactive Title Menu Actions:** Quick-action buttons in the view headers let you open the web dashboard in one click.

---

## ⚡ Extension Features

### 🚀 Episode-Based Intent Tracking
Organize your coding context cleanly by starting discrete tracking episodes. Grouping changes by feature branch or specific task ensures clean history and accurate summaries.

### 🧠 AI-Powered Context Capture
Automatically captures file diffs and active file context during AI assistant interactions, tracking code changes and intent continuously.

### 🔐 Seamless Auth Sync
Integrated authentication utilizing secure callbacks (`vscode://Noventra-Labs.contextlens`) connecting Firebase Auth directly from the web dashboard.

### 📊 Deep Dashboard Integration
Instant navigation hooks to open your specific projects, active branches, or episodes directly in the web dashboard for deep timeline inspection.

---

## ⌨️ Keyboard Shortcuts & Keybindings

Quickly manage your tracking states without leaving your code editor using global shortcuts:

| Command | Action | Keyboard Shortcut (Windows/Linux) | Keyboard Shortcut (macOS) |
|---|---|---|---|
| `contextlens.newEpisode` | Start a new tracking episode | `Ctrl + Alt + N` | `Cmd + Alt + N` |
| `contextlens.closeEpisode` | Close active episode | `Ctrl + Alt + X` | `Cmd + Alt + X` |

*(Shortcut customization can be toggled via the `contextlens.enableShortcuts` settings entry.)*

---

## 🛠️ Configuration Settings

Configure extension behaviors through the standard VS Code Settings (`Ctrl+,`):

*   **`contextlens.enableShortcuts`** (`boolean`, default: `true`):
    Enable global keyboard shortcuts for starting and ending episodes.
*   **`contextlens.apiUrl`** (`string`, default: `https://us-central1-contextlens-backend-001.cloudfunctions.net/api`):
    The base URL pointing to your ContextLens backend APIs.

---

## 📦 Command Palette Commands (`Ctrl+Shift+P` / `Cmd+Shift+P`)

Access the full suite of ContextLens utilities from the VS Code command line:

*   `ContextLens: Sign In` — Log in to synchronize local context to the cloud.
*   `ContextLens: Sign Out` — Log out from active workspace sync.
*   `ContextLens: New Episode` — Initialize a new tracking episode.
*   `ContextLens: Close Episode` — Complete and close the current episode.
*   `ContextLens: Explain Diff` — Query the AI companion to explain active file changes.
*   `ContextLens: Summarize Branch` — Generate a branch-level summary.
*   `ContextLens: Open Dashboard` — Open the main web dashboard interface.
*   `ContextLens: Configure AI Provider` — Customize your active LLM and provider configurations.

---

## 🏷️ Extension Metadata

*   **Categories:** `Programming Languages`, `Data Science`, `Machine Learning`
*   **Keywords:** `ai`, `context`, `gemini`, `tracking`, `developer-productivity`

---

## 🧑‍💻 Development Guide

If you are contributing to or testing the extension:

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [npm](https://www.npmjs.com/)

### Setup
```bash
cd vscode-extension
npm install
```

### Running in Host
1. Open the `vscode-extension` workspace folder in VS Code.
2. Press `F5` or navigate to the Run and Debug tab to start a new **Extension Development Host** sandbox window.

### Compiling & Packaging
```bash
# Compiles the TypeScript source using Webpack
npm run compile

# Packages the extension as a local .vsix installer
npm run package
```

---

## 📄 License

MIT © ContextLens
