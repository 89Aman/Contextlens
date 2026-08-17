const {
  excessCalls,
  isEligibleForArchive,
  isEligibleForDeletion,
  daysAgo,
  runRetention,
  queryAll,
} = require('../../services/retention');

jest.mock('../../firebase', () => ({
  admin: {
    firestore: {
      FieldValue: {
        increment: jest.fn((n) => ({ __op: 'increment', n })),
        serverTimestamp: jest.fn(() => ({ __op: 'serverTimestamp' })),
      },
    },
  },
  db: {},
}));

describe('retention decision helpers', () => {
  it('computes excess calls above the cap', () => {
    expect(excessCalls(1002, 1000)).toBe(2);
    expect(excessCalls(999, 1000)).toBe(0);
    expect(excessCalls(undefined, 1000)).toBe(0);
    expect(excessCalls(0, 1000)).toBe(0);
  });

  it('archives only closed episodes older than the cutoff', () => {
    const cutoff = daysAgo(365);
    const oldDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);

    expect(isEligibleForArchive({ status: 'closed', endedAt: { toDate: () => oldDate } }, cutoff)).toBe(true);
    expect(isEligibleForArchive({ status: 'open', endedAt: { toDate: () => oldDate } }, cutoff)).toBe(false);
    expect(isEligibleForArchive({ status: 'closed' }, cutoff)).toBe(false);
    expect(isEligibleForArchive({ status: 'closed', endedAt: { toDate: () => new Date() } }, cutoff)).toBe(false);
  });

  it('deletes only archived episodes older than the cutoff', () => {
    const cutoff = daysAgo(730);
    const oldDate = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000);

    expect(isEligibleForDeletion({ status: 'archived', archivedAt: { toDate: () => oldDate } }, cutoff)).toBe(true);
    expect(isEligibleForDeletion({ status: 'closed', archivedAt: { toDate: () => oldDate } }, cutoff)).toBe(false);
    expect(isEligibleForDeletion({ status: 'archived', archivedAt: { toDate: () => new Date() } }, cutoff)).toBe(false);
    expect(isEligibleForDeletion({ status: 'archived' }, cutoff)).toBe(false);
  });
});

describe('runRetention', () => {
  function fakeDoc(id, data, ref) {
    return { id, data: () => data, ref: ref || { path: `users/u/projects/p/episodes/${id}`, id } };
  }

  function fakeCallDoc(id) {
    const ref = { path: `.../calls/${id}`, delete: jest.fn().mockResolvedValue(undefined) };
    return { id, ref, data: () => ({ createdAt: new Date() }) };
  }

  function makeBatch() {
    return {
      delete: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * Fake vectors collection under users/{uid}/projects/{pid}/vectors.
   * `docs` (map id → fake vector doc) is exposed so tests can assert cascades.
   * Mirrors Firestore: `col.doc(id)` returns a DocumentReference, and query
   * docs expose `.ref` pointing at that same reference.
   */
  function makeVectorsCol() {
    const docs = new Map();
    const col = {
      docs,
      doc: jest.fn((id) => {
        if (!docs.has(id)) {
          const ref = { id, path: `.../vectors/${id}`, delete: jest.fn().mockResolvedValue(undefined) };
          docs.set(id, { id, ref, data: () => ({ episodeId: 'e3' }) });
        }
        return docs.get(id).ref;
      }),
      where: jest.fn(() => ({
        get: jest.fn(async () => {
          const all = [...docs.values()];
          return { docs: all, empty: all.length === 0 };
        }),
      })),
    };
    return col;
  }

  function fakeDb(overrides = {}) {
    const episodes = overrides.episodes || [];
    const vectorsCol = makeVectorsCol();
    const batchInstances = [];

    const episodesQuery = {
      where: jest.fn(() => episodesQuery),
      orderBy: jest.fn(() => episodesQuery),
      limit: jest.fn(() => episodesQuery),
      startAfter: jest.fn(() => episodesQuery),
      get: jest.fn(async () => ({ docs: episodes, empty: episodes.length === 0 })),
    };

    const usersDoc = {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => vectorsCol),
        })),
      })),
    };

    const db = {
      collection: jest.fn((name) => {
        if (name === 'users') return { doc: jest.fn(() => usersDoc) };
        throw new Error(`unexpected collection ${name}`);
      }),
      collectionGroup: jest.fn((name) => {
        if (name === 'episodes') return episodesQuery;
        throw new Error(`unexpected collectionGroup ${name}`);
      }),
      batch: jest.fn(() => {
        const batch = makeBatch();
        batchInstances.push(batch);
        return batch;
      }),
    };
    return { db, episodesQuery, vectorsCol, batchInstances };
  }

  it('pages through large result sets with a cursor', async () => {
    const page1 = [fakeDoc('e1', {}), fakeDoc('e2', {})];
    const page2 = [fakeDoc('e3', {})];
    const query = {
      limit: jest.fn(() => query),
      startAfter: jest.fn(() => query),
      get: jest.fn()
        .mockResolvedValueOnce({ docs: page1, empty: false })
        .mockResolvedValueOnce({ docs: page2, empty: false }),
    };

    const docs = await queryAll(query, 2);

    expect(docs.map((d) => d.id)).toEqual(['e1', 'e2', 'e3']);
    expect(query.startAfter).toHaveBeenCalledTimes(1);
    expect(query.get).toHaveBeenCalledTimes(2);
    expect(query.startAfter).toHaveBeenCalledWith(page1[1]);
  });

  it('prunes calls from over-cap episodes, cascade-deletes vectors, and updates callCount', async () => {
    const call1 = fakeCallDoc('c1');
    const call2 = fakeCallDoc('c2');
    const epUpdate = jest.fn().mockResolvedValue(undefined);
    const epRef = {
      path: 'users/u/projects/p/episodes/e1',
      id: 'e1',
      collection: jest.fn(() => ({
        orderBy: jest.fn(() => ({ limit: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [call1, call2], empty: false, size: 2 })) })) })),
      })),
      update: epUpdate,
      delete: jest.fn(),
      listCollections: jest.fn(async () => []),
    };
    const overCap = [fakeDoc('e1', { callCount: 1002 }, epRef)];

    const { db, episodesQuery, vectorsCol, batchInstances } = fakeDb({ episodes: overCap });
    // closed + archived queries return nothing
    episodesQuery.get
      .mockResolvedValueOnce({ docs: overCap, empty: false })
      .mockResolvedValueOnce({ docs: [], empty: true })
      .mockResolvedValueOnce({ docs: [], empty: true });

    const stats = await runRetention({ db });

    expect(stats.callsPruned).toBe(2);
    expect(epUpdate).toHaveBeenCalledWith({ callCount: { __op: 'increment', n: -2 } });

    // Call docs AND their vectors are batch-deleted (callId = vector doc id).
    const deletedRefs = batchInstances.flatMap((b) => b.delete.mock.calls.map((c) => c[0]));
    expect(deletedRefs).toContain(call1.ref);
    expect(deletedRefs).toContain(call2.ref);
    expect(deletedRefs).toContain(vectorsCol.doc('c1'));
    expect(deletedRefs).toContain(vectorsCol.doc('c2'));
  });

  it('archives stale closed episodes and deletes stale archived episodes', async () => {
    const oldEnded = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const oldArchived = new Date(Date.now() - 800 * 24 * 60 * 60 * 1000);

    const closedRef = { path: 'users/u/projects/p/episodes/e2', id: 'e2', collection: jest.fn(() => ({ orderBy: jest.fn(() => ({ limit: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [], empty: true })) })) })) })), update: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined), listCollections: jest.fn(async () => []) };
    const archivedRef = { path: 'users/u/projects/p/episodes/e3', id: 'e3', collection: jest.fn(() => ({ orderBy: jest.fn(() => ({ limit: jest.fn(() => ({ get: jest.fn(async () => ({ docs: [], empty: true })) })) })) })), update: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined), listCollections: jest.fn(async () => []) };

    const closedEp = fakeDoc('e2', { status: 'closed', endedAt: { toDate: () => oldEnded } }, closedRef);
    const archivedEp = fakeDoc('e3', { status: 'archived', archivedAt: { toDate: () => oldArchived } }, archivedRef);

    const { db, episodesQuery, vectorsCol, batchInstances } = fakeDb();
    episodesQuery.get
      .mockResolvedValueOnce({ docs: [], empty: true })   // over-cap
      .mockResolvedValueOnce({ docs: [closedEp], empty: false })  // closed
      .mockResolvedValueOnce({ docs: [archivedEp], empty: false }); // archived

    // Pre-populate vectors belonging to the archived episode (episodeId e3).
    vectorsCol.doc('v1');
    vectorsCol.doc('v2');
    vectorsCol.docs.get('v1').data = () => ({ episodeId: 'e3' });
    vectorsCol.docs.get('v2').data = () => ({ episodeId: 'e3' });

    const stats = await runRetention({ db });

    expect(stats.archived).toBe(1);
    expect(stats.deleted).toBe(1);
    expect(closedRef.update).toHaveBeenCalledWith({ status: 'archived', archivedAt: { __op: 'serverTimestamp' } });
    expect(archivedRef.delete).toHaveBeenCalled();

    // The episode's vectors are cascade-deleted in the same retention pass.
    const deletedRefs = batchInstances.flatMap((b) => b.delete.mock.calls.map((c) => c[0]));
    expect(deletedRefs).toContain(vectorsCol.docs.get('v1').ref);
    expect(deletedRefs).toContain(vectorsCol.docs.get('v2').ref);
  });
});
