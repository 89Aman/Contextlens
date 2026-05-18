/**
 * Firebase Admin SDK instance.
 */
const admin = require('firebase-admin');

if (!admin.apps.length) {
  if (!process.env.GOOGLE_CLOUD_PROJECT && process.env.GCLOUD_PROJECT) {
    process.env.GOOGLE_CLOUD_PROJECT = process.env.GCLOUD_PROJECT;
  }
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.error('Missing GOOGLE_CLOUD_PROJECT environment variable');
  }
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT
  });
}

const { getFirestore } = require('firebase-admin/firestore');

/**
 * Firestore database instance.
 */
const db = getFirestore(admin.app(), 'default');

/**
 * Firebase Auth instance.
 */
const auth = admin.auth();

module.exports = { admin, db, auth };
