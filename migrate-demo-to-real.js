const { db } = require('./src/firebase');
const { collection, getDocs, doc, setDoc } = require('firebase-admin/firestore');

const DEMO_UID = 'contextlens-demo-user';
const REAL_UID = 'NcsKk3Evd4PblbAeT6ik9Pzlh2K2';

async function migrate() {
  console.log(`Migrating data from ${DEMO_UID} to ${REAL_UID}...`);

  const demoProjectsRef = db.collection(`users/${DEMO_UID}/projects`);
  const demoProjectsSnap = await demoProjectsRef.get();

  for (const projectDoc of demoProjectsSnap.docs) {
    const projectId = projectDoc.id;
    const projectData = projectDoc.data();
    
    console.log(`Copying project: ${projectData.name} (${projectId})`);
    await db.doc(`users/${REAL_UID}/projects/${projectId}`).set(projectData);

    // Copy episodes
    const episodesRef = projectDoc.ref.collection('episodes');
    const episodesSnap = await episodesRef.get();
    
    for (const episodeDoc of episodesSnap.docs) {
      const episodeId = episodeDoc.id;
      const episodeData = episodeDoc.data();
      console.log(`  Copying episode: ${episodeData.label} (${episodeId})`);
      await db.doc(`users/${REAL_UID}/projects/${projectId}/episodes/${episodeId}`).set(episodeData);

      // Copy calls
      const callsRef = episodeDoc.ref.collection('calls');
      const callsSnap = await callsRef.get();
      for (const callDoc of callsSnap.docs) {
        const callId = callDoc.id;
        const callData = callDoc.data();
        await db.doc(`users/${REAL_UID}/projects/${projectId}/episodes/${episodeId}/calls/${callId}`).set(callData);
      }
    }
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);
