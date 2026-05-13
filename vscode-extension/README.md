# ContextLens VS Code Extension

ContextLens is a powerful AI-driven developer companion that captures your coding intent and context as you work, providing seamless integration with the ContextLens Dashboard for deep project insights and automated summarization.

## Features

- **Episode-Based Tracking**: Log your work in discrete episodes to organize context by feature or task.
- **AI-Powered Context Capture**: Automatically captures file diffs and active file context during AI interactions.
- **Seamless Auth**: Integrated Google Sign-In via Firebase Auth.
- **Dashboard Integration**: Direct links to view your project and episodes in the web dashboard.
- **Intelligent Summarization**: Generate PR summaries and branch-level insights based on your actual work history.

## Installation

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Search for "ContextLens" (if published) or install from VSIX.
4. Reload VS Code.

## Getting Started

1. **Sign In**: Click the "ContextLens: Sign In" button in the status bar or sidebar.
2. **Select Project**: Initialize or select an existing project from the sidebar.
3. **Start Episode**: Before starting a task, click "Start Episode" to begin tracking context.
4. **Interact with AI**: Use your favorite AI assistant; ContextLens captures the interactions automatically.
5. **View Dashboard**: Click the project name in the status bar to open the web dashboard.

## Development

If you're contributing to the extension:

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/)

### Setup

```bash
cd vscode-extension
npm install
```

### Running

1. Open the `vscode-extension` folder in VS Code.
2. Press `F5` to start a new "Extension Development Host" window.

### Building

```bash
npm run compile
npm run package
```

## License

MIT
