# ContextLens — Comprehensive Documentation

> **Vision**: To eliminate the context-loss problem in software development by capturing the *intent* and *evolution* of code in real-time.

---

## 📖 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Component Deep-Dive](#-component-deep-dive)
   - [CLI Tool (cl)](#cli-tool-cl)
   - [VS Code Extension](#vs-code-extension)
   - [Web Dashboard](#web-dashboard)
   - [Backend Services](#backend-services)
3. [Core Concepts](#-core-concepts)
   - [Episodes](#episodes)
   - [Intent Capture](#intent-capture)
   - [Semantic History](#semantic-history)
4. [Getting Started](#-getting-started)
5. [CLI Reference](#-cli-reference)
6. [Security & Privacy](#-security--privacy)
7. [Contributing](#-contributing)

---

## 🏗️ System Architecture

ContextLens operates as a distributed system with multiple capture points and a centralized processing engine.

### Data Flow
1. **Capture**: The VS Code Extension and CLI (`cl`) capture developer activity (AI chats, terminal commands, git diffs).
2. **Buffering**: Data is buffered locally (especially in the extension) to ensure zero data loss during offline periods.
3. **Synchronization**: The Sync Engine flushes data to the Firebase Backend via HTTPS.
4. **Storage**: Data is stored in Firestore, organized by `Project` -> `Episode` -> `Call`.
5. **Visualization**: The Web Dashboard queries Firestore to reconstruct a visual timeline of the project's development.

```mermaid
graph TD
    A[VS Code Extension] -->|HTTPS/Auth| E[Firebase Functions]
    B[CLI Tool 'cl'] -->|HTTPS/Auth| E
    C[Git Hooks] -->|Exec| B
    E -->|Write| F[(Firestore DB)]
    G[Web Dashboard] -->|Query| F
    G -->|Auth| H[Firebase Auth]
```

---

## 🧩 Component Deep-Dive

### CLI Tool (`cl`)
The CLI is built with **Node.js** and **Commander.js**. It serves as a standalone interface for developers who prefer the terminal or want to automate context capture in CI/CD pipelines.

- **Storage**: Global config is stored in `~/.contextlens/config.json`. Local project config is in `./.contextlens/config.json`.
- **Git Integration**: Includes a `git-hook` command designed to be used in `post-commit` hooks to automatically log diffs.

### VS Code Extension
The "Heart" of ContextLens. It monitors the IDE state and captures the most granular context.
- **Sync Engine**: A robust background process that ensures data is sent to the backend without blocking the UI.
- **Status Bar**: Provides immediate feedback on active episodes and sync status.
- **Webview UI**: (Upcoming) Interactive chat and project summary interface.

### Web Dashboard
A **React + Vite** application designed for high-end visual storytelling.
- **Glassmorphism Design**: Uses a premium aesthetic with radial gradients and backdrop blurs.
- **Timeline View**: Reconstructs development history as a series of expandable "Episodes".
- **Interactive Diffs**: Allows users to see code changes exactly as they happened, with AI-generated explanations.

### Backend Services
Built on **Firebase Cloud Functions (Gen 2)** and **Firestore**.
- **Auth**: Uses Firebase Authentication (Google Provider).
- **Security**: Strict Firestore rules ensure users can only access their own project data.
- **Scalability**: Stateless functions allow for infinite scaling of capture events.

---

## 💡 Core Concepts

### Episodes
An Episode is a logical unit of work. Instead of just "Commits," ContextLens tracks "Episodes."
- **Example**: "Refactoring the Auth Logic" or "Implementing the Search Bar."
- An episode spans multiple commits, branches, and AI interactions.

### Intent Capture
Unlike Git, which captures *what* changed, ContextLens captures *why* it changed by logging the prompts and AI responses that led to the code modification.

### Semantic History
The end result is a "Semantic History"—a searchable, human-readable record of the project's evolution that is much more useful for onboarding new developers than raw git logs.

---

## 🚀 Getting Started

ContextLens is designed to be set up in minutes. Follow these steps to start capturing your development context.

### 1. Install the CLI Tool
The CLI is the primary way to interact with ContextLens from your terminal.
```bash
# From the project root
cd cli
npm install -g .
```
*Verify installation by running `cl --version`.*

### 2. Connect the VS Code Extension
The extension handles real-time capture while you code.
1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Search for "ContextLens" and install.
4. You will see a `CL` icon in your status bar.

### 3. Log In & Authenticate
To sync your data, you need to authenticate with your ContextLens account.
```bash
# Get your token from the Dashboard settings
cl auth <your-firebase-token>
```

### 4. Track Your First Episode
Navigate to your project folder and initialize ContextLens:
```bash
cl init <project-id>
```
To start a manual capture session (Episode):
```bash
cl log-call -t "Starting work on the user profile feature"
```

### 5. View the Dashboard
To see your progress visualized:
1. Navigate to the [ContextLens Web Dashboard](http://localhost:5173).
2. Log in with the same account.
3. Explore your project timeline and AI insights.

---

## 🛠️ Advanced: Self-Hosting (Optional)
If you want to host your own ContextLens backend, refer to the [Backend Setup Guide](../src/README.md) for Firebase configuration.

---

## 💻 CLI Reference

| Command | Usage | Description |
|---|---|---|
| `cl auth <token>` | `cl auth abc-123` | Save your Firebase auth token. |
| `cl init <id>` | `cl init my-proj` | Initialize a project in the current dir. |
| `cl status` | `cl status` | Show project and sync status. |
| `cl log-call` | `cl log-call -t "Refactor"` | Manually log an event or AI call. |
| `cl logs` | `cl logs --lines 20` | View recent activity from the terminal. |
| `cl sync` | `cl sync` | Test connectivity and refresh local config. |
| `cl git-hook` | `cl git-hook post-commit` | Auto-log git diffs (run from hook). |

---

## 🛡️ Security & Privacy

ContextLens is designed with privacy in mind:
- **Redaction**: The CLI and Extension include utilities to scrub API keys and PII before they leave your machine.
- **Data Sovereignty**: Since the backend is a standard Firebase app, you can host your own "ContextLens Server" easily.
- **Authentication**: All data is protected by industry-standard Firebase Auth.

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on how to get started.

---

## 📜 License

ContextLens is open-source software licensed under the [MIT License](../LICENSE).
