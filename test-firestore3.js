const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function test() {
  try {
    const app = initializeApp({ projectId: 'contextlens-backend-001' });
    
    // Explicitly target 'default' instead of the SDK default '(default)'
    const db = getFirestore(app, 'default');
    
    const docRef = db.collection('test').doc('test-doc');
    await docRef.set({ ok: true });
    console.log("Write local successful with 'default'!");
  } catch(e) {
    console.error("Local write error with 'default':", e);
  }
}
test();
