const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Initialize with application default credentials. Caller should set
  // GOOGLE_APPLICATION_CREDENTIALS or run in GCP environment.
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
