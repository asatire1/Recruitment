const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp();
const db = getFirestore();
const storage = getStorage();

const RETENTION_DAYS = {
  rejected: 180,
  withdrawn: 90,
  not_suitable: 180,
  offer_declined: 180,
};

exports.cleanupOldCVs = onSchedule('0 2 * * *', async () => {
  console.log('Starting CV cleanup...');
  const now = new Date();
  let deleted = 0;

  const snapshot = await db.collection('candidates').where('cvUrl', '!=', null).get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const status = data.status || 'new';
    const retentionDays = RETENTION_DAYS[status];

    if (!retentionDays) continue;

    const statusDate = data.statusChangedAt?.toDate() || data.updatedAt?.toDate() || data.createdAt?.toDate();
    if (!statusDate) continue;

    const ageInDays = (now - statusDate) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > retentionDays && data.cvUrl) {
      try {
        const url = new URL(data.cvUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          await storage.bucket().file(filePath).delete();
        }
        
        await doc.ref.update({
          cvUrl: null,
          cvDeleted: true,
          cvDeletedAt: FieldValue.serverTimestamp(),
        });
        deleted++;
        console.log(`Deleted CV for ${doc.id}`);
      } catch (e) {
        console.error(`Error deleting CV for ${doc.id}:`, e);
      }
    }
  }

  console.log(`Cleanup complete. Deleted ${deleted} CVs.`);
  return { deleted };
});
