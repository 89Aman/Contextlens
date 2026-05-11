const { auth } = require('../firebase');

/**
 * Auth middleware — hackathon-friendly.
 * 
 * Behavior:
 *   - If a valid Firebase ID token is provided → use the real uid.
 *   - If the token is a custom token (not an ID token) → fallback to demo user.
 *   - If no token is provided → fallback to demo user.
 * 
 * In production, the no-token and invalid-token cases would return 401.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      // No token provided — use demo user for hackathon
      req.user = { uid: 'contextlens-demo-user', email: null, name: null };
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      // Try to verify as a real Firebase ID token
      const decoded = await auth.verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null };
    } catch (verifyErr) {
      // Token might be a custom token (not an ID token) — fallback for hackathon
      // In production you would reject here with 401
      req.user = { uid: 'contextlens-demo-user', email: null, name: null };
    }

    return next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: { code: 'unauthenticated', message: 'Authentication failed' } });
  }
}

module.exports = { requireAuth };
