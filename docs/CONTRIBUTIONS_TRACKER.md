# Changelog - 50 Contributions to ContextLens

This document tracks the 50 contributions made to the ContextLens project to improve its robustness, documentation, and feature set.

## [1.0.0] - 2026-05-13

### Phase 1: Repository Standards (5/5)
- [x] 1. Update `.gitignore` to exclude `coverage/`, `dist/`, and `.env` files.
- [x] 2. Add `CONTRIBUTING.md` with guidelines for new developers.
- [x] 3. Add `CODE_OF_CONDUCT.md` using the Contributor Covenant.
- [x] 4. Add `LICENSE` file (MIT).
- [x] 5. Create a `docs/` directory and add an `ARCHITECTURE.md` overview.

### Phase 2: Documentation & CLI (7/15)
- [x] 6. Add JSDoc to `src/index.js` (API server entry point).
- [x] 7. Document `package.json` scripts in `README.md`.
- [x] 8. Add JSDoc to `vscode-extension/src/episodeStore.ts`.
- [x] 9. Add JSDoc to `vscode-extension/src/syncEngine.ts`.
- [x] 10. Add JSDoc to `vscode-extension/src/apiClient.ts`.
- [x] 11. Create `cli/` folder and move `contextlens-cli.js` (as `index.js`).
- [x] 12. Create `cli/README.md` with setup and command reference.
- [x] 13. Consolidated CLI into a standalone `cl` command.
- [x] 14. Cleaned up legacy migration and documentation scripts.
- [ ] 15. Create `docs/API_REFERENCE.md`.

### Phase 3: Code Quality & Consistency (5/15)
- [x] 16. Refactor `extension.ts` and extract `statusBar.ts` (includes bugfix for `episodeStore` undefined).
- [x] 17. Use `async/await` consistently in `episodeStore.ts` and add validation.
- [x] 18. Optimize `syncEngine.ts` interval and flush logic.
- [x] 19. Implement `StatusBarManager` to handle status bar lifecycle.
- [x] 20. Update root `package.json` with correct `bin` paths and metadata.

### Phase 4: UI/UX & Features (3/15)
- [x] 49. Implement "Keyboard Shortcuts" for extension (Ctrl+Shift+L for Log, Ctrl+Shift+S for Sync).
- [ ] 50. Add "Git Commit Linking".
- [ ] 36. Add a loading spinner to the extension chat webview.
- [ ] 39. Implement a dark mode theme for the dashboard.

