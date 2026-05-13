import { explainDiff, branchSummary, search } from '../../lib/api';
import { auth } from '../../lib/firebase';

jest.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn(),
    },
  },
}));

describe('API Utilities', () => {
  let fetchMock: jest.Mock;
  const mockToken = 'mock_token_12345';

  beforeEach(() => {
    jest.clearAllMocks();
    (auth.currentUser as any).getIdToken.mockResolvedValue(mockToken);
    fetchMock = jest.fn();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('explainDiff', () => {
    it('should successfully explain a diff', async () => {
      const mockResponse = {
        summary: 'This diff adds a new feature',
        changes: ['Added file.js', 'Modified README.md'],
      };

      fetchMock.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await explainDiff('project123', 'episode456');

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledWith(
        '/episodes/explain',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw error when unauthorized', async () => {
      fetchMock.mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      await expect(explainDiff('project123', 'episode456')).rejects.toThrow();
    });
  });

  describe('branchSummary', () => {
    it('should successfully get branch summary', async () => {
      const mockResponse = {
        summary: 'Branch summary text',
        stats: { commits: 5, files: 10 },
      };

      fetchMock.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const episodes = [{ id: 'ep1' }, { id: 'ep2' }];
      const result = await branchSummary('project123', 'main', episodes);

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should handle quota exceeded error', async () => {
      fetchMock.mockResolvedValueOnce({
        status: 429,
        ok: false,
      });

      const episodes: any[] = [];
      await expect(branchSummary('project123', 'main', episodes)).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should successfully search with query and filters', async () => {
      const mockResponse = {
        episodes: [
          {
            episodeId: 'ep1',
            projectId: 'proj1',
            label: 'Episode 1',
            branchName: 'main',
            callCount: 3,
            startedAt: '2023-01-01T00:00:00Z',
          },
        ],
        calls: [
          {
            callId: 'call1',
            episodeId: 'ep1',
            intentTag: 'add-feature',
            activeFilePath: 'src/index.js',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const filters = { branchName: 'main', filePath: 'src/' };
      const result = await search('project123', 'feature', filters);

      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(search('project123', 'query')).rejects.toThrow();
    });

    it('should retry on 500 errors', async () => {
      const mockResponse = { episodes: [], calls: [] };

      fetchMock
        .mockResolvedValueOnce({
          status: 500,
          ok: false,
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

      jest.useFakeTimers();

      const promise = search('project123', 'query');
      jest.advanceTimersByTime(2000);

      const result = await promise;
      expect(result).toEqual(mockResponse);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Error handling', () => {
    it('should handle timeout errors', async () => {
      jest.useFakeTimers();

      const abortError = new Error('Timeout');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValueOnce(abortError);

      const promise = explainDiff('project123', 'episode456');
      jest.advanceTimersByTime(30000);

      await expect(promise).rejects.toThrow();

      jest.useRealTimers();
    });

    it('should provide friendly error messages', async () => {
      fetchMock.mockResolvedValueOnce({
        status: 503,
        ok: false,
      });

      try {
        await explainDiff('project123', 'episode456');
      } catch (error: any) {
        expect(error.message).toContain('temporarily unavailable');
      }
    });

    it('should handle unauthenticated users', async () => {
      (auth.currentUser as any).getIdToken.mockRejectedValueOnce(new Error('No user'));

      await expect(explainDiff('project123', 'episode456')).rejects.toThrow();
    });
  });
});
