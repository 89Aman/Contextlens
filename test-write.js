const { db } = require('./src/firebase');

async function testWrite() {
  const REAL_UID = 'NcsKk3Evd4PblbAeT6ik9Pzlh2K2';
  console.log(`Writing test doc for ${REAL_UID}...`);
  await db.doc(`users/${REAL_UID}/test/doc`).set({ success: true, timestamp: new Date() });
  console.log('Write successful!');
}

testWrite().catch(console.error);
