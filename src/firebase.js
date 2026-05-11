const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'contextlens-backend-001'
  });
}

const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore(admin.app(), 'default');
const auth = admin.auth();

module.exports = { admin, db, auth };
