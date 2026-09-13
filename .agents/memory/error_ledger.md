# ContextLens Supervisor — Mistake & Error Ledger

This ledger records errors, root causes, and generated anti-patterns to prevent repetitive mistakes.

## Anti-Pattern Index

### [ERR-20260914-01] VSIX Source File Inclusion Bloat
- **Symptom**: `vsce package` generated 434 KB package containing raw `src/`, `test/`, and `out/` files, with `Neither a .vscodeignore file nor a "files" property in package.json was found`.
- **Root Cause**: Missing `.vscodeignore` in extension root directory.
- **Anti-Pattern (Never Do)**: Running `vsce package` without explicit `.vscodeignore` or `files` whitelist.
- **Correct Pattern (Always Do)**: Maintain `.vscodeignore` that excludes `.vscode/`, `src/`, `test/`, `out/`, `*.map`, `tsconfig*.json`, reducing bundle to compiled `dist/` and assets (61 KB).

### [ERR-20260914-02] Lint Failure on Default Test Command
- **Symptom**: Running `npm test` triggered `pretest` step running `eslint` which errored when ESLint config is absent or mismatched.
- **Root Cause**: Package script `test` had `pretest` hook calling `npm run lint`.
- **Anti-Pattern (Never Do)**: Calling `npm test` when intending to verify unit test assertions only.
- **Correct Pattern (Always Do)**: Run targeted `npm run test:unit` directly invoking mocha runner to isolate logic tests from linter configuration.

