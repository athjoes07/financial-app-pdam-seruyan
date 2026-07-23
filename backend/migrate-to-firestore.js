/**
 * Migrasi data dari SQLite ke Firestore
 * 
 * Cara pakai:
 *   1. Pastikan service-account-key.json sudah ada di backend/
 *   2. Jalankan: node migrate-to-firestore.js
 */

const path = require('path');
const { initDatabase: initSQLite } = require('./database');
const { initFirebase } = require('./firebase-admin');

async function migrate() {
  console.log('=== MIGRASI SQLite → Firestore ===\n');

  // 1. Init Firebase
  const fb = initFirebase();
  if (!fb) {
    console.log('Gagal init Firebase. Pastikan service-account-key.json ada.');
    process.exit(1);
  }
  const firestore = fb.firestore;
  console.log('Firebase OK');

  // 2. Baca data dari SQLite
  const sqlite = await initSQLite();
  console.log('SQLite OK\n');

  // 3. Migrasi Akun
  const akun = sqlite.queryAll('SELECT * FROM akun');
  console.log(`Migrasi ${akun.length} akun...`);
  for (const a of akun) {
    await firestore.collection('akun').add({
      kode: a.kode,
      nama: a.nama,
      tipe: a.tipe,
      saldo_normal: a.saldo_normal,
      kategori: a.kategori || '',
      migratedAt: new Date().toISOString()
    });
  }

  // 4. Migrasi Transaksi + Jurnal
  const transaksi = sqlite.queryAll(`
    SELECT t.*, GROUP_CONCAT(
      '{"akun_id":' || j.akun_id || ',"debit":' || j.debit || ',"kredit":' || j.kredit || '}'
    ) as jurnal
    FROM transaksi t
    LEFT JOIN jurnal j ON j.transaksi_id = t.id
    GROUP BY t.id
  `);

  console.log(`Migrasi ${transaksi.length} transaksi...`);
  for (const t of transaksi) {
    let jurnalEntries = [];
    try {
      if (t.jurnal) jurnalEntries = JSON.parse('[' + t.jurnal + ']');
    } catch (e) {}

    const txRef = await firestore.collection('transaksi').add({
      tanggal: t.tanggal,
      deskripsi: t.deskripsi,
      sumber: t.sumber || '',
      migratedAt: new Date().toISOString()
    });

    for (const j of jurnalEntries) {
      await firestore.collection('jurnal').add({
        transaksi_id: txRef.id,
        akun_id: String(j.akun_id),
        debit: parseFloat(j.debit) || 0,
        kredit: parseFloat(j.kredit) || 0
      });
    }
  }

  console.log('\n✅ Migrasi selesai!');
  console.log(`   ${akun.length} akun`);
  console.log(`   ${transaksi.length} transaksi`);
}

migrate().catch(err => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});
