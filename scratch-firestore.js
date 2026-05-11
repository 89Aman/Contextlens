const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function run() {
  try {
    const app = initializeApp({ credential: applicationDefault() });
    const db = getFirestore();
    const docRef = db.collection('test').doc('test-doc');
    await docRef.set({ test: true });
    console.log('SUCCESS! Wrote to Firestore.');
  } catch (error) {
    console.error('ERROR WRITING TO FIRESTORE:', error);
  }
}

run();
