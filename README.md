<div align="center">

<img src="vscode-extension/resources/icon.png" alt="ContextLens" width="128" />

# ContextLens Local Core

**The 100% Local-First AI Context Engine & Persistent Knowledge Graph for VS Code.**

Capture coding intent, extract symbols with zero tokens, maintain an evolving decision graph, and expose your development context to any MCP-compatible AI agent—completely offline and private.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.80%2B-007ACC?style=flat-square&logo=visual-studio-code)](https://code.visualstudio.com)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Compatible-brightgreen?style=flat-square)](https://modelcontextprotocol.io)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-success?style=flat-square)](#-privacy--zero-cloud-guarantee)

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Features](#-core-features) · [MCP Integration](#-mcp-integration) · [Commands](#-vs-code-commands)

</div>

---

## 🤔 Why ContextLens Local Core?

Every coding session generates ephemeral context that AI tools (Cursor, Claude, Antigravity) lose between chats. Traditional approaches attempt to sync your code to cloud servers or run expensive LLM passes on every keystroke.

**ContextLens Local Core** solves this with a lean, zero-cloud architecture:
- **Zero Cloud Dependence:** No accounts, no subscriptions, no cloud databases. All state lives inside your repository in `.contextlens/` (automatically gitignored).
- **Pass 1 Deterministic Extractor:** Extracts functions, classes, and types using AST/regex parsing in `<5ms` with **0 tokens**.
- **Passive Intent Mining:** Automatically discovers decisions from code comments (`// WHY:`, `// DECISION:`) and Git commit bodies.
- **Embedded MCP Server:** Exposes your active episode context and persistent graph directly to Cursor, Claude Desktop, and Antigravity over local stdio or `127.0.0.1:3012`.
- **One-Click PR Generator:** Assembles your active episode subgraph and generates a GitHub PR description offline or with your BYOK Gemini key.

---

## ⚡ Quick Start

### 1. Install the Extension
Download the latest `.vsix` bundle or package it directly from source:
```powershell
# In repository root
npm run package:vsix

# Install into VS Code
code --install-extension vscode-extension/contextlens-agent-1.0.3.vsix
```

### 2. Auto-Setup MCP in Your AI Clients
Open VS Code Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:
```text
ContextLens: Auto-Setup MCP in AI Clients
```
This automatically configures:
- **Cursor Workspace:** `<workspaceRoot>/.cursor/mcp.json`
- **Cursor Global:** `~/.cursor/mcp.json`
- **Claude Desktop:** `%APPDATA%\Claude\claude_desktop_config.json` (or macOS equivalent)
- **Agent Rules:** Injects prompt directives into `.cursorrules` and `CLAUDE.md`.

---

## 🏗️ Architecture

```text
  Developer Actions (Save, Edit, Git Commit)
                    │
                    ▼
     Pass 1 Deterministic Extractor (0 tokens, <5ms)
   ┌───────────────────────────────────────────────┐
   │ • Regex/AST multi-language parser             │
   │ • Intent tags: WHY:, DECISION:, NOTE:, ARCH:  │
   │ • Git commit body rationale extractor         │
   └───────────────────────┬───────────────────────┘
                           ▼
              Local Knowledge Graph (.contextlens/)
   ┌───────────────────────────────────────────────┐
   │ graph.json (Files, Decisions, Active Episode) │
   │ archive/<id>.json (Compacted leaf symbols)    │
   └───────────────┬───────────────────────────────┘
                   │
         ┌─────────┴────────────────────────┐
         ▼                                  ▼
   Embedded MCP Server              One-Click PR Generator
 (127.0.0.1:3012 / stdio)        (Offline or BYOK Gemini)
         │                                  │
         ▼                                  ▼
Cursor / Claude / Antigravity       Formatted GitHub PR Body
```

---

## ✨ Core Features

### 1. Local Workspace Knowledge Graph
All data is stored inside `.contextlens/` at your workspace root:
- `graph.json`: Nodes (`file`, `symbol`, `decision`, `commit`, `episode`) and weighted edges (`EXTRACTED` = 1.0, `AI_INFERRED` = 0.8).
- `episodes.json`: Workspace work sessions and file save timelines.
- `archive/`: Archived leaf symbols for closed episodes.

### 2. Zero-Token Deterministic Extractor
The Pass 1 engine parses modified files instantaneously on save without sending any code to an LLM:
- **Supported Languages:** TypeScript, JavaScript, Python, Go, Rust, Java.
- **Extracted Symbols:** Functions, methods, classes, interfaces, structs, types.
- **Intent Comment Mining:** Annotate your code with intent comments:
  ```typescript
  // WHY: Debounce autosave to prevent disk thrashing during rapid edits
  // DECISION: Cache token validation in memory with 30s TTL
  ```
  ContextLens automatically converts these comments into first-class `decision` nodes in the active graph.
- **Commit Body Mining:** Paragraphs written in commit messages (line 3+) are automatically linked as decision nodes to the commit and episode.

### 3. Two-Tier Graph Compaction
As your project grows across dozens of episodes, active `graph.json` stays lean and under 100 KB:
- When an episode closes, detailed `sym:*` (symbol) nodes are pruned from `graph.json` and archived in `.contextlens/archive/<episodeId>.json`.
- High-level `file`, `decision`, and `episode` summary nodes remain in `graph.json` for fast semantic retrieval.

### 4. Embedded MCP Server
ContextLens runs an embedded Model Context Protocol (MCP) server on port `3012` with rotating authentication tokens and rate limiting:
- `contextlens_get_graph`: Lets external AI clients inspect the active episode's subgraph or project graph.
- `contextlens_log_decision`: Allows external AI agents to record design decisions directly into the graph.
- `contextlens_status`: Returns current episode metadata and active file count.
- `contextlens_explain_diff`: Analyzes active changes against the workspace state.

### 5. One-Click PR Generation
Generate comprehensive pull request descriptions with a single command:
1. Run `ContextLens: Generate PR from Graph` in the Command Palette.
2. ContextLens aggregates modified files, extracted symbols, mined decisions, and commit history.
3. Formats a structured PR summary (copied to clipboard and opened in a Markdown tab).
4. Supports offline deterministic generation or optional BYOK Gemini enhancement (`contextlens.apiKey`).

---

## 🔒 Privacy & Zero-Cloud Guarantee

ContextLens Local Core is built on strict local-first principles:
- **No telemetry by default.**
- **No cloud dependencies or mandatory user accounts.**
- **`.contextlens/` is automatically added to `.gitignore`.**
- **All MCP bindings listen strictly on `127.0.0.1`.**

---

## ⌨️ VS Code Commands

| Command | Title | Description |
|---|---|---|
| `contextlens.generatePrFromGraph` | **Generate PR from Graph** | Builds markdown PR description from active episode subgraph |
| `contextlens.autoSetupMcp` | **Auto-Setup MCP in AI Clients** | Configures Cursor, Claude Desktop, and agent rules |
| `contextlens.installAgentRules` | **Install Agent Memory Directives** | Writes directives to `.cursorrules` and `CLAUDE.md` |
| `contextlens.newEpisode` | **New Episode** | Starts a new contextual work session |
| `contextlens.closeEpisode` | **Close Episode** | Finalizes session and compacts symbols to archive |
| `contextlens.quickStatus` | **Quick Status** | Displays active episode and graph summary in status bar |

---

## 🛠️ Development & Building

```powershell
# Clone the repository
git clone https://github.com/Noventra-Labs/ContextLens.git
cd ContextLens

# Install dependencies in vscode-extension
cd vscode-extension
npm install

# Run unit test suite (38 passing tests)
npm run test:unit

# Build extension with Webpack
npm run compile

# Package production VSIX (61 KB)
npx @vscode/vsce package --no-dependencies
```

---

## 📄 License

MIT © [Noventra Labs](https://github.com/Noventra-Labs)
