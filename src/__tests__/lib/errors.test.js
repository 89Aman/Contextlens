const { typedError, mapError } = require('../../lib/errors');

describe('Error Handling Utilities', () => {
  describe('typedError', () => {
    it('should create error object with code and message', () => {
      const result = typedError('test_error', 'Test error message');
      expect(result).toEqual({
        error: {
          code: 'test_error',
          message: 'Test error message',
          details: null,
        },
      });
    });

    it('should create error object with details', () => {
      const details = { userId: 'user123', action: 'delete' };
      const result = typedError('auth_error', 'Unauthorized action', details);
      expect(result).toEqual({
        error: {
          code: 'auth_error',
          message: 'Unauthorized action',
          details: details,
        },
      });
    });

    it('should set details to null when not provided', () => {
      const result = typedError('not_found', 'Resource not found');
      expect(result.error.details).toBeNull();
    });
  });

  describe('mapError', () => {
    it('should map unauthenticated errors to 401', () => {
      const err = new Error('Unauthenticated user');
      const result = mapError(err);
      expect(result).toEqual({
        status: 401,
        code: 'unauthenticated',
        message: 'Unauthenticated user',
      });
    });

    it('should map permission errors to 403', () => {
      const err = new Error('Permission denied');
      const result = mapError(err);
      expect(result).toEqual({
        status: 403,
        code: 'forbidden',
        message: 'Permission denied',
      });
    });

    it('should map not found errors to 404', () => {
      const errorMessages = [
        'Resource not found',
        'User not_found',
        'File missing',
      ];

      errorMessages.forEach(msg => {
        const err = new Error(msg);
        const result = mapError(err);
        expect(result.status).toBe(404);
        expect(result.code).toBe('not_found');
      });
    });

    it('should map timeout errors to 504', () => {
      const err = new Error('Request timeout occurred');
      const result = mapError(err);
      expect(result).toEqual({
        status: 504,
        code: 'model_timeout',
        message: 'Request timeout occurred',
      });
    });

    it('should map quota errors to 429', () => {
      const err = new Error('Quota exceeded for API');
      const result = mapError(err);
      expect(result).toEqual({
        status: 429,
        code: 'quota_exceeded',
        message: 'Quota exceeded for API',
      });
    });

    it('should map unknown errors to 500', () => {
      const err = new Error('Something went wrong');
      const result = mapError(err);
      expect(result).toEqual({
        status: 500,
        code: 'internal_error',
        message: 'Something went wrong',
      });
    });

    it('should handle null error', () => {
      const result = mapError(null);
      expect(result).toEqual({
        status: 500,
        code: 'internal_error',
        message: 'Unknown error',
      });
    });

    it('should handle undefined error', () => {
      const result = mapError(undefined);
      expect(result).toEqual({
        status: 500,
        code: 'internal_error',
        message: 'Unknown error',
      });
    });

    it('should handle error object without message', () => {
      const err = {};
      const result = mapError(err);
      expect(result).toEqual({
        status: 500,
        code: 'internal_error',
        message: 'Unknown error',
      });
    });

    it('should be case-insensitive for error matching', () => {
      const testCases = [
        { message: 'UNAUTHENTICATED', expectedCode: 'unauthenticated', expectedStatus: 401 },
        { message: 'Permission Denied', expectedCode: 'forbidden', expectedStatus: 403 },
        { message: 'NOT_FOUND', expectedCode: 'not_found', expectedStatus: 404 },
        { message: 'TIMEOUT', expectedCode: 'model_timeout', expectedStatus: 504 },
      ];

      testCases.forEach(({ message, expectedCode, expectedStatus }) => {
        const err = new Error(message);
        const result = mapError(err);
        expect(result.code).toBe(expectedCode);
        expect(result.status).toBe(expectedStatus);
      });
    });

    it('should prioritize first matching error pattern', () => {
      const err = new Error('Permission denied, not found');
      const result = mapError(err);
      expect(result.code).toBe('forbidden');
      expect(result.status).toBe(403);
    });
  });
});
