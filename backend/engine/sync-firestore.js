/**
 * Sinkronisasi data SQLite → Firestore
 * Data tetap di SQLite (untuk query kompleks)
 * Firestore sebagai backup + realtime sync
 */

const { initFirebase } = require('../firebase-admin');

async function syncToFirestore(db) {
  const fb = initFirebase();
  if (!fb) return { success: false, error: 'Firebase not initialized' };

  const firestore = fb.firestore;
  const results = { akun: 0, transaksi: 0, jurnal: 0 };

  // 1. Sync akun (gunakan batch)
  const akun = db.queryAll('SELECT * FROM akun');
  for (const a of akun) {
    try {
      const existing = await firestore.collection('akun').where('kode', '==', a.kode).get();
      const data = { kode: a.kode, nama: a.nama, tipe: a.tipe, saldo_normal: a.saldo_normal, kategori: a.kategori || '' };
      if (existing.empty) {
        await firestore.collection('akun').add({ ...data, syncedAt: new Date().toISOString() });
      } else {
        await existing.docs[0].ref.update(data);
      }
    } catch (e) {
      console.log('  Akun sync error:', a.kode, e.message);
    }
    results.akun++;
  }

  // 2. Sync transaksi + jurnal
  const transaksi = db.queryAll('SELECT * FROM transaksi ORDER BY id');
  for (const t of transaksi) {
    try {
      const existing = await firestore.collection('transaksi').where('id_lama', '==', t.id).get();
      if (!existing.empty) continue;

      const txRef = await firestore.collection('transaksi').add({
        id_lama: t.id,
        tanggal: t.tanggal,
        deskripsi: t.deskripsi,
        sumber: t.sumber || '',
        syncedAt: new Date().toISOString()
      });

      const jurnal = db.queryAll('SELECT * FROM jurnal WHERE transaksi_id = ?', [t.id]);
      for (const j of jurnal) {
        await firestore.collection('jurnal').add({
          transaksi_id: txRef.id,
          transaksi_lama_id: t.id,
          akun_id: j.akun_id,
          debit: j.debit,
          kredit: j.kredit
        });
        results.jurnal++;
      }
    } catch (e) {
      console.log('  Tx sync error:', t.id, e.message);
    }
    results.transaksi++;
  }

  return { success: true, results };
}

module.exports = { syncToFirestore };
