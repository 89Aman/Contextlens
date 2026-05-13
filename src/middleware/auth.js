const { auth } = require('../firebase');

/**
 * Auth middleware — production-ready.
 *
 * Behavior:
 *   - Requires a valid Firebase ID token in the Authorization header.
 *   - Extracts the real UID from the verified token.
 *   - Returns 401 for missing, invalid, or expired tokens.
 *
 * Note: The VS Code extension must send the Firebase ID token
 * (obtained after signInWithCustomToken), NOT the custom token itself.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'unauthenticated',
          message: 'No authorization token provided. Please sign in.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      console.error('Auth middleware: Bearer token is missing');
      return res.status(401).json({
        error: {
          code: 'unauthenticated',
          message: 'Malformed authorization header.',
        },
      });
    }

    try {
      const decoded = await auth.verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || null,
      };
    } catch (verifyErr) {
      console.error('Token verification failed:', {
        code: verifyErr.code,
        message: verifyErr.message,
        tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
      });
      return res.status(401).json({
        error: {
          code: 'invalid_token',
          message: verifyErr.message || 'Invalid or expired token.',
        },
      });
    }

    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      error: {
        code: 'unauthenticated',
        message: 'Authentication failed',
      },
    });
  }
}

module.exports = { requireAuth };
