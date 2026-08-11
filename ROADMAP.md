# ContextLens Roadmap

## v1 — Foundation Release (current scope)

**Goal:** restore developer context to AI coding sessions. Everything below is
considered in-scope for the public v1 release.

### ✅ In v1 (done or in-progress)

- [x] VS Code capture (diffs, commits, file saves, branch switches)
- [x] Episode management (create/close/auto-name, stale detection, pause/resume)
- [x] Local MCP server (`127.0.0.1:3012`, rotating token auth, rate limiting)
- [x] MCP bridge (stdio JSON-RPC) for Claude Desktop, Cursor, Antigravity, Gemini CLI
- [x] Context search (`search_context`)
- [x] Dashboard timeline (projects, episodes, per-call transcripts)
- [x] Manual diff explanation (`explain_diff`) and PR summary (`summarize_branch`) — AI is never auto-invoked
- [x] Secure Firebase sync (opt-in, idempotency keys, ownership checks)
- [x] Secret redaction (local + backend) and encrypted provider keys

### v1 hardening (this sprint)

- [x] Resolve duplicate CLI binaries (`contextlens` vs `contextlens-mcp`)
- [x] Remove legacy `src/routes/api.js`
- [x] Harden MCP auth: constant-time token compare, request IDs, body limits, replay tests
- [x] Extend redaction patterns + crypto tests + key-rotation support
- [x] CI matrix: backend/dashboard/cli/extension tests, bridge smoke, gitleaks, bin-conflict check

---

## Deferred to v1.1 or later

These are explicitly **out of scope for v1** to keep the launch focused.

### v1.1 — Smarter capture

- [ ] Autonomous background agents
- [ ] Multi-agent workflows
- [ ] Auto-episode detection driven by more git signals
- [ ] Workspace-level AI summaries
- [ ] Repository-wide code indexing and embeddings (semantic memory)

### v1.1 — Platform polish

- [ ] Automatic commit operations
- [ ] Team collaboration and multi-user dashboards
- [ ] Cross-editor support (JetBrains, Zed, etc.)
- [ ] Long-term semantic memory across projects
- [ ] Episode retention/archival job (see [data-model.md](docs/data-model.md))

### v2 — Platform

- [ ] Plugin marketplace for community tools
- [ ] Custom resource providers
- [ ] Webhook integrations
- [ ] REST API for external services
- [ ] Self-hosted deployment option
- [ ] Slack/Discord notifications

---

## How We Prioritize

1. **User feedback** — Issues and feature requests drive priorities
2. **Security** — Security fixes ship immediately
3. **Stability** — Bug fixes before new features
4. **Community** — Features that help the most users come first

## Feature Requests

Have an idea? [Open a feature request](https://github.com/Noventra-labs/Contextlens/issues/new?template=feature_request.yml)
