/**
 * Retention & archival service.
 *
 * Scheduled job (see src/index.js exports) that:
 *  1. Prunes the oldest calls from episodes that exceed a per-episode cap.
 *  2. Archives closed episodes older than RETENTION_ARCHIVE_AFTER_DAYS.
 *  3. Deletes archived episodes older than RETENTION_DELETE_AFTER_DAYS.
 *
 * `db` is injectable for tests. Uses collectionGroup queries (Admin SDK
 * bypasses security rules) and single-field filters only, so no composite
 * indexes are required.
 */

const { admin, db: defaultDb } = require('../firebase');

const DEFAULT_ARCHIVE_AFTER_DAYS = 365;
const DEFAULT_DELETE_AFTER_DAYS = 730;
const DEFAULT_MAX_CALLS_PER_EPISODE = 1000;
const BATCH_LIMIT = 400; // Firestore batch limit is 500; stay under

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Number of calls to prune so the episode is back under `maxCalls`. */
function excessCalls(callCount, maxCalls) {
  const count = Number(callCount) || 0;
  return Math.max(0, count - maxCalls);
}

/** True if a closed episode's endedAt predates `cutoff`. */
function isEligibleForArchive(episode, cutoff) {
  if (!episode || episode.status !== 'closed') return false;
  const endedAt = episode.endedAt;
  if (!endedAt) return false;
  const ts = endedAt.toDate ? endedAt.toDate() : new Date(endedAt);
  return ts.getTime() < cutoff.getTime();
}

/** True if an archived episode's archivedAt predates `cutoff`. */
function isEligibleForDeletion(episode, cutoff) {
  if (!episode || episode.status !== 'archived') return false;
  const archivedAt = episode.archivedAt;
  if (!archivedAt) return false;
  const ts = archivedAt.toDate ? archivedAt.toDate() : new Date(archivedAt);
  return ts.getTime() < cutoff.getTime();
}

/**
 * Run the full retention pass.
 * @returns {Promise<{archived:number, deleted:number, callsPruned:number, errors:number}>}
 */
async function runRetention(opts = {}) {
  const db = opts.db || defaultDb;
  const archiveAfterDays = Number(process.env.RETENTION_ARCHIVE_AFTER_DAYS) || DEFAULT_ARCHIVE_AFTER_DAYS;
  const deleteAfterDays = Number(process.env.RETENTION_DELETE_AFTER_DAYS) || DEFAULT_DELETE_AFTER_DAYS;
  const maxCalls = Number(process.env.RETENTION_MAX_CALLS_PER_EPISODE) || DEFAULT_MAX_CALLS_PER_EPISODE;

  const stats = { archived: 0, deleted: 0, callsPruned: 0, errors: 0 };

  try {
    // ── Phase 1: prune over-cap episodes ────────────────────────────────────
    const overCap = await db.collectionGroup('episodes')
      .where('callCount', '>', maxCalls)
      .get();

    for (const ep of overCap.docs) {
      try {
        const toPrune = excessCalls(ep.data().callCount, maxCalls);
        if (toPrune <= 0) continue;

        const calls = await ep.ref.collection('calls')
          .orderBy('createdAt', 'asc')
          .limit(Math.min(toPrune, BATCH_LIMIT))
          .get();

        if (calls.empty) continue;

        let batch = db.batch();
        let ops = 0;
        for (const call of calls.docs) {
          batch.delete(call.ref);
          ops += 1;
          if (ops >= BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
          }
        }
        if (ops > 0) await batch.commit();

        await ep.ref.update({ callCount: admin.firestore.FieldValue.increment(-calls.size) });
        stats.callsPruned += calls.size;
      } catch (err) {
        stats.errors += 1;
        console.error('[Retention] call prune failed:', ep.ref.path, err.message);
      }
    }

    // ── Phase 2: archive stale closed episodes ──────────────────────────────
    const archiveCutoff = daysAgo(archiveAfterDays);
    const closedEpisodes = await db.collectionGroup('episodes')
      .where('status', '==', 'closed')
      .get();

    for (const ep of closedEpisodes.docs) {
      try {
        if (!isEligibleForArchive(ep.data(), archiveCutoff)) continue;
        await ep.ref.update({ status: 'archived', archivedAt: admin.firestore.FieldValue.serverTimestamp() });
        stats.archived += 1;
      } catch (err) {
        stats.errors += 1;
        console.error('[Retention] archive failed:', ep.ref.path, err.message);
      }
    }

    // ── Phase 3: delete stale archived episodes ─────────────────────────────
    const deleteCutoff = daysAgo(deleteAfterDays);
    const archivedEpisodes = await db.collectionGroup('episodes')
      .where('status', '==', 'archived')
      .get();

    for (const ep of archivedEpisodes.docs) {
      try {
        if (!isEligibleForDeletion(ep.data(), deleteCutoff)) continue;

        // Delete subcollections first (calls, cache), then the episode doc.
        const subcollections = await ep.ref.listCollections();
        for (const sub of subcollections) {
          const subDocs = await sub.listDocuments();
          let batch = db.batch();
          let ops = 0;
          for (const docRef of subDocs) {
            batch.delete(docRef);
            ops += 1;
            if (ops >= BATCH_LIMIT) {
              await batch.commit();
              batch = db.batch();
              ops = 0;
            }
          }
          if (ops > 0) await batch.commit();
        }

        await ep.ref.delete();
        stats.deleted += 1;
      } catch (err) {
        stats.errors += 1;
        console.error('[Retention] delete failed:', ep.ref.path, err.message);
      }
    }
  } catch (err) {
    console.error('[Retention] run failed:', err.message);
    throw err;
  }

  return stats;
}

module.exports = { runRetention, excessCalls, isEligibleForArchive, isEligibleForDeletion, daysAgo };
