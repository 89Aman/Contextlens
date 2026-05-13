# ContextLens: Workflows & Technical Processes

This document provides a deep dive into the operational mechanics of the ContextLens ecosystem, specifically focusing on the VS Code Extension, the CLI, and the automated project lifecycle.

---

## 🧩 1. VS Code Extension Mechanics

The extension acts as the primary "Context Sensor." It captures real-time development signals and synchronizes them with the cloud.

### 📦 Installation & Activation
1.  **Distribution**: The extension is packaged as a `.vsix` file or distributed via the VS Code Marketplace.
2.  **Activation**: It activates on `onStartupFinished` or when specific ContextLens commands are invoked.
3.  **Authentication Callback**:
    *   **Trigger**: If no auth token is found in the local `SecretStorage`.
    *   **Redirect**: Opens the browser to the Firebase Auth landing page.
    *   **Return**: Upon successful login, the browser redirects to `vscode://89Aman.contextlens/auth?token=...`.
    *   **Handler**: The extension's `CustomUriHandler` parses the token and saves it securely for all future API requests.

### 🕵️ Autonomous Watchers
The extension runs background processes ("Watchers") that monitor:
-   **Active Editor**: Tracks which file you are currently focused on.
-   **Text Changes**: Detects diffs and AI-generated code patterns.
-   **Git Context**: Monitors branch switches (`onDidChangeBranch`) to ensure data is attributed to the correct development stream.

---

## 💻 2. CLI (`cl`) Architecture

The CLI is a standalone Node.js application designed for terminal-heavy workflows and CI/CD integration.

### 🛠️ Global vs. Local Setup
-   **Installation**: Run `npm install -g .` within the `/cli` directory.
-   **Global Config**: Stored in `~/.contextlens/config.json`. This holds your **Authentication Token**, allowing the CLI to work across any directory on your machine.
-   **Local Config**: Stored in `./.contextlens/config.json` within a specific project folder. This holds the **Project ID**, linking that directory to a specific ContextLens dashboard.

### 🔄 Data Flow
When you run a command like `cl log "Fixed bug"`:
1.  The CLI loads the **Global Token**.
2.  The CLI loads the **Local Project ID**.
3.  It finds the **Active Episode** by querying the backend for the current user's state.
4.  It sends a `POST` request to the backend with the message and metadata.

---

## 🚀 3. Automatic Project Creation

ContextLens minimizes manual setup by automatically resolving project identities.

### 🔍 The "Fingerprinting" Process
When the VS Code extension or CLI initializes in a new folder:
1.  **Remote Check**: It executes `git remote get-url origin`.
2.  **Naming**: It defaults the project name to the folder's name (e.g., `ContextLens`).
3.  **Creation Request**: It calls `POST /api/projects` with the `repoUrl` and `name`.

### 🧠 Backend Resolution Logic
1.  **Deduplication**: The backend checks the Firestore `projects` collection for a record matching the `UID` (user) and the `repoUrl`.
2.  **Upsert**: 
    *   If a match exists, it returns the existing `projectId`.
    *   If no match exists, it creates a new project record and returns the new `projectId`.
3.  **Client-Side Persistence**: The Extension saves this ID in its `workspaceState` (linked to that specific folder), ensuring that future activations are instant.

---

## 📊 4. The Sync Engine

To ensure data integrity during offline development:
1.  **Buffering**: All "Calls" and "Events" are first written to a local JSON buffer.
2.  **Retry Logic**: A background sync loop attempts to push the buffer to the cloud every 30 seconds.
3.  **Atomic Flushes**: Once the backend acknowledges receipt (200 OK), the local buffer is cleared.

---

> [!TIP]
> To view your current project status from the terminal at any time, simply run `cl status`.
