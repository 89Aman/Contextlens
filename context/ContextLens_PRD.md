# ContextLens — Product Requirements Document

**Version:** 1.0  
**Status:** Draft — Hackathon MVP  
**Author:** Product Strategy Team  
**Date:** May 2026  
**Target Event:** GDG Final / Demo Day  

---

## Executive Summary

ContextLens is a developer-first AI Context Management Layer that attaches structured metadata — git branch, file diff, TODO comment, intent note — to every Gemini AI interaction inside the IDE, then surfaces those interactions as an auditable, searchable "Episode Timeline" on a companion web dashboard. It addresses the fastest-growing friction point in AI-assisted development in 2026: not capability gaps in models, but cognitive overload from context loss and untracked AI decision trails.

The hackathon MVP targets VS Code as the primary host, with Firebase + Firestore as the backend, Gemini 2.5 Pro as the reasoning engine, and a Next.js dashboard hosted on Firebase Hosting. The build is scoped to 40–60 hours for a team of 1–3 developers.

---

## 1. Problem Definition

### 1.1 The Core Pain

As of 2026, AI model quality is no longer the primary bottleneck in developer workflows. The bottleneck is **context**: developers lose track of what the AI suggested, why it suggested it, what changed in the codebase as a result, and how that change relates to the broader task.

**Observed behaviors indicating the pain:**
- Developers maintain manual "context notes" in scratch files, Notion docs, or voice memos to track AI sessions.
- Teams paste long system prompts repeatedly into each new chat window because there is no persistent project-level context.
- Code review discussions frequently include "why was this changed this way?" — the AI's reasoning is invisible in the diff.
- Developers frequently restart AI sessions after switching branches, losing all accumulated context.
- Postmortems on AI-assisted changes are difficult because there is no audit trail.

### 1.2 The Root Cause

Current AI coding tools (Copilot, Cursor, raw Gemini API calls, etc.) operate **statelessly per session**. There is no layer that:

1. Persists the *intent* behind a change (why was this AI call made?).
2. Associates the AI's suggestion with the exact code state (diff, branch, file) at the time of the call.
3. Builds a timeline narrative across multiple AI sessions for the same task.
4. Surfaces that narrative in a team-sharable, readable format.

### 1.3 Problem Statement

> "Developer teams using AI coding assistants lack a persistent, auditable record of AI-assisted decisions, making it impossible to understand the reasoning behind changes, reproduce AI sessions, or collaborate effectively on AI-native branches."

### 1.4 Why This Matters in 2026 Specifically

- **AI-generated code adoption has crossed a threshold** where teams are shipping code they didn't fully write, creating accountability gaps.
- **Context engineering** has emerged as a recognized discipline — developers understand that quality of AI output is proportional to quality of context input, but no tool helps them build and manage that context over time.
- **Regulatory and security pressure** is growing around "AI-generated artifacts" — teams need audit trails for compliance.
- **Google's push** to integrate Gemini into Android Studio, Firebase Studio, and the AI Studio ecosystem creates a natural extension surface for a context management layer that plugs into those tools.

---

## 2. Product Vision

> **"ContextLens makes AI-assisted development coherent, auditable, and collaborative by turning every AI interaction into a structured, searchable episode in the story of your codebase."**

### 2.1 North Star Metric

**Weekly Active Episode Count (WAEC):** The number of AI-tagged coding sessions logged per active developer per week. Target: ≥5 episodes/dev/week indicates habitual usage.

### 2.2 Success Criteria (Hackathon Demo)

- Judge can watch a 90-second demo and say: "I understand exactly what this does and why I need it."
- Live demo runs without failure: plugin logs an AI call → dashboard shows episode → summary generated.
- Demo triggers at least one judge to ask "how do we install this?"

---

## 3. Target Users

### 3.1 Primary Persona — "The AI-Native Solo Developer"

| Attribute | Detail |
|-----------|--------|
| **Name** | Arjun / Maya |
| **Role** | Mid-level SWE or indie hacker |
| **AI usage** | 30–50% of code written or refactored with AI assistance daily |
| **Pain point** | "I can't remember why I made this change last Tuesday" |
| **Tools** | VS Code, Cursor, GitHub Copilot, Gemini, Claude |
| **Platform** | Mac or Windows; heavy terminal user |

### 3.2 Secondary Persona — "The AI-Skeptic Tech Lead"

| Attribute | Detail |
|-----------|--------|
| **Name** | Rohan / Priya |
| **Role** | Tech lead or senior SWE reviewing AI-generated PRs |
| **Pain point** | "I can't trust this diff because I don't know what the AI was told to do" |
| **Goal** | Wants auditability and team-level context sharing |

### 3.3 Tertiary Persona — "The Hackathon Student Team"

| Attribute | Detail |
|-----------|--------|
| **Profile** | 2–4 CS students, 24–48 hour build |
| **Pain point** | Context loss during handoffs between teammates; multiple AI sessions across branches |
| **Goal** | Stay in sync on what AI changed and why; demo a polished product |

---

## 4. Scope

### 4.1 In-Scope (Hackathon MVP)

- VS Code extension (TypeScript) — primary surface
- Web dashboard (Next.js + Firebase Hosting)
- Firebase backend (Auth + Firestore + Functions)
- Gemini 2.5 Pro integration for summarization and analysis
- Episode Timeline view (core feature)
- "Explain this diff" and "Summarize this branch" quick actions
- State Header sidebar panel in VS Code

### 4.2 Out-of-Scope (Post-Hackathon)

- JetBrains plugin
- Team/org-level multi-user dashboards
- GitHub PR annotations
- Slack/Linear integrations
- LangChain agent orchestration layer
- Mobile companion app
- Enterprise SSO

---

## 5. Feature Specifications

### 5.1 Feature 1 — AI Call Interceptor (VS Code Extension Core)

**Description:** Every time the developer invokes an AI action (via the ContextLens command palette or by intercepting calls from integrated tools), the extension automatically captures and tags the interaction.

**Captured Metadata per AI Call:**

| Field | Source | Description |
|-------|--------|-------------|
| `session_id` | Generated | UUID for the coding episode |
| `timestamp` | System clock | ISO 8601 datetime |
| `branch_name` | Git HEAD | Current branch at time of call |
| `file_path` | VS Code active editor | Relative path of focused file |
| `diff_snapshot` | Git diff (staged + unstaged) | Serialized unified diff at call time |
| `intent_tag` | User input (optional, <60 chars) | What is the goal? ("Refactor auth handler") |
| `prompt_text` | Captured from input | The actual prompt sent to the model |
| `model_response` | Captured from Gemini response | The full AI output |
| `related_todos` | File parsing | TODOs/FIXMEs in the current file |
| `episode_label` | User-set or auto-inferred | Task-level grouping label |

**User Flows:**

1. **Passive capture:** Developer uses ContextLens Gemini chat in the sidebar. Every message is auto-tagged.
2. **Active tagging:** Developer wraps any external AI interaction by triggering `ContextLens: Log this AI call` command, pasting the prompt + response.
3. **Episode creation:** On starting a new significant task, developer runs `ContextLens: New Episode` and types a label. All subsequent AI calls are grouped under that episode.

**Technical Implementation:**
- Extension uses VS Code Extension API (`vscode.workspace`, `vscode.window`, `vscode.scm`)
- Git integration via `child_process.execSync('git diff')` within the workspace root
- AI calls routed through Firebase Functions proxy that adds metadata and stores to Firestore before returning response

**Acceptance Criteria:**
- [ ] Every AI call via ContextLens chat produces a Firestore document within 2 seconds.
- [ ] Diff snapshot is accurate to the state at time of the AI call (not post-modification).
- [ ] Intent tag input appears as an optional non-blocking inline prompt in the sidebar.
- [ ] Episode grouping correctly associates multiple AI calls under the same label.

---

### 5.2 Feature 2 — Episode Timeline Dashboard (Web App)

**Description:** A web dashboard that displays all captured AI interactions as a scrollable timeline of "episodes," each with its metadata, diffs, summaries, and Gemini-generated insights.

**Dashboard Views:**

#### 5.2.1 Timeline View (Main)

```
┌─ EPISODE: "Refactor Auth Middleware" ─────────────────────────────────┐
│  Branch: feature/auth-v2 │ Started: May 9, 2026 11:43 PM │ 4 AI calls │
│                                                                        │
│  ┌─ Call #1 ──────────────────────────────────────────────────────┐   │
│  │ Intent: "Clean up token validation logic"                       │   │
│  │ File: src/middleware/auth.ts                                    │   │
│  │ [View Diff ▼] [View Prompt ▼] [View Response ▼]                │   │
│  │ Gemini Summary: Extracted token validation into a helper fn...  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│  ┌─ Call #2 ──────────────────────────────────────────────────────┐   │
│  │ Intent: "Add error handling for expired tokens"                 │   │
│  │ ...                                                             │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  [📋 Generate Branch Summary]  [🔍 Explain for Code Review]           │
└────────────────────────────────────────────────────────────────────────┘
```

**Timeline View Specifications:**

| Element | Spec |
|---------|------|
| Episode card | Collapsed by default; expand on click |
| Diff display | Syntax-highlighted unified diff (Monaco or highlight.js) |
| Prompt/response | Collapsed, expandable; prompt truncated to 200 chars in summary |
| Gemini summary | Auto-generated on episode close or on-demand |
| Search | Full-text search across intent tags, file paths, and summaries |
| Filters | Branch name, date range, file path glob |

#### 5.2.2 State Header Panel (VS Code Sidebar)

A persistent panel in the VS Code activity bar sidebar showing:

- **Current episode label** and call count.
- **"What AI owns":** List of files modified by AI in this episode (auto-detected from diffs).
- **"What you own":** Files with no AI-generated changes in this episode.
- **Quick note field:** Freeform annotation (≤140 chars) saved to Firestore.
- **Quick actions:** New Episode | Log AI Call | Open Dashboard.

**Acceptance Criteria:**
- [ ] Timeline view renders all episodes for authenticated user.
- [ ] Episodes correctly group AI calls under their label.
- [ ] Diff view renders accurate, syntax-highlighted diffs.
- [ ] Gemini summary generates in ≤5 seconds for an episode with ≤10 calls.
- [ ] Search filters results correctly by branch name and intent text.
- [ ] Dashboard is fully responsive and usable on a 13" laptop screen.

---

### 5.3 Feature 3 — "Explain this Diff" Quick Action

**Description:** A one-click action available on any episode or individual AI call that sends the accumulated diff + context to Gemini and returns a human-readable code review summary.

**Input to Gemini:**
```
You are a senior software engineer performing a code review.
Below is a git diff for the branch "{branch_name}", representing 
changes made during the episode "{episode_label}".

The developer's stated intent was: "{intent_tags joined}"

Provide:
1. A plain-English summary of what changed and why (3–5 sentences).
2. Potential risks or edge cases introduced.
3. Suggested follow-up tests or checks.

Diff:
{diff_snapshot}
```

**Output:** Rendered in a side panel in VS Code and saved to Firestore for the episode record.

**Acceptance Criteria:**
- [ ] Action is accessible from both VS Code extension (command palette) and web dashboard.
- [ ] Output renders in under 8 seconds for diffs up to 500 lines.
- [ ] Output includes: change summary, risks section, and follow-up suggestions.
- [ ] Output is saved to the episode record and visible on the dashboard.

---

### 5.4 Feature 4 — "Summarize this Branch" Quick Action

**Description:** Aggregates all episodes on a branch and sends them to Gemini to produce a high-level narrative of the branch's purpose, changes, and key decisions — suitable for use in a PR description.

**Input to Gemini:**
```
You are a senior developer preparing a pull request description.
Below is a structured log of AI-assisted coding sessions on branch "{branch_name}".

Sessions (in order):
{episodes with labels, intents, and per-episode summaries}

Produce:
1. A 2–3 sentence PR summary ("What this PR does").
2. A bullet list of key changes (max 8 bullets).
3. Key technical decisions made and their rationale.
4. Potential risks or areas requiring extra review attention.
```

**Output:** Rendered in the web dashboard with a "Copy as PR Description" button that exports Markdown.

**Acceptance Criteria:**
- [ ] Action is available on the branch view of the web dashboard.
- [ ] Output correctly aggregates ≥3 episodes into a coherent narrative.
- [ ] "Copy as PR Description" exports valid GitHub Markdown.
- [ ] Summary generated in ≤12 seconds for a branch with ≤5 episodes.

---

### 5.5 Feature 5 — Authentication & Project Setup

**Description:** Firebase Auth (Google Sign-In) to associate episodes with a user account. Projects are created to scope episodes (one project = one repository).

**Flows:**

1. Developer installs VS Code extension.
2. Runs `ContextLens: Sign In` → browser opens Firebase Auth Google login.
3. On success, extension receives auth token and stores it in VS Code SecretStorage.
4. Developer runs `ContextLens: New Project` → enters project name + optional repo URL.
5. All subsequent episodes are scoped to the active project.

**Acceptance Criteria:**
- [ ] Google Sign-In completes in under 30 seconds.
- [ ] Auth token persists across VS Code restarts (VS Code SecretStorage).
- [ ] Project switching is possible from the extension status bar.
- [ ] Web dashboard shows only the authenticated user's projects.

---

## 6. Technical Architecture

### 6.1 System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER MACHINE                              │
│                                                                       │
│  ┌─────────────────────────────────┐                                 │
│  │      VS Code Extension          │                                 │
│  │  - ContextLens Sidebar Panel    │                                 │
│  │  - AI Chat (Gemini proxied)     │                                 │
│  │  - Git diff capture             │                                 │
│  │  - Auth (Firebase Auth)         │                                 │
│  └──────────────┬──────────────────┘                                 │
│                 │ HTTPS (Firebase SDK)                               │
└─────────────────┼────────────────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────────────────┐
│                       FIREBASE + GCP BACKEND                          │
│                                                                       │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ Firebase     │  │ Cloud Firestore   │  │ Firebase Functions   │   │
│  │ Auth         │  │                   │  │                      │   │
│  │              │  │ /users            │  │ POST /log-call       │   │
│  │ Google       │  │   /projects       │  │ POST /summarize      │   │
│  │ Sign-In      │  │     /episodes     │  │ POST /explain-diff   │   │
│  │              │  │       /calls      │  │ POST /branch-summary │   │
│  └──────────────┘  └──────────────────┘  └──────────┬───────────┘   │
│                                                       │              │
│                                            ┌──────────▼───────────┐  │
│                                            │   Gemini 2.5 Pro     │  │
│                                            │   (Gemini API /      │  │
│                                            │    Vertex AI)        │  │
│                                            └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────────────────┐
│                      WEB DASHBOARD                                    │
│                                                                       │
│  Next.js App (Firebase Hosting)                                       │
│  - Episode Timeline                                                   │
│  - Diff viewer                                                        │
│  - Branch summary view                                                │
│  - Project settings                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| VS Code Extension | TypeScript + VS Code Extension API | Native IDE integration, full Git and editor access |
| Extension AI Chat | Gemini 2.5 Pro via Firebase AI Logic | GDG-native, tight Firebase integration |
| Backend Functions | Firebase Cloud Functions (Node.js 20) | Serverless, tightly integrated with Firestore and Auth |
| Database | Cloud Firestore | Real-time sync, Firebase-native, hierarchical data model |
| Auth | Firebase Auth (Google Sign-In) | Zero-friction for Google accounts; OAuth 2.0 standard |
| Web Dashboard | Next.js 15 (App Router) | Fast, modern React, easy deployment |
| Dashboard Hosting | Firebase Hosting | One-command deploy, CDN, matches backend ecosystem |
| AI Summarization | Gemini 2.5 Pro (Gemini API) | Best for long-context code understanding and narration |
| Diff Rendering | Monaco Editor (read-only) or react-diff-viewer | Matches VS Code visual language; familiar to devs |

### 6.3 Firestore Data Model

```
/users/{uid}
  - email: string
  - displayName: string
  - createdAt: timestamp

/users/{uid}/projects/{projectId}
  - name: string
  - repoUrl: string (optional)
  - createdAt: timestamp
  - activeBranch: string

/users/{uid}/projects/{projectId}/episodes/{episodeId}
  - label: string
  - branchName: string
  - status: "active" | "closed"
  - createdAt: timestamp
  - closedAt: timestamp (optional)
  - callCount: number
  - geminiSummary: string (optional, generated on close)
  - diffAggregate: string (optional, generated on close)

/users/{uid}/projects/{projectId}/episodes/{episodeId}/calls/{callId}
  - timestamp: timestamp
  - filePath: string
  - diffSnapshot: string
  - intentTag: string
  - promptText: string
  - modelResponse: string
  - relatedTodos: string[]
  - explainOutput: string (optional)
```

### 6.4 Firebase Functions API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/logCall` | POST | Receives call metadata from extension, writes to Firestore |
| `/summarizeEpisode` | POST | Calls Gemini to generate episode summary; updates Firestore |
| `/explainDiff` | POST | Sends diff + context to Gemini; returns explanation |
| `/branchSummary` | POST | Aggregates all episodes for a branch; returns PR narrative |

All endpoints require Firebase Auth ID token in `Authorization: Bearer <token>` header.

### 6.5 VS Code Extension — Component Breakdown

| Component | File | Responsibility |
|-----------|------|----------------|
| Extension Entry | `extension.ts` | Register commands, activate sidebars, auth listener |
| Auth Manager | `authManager.ts` | Firebase Auth flow, token storage in SecretStorage |
| Git Capture | `gitCapture.ts` | `child_process` calls for diff, branch name, TODO extraction |
| Episode Manager | `episodeManager.ts` | Create/close episodes, group calls under active episode |
| Firestore Client | `firestoreClient.ts` | Firebase Web SDK calls to read/write episodes and calls |
| AI Chat Panel | `chatPanel.ts` | WebviewProvider hosting the Gemini chat UI |
| State Header | `stateHeader.ts` | TreeDataProvider showing current episode state |
| Status Bar | `statusBar.ts` | Episode name + call count in VS Code status bar |

---

## 7. UX & Design Specifications

### 7.1 VS Code Extension UX

#### Activity Bar Icon
- Custom SVG icon: a lens/eye motif with a subtle circuit-board grid pattern inside.
- Color: matches VS Code theme accent; uses `currentColor`.

#### Sidebar Panels

**Panel 1 — Active Episode (State Header)**
```
┌─ CONTEXTLENS ──────────────── [+ New] [⚙] ┐
│                                              │
│  📍 CURRENT EPISODE                         │
│  ┌──────────────────────────────────────┐   │
│  │ 🔖 Refactor Auth Middleware           │   │
│  │ Branch: feature/auth-v2              │   │
│  │ 4 AI calls · Started 2h ago          │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  📝 AI OWNS (modified by AI this episode)   │
│  ├── src/middleware/auth.ts                  │
│  └── src/utils/tokenHelper.ts               │
│                                              │
│  👤 YOU OWN (no AI changes)                 │
│  ├── src/routes/user.ts                      │
│  └── tests/auth.test.ts                     │
│                                              │
│  [💬 Chat with Gemini]                       │
│  [📋 Explain Diff]  [🔍 Close Episode]       │
└──────────────────────────────────────────────┘
```

**Panel 2 — Gemini Chat (WebView)**
- Standard chat UI within VS Code webview.
- Every message sent is auto-logged with current git context.
- Inline option to tag intent before sending.
- Response displayed inline with "Save to Episode" toggle (on by default).

#### Status Bar Item
```
[⬢ ContextLens: Refactor Auth · 4 calls]
```
- Clicking opens the Episode panel.
- Color: accent color when episode is active; muted when no active episode.

### 7.2 Web Dashboard UX

#### Design Direction
- **Aesthetic:** Developer tool — precise, dark-mode-first, low-color, dense but breathable. Reference: Linear, Vercel Dashboard.
- **Primary font:** Geist Mono (headings and code labels) + Geist Sans (body).
- **Palette:** Dark surface with teal accent (`--color-primary: #4f98a3` in dark mode). Diff additions in muted green; deletions in muted red.
- **Layout:** Left sidebar (project/branch tree) + main content (timeline). No bottom nav. Top bar with user avatar, project switcher, and theme toggle.

#### Pages

**Page 1 — Dashboard Home (`/dashboard`)**
- Project overview cards: name, branch, last episode date, total AI calls.
- "Recent Episodes" feed (last 5 across all projects).
- Quick action: "Open in VS Code" deep link.

**Page 2 — Project View (`/dashboard/[projectId]`)**
- Branch list with episode counts.
- "Branch Summary" button per branch.
- Episode timeline for all branches or filtered by branch.

**Page 3 — Episode Detail (`/dashboard/[projectId]/episodes/[episodeId]`)**
- Episode header: label, branch, time range, call count.
- AI Call list: each expandable to show prompt, response, diff, and explain output.
- Action bar: "Explain Diff," "Generate Summary," "Copy PR Description."
- Gemini-generated summary displayed in a callout card.

#### Key UI Components

| Component | Behavior |
|-----------|----------|
| Episode Card | Collapsed by default; expand on click to reveal calls |
| Diff Viewer | Syntax-highlighted; shows added/removed lines; collapsed by default |
| Gemini Summary Card | Teal left-border callout with AI-generated narrative |
| Call Metadata Tags | Pill badges for branch, file, intent; color-coded by type |
| Search Bar | Debounced full-text search across intent tags and summaries |
| Branch Filter | Dropdown multi-select for branch filtering |
| Empty State | Animated "no episodes yet" with a CTA to install the extension |

### 7.3 Interaction Design Principles

1. **Every AI call is visible.** No interaction is silently swallowed; the developer always sees the logged call in the status bar.
2. **Context capture is passive by default.** The developer should never need to manually trigger capture during normal chat; tagging is optional and additive.
3. **Episode boundaries are developer-controlled.** New Episode and Close Episode are explicit actions; the tool does not auto-close without a signal.
4. **Summaries are on-demand.** Gemini does not run automatically in the background; it runs when the developer explicitly asks.
5. **No blocking UI.** Every Gemini call is async with a spinner; the IDE and dashboard remain fully usable while waiting.

---

## 8. API & Integration Specifications

### 8.1 Gemini API Usage

| Action | Model | Context Window Used | Approx. Tokens In | Tokens Out |
|--------|-------|--------------------|--------------------|------------|
| Explain Diff | Gemini 2.5 Pro | Up to 32k tokens | ~1–8k (diff + context) | ~500–800 |
| Summarize Episode | Gemini 2.5 Pro | Up to 32k tokens | ~2–15k (all calls) | ~400–600 |
| Branch Summary | Gemini 2.5 Pro | Up to 32k tokens | ~5–25k (all episodes) | ~600–1000 |
| Chat (IDE Panel) | Gemini 2.5 Flash | Standard | Conversation length | Variable |

**API Key Management:**  
- For the hackathon MVP: server-side key in Firebase Functions environment variables.  
- Never expose key to the VS Code extension or browser.  
- Post-hackathon: support BYO Gemini API key via project settings.

### 8.2 Git Integration

The extension uses local `git` CLI via `child_process.execSync`:

```typescript
// Branch name
execSync('git rev-parse --abbrev-ref HEAD', { cwd: workspaceRoot }).toString().trim()

// Unified diff (staged + unstaged)
execSync('git diff HEAD', { cwd: workspaceRoot }).toString()

// TODOs in active file
// Parse active file text with regex: /\/\/(?: TODO| FIXME| HACK):(.+)/g
```

**Error handling:**  
- If workspace is not a git repo: show "Not a git repo" in State Header panel; disable diff capture; log calls without diff.  
- If git is not installed: show actionable error with install link.

### 8.3 VS Code SecretStorage (Auth Token)

```typescript
// Store
await context.secrets.store('contextlens.authToken', idToken);

// Retrieve
const token = await context.secrets.get('contextlens.authToken');

// Delete on sign-out
await context.secrets.delete('contextlens.authToken');
```

---

## 9. Security & Privacy

### 9.1 Data Sensitivity

ContextLens captures code diffs and AI prompts, which may contain sensitive information. The following mitigations are required for the MVP:

| Concern | Mitigation |
|---------|------------|
| API keys in diffs | Pattern-detect common secret formats in diff before storage; warn developer; offer redaction |
| Proprietary code in prompts | All data stored in user-scoped Firestore paths; no shared storage |
| Auth token exposure | Stored in VS Code SecretStorage (encrypted); never logged or sent to third parties |
| Gemini API key | Stored only in Firebase Functions environment config; never client-side |

### 9.2 Firestore Security Rules (MVP)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

This ensures each user can only read and write their own data.

---

## 10. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | AI response displayed within 8 seconds for diffs ≤500 lines |
| **Reliability** | Firestore writes succeed with retry; extension does not crash on git errors |
| **Responsiveness** | Dashboard usable at 1280px and 375px viewports |
| **Availability** | Firebase Functions cold start ≤3 seconds |
| **Accessibility** | Dashboard meets WCAG AA for text contrast; keyboard-navigable |
| **Offline behavior** | Extension queues failed Firestore writes and retries on reconnect |

---

## 11. Build Plan (Hackathon Execution)

### 11.1 Team Structure (3 Developers)

| Developer | Focus Area | Hours |
|-----------|-----------|-------|
| Dev 1 | VS Code extension (TypeScript): auth, git capture, chat panel, state header | 20–25h |
| Dev 2 | Firebase backend: Firestore schema, Cloud Functions, Gemini API integration | 15–20h |
| Dev 3 | Web dashboard (Next.js): timeline view, diff viewer, episode detail, deploy | 15–20h |

### 11.2 Build Phases

#### Phase 0 — Setup (Hour 0–3)
- [ ] Create Firebase project; enable Auth + Firestore + Functions.
- [ ] Initialize VS Code extension with `yo code` (TypeScript template).
- [ ] Initialize Next.js project; connect Firebase SDK.
- [ ] Set up Gemini API key in Firebase Functions config.
- [ ] Create shared Firestore data model and deploy security rules.

#### Phase 1 — Core Data Pipeline (Hour 3–15)
- [ ] Implement `gitCapture.ts`: branch name, diff, TODO extraction.
- [ ] Implement `episodeManager.ts`: create/close/list episodes.
- [ ] Implement `firestoreClient.ts`: write call to Firestore via Functions.
- [ ] Implement `/logCall` Firebase Function with auth middleware.
- [ ] Test: extension logs a call → Firestore shows document.

#### Phase 2 — AI Features (Hour 15–28)
- [ ] Implement Gemini chat panel (WebView) with call logging.
- [ ] Implement `/explainDiff` Firebase Function with Gemini prompt.
- [ ] Implement `/summarizeEpisode` Firebase Function.
- [ ] Implement `/branchSummary` Firebase Function.
- [ ] Test: each action produces correct Gemini output.

#### Phase 3 — VS Code UX (Hour 28–38)
- [ ] Implement State Header TreeDataProvider.
- [ ] Implement Status Bar item.
- [ ] Implement command palette commands: New Episode, Close Episode, Explain Diff.
- [ ] Polish: loading indicators, error messages, empty state.

#### Phase 4 — Web Dashboard (Hour 25–45, parallel with Phase 3)
- [ ] Build layout: sidebar + main content.
- [ ] Build Episode Timeline component.
- [ ] Build Diff Viewer component.
- [ ] Build Episode Detail page with Gemini summary card.
- [ ] Connect to Firestore real-time listener.
- [ ] Deploy to Firebase Hosting.

#### Phase 5 — Integration, Polish & Demo Prep (Hour 45–55)
- [ ] End-to-end test: VS Code → Firestore → Dashboard.
- [ ] Pre-seed demo account with realistic episode data.
- [ ] Polish dashboard UI: animations, typography, dark mode.
- [ ] Prepare demo script and rehearse 90-second flow.
- [ ] Record backup demo video in case of live failures.

---

## 12. Demo Script (GDG Final — 90 Seconds)

### Setup (before demo)
- Pre-seeded account with 2 completed episodes on branch `feature/auth-v2`.
- A third episode, "Add Rate Limiting," is "active" with 2 calls already logged.
- Demo account signed in on VS Code and Dashboard (side by side on screen).

### Script

**[0:00 – 0:15] Hook**  
> "Every developer here has lost context. You start a task, use AI to help, take a break, come back, and have no idea what the AI changed or why. ContextLens fixes that."

**[0:15 – 0:30] VS Code Extension — Live Logging**  
Open VS Code. Show the State Header sidebar: "Active Episode: Add Rate Limiting, 2 AI calls."  
Type a new prompt in the ContextLens Gemini chat: "Add Express rate limiter middleware to this route."  
Show the status bar increment: "3 calls."  

**[0:30 – 0:50] Dashboard — Episode Timeline**  
Switch to the browser (dashboard already open).  
Show the live update: the new call appears in the timeline under "Add Rate Limiting."  
Click on the previous episode, "Refactor Auth Middleware." Show the 4 AI calls, each with intent tags, file paths, and diffs collapsed.  

**[0:50 – 1:10] Gemini — Explain Diff**  
Click "Explain Diff" on the "Refactor Auth Middleware" episode.  
Show the Gemini-generated code review summary appearing: change summary, risk notes, suggested follow-up tests.  

**[1:10 – 1:25] Branch Summary**  
Click "Summarize Branch: feature/auth-v2."  
Show the PR description narrative generated by Gemini — 3 sentences + bullet list of changes.  
Click "Copy as PR Description."  

**[1:25 – 1:30] Close**  
> "This is how AI-assisted development should work — coherent, auditable, and collaborative. ContextLens."

---

## 13. Demo Hardening Checklist

To prevent demo failure in a live setting:

- [ ] Pre-seed demo Firestore data (episodes, calls, summaries) as JSON import — if live logging fails, can switch to pre-seeded data.
- [ ] Gemini summaries pre-generated and cached for demo episodes — "Explain Diff" will show cached result instantly if API is slow.
- [ ] Record a 90-second backup screen recording of perfect demo run.
- [ ] Test demo flow end-to-end on the exact machine that will be used at the event.
- [ ] Disable VS Code notifications and system notifications before presenting.
- [ ] Dashboard deployed to Firebase Hosting — not localhost — for reliability.
- [ ] Backup mobile hotspot if venue WiFi is unreliable.

---

## 14. Post-Hackathon Roadmap

### Phase 2 — Solo Developer Product (Weeks 2–6)

| Feature | Description | Priority |
|---------|-------------|----------|
| JetBrains plugin | IntelliJ IDEA / Android Studio support | High |
| GitHub PR integration | Auto-attach episode summaries to PR descriptions | High |
| BYO Gemini key | Let users supply their own API key for unlimited use | Medium |
| Episode export | Export episodes as Markdown or JSON | Medium |

### Phase 3 — Team Collaboration (Months 2–4)

| Feature | Description |
|---------|-------------|
| Org-level projects | Shared projects across a team |
| Role-based access | Viewer / Editor / Admin roles |
| Team timeline | Aggregate view of all team members' episodes on a branch |
| Slack integration | Post episode summaries to Slack on branch close |

### Phase 4 — Enterprise (Months 4–12)

| Feature | Description |
|---------|-------------|
| SSO / SAML | Enterprise identity provider support |
| Compliance mode | Secret detection + automatic redaction before storage |
| Audit log export | SOC 2-compatible event log export |
| Self-hosted option | Docker deployment for air-gapped environments |

---

## 15. Monetization Model

| Tier | Price | Limits | Target |
|------|-------|--------|--------|
| **Free** | $0/mo | 100 AI calls/month, 5 episodes, 1 project | Individual devs, students |
| **Pro** | $9/mo | Unlimited calls and episodes, 5 projects, branch summaries | Indie hackers, professionals |
| **Team** | $29/mo per 5 seats | Unlimited everything, team timelines, Slack integration | Startup teams |
| **Enterprise** | Custom | SSO, compliance mode, self-hosted, audit logs | Mid-size companies |

**Growth levers:**
- OSS contributors get free Pro tier (community growth).
- Student discount: free Pro with `.edu` email.
- Referral: invite a developer → both get 1 month Pro free.

---

## 16. Success Metrics (Post-Launch)

| Metric | 30-Day Target | 90-Day Target |
|--------|---------------|---------------|
| Extension installs | 500 | 5,000 |
| Weekly Active Users | 100 | 1,000 |
| Episodes logged/week | 1,000 | 15,000 |
| Pro conversions | 5% of WAU | 8% of WAU |
| NPS score | ≥40 | ≥55 |
| GitHub stars (if OSS core) | 200 | 1,500 |

---

## Appendix A — Competitive Analysis

| Tool | What it Does | ContextLens Differentiation |
|------|-------------|----------------------------|
| **GitHub Copilot** | Inline AI code completion | Copilot generates code; ContextLens logs and narrates AI decisions across sessions |
| **Cursor** | AI-first IDE | Cursor is an IDE replacement; ContextLens is a layer that works inside any IDE |
| **Recontext (YC S24)** | Attaches diffs + dependency graphs to AI calls | ContextLens adds: episode grouping, intent tagging, timeline narrative, branch summary — and is Firebase/GCP-native |
| **Pieces for Developers** | Saves code snippets with AI context | Snippet storage vs. structured AI session timeline |
| **MemGPT / OpenMemory** | Persistent memory for AI assistants | General AI memory vs. code-centric, git-aware, team-sharable episodes |

---

## Appendix B — Hackathon Judge Appeal Framework

| Judge Priority | How ContextLens Addresses It |
|----------------|------------------------------|
| **Google ecosystem depth** | Firebase Auth + Firestore + Functions + Hosting + Gemini 2.5 Pro — all Google-native |
| **Real problem, not toy** | Context loss is documented, widespread, and worsening as AI coding adoption grows |
| **Technical sophistication** | VS Code extension API + git integration + serverless backend + streaming AI — not a simple chatbot wrapper |
| **Demo clarity** | Problem → solution arc fits in 90 seconds; every feature is shown, not told |
| **Startup potential** | Clear TAM (40M+ developers), defensible moat (episode history/data), viable monetization |
| **Uniqueness** | No other tool in the GDG ecosystem combines IDE plugin + audit timeline + branch narrative + Gemini |

---

*End of Document*
