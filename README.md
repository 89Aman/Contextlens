# ContextLens Backend (scaffold)

This repo contains a production-oriented Node.js Express backend for the ContextLens spec, including Firebase auth, Firestore isolation, and Vertex AI Gemini integration.

## Quick start

### Prerequisite: Node.js 18 or newer.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Provide Firebase and Vertex credentials in the environment:
   - Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON file with access to Firestore.
   - Set `GCP_PROJECT` or `GOOGLE_CLOUD_PROJECT`.
   - Set `USE_VERTEX=true`.
   - Set `VERTEX_MODEL` if you want a model other than `gemini-1.5-pro`.
   - Optional: `VERTEX_LOCATION=us-central1`, `VERTEX_TIMEOUT_MS=30000`, `VERTEX_RETRY_ATTEMPTS=2`.
   - Current pinned runtime package floor: `express@5.2.1`, `firebase-admin@13.9.0`, `body-parser@2.2.2`, `morgan=1.10.1`, `@google-cloud/vertexai=1.12.0`.

3. Run locally:
   ```bash
   npm start
   ```

## Endpoints

All endpoints require a `Authorization: Bearer <Firebase ID Token>` header.

- `POST /api/projects/create`
- `POST /api/episodes/create`
- `POST /api/calls/log`
- `POST /api/episodes/explain`
- `POST /api/branches/summarize`
- `POST /api/search`
- `POST /api/episodes/close`

## Notes

- AI calls use the Vertex AI Gemini SDK in `src/services/ai.js` and redact likely secrets before sending prompts or storing responses.
- If Vertex is unavailable or disabled, the service falls back to a mocked response so local development still works.
- Firestore security rules are in `firestore.rules` and enforce per-user access.

## Related Projects

- [ContextLens Web Dashboard](./dashboard/) - Built with Next.js (Builder Spec 3)
- [ContextLens VS Code Extension](./vscode-extension/) - Built with TypeScript (Builder Spec 1)

See the respective directories for detailed documentation on each component.