# ContextLens Dashboard

Vite + React + TypeScript dashboard for ContextLens.

## Setup

```bash
npm install
cp .env.example .env   # fill in Firebase values
npm run dev            # local dev on :5173
```

## Build & Deploy

```bash
npm run build
firebase deploy --only hosting
```

## Environment Variables

See `.env.example`. All variables start with `VITE_`.

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console |
| `VITE_FIREBASE_APP_ID` | From Firebase console |
| `VITE_API_BASE_URL` | Deployed backend Cloud Functions URL |

## Firebase Hosting

Ensure `firebase.json` at project root has:

```json
{
  "hosting": {
    "public": "contextlens-dashboard/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```
