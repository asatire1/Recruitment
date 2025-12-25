const admin = require('firebase-admin');
const algoliasearch = require('algoliasearch');

// Initialize Firebase Admin with service account
// You'll need to download this from Firebase Console
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Algolia
const algoliaClient = algoliasearch('XQ0F8KCOQG', '8bb7bf924f7375046eadb33818e71f2d');
const candidatesIndex = algoliaClient.initIndex('allied_candidates');

async function syncCandidates() {
  console.log('Fetching candidates from Firebase...');
  const snapshot = await db.collection('candidates').get();
  
  const records = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    records.push({
      objectID: doc.id,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      status: data.status || 'new',
      appliedJobType: data.appliedJobType || '',
      appliedJobTitle: data.appliedJobTitle || '',
      entityName: data.entityName || '',
      branchName: data.branchName || '',
      skills: Array.isArray(data.skills) ? data.skills.map(s => typeof s === 'string' ? s : s.name) : [],
      totalExperienceMonths: data.totalExperienceMonths || 0,
      cvParsed: data.cvParsed || false,
      gphcRegistered: !!data.gphcNumber,
      createdAtTimestamp: data.createdAt?.toDate?.()?.getTime() / 1000 || Date.now() / 1000,
      updatedAtTimestamp: data.updatedAt?.toDate?.()?.getTime() / 1000 || Date.now() / 1000
    });
  });

  console.log(`Found ${records.length} candidates`);
  
  if (records.length > 0) {
    await candidatesIndex.saveObjects(records);
    console.log('Synced to Algolia successfully!');
  } else {
    console.log('No candidates to sync');
  }
  
  process.exit(0);
}

syncCandidates().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
