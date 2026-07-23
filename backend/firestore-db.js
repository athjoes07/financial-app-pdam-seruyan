/**
 * Firestore Database Layer
 * Menggantikan SQLite dengan Firestore sebagai backend database.
 * 
 * Cara pakai:
 *   1. Download service account key dari Firebase Console
 *   2. Simpan sebagai backend/service-account-key.json
 *   3. Ganti require('./database') dengan require('./firestore-db')
 */

const { getFirestore } = require('./firebase-admin');
const COA = require('./coa-master');

let db = null;

function getDb() {
  if (!db) {
    db = getFirestore();
    if (!db) throw new Error('Firebase not initialized. Run initFirebase() first.');
  }
  return db;
}

async function initDatabase() {
  const firestore = getFirestore();
  if (!firestore) {
    console.log('Firebase unavailable, falling back to SQLite');
    return require('./database');
  }
  db = firestore;

  // Check if COA already seeded
  const coaSnap = await db.collection('akun').limit(1).get();

  if (coaSnap.empty) {
    console.log('Seeding Firestore with COA data...');
    const batch = db.batch();
    for (const a of COA) {
      const ref = db.collection('akun').doc();
      batch.set(ref, {
        kode: a.kode,
        nama: a.nama,
        tipe: a.tipe,
        saldo_normal: a.saldo_normal,
        kategori: a.kategori || '',
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();
    console.log('COA seeded successfully');
  }

  return createDbApi();
}

function createDbApi() {
  return {
    // Query all - return array of objects
    queryAll: async (collectionName, filters = [], orderByField = null) => {
      let q = db.collection(collectionName);
      for (const f of filters) {
        q = q.where(f.field, f.op, f.value);
      }
      if (orderByField) {
        q = q.orderBy(orderByField);
      }
      const snap = await q.get();
      const results = [];
      snap.forEach(doc => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    },

    // Query one
    queryOne: async (collectionName, filters = []) => {
      const results = await createDbApi().queryAll(collectionName, filters);
      return results.length > 0 ? results[0] : null;
    },

    // Insert
    add: async (collectionName, data) => {
      const docRef = await db.collection(collectionName).add({
        ...data,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    },

    // Update
    update: async (collectionName, docId, data) => {
      await db.collection(collectionName).doc(docId).update({
        ...data,
        updatedAt: new Date().toISOString()
      });
    },

    // Delete
    delete: async (collectionName, docId) => {
      await db.collection(collectionName).doc(docId).delete();
    },

    // Get by ID
    getById: async (collectionName, docId) => {
      const doc = await db.collection(collectionName).doc(docId).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    },

    // Raw Firestore instance
    firestore: db
  };
}

module.exports = { initDatabase };
