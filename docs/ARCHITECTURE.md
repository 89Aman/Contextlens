# Architecture Overview

ContextLens is designed to bridge the gap between local development activity and high-level project visibility. It uses a distributed architecture to capture, process, and visualize developer context.

## System Components

### 1. VS Code Extension (Client)
- **Context Capture**: Monitors file changes, git branch switches, and AI interactions.
- **Sync Engine**: Buffers local events and pushes them to the backend when a connection is available.
- **Authentication**: Uses Firebase Auth (Google Sign-In) to secure communication.
- **Local Storage**: Uses `vscode.SecretStorage` for tokens and `vscode.ExtensionContext.workspaceState` for ephemeral episode data.

### 2. Backend (Cloud Functions & Firestore)
- **API Layer**: Express-based Cloud Functions providing endpoints for project management, episode tracking, and AI logging.
- **AI Processing**: Integrates with Google Gemini to generate diff explanations, PR summaries, and risk assessments.
- **Data Persistence**: Firestore stores project metadata, episode history, and captured AI interaction logs.
- **Security**: Firebase Admin SDK validates ID tokens on every request.

#### Active route structure

The backend exposes three Express apps, each exported as a Firebase Function v2
from `src/index.js`. There is no `src/routes/` module anymore — routes live in
the apps:

| App | File | Endpoints |
|-----|------|-----------|
| Auth | `src/apps/auth.js` | `GET /auth/login`, `POST /auth/exchange` |
| Core | `src/apps/core.js` | projects, episodes CRUD/export/list, settings get/update, search |
| AI | `src/apps/ai.js` | calls/log, episodes/explain, branches/summarize |

When adding an endpoint, add it to the matching app, register validation rules
in `src/middleware/validate.js`, and export the app from `src/index.js`.

### 3. Web Dashboard (Frontend)
- **Visualization**: A React-based SPA that provides a timeline view of development activity.
- **Project Management**: Allows users to manage repository links and project-level settings.
- **Insight Delivery**: Displays AI-generated summaries and checklists for code reviews.

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
