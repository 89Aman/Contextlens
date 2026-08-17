const { cosineSimilarity, rankBySimilarity } = require('../../lib/embeddings');

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
  });

  it('handles empty or mismatched vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('scales with magnitude', () => {
    // [2,2] is the same direction as [1,1]
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1, 6);
  });
});

describe('rankBySimilarity', () => {
  const query = [1, 0, 0];
  const candidates = [
    { id: 'close', vector: [0.99, 0.1, 0] },
    { id: 'far', vector: [0.1, 0.99, 0] },
    { id: 'exact', vector: [1, 0, 0] },
    { id: 'empty', vector: [] },
  ];

  it('ranks by descending similarity', () => {
    const ranked = rankBySimilarity(query, candidates, 10);
    expect(ranked[0].id).toBe('exact');
    expect(ranked[1].id).toBe('close');
    expect(ranked[2].id).toBe('far');
  });

  it('excludes empty vectors', () => {
    const ranked = rankBySimilarity(query, candidates, 10);
    expect(ranked.find((r) => r.id === 'empty')).toBeUndefined();
  });

  it('respects the limit', () => {
    const ranked = rankBySimilarity(query, candidates, 2);
    expect(ranked.length).toBe(2);
  });

  it('filters out candidates below minScore', () => {
    const ranked = rankBySimilarity(query, candidates, 10, 0.999);
    expect(ranked.map((r) => r.id)).toEqual(['exact']);
  });

  it('includes candidates at exactly minScore', () => {
    const exact = [{ id: 'edge', vector: [0.5, 0, 0] }];
    const ranked = rankBySimilarity([1, 0, 0], exact, 10, 0.5);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('edge');
  });

  it('attaches scores', () => {
    const ranked = rankBySimilarity(query, candidates, 1);
    expect(ranked[0].score).toBeGreaterThan(0.99);
  });
});
