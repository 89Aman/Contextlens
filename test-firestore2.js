const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function test() {
  const db = getFirestore();
  const docRef = db.collection('test').doc('test-doc');
  try {
    await docRef.set({ ok: true });
    console.log("Write local successful!");
  } catch(e) {
    console.error("Local write error:", e);
  }
}
test();
