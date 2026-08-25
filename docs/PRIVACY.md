# Privacy Policy — ContextLens

How ContextLens handles your codebase data and secrets. Last updated: 2026-08-11.

## 1. Offline-First Capture

ContextLens is designed to be **offline-first**. The VS Code extension captures
coding intent locally:

- Git branch/commit/diff snapshots are captured in memory and on disk.
- AI interactions are queued in a local sync queue (`cl_queue.json`) in VS Code
  global storage.
- Episodes and calls are persisted in VS Code workspace state.

**Redaction:** Before any diff, prompt, or response leaves your machine, secret
patterns (API keys, tokens, private keys, connection strings) are stripped
locally by the extension's redaction engine.

## 2. Optional Cloud Synchronization

Sync to the ContextLens backend (Firebase) is **opt-in** — you must sign in to
the extension. When enabled, the following is uploaded over HTTPS to your
authenticated project:

- Project and episode metadata.
- File diff summaries (after local redaction).
- Recorded AI prompt/response text (after local redaction).

Your AI provider API keys are **not** synced as plaintext. If you store a
provider key via the extension or dashboard, it is encrypted at rest with
AES-256-GCM (`SETTINGS_ENCRYPTION_KEY`) before being written to Firestore and is
never returned to clients in plaintext.

## 3. Keychain Security

Third-party LLM API keys you provide are kept out of plaintext config files:

- Keys entered in the VS Code extension live in `vscode.SecretStorage`, which
  binds to your OS secure keychain (Keychain Access / Credential Manager /
  Secret Service).
- Keys stored in the backend dashboard are encrypted at rest (AES-256-GCM) and
  only decrypted in memory for the duration of a request.

## 4. Analytics & Telemetry

- The extension's telemetry is a console-only event logger; no analytics
  payloads are transmitted.
- The backend emits structured audit logs (event type, request id, uid) and
  Sentry error reports with PII disabled (`sendDefaultPii: false`). Raw diffs,
  full conversations, and key material are excluded from logs and metrics.
- No third-party tracking cookies are used.

## 5. Data Deletion

Deleting a project in the dashboard removes its episodes and calls from
Firestore under `users/{uid}/projects/{projectId}`. Local queue and workspace
state are cleared when you sign out or remove the extension.

## Contact

Security / privacy questions: `security@contextlens.dev` (48h acknowledgement
SLA). See also [SECURITY.md](./SECURITY.md).
