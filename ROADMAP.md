# ContextLens Roadmap

## v1.0 — Local Core Pivot (Current Scope)

**Goal:** Provide a 100% local-first, zero-cloud developer context engine and knowledge graph for VS Code.

### ✅ Completed in Local Core v1.0
- [x] **Local Workspace Knowledge Graph**: `.contextlens/graph.json` and `.contextlens/episodes.json` strictly local and gitignored.
- [x] **Pass 1 Deterministic Extractor**: Zero-token AST/regex symbol extraction for TypeScript, JavaScript, Python, Go, Rust, Java.
- [x] **Passive Intent & Decision Mining**: Extracted intent comments (`WHY:`, `DECISION:`, `NOTE:`) and Git commit bodies into first-class graph decision nodes.
- [x] **Embedded MCP Server**: Running on `127.0.0.1:3012` with token auth and rate limiting; exposing `contextlens_get_graph` and `contextlens_log_decision`.
- [x] **Zero-Friction MCP Onboarding**: Auto-configures Cursor (`.cursor/mcp.json`), Claude Desktop, and injects agent directives (`.cursorrules`, `CLAUDE.md`).
- [x] **One-Click PR Generation**: `ContextLens: Generate PR from Graph` command generating PR descriptions offline or via BYOK Gemini.
- [x] **Two-Tier Graph Compaction**: Prunes leaf symbols to `.contextlens/archive/<id>.json` on episode close while preserving decision and file summary nodes.
- [x] **Lean VSIX Packaging**: 61.58 KB bundle containing compiled assets and runtime bridge.
- [x] **Decoupling**: Removed legacy Firebase cloud functions backend and React dashboard.

---

## v1.1 — Enhanced Developer Experience (Next Milestone)

- [ ] **Local Graph Visualizer**: Lightweight interactive webview or SVG export showing episode graph evolution.
- [ ] **Tree-sitter AST Parsing**: Optional native Tree-sitter parsers for deeper type-hierarchy extraction.
- [ ] **Automated Commit Suggestions**: Generate commit messages using active episode subgraph changes.
- [ ] **Configurable Compaction Thresholds**: User settings for symbol retention and graph max size.
- [ ] **Cross-Editor CLI / Daemon**: Standalone local daemon for Neovim and Zed.

---

## v1.2 — Collaborative & Cross-Project Context

- [ ] **Graph Export / Import**: Share redacted episode graphs with team members via Git commits (`.contextlens/shared/`).
- [ ] **Cross-Project Memory Linking**: Reference architectural decisions across multiple repositories.
- [ ] **Local Embeddings**: 100% on-device embedding index for semantic code search without external APIs.

---

## Priorities

1. **Local-First Privacy**: Never send code or diffs to external servers without explicit user invocation.
2. **Zero-Token Performance**: Minimize latency and token cost using deterministic parsing.
3. **Agent Interoperability**: First-class support for Cursor, Claude Desktop, Antigravity, and all standard MCP clients.
