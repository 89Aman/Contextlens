# Architecture Overview

ContextLens is designed to bridge the gap between local development activity and high-level project visibility. It uses a distributed architecture to capture, process, and visualize developer context.

## System Components

### 1. VS Code Extension (Local Core Engine - Default)
- **Local Context Storage**: Stores project knowledge graph in `<workspaceRoot>/.contextlens/graph.json` and episodes in `.contextlens/episodes.json` (100% local, zero-cloud).
- **Pass 1 Deterministic Extractor**: Deterministically extracts modified files, classes, functions, and symbols from saved diffs and git commits with zero token cost.
- **Local MCP Server (`127.0.0.1:3012`)**: Exposes graph queries (`contextlens_get_graph`) and decision logging (`contextlens_log_decision`) to external AI clients (Cursor, Claude Desktop, Antigravity).
- **One-Click PR Generator**: Uses episode subgraph and BYOK LLM (or deterministic fallback) to generate comprehensive PR descriptions directly from IDE.

### 2. Cloud Backend & Web Dashboard (Decoupled / Frozen for MVP)
- **Backend (`src/apps`)**: Express/Firebase Cloud Functions v2 and Firestore database decoupled. Optional cloud sync is disabled by default (`contextlens.localOnly: true`).
- **Dashboard (`contextlens-dashboard`)**: React SPA frozen. Primary user workflows occur directly inside VS Code and via connected MCP clients.
- **Python Submodule (`graphify`)**: Discarded in favor of pure TypeScript Pass 1 AST extraction and native node-link JSON graph storage.

## Data Flow

1.  **Event Capture**: The VS Code extension detects a file save or an AI prompt.
2.  **Context Enrichment**: The extension gathers the current diff, active file path, and branch name.
3.  **Synchronization**: The `SyncEngine` sends an authenticated POST request to the backend.
4.  **AI Analysis**: The backend receives the data, optionally calls Gemini for a summary/explanation, and stores the result.
5.  **Persistence**: Data is saved to Firestore.
6.  **Visualization**: The Web Dashboard fetches the latest data via the backend API and renders the UI.

## Technology Stack

- **Extension**: TypeScript, VS Code API, Node.js.
- **Backend**: Node.js, Firebase Cloud Functions, Firestore, Gemini AI API.
- **Dashboard**: React, Vite, Tailwind CSS, Firebase Hosting.

## Security & Privacy

- All communication is over HTTPS.
- Authentication is handled by Firebase Auth.
- Sensitive data (like file contents in diffs) can be optionally redacted by the client before synchronization.
