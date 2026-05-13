# ContextLens: Versions & Fixes History

This document provides a chronological record of the major development phases, alignment audits, and critical bug fixes that have shaped ContextLens.

---

## 🕒 Development Timeline

### Phase 1: Architectural Scaffolding
**Focus:** Establishing the three-tier architecture (Extension, Backend, Dashboard).
- **Context Files:** `ContextLens_Builder_1_VSCode_Extension.txt`, `ContextLens_Builder_2_Backend_AI_Services.txt`, `ContextLens_Builder_3_Web_Dashboard.txt`.
- **Milestones:**
  - Defined the Firestore schema for Projects, Episodes, and Calls.
  - Scaffolding of the Gemini-powered backend (Cloud Functions v2).
  - Initial UI design for the glassmorphism dashboard.

### Phase 2: Workflow Alignment Audit (Major Milestone)
**Focus:** Ensuring the Extension and Dashboard match the Backend's API contracts.
- **Context File:** `Workflow_Alignment_Audit.md`.
- **What Was Fixed:**
  - **Extension Client:** Rewrote `apiClient.ts` to use real `https` with Bearer tokens instead of mock data.
  - **Command Implementation:** Finalized all 8 core commands (New Episode, Close Episode, Explain Diff, etc.).
  - **Data Payloads:** Unified the JSON payloads between Extension and Backend to include `branchName`, `activeFilePath`, and `diffSnapshot`.
  - **Deep Linking:** Implemented dynamic URL construction in the extension to allow direct navigation from VS Code to specific episodes/branches in the dashboard.
  - **Sidebar State:** Replaced static placeholders with a live `TreeDataProvider` showing real-time episode status.

### Phase 3: The "Empty Dashboard" Crisis & Auth Hardening
**Focus:** Resolving connectivity issues and transitioning from demo-mode to production-auth.
- **Context File:** `fix-7`.
- **What Was Fixed:**
  - **UID Mismatch:** Identified that the backend was writing to a `demo-user` path while the dashboard was searching for real `auth.currentUser.uid`.
  - **Firestore Rules:** Updated security rules to allow read/write during the transition to ensure no silent failures.
  - **Fallback Logic:** Implemented `|| 'contextlens-demo-user'` in all dashboard hooks (`useProjects`, `useEpisodes`, `useCalls`) to ensure data visibility for unauthenticated users.
  - **Auth Middleware:** Hardened the backend middleware to verify real Firebase ID tokens while maintaining a testing fallback.

### Phase 4: Production Refinement & CLI Standalone
**Focus:** Professionalizing the codebase and extracting the CLI.
- **Current State:**
  - **Documentation Revamp:** Moved all technical guides to the `/docs` directory.
  - **CLI extraction:** Converted the `/cli` folder into a standalone product (`cl`) with its own global configuration system (`~/.contextlens/config.json`).
  - **Security Audit:** Formally documented security policies regarding PII redaction and secret storage.

---

## 🛠️ Critical Bug Fixes Registry

| Fix ID | Issue | Solution | Status |
| :--- | :--- | :--- | :--- |
| **FL-001** | Dashboard shows 0 projects | Updated hooks to fall back to `contextlens-demo-user` and updated Firestore rules. | ✅ Resolved |
| **FL-002** | Extension fails to call API | Rewrote client using Node `https` module to avoid dependency conflicts. | ✅ Resolved |
| **FL-003** | Explain Diff returns empty | Fixed payload mapping to send the raw `git diff` instead of a hash. | ✅ Resolved |
| **FL-004** | Auth Popup blocked | Configured Vite headers for `Cross-Origin-Opener-Policy: same-origin`. | ✅ Resolved |
| **FL-005** | Search param mismatch | Backend expected `?q=...`, dashboard sent `?query=...`. Unified to `q`. | ✅ Resolved |

---

## 📈 Future Vision (Roadmap)
- [ ] **Advanced Redaction:** Automatic stripping of API keys and PII before any data leaves the local machine.
- [ ] **Team Workspaces:** Moving beyond single-user Firestore paths to shared project contexts.
- [ ] **Offline Mode:** Local SQLite caching for episodes when internet connectivity is intermittent.

> [!NOTE]
> This history is synthesized from the `/context` folder and development logs. For deep technical details on any specific fix, refer to the corresponding file in `/context`.
