# Changelog

All notable changes to ContextLens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-14

### Major Pivot: ContextLens Local Core

Transitioned ContextLens into a 100% local-first, zero-cloud developer context engine and persistent knowledge graph.

#### Added
- **Local Workspace Storage**:
  - `GraphStore` managing `<workspaceRoot>/.contextlens/graph.json` and `.contextlens/archive/`.
  - Automatic gitignore protection for `.contextlens/`.
  - Offline-first `episodeStore.ts` saving sessions to `.contextlens/episodes.json`.
- **Pass 1 Deterministic Extractor**:
  - Zero-token multi-language AST/regex parser for TypeScript, JavaScript, Python, Go, Rust, Java.
  - Automatic extraction of functions, methods, classes, interfaces, structs, and types on save.
  - Intent comment mining: extracts `// WHY:`, `// DECISION:`, `// NOTE:`, `// REFACTOR:`, `// ARCH:`, `// FIX:` as first-class decision nodes with confidence 1.0.
  - Git commit body mining: extracts commit body rationale into linked decision nodes.
- **Embedded MCP Graph Tools**:
  - `contextlens_get_graph`: Subgraph inspection for Cursor, Claude Desktop, Antigravity.
  - `contextlens_log_decision`: Lets external AI agents append architectural reasoning to the graph.
- **One-Click PR Generator**:
  - `ContextLens: Generate PR from Graph`: Assembles episode subgraph and generates PR description offline or via BYOK Gemini.
- **Zero-Friction MCP Onboarding**:
  - `ContextLens: Auto-Setup MCP in AI Clients`: Automates configuration of `.cursor/mcp.json`, `~/.cursor/mcp.json`, Claude Desktop, and agent prompt rules.
  - `ContextLens: Install Agent Memory Directives`: Writes prompt directives into `.cursorrules` and `CLAUDE.md`.
- **Two-Tier Graph Compaction**:
  - Prunes detailed leaf symbol nodes (`sym:*`) to `.contextlens/archive/<id>.json` on episode close.
  - Retains high-level decision and file nodes in `graph.json` to keep active file under 100 KB.
- **VSIX Packaging**:
  - Added `.vscodeignore` to slim package from 434 KB down to 61.58 KB.

#### Removed & Decoupled
- Stripped Firebase Cloud Functions backend (`src/`).
- Removed React web dashboard (`contextlens-dashboard/`).
- Removed legacy CLI and duplicate packages (`contextlens-cli/`, `packages/`).
- Removed custom chat sidebar webview (`chatViewProvider.ts`).
- Removed Firebase config files (`firebase.json`, `firestore.rules`, `.firebaserc`).
