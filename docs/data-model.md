# Episode Data Model

This document formalizes the ContextLens episode model: the lifecycle,
field rules, sync semantics, and edge-case behavior. It describes both the
current implementation and the recommended target for edge cases.

## Hierarchy

```
users/{uid}/
  projects/{projectId}/
    name, repoUrl, localWorkspaceName, defaultBranch, settings, timestamps
    episodes/{episodeId}/
      label, branchName, status (open|closed), startedAt, endedAt,
      callCount, changedFiles, latestDiffHash, manualNotes
      calls/{callId}/
        promptText, modelResponse, modelName, source, branchName,
        activeFilePath, relatedFiles, diffSnapshot, diffHash,
        todoMatches, latencyMs, tokenUsage, status, createdAt
      cache/{diffHash}/          # memoized explain-diff result
  settings/global/               # aiProvider + encrypted keys
  idempotency/{key}/             # request dedup
```

## Episode fields

| Field | Type | Mutability | Notes |
|-------|------|------------|-------|
| `id` | uuid | **immutable** | Client-generated UUID for offline-first creation |
| `label` / `name` | string | mutable | Human-readable task label |
| `status` | `open` \| `closed` | mutable | Set via `/episodes/create` and `/episodes/close` |
| `branchName` | string | mutable | Snapshot of the git branch at creation; updates on branch events |
| `startedAt` | number | immutable | ms epoch |
| `endedAt` | number \| null | mutable | Set when `status` becomes `closed` |
| `callCount` | number | backend-only | Incremented via `FieldValue.increment`; do not trust client value |
| `changedFiles` | string[] | mutable | Workspace-relative paths, capped at 100 |
| `latestDiffHash` | string \| null | mutable | MD5 of the most recent redacted diff |
| `manualNotes` | string | mutable | Free-form notes |

**Call fields:** `promptText` and `modelResponse` are capped (50k / 100k chars)
and **redacted** by the backend before storage. `source` is one of
`extension | git_commit | manual_log | chat | mcp`. `diffSnapshot` is capped at
6000 chars by the extension before sync.

## Lifecycle

Current implementation uses a two-state machine:

```
draft ──► active ──► closed
```

- **draft:** an episode whose `id` is a client UUID still in the offline sync
  queue (not yet acknowledged by the backend).
- **active:** persisted with `status: 'open'`; receiving new calls/diffs.
- **closed:** `status: 'closed'` with `endedAt` set; no longer accepts calls.

### Recommended target lifecycle

Adopt an explicit four-state machine to support pause and archival:

```
draft → active ⇄ paused → closed → archived
```

- `active ⇄ paused`: toggling capture pauses/resumes call recording without
  closing the episode (new `contextlens.pauseCapture` command).
- `archived`: soft-deleted, excluded from default listings, retained for search.

## Sync & idempotency

Every outbound sync item carries an idempotency key:

```
userId + projectId + episodeId + eventId
```

The backend dedups on `X-Idempotency-Key` (`users/{uid}/idempotency/{key}`), so
retries after network failures or client restarts never create duplicate calls
or double-increment `callCount`.

## Edge cases

| Scenario | Behavior |
|----------|----------|
| Branch renamed | Watcher closes the episode for the old branch and auto-creates a new one on the new branch. The old episode remains `closed` with its original `branchName`. |
| Force-push | No special handling; the diff snapshot at each commit is preserved, so history is not rewritten. `latestDiffHash` may change on the next captured diff. |
| Two devices editing the same episode | Last-write-wins per document. `callCount` uses server-side increments to avoid client drift. The extension creates separate episodes per device unless both resolve the same project + branch. |
| Episode open > 24h with no activity | Stale detector prompts the user to close it. |
| Diff exceeds size cap | Truncated to 6000 chars (`... [TRUNCATED]` marker) before sync. |

## Retention

A scheduled Cloud Function (`retentionService`, cron `0 3 * * *` UTC by
default) enforces retention automatically:

- **Call capping:** episodes exceeding `RETENTION_MAX_CALLS_PER_EPISODE`
  (default 1000) have their oldest calls pruned and `callCount` corrected.
- **Archival:** closed episodes older than `RETENTION_ARCHIVE_AFTER_DAYS`
  (default 365) are marked `status: 'archived'` with an `archivedAt` timestamp
  and excluded from default listings.
- **Deletion:** archived episodes older than `RETENTION_DELETE_AFTER_DAYS`
  (default 730) are deleted along with their `calls` and `cache` subcollections.

All three windows are configurable via environment variables; see
`docs/ENV_VARS.md`.

## Immutability rules

- `id`, `startedAt` are immutable once the episode is acknowledged.
- `status`, `endedAt`, `callCount`, `changedFiles`, `latestDiffHash` are only
  changed by the backend via authenticated endpoints.
- Client-provided `label` and `manualNotes` are always mutable.
