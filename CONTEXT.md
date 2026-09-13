# ContextLens Local Core — Consolidated Project Context

> **Single-File Complete Technical Reference & Context Manual**  
> *Last Updated: 2026-09-13 | Version: 1.2.0*
> *Status: 100% Local-First Architecture Verified | Zero Cloud Dependencies*

---

## Table of Contents
1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [Complete Repository Layout](#2-complete-repository-layout)
3. [Architecture & Data Flow](#3-architecture--data-flow)
4. [Data Schemas & On-Disk Storage](#4-data-schemas--on-disk-storage)
5. [Pass 1 Deterministic Extractor & Intent Mining](#5-pass-1-deterministic-extractor--intent-mining)
6. [Two-Tier Graph Compaction & Archival](#6-two-tier-graph-compaction--archival)
7. [Embedded MCP Server (Port 3012 & Stdio)](#7-embedded-mcp-server-port-3012--stdio)
8. [Zero-Friction MCP Onboarding & Agent Directives](#8-zero-friction-mcp-onboarding--agent-directives)
9. [One-Click PR Description Generator](#9-one-click-pr-description-generator)
10. [Build, Test, and Packaging Pipeline](#10-build-test-and-packaging-pipeline)
11. [Deleted & Deprecated Legacy Components](#11-deleted--deprecated-legacy-components)
12. [Governed Agent System (.agents/)](#12-governed-agent-system-agents)

---

## 1. Executive Summary & Core Philosophy

**ContextLens Local Core** is a 100% local-first, zero-cloud developer context engine and persistent knowledge graph packaged as a native Visual Studio Code extension.

### The Problem It Solves
Modern AI coding assistants (Cursor, Claude Desktop, Antigravity, GitHub Copilot) treat every conversation as a blank slate. When a developer starts a new chat, the AI has no memory of:
- Architectural decisions made 2 hours ago.
- Why specific files or symbols were modified.
- The intent behind complex refactors.
Previous solutions attempted to solve this by streaming repository changes to cloud SaaS backends, introducing security risks, high subscription costs, and latency.

### The ContextLens Solution
ContextLens turns the local repository itself into a persistent contextual graph:
1. **Zero-Cloud & 100% Private**: All metadata is stored strictly in `<workspaceRoot>/.contextlens/` (automatically gitignored). Diffs and code never leave the local machine.
2. **Zero-Token Symbol Extraction**: A deterministic AST/regex parser extracts functions, classes, and types on save in `<5ms` with 0 LLM tokens.
3. **Passive Intent Mining**: Code comments (`// WHY:`, `// DECISION:`, etc.) and Git commit body explanations are mined automatically into first-class decision nodes.
4. **Universal MCP Server**: Runs a lightweight local server on `127.0.0.1:3012` and stdio, giving Cursor, Claude Desktop, and Antigravity instant access to episode graphs and decision logging.
5. **Two-Tier Compaction**: Prunes leaf symbol nodes to `.contextlens/archive/` when an episode closes, keeping the active graph lean (<100 KB) across hundreds of sessions.
6. **One-Click PR Generator**: Aggregates the episode graph, diff, and mined decisions to generate a complete GitHub PR description offline or with BYOK Gemini.

---

## 2. Complete Repository Layout

```text
ContextLens/
├── .agents/                                # Governed Agent Supervisor Ecosystem
│   ├── memory/
│   │   ├── capability_inventory.json       # Registered tools, skills, and MCP servers
│   │   ├── error_ledger.md                 # Post-mortems, anti-patterns, and bug resolutions
│   │   └── learnings.md                    # Accumulated project patterns and conventions
│   └── skills/
│       ├── caveman/                        # Ultra-compressed communication skill
│       ├── council/                        # 6-perspective LLM peer review & trade-off critique
│       ├── jeorge/                         # Routing, stack selection, and execution planner
│       ├── neo/                            # Web product discovery & market research
│       └── supervisor/                     # Master governed supervisor and self-healing engine
│
├── docs/                                   # Documentation
│   ├── ARCHITECTURE.md                     # Complete architectural design specification
│   ├── CONTEXT.md                          # Consolidated technical context
│   ├── PRIVACY.md                          # Zero-cloud local privacy policy
│   ├── ROADMAP.md                          # Project roadmap and upcoming milestones
│   └── SECURITY.md                         # Security posture and vulnerability reporting
│
├── vscode-extension/                       # Core VS Code Extension (TypeScript)
│   ├── .mocharc.json                       # Mocha test runner configuration
│   ├── .vscodeignore                       # Production VSIX packaging filter (slims to 61KB)
│   ├── package.json                        # Extension manifest, contributes, scripts
│   ├── tsconfig.json                       # Extension TypeScript configuration
│   ├── tsconfig.test.json                  # Test runner TypeScript configuration
│   ├── webpack.config.js                   # Webpack bundler for production dist/extension.js
│   ├── mcp-bridge.js                       # Stdio JSON-RPC to HTTP bridge for Claude/Cursor
│   │
│   ├── src/
│   │   ├── extension.ts                    # Extension entrypoint, activation, commands
│   │   ├── episodeStore.ts                 # Local episode lifecycle (.contextlens/episodes.json)
│   │   ├── prGenerator.ts                  # One-click PR generator (offline & BYOK Gemini)
│   │   ├── watchers.ts                     # File save & Git commit watchers
│   │   ├── redaction.ts                    # Secret pattern scrubbing (API keys, tokens)
│   │   ├── statusBar.ts                    # Status bar indicator and item
│   │   ├── stateTreeProvider.ts            # Sidebar tree view for active episodes
│   │   ├── mcpServer.ts                    # HTTP server (port 3012) & SSE endpoints
│   │   │
│   │   ├── graph/                          # Local Knowledge Graph Engine
│   │   │   ├── graphStore.ts               # Core graph CRUD, atomic disk sync, compaction
│   │   │   └── extractor.ts                # Pass 1 deterministic AST/regex parser & miner
│   │   │
│   │   └── mcp/                            # Modular Model Context Protocol Implementation
│   │       ├── FeatureFlag.ts              # Runtime feature flags
│   │       ├── RateLimiter.ts              # Token-bucket rate limiter with burst protection
│   │       ├── TokenManager.ts             # Rotating 30-minute bearer token auth
│   │       ├── ToolRegistry.ts             # Dynamic tool registration and dispatch
│   │       ├── ClientIdentityTracker.ts    # Connected AI client tracking
│   │       ├── Validation.ts               # JSON Schema tool argument validator
│   │       └── tools/
│   │           ├── index.ts                # Tool registry bootstrap
│   │           ├── graph.ts                # contextlens_get_graph, contextlens_log_decision
│   │           ├── episode.ts              # contextlens_status, contextlens_list_episodes
│   │           ├── search.ts               # contextlens_search
│   │           ├── git.ts                  # contextlens_explain_diff, contextlens_git_status
│   │           └── ai.ts                   # log_ai_call
│   │
│   └── test/
│       ├── graph.test.ts                   # Unit tests for extractor, graphStore, compaction
│       ├── security.test.ts                # Unit tests for rate limiting, auth, validation
│       └── tools.test.ts                   # Unit tests for MCP server tool dispatch
│
├── CHANGELOG.md                            # Release history (Keep a Changelog format)
├── CODE_OF_CONDUCT.md                      # Contributor Covenant v2.1
├── CONTRIBUTING.md                          # Contribution guidelines
├── LICENSE                                 # MIT License
├── README.md                               # Primary project README (Local Core focus)
├── ROADMAP.md                              # Release milestones and future vision
└── package.json                            # Root workspace script runner
```

---

## 3. Architecture & Data Flow

```text
               DEVELOPER ACTIONS
   (File Save, Editor Edit, Git Commit)
                    │
                    ▼
     [Pass 1 Deterministic Extractor]
     - Multi-language AST/regex (<5ms)
     - Intent comment scanner (WHY:, DECISION:)
     - Git commit body parser (lines 3+)
                    │
                    ▼
         [Local GraphStore Engine]
    ┌──────────────────────────────────────┐
    │  <workspace>/.contextlens/           │
    │  ├── graph.json (Active Nodes/Edges) │
    │  ├── episodes.json (Work Sessions)   │
    │  └── archive/<id>.json (Compacted)   │
    └──────────────────┬───────────────────┘
                       │
       ┌───────────────┴─────────────────┐
       ▼                                 ▼
[Embedded MCP Server]           [One-Click PR Generator]
- Port 3012 & Stdio             - contextlens.generatePrFromGraph
- Rotating Token Auth           - Assembles episode subgraph
- Rate Limiting                 - Formats Markdown PR
       │                                 │
       ▼                                 ▼
[External AI Clients]           [Clipboard & VS Code Tab]
- Cursor (.cursor/mcp.json)
- Claude Desktop
- Antigravity IDE
```

---

## 4. Data Schemas & On-Disk Storage

All state is stored within `<workspaceRoot>/.contextlens/`. This directory is automatically appended to `<workspaceRoot>/.gitignore` on extension startup.

### 4.1. Graph Schema (`.contextlens/graph.json`)
```typescript
interface GraphStoreData {
  version: number;        // Currently 1
  projectId: string;      // Workspace identifier
  updatedAt: string;      // ISO timestamp
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;             // e.g. "file:src/auth.ts", "sym:src/auth.ts:login", "dec:uuid"
  type: 'file' | 'symbol' | 'decision' | 'concept' | 'commit' | 'episode';
  label: string;          // Human-readable title
  metadata: {
    language?: string;    // e.g. "typescript", "python"
    kind?: string;        // "function" | "class" | "interface" | "struct" | "method"
    episodeId?: string;   // Active episode context
    rationale?: string;   // For decision nodes
    commitHash?: string;  // For commit nodes
    source?: string;      // "code_comment" | "commit_body" | "mcp_agent" | "regex"
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface GraphEdge {
  source: string;         // Source node id
  target: string;         // Target node id
  relation: 'defines' | 'modifies' | 'depends_on' | 'decided_in' | 'belongs_to' | 'commits';
  weight: number;         // Defaults to 1.0
  confidence: 'EXTRACTED' | 'AI_INFERRED' | 'USER_ASSERTED'; // 1.0, 0.8, 1.0
  metadata?: Record<string, any>;
}
```

### 4.2. Episode Schema (`.contextlens/episodes.json`)
```typescript
interface Episode {
  id: string;             // UUID or timestamp-based ID
  name: string;           // Descriptive name (e.g., "Refactor Auth Middleware")
  branch: string;         // Git branch name
  createdAt: string;      // ISO timestamp
  closedAt?: string;      // ISO timestamp (if closed)
  status: 'active' | 'closed' | 'paused';
  summary?: string;       // High-level session summary
  modifiedFiles: string[];// List of relative file paths touched
}
```

### 4.3. Archived Subgraph Schema (`.contextlens/archive/<episodeId>.json`)
```typescript
interface ArchiveRecord {
  episodeId: string;
  archivedAt: string;
  prunedSymbolsCount: number;
  nodes: GraphNode[];     // Pruned sym:* nodes
  edges: GraphEdge[];     // Associated defines edges
}
```

---

## 5. Pass 1 Deterministic Extractor & Intent Mining

Located in [vscode-extension/src/graph/extractor.ts](file:///c:/Users/shasa/Projects/ContextLens/vscode-extension/src/graph/extractor.ts).

### 5.1. Zero-Token Symbol Parsing
Parses buffer contents on document save with zero external network or process dependencies in `<5ms`:
- **TypeScript / JavaScript**:
  - Functions: `function foo(...)`, `async function foo(...)`, `const foo = (...) =>`, `foo(...) {`
  - Classes: `class Foo`, `abstract class Foo`
  - Types: `interface Foo`, `type Foo =`
- **Python**:
  - `def foo(...)`, `async def foo(...)`, `class Foo`
- **Go**:
  - `func foo(...)`, `func (r *Receiver) foo(...)`, `type Foo struct`, `type Foo interface`
- **Rust**:
  - `fn foo(...)`, `pub fn foo(...)`, `struct Foo`, `enum Foo`, `trait Foo`, `impl Foo`
- **Java**:
  - `class Foo`, `interface Foo`, `enum Foo`, method signatures with access modifiers.

### 5.2. Passive Intent Comment Mining
Extracts developer rationale directly from added or modified code comments:
- **Pattern**:
  ```regexp
  (?:\/\/|#|\/\*)\s*(?:WHY|DECISION|REFACTOR|NOTE|ARCH|FIX):\s*([^\r\n*]+)
  ```
- **Behavior**: Creates a `decision` node with `confidence: 'EXTRACTED'`, `weight: 1.0`, linked via `decided_in` edge to the active episode and `modifies` edge to the enclosing file.

### 5.3. Git Commit Body Mining
Extracts rationale from Git commit messages:
- Triggered by file saves targeting `.git/COMMIT_EDITMSG`.
- Subject line (line 1) is recorded as a `commit` node.
- Body paragraphs (lines 3+) are extracted as `decision` nodes attached to the commit and episode.

---

## 6. Two-Tier Graph Compaction & Archival

Located in [vscode-extension/src/graph/graphStore.ts](file:///c:/Users/shasa/Projects/ContextLens/vscode-extension/src/graph/graphStore.ts).

### The Graph Bloat Problem
In long-running repositories, tracking every function and class modification creates thousands of nodes, causing `graph.json` to exceed megabytes and slowing down AI context injection.

### Two-Tier Solution
When an episode closes (`closeEpisode()` in `episodeStore.ts`):
1. `compactEpisodeSymbols(episodeId)` is executed.
2. All leaf `sym:*` nodes belonging to the closed episode are removed from the active `graph.json`.
3. Pruned symbols and their `defines` edges are written to `.contextlens/archive/<episodeId>.json`.
4. High-level `file`, `decision`, `commit`, and `episode` nodes remain in `graph.json`.
5. **Result**: The active working graph stays under **100 KB** indefinitely while full granular history remains archived locally.

---

## 7. Embedded MCP Server (Port 3012 & Stdio)

Located in [vscode-extension/src/mcp/](file:///c:/Users/shasa/Projects/ContextLens/vscode-extension/src/mcp/) and `mcpServer.ts`.

### 7.1. Transports
- **HTTP / Server-Sent Events (SSE)**: Listens strictly on `127.0.0.1:3012`.
- **Stdio Bridge**: `mcp-bridge.js` acts as a stdio proxy between Claude Desktop / Cursor and the local HTTP server.

### 7.2. Security Architecture
- **Rotating Bearer Token**: Stored in VS Code secret storage, rotates every 30 minutes with a 1-minute transition grace period.
- **Constant-Time Comparison**: Mitigates timing attacks on authorization headers.
- **Rate Limiting**: Token-bucket algorithm enforces per-client limits:
  - Standard endpoints: 120 calls/min (burst: 30)
  - Expensive endpoints: 10 calls/min (burst: 2)

### 7.3. MCP Tool Catalog
| Tool Name | Category | Description | Parameters |
|---|---|---|---|
| `contextlens_get_graph` | `memory` | Inspects full graph or active episode subgraph | `episodeId` (opt), `maxDepth` (opt), `nodeTypes` (opt) |
| `contextlens_log_decision` | `memory` | External AI writes decision rationale to graph | `summary` (req), `rationale` (opt), `files` (opt), `symbols` (opt), `episodeId` (opt) |
| `contextlens_status` | `episode` | Returns active episode state and modified file counts | none |
| `contextlens_explain_diff` | `git` | Generates semantic explanation of git diff | `filePath` (opt) |
| `contextlens_search` | `search` | Searches local episodes and graph nodes | `query` (req), `limit` (opt) |

---

## 8. Zero-Friction MCP Onboarding & Agent Directives

Command: `ContextLens: Auto-Setup MCP in AI Clients` (`contextlens.autoSetupMcp`)  
Command: `ContextLens: Install Agent Memory Directives` (`contextlens.installAgentRules`)

### 8.1. Automatic Client Configuration
On command execution, ContextLens discovers and atomically updates configuration files:
1. **Cursor Workspace**: Creates or merges `<workspaceRoot>/.cursor/mcp.json`:
   ```json
   {
     "mcpServers": {
       "contextlens": {
         "command": "node",
         "args": ["<pathToExtension>/mcp-bridge.js"]
       }
     }
   }
   ```
2. **Cursor Global**: Merges into `~/.cursor/mcp.json`.
3. **Claude Desktop**: Merges into `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS).

### 8.2. Agent Memory Prompt Directives
Injects standard instructions into workspace `.cursorrules` and `CLAUDE.md`:
```markdown
# ContextLens Memory Directives
Before starting non-trivial tasks:
1. Call `contextlens_get_graph` to inspect recent architectural decisions and modified symbols.
2. After implementing major architectural changes, refactors, or fixes, call `contextlens_log_decision` with your summary and rationale.
```

---

## 9. One-Click PR Description Generator

Command: `ContextLens: Generate PR from Graph` (`contextlens.generatePrFromGraph`)  
Located in [vscode-extension/src/prGenerator.ts](file:///c:/Users/shasa/Projects/ContextLens/vscode-extension/src/prGenerator.ts).

### 9.1. Execution Flow
1. Developer runs the command from VS Code Command Palette.
2. ContextLens fetches the active episode subgraph:
   - Modified files list.
   - Touched symbols (functions, classes).
   - Mined decision nodes (`WHY:`, `DECISION:`, commit bodies).
   - Git commit log & diff summary.
3. **Synthesis Engine**:
   - **Mode A (BYOK Gemini)**: If `contextlens.apiKey` is configured in VS Code settings, calls Google Gemini (`gemini-2.0-flash` or `gemini-1.5-pro`) to draft an executive narrative PR.
   - **Mode B (Deterministic Offline Fallback)**: If no API key is present or user is offline, formats a structured PR markdown using local AST symbols and mined decisions directly (0 tokens, 100% offline).
4. **Delivery**:
   - Copies markdown to system clipboard.
   - Opens a new side-by-side editor tab (`ContextLens-PR-<episodeId>.md`) for immediate review.

---

## 10. Build, Test, and Packaging Pipeline

### 10.1. Root Workspace Scripts
Located in root `package.json`:
- `npm test`: Runs `npm --prefix vscode-extension run test:unit` (Mocha runner).
- `npm run compile`: Runs Webpack compilation in `vscode-extension`.
- `npm run watch`: Webpack incremental watcher.
- `npm run package`: Webpack production bundle with hidden source-maps.
- `npm run package:vsix`: Builds production `.vsix` bundle via `vsce`.

### 10.2. Production VSIX Packaging Optimization
- Controlled by [vscode-extension/.vscodeignore](file:///c:/Users/shasa/Projects/ContextLens/vscode-extension/.vscodeignore):
  - Excludes `src/**`, `test/**`, `out/**`, `*.map`, `tsconfig*.json`, `.mocharc.json`.
  - Includes only `dist/extension.js`, `mcp-bridge.js`, `package.json`, `README.md`, `LICENSE.txt`, and `resources/`.
- **Bundle Size**: **61.52 KB** (reduced by 86% from unconstrained 434 KB).
- **Test Coverage**: 38/38 unit tests passing in <100ms.

---

## 11. Deleted & Deprecated Legacy Components

As of version `1.0.3`, all multi-service cloud baggage was removed from the codebase to guarantee 100% local operation:
- **`src/` (Root)**: Deleted legacy Firebase Cloud Functions v2 backend (`apps/`, `services/`, `middleware/`, `firebase.js`).
- **`contextlens-dashboard/`**: Deleted legacy React/Tailwind web dashboard.
- **`contextlens-cli/` & `packages/`**: Deleted legacy CLI and duplicate SDK packages.
- **Firebase Infrastructure**: Deleted `firebase.json`, `firestore.rules`, `.firebaserc`, `.firebase/`.
- **`chatViewProvider.ts`**: Deleted unused 400-line VS Code chat sidebar webview.

---

## 12. Governed Agent System (`.agents/`)

ContextLens includes a governed autonomous agent hierarchy under `.agents/`:
- **`/supervisor`** ([SKILL.md](file:///c:/Users/shasa/Projects/ContextLens/.agents/skills/supervisor/SKILL.md)): Central governor; operates with relentless persistence until tasks compile and pass verification; updates error ledger and learnings.
- **`/jeorge`** ([SKILL.md](file:///c:/Users/shasa/Projects/ContextLens/.agents/skills/jeorge/SKILL.md)): Route and architecture planner; evaluates Route A/B/C trade-offs.
- **`/neo`** ([SKILL.md](file:///c:/Users/shasa/Projects/ContextLens/.agents/skills/neo/SKILL.md)): Web product discovery and competitive benchmark researcher.
- **`/council`** ([SKILL.md](file:///c:/Users/shasa/Projects/ContextLens/.agents/skills/council/SKILL.md)): 6-perspective LLM peer review council (Customer, Market, Architect, Business, Risk, Critic).
- **`/caveman`** ([SKILL.md](file:///c:/Users/shasa/Projects/ContextLens/.agents/skills/caveman/SKILL.md)): Ultra-compressed token communication mode.
- **Memory Ledgers**:
  - `learnings.md`: Persistent workspace rules and engineering conventions.
  - `error_ledger.md`: Catalog of encountered errors, root causes, and generated anti-pattern rules.
  - `capability_inventory.json`: Live registry of verified modules and tools.
