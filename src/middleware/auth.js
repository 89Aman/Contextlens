const { auth } = require('../firebase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'unauthenticated', message: 'Missing Bearer token' } });
  }
  const idToken = authHeader.split(' ')[1];
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    return next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'unauthenticated', message: 'Invalid token' } });
  }
}

module.exports = { requireAuth };
