# ContextLens Supervisor — Learnings Ledger

This file records workspace conventions, environment patterns, architectural discoveries, and user preferences accumulated across sessions.

## Workspace & Environment Rules
- **OS Platform**: Windows (PowerShell / pwsh). All shell operations must use PowerShell syntax.
- **Extensions & Tooling**: ContextLens VS Code extension in `vscode-extension/`.
- **Core Triad Skills Available**:
  - `/jeorge`: Route and architecture decision agent in `.agents/skills/jeorge/`
  - `/neo`: Web product discovery agent in `.agents/skills/neo/`
  - `/council`: 6-perspective LLM council review in `.agents/skills/council/`
  - `/supervisor`: Master governed supervisor in `.agents/skills/supervisor/`

## ContextLens Local Core Discoveries & Rules
- **VSIX Packaging**: Without `.vscodeignore`, `vsce` packages raw TypeScript `src/`, `out/`, and tests (434 KB). With `.vscodeignore` excluding `src/**`, `test/**`, and `out/**`, VSIX size drops to 61.58 KB (86% reduction) containing only compiled `dist/extension.js` and runtime assets.
- **Pass 1 Deterministic Extractor**: Multi-language regex scanning on TS/JS, Python, Go, Java, and Rust runs in <5ms without external processes or AST parser dependencies. Intent comment extraction (`WHY:`, `DECISION:`, `NOTE:`, `REFACTOR:`, `ARCH:`, `FIX:`) and commit body lines 3+ automatically populate high-confidence decision nodes without LLM token cost.
- **Two-Tier Graph Compaction**: Keeping leaf symbols (`sym:*`) in active graph causes memory bloat. Moving leaf symbol nodes to `.contextlens/archive/<episodeId>.json` while retaining file, decision, and episode nodes keeps active graph under 100 KB across hundreds of episodes.
- **Agent Memory Directives**: Non-MCP agent clients (raw Cursor tab, raw Claude) can be conditioned to log decisions by writing declarative instruction blocks into workspace `.cursorrules` and `CLAUDE.md`.
- **Test Suite**: Mocha unit tests are directly executed via `npm run test:unit`. Default `npm test` runs pretest linting which requires ESLint configuration.

