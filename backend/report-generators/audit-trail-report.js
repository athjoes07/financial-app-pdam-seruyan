const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function generateAuditTrail(db, outputPath) {
  const wb = XLSX.utils.book_new();

<<<<<<< HEAD
  const now = new Date();
  const waktuCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // === SHEET 1: Input File Map ===
  const inputFileMap = [];
  inputFileMap.push(['AUDIT TRAIL - INPUT FILE MAP LAPORAN KEU']);
  inputFileMap.push(['']);
  inputFileMap.push(['No', 'File Input', 'Sheet Name', 'Baris (Row)', 'Kolom (Col)', 'Data Diekstrak', 'Tujuan (add_tx / Output)', 'Status']);

  const inputFiles = db.queryAll('SELECT DISTINCT sumber FROM transaksi WHERE sumber != "" ORDER BY sumber');
  let no = 1;
  for (const f of inputFiles) {
    const txCount = db.queryOne('SELECT COUNT(*) as cnt FROM transaksi WHERE sumber = ?', [f.sumber]);
    inputFileMap.push([no++, f.sumber, 'Sheet0', 'Semua baris', '-', '-', 'Input ke DB', 'TERPROSES']);
=======
  let logs = [];
  try {
    logs = db.queryAll(`
      SELECT timestamp, kategori, sumber_file, deskripsi, status, detail, hash, prev_hash, before_state, after_state
      FROM audit_log
      ORDER BY id DESC
    `);
  } catch (e) {
    logs = [];
>>>>>>> 12181dbbbfd837fbdcfd5aa7e3fdddc3878b99f6
  }
  inputFileMap.push(['', '', '', '', '', '', '', '']);
  inputFileMap.push(['TOTAL FILE INPUT', inputFiles.length + ' file', '', '', '', '', '', '']);

  const inputFileSheet = XLSX.utils.aoa_to_sheet(inputFileMap);
  inputFileSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, inputFileSheet, 'Input File Map');

<<<<<<< HEAD
  // === SHEET 2: Journal Entry Audit ===
  const journalAudit = [];
  journalAudit.push(['AUDIT TRAIL - SETIAP BARIS JOURNAL (add_tx)']);
  journalAudit.push(['']);
  journalAudit.push(['No', 'Sumber (src)', 'Ref', 'Tgl', 'Deskripsi', 'Debet', 'Credit', 'Jumlah (Rp)', 'Output yang Terdampak']);

  const transactions = db.queryAll(`
    SELECT t.*, GROUP_CONCAT(
      '{"akun_id":' || j.akun_id || ',"akun_kode":"' || a.kode || '","akun_nama":"' || a.nama || '","debit":' || j.debit || ',"kredit":' || j.kredit || '}'
    ) as jurnal
    FROM transaksi t
    LEFT JOIN jurnal j ON j.transaksi_id = t.id
    LEFT JOIN akun a ON a.id = j.akun_id
    GROUP BY t.id
    ORDER BY t.tanggal ASC, t.id ASC
  `);

  let txNo = 1;
  for (const t of transactions) {
    let journal;
    try { journal = JSON.parse('[' + t.jurnal + ']'); } catch (e) { continue; }

    const debitEntry = journal.find(j => parseFloat(j.debit) > 0);
    const kreditEntry = journal.find(j => parseFloat(j.kredit) > 0);

    const debitAkun = debitEntry ? debitEntry.akun_kode : '-';
    const kreditAkun = kreditEntry ? kreditEntry.akun_kode : '-';
    const jumlah = debitEntry ? parseFloat(debitEntry.debit) : 0;

    journalAudit.push([
      txNo++,
      t.sumber || '-',
      t.sumber || '-',
      t.tanggal || '-',
      t.deskripsi || '-',
      debitAkun,
      kreditAkun,
      jumlah,
      'BUKU BESAR | Journal'
=======
    logs = txs.map(t => ({
      timestamp: t.created_at || new Date().toISOString(),
      kategori: t.sumber || 'TRANSAKSI',
      sumber_file: t.sumber || 'Sistem Keuangan',
      deskripsi: t.deskripsi,
      status: (t.total_debit === t.total_kredit && t.total_debit > 0) ? 'BALANCED' : 'UNBALANCED',
      detail: `Total Debit: Rp ${(t.total_debit || 0).toLocaleString('id-ID')} | Total Kredit: Rp ${(t.total_kredit || 0).toLocaleString('id-ID')}`,
      hash: '', prev_hash: '', before_state: '', after_state: ''
    }));
  }

  const data = [];
  data.push(['PERUMDAM TIRTA SERUYAN - KABUPATEN SERUYAN', '', '', '', '', '', '', '', '', '']);
  data.push(['AUDIT TRAIL (CRYPTOGRAPHIC LOG & DATA SNAPSHOTS)', '', '', '', '', '', '', '', '', '']);
  data.push(['Tanggal Cetak: ' + new Date().toLocaleString('id-ID'), '', '', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '', '', '']);
  data.push(['No', 'Waktu / Timestamp', 'Kategori / Sumber', 'File Input / Ref', 'Deskripsi Operasi', 'Status', 'Detail Mutasi / Ringkasan', 'SHA-256 Hash Kriptografi', 'Hash Sebelumnya (Prev)', 'Before State (JSON)', 'After State (JSON)']);

  logs.forEach((l, idx) => {
    data.push([
      idx + 1,
      l.timestamp,
      l.kategori,
      l.sumber_file,
      l.deskripsi,
      l.status,
      l.detail,
      l.hash || '',
      l.prev_hash || '',
      l.before_state || '',
      l.after_state || ''
>>>>>>> 12181dbbbfd837fbdcfd5aa7e3fdddc3878b99f6
    ]);
  }

<<<<<<< HEAD
  const journalAuditSheet = XLSX.utils.aoa_to_sheet(journalAudit);
  journalAuditSheet['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, journalAuditSheet, 'Journal Entry Audit');

  // === SHEET 3: Output File Map ===
  const outputFileMap = [];
  outputFileMap.push(['AUDIT TRAIL - STRUKTUR FILE OUTPUT']);
  outputFileMap.push(['']);
  outputFileMap.push(['No', 'Nama File Output', 'Tab Sheet', 'Cell / Rentang', 'Konten', 'Data Input Sumber', 'Keterangan']);

  const outputFiles = [
    ['BUKU BESAR 2026.xlsx', '1 sheet/akun', 'A1:F8', 'Header + Detail transaksi', 'Jurnal DB', 'Buku besar per akun'],
    ['Journal 2026.xlsx', 'JU, DVUD', 'A1:K7+', 'Header + List jurnal', 'Jurnal DB', 'Jurnal umum & voucher'],
    ['Neraca Lajur 2026.xlsx', '5 sheets (Jan-Mei)', 'A1:L7+', 'Neraca saldo per bulan', 'Jurnal DB', 'Neraca lajur bulanan'],
    ['Neraca, RL, Arus Kas.xlsx', 'Laba-ETAP, Neraca, P-9, P-10', 'A1:H30+', 'Laporan keuangan', 'Jurnal DB', 'Laporan finansial'],
    ['AUDIT_TRAIL.xlsx', '6 sheets', 'A1:K5+', 'Audit trail lengkap', 'Semua data', 'Input map, jurnal audit, COA usage'],
=======
  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 20 },
    { wch: 30 },
    { wch: 45 },
    { wch: 15 },
    { wch: 50 },
    { wch: 65 }, // Hash
    { wch: 65 }, // Prev Hash
    { wch: 100 }, // Before
    { wch: 100 }  // After
>>>>>>> 12181dbbbfd837fbdcfd5aa7e3fdddc3878b99f6
  ];

  outputFiles.forEach((f, i) => {
    outputFileMap.push([i + 1, f[0], f[1], f[2], f[3], f[4], f[5]]);
  });

  const outputFileSheet = XLSX.utils.aoa_to_sheet(outputFileMap);
  outputFileSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, outputFileSheet, 'Output File Map');

  // === SHEET 4: Data Tidak Masuk Output ===
  const dataTidakMasuk = [];
  dataTidakMasuk.push(['AUDIT TRAIL - DATA INPUT YANG TIDAK MASUK OUTPUT']);
  dataTidakMasuk.push(['']);
  dataTidakMasuk.push(['No', 'Data Input', 'Lokasi File/Sheet/Cell', 'Alasan Tidak Diproses', 'Rekomendasi']);

  const allAkun = db.queryAll('SELECT COUNT(*) as cnt FROM akun');
  const akunWithTx = db.queryAll('SELECT COUNT(DISTINCT a.id) as cnt FROM akun a INNER JOIN jurnal j ON j.akun_id = a.id');
  const totalAkun = allAkun[0]?.cnt || 0;
  const akunUsed = akunWithTx[0]?.cnt || 0;
  const akunUnused = totalAkun - akunUsed;

  if (akunUnused > 0) {
    dataTidakMasuk.push([1, 'Akun tanpa transaksi', 'COA Master', akunUnused + ' akun tidak ada jurnal', 'Periksa apakah ada transaksi yang belum diproses']);
  }

  dataTidakMasuk.push(['', '', '', '', '']);

  const outputFileSheet2 = XLSX.utils.aoa_to_sheet(dataTidakMasuk);
  outputFileSheet2['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 25 }, { wch: 40 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, outputFileSheet2, 'Data Tidak Masuk Output');

  // === SHEET 5: COA Usage ===
  const coaUsage = [];
  coaUsage.push(['AUDIT TRAIL - CHART OF ACCOUNTS: MASTER vs PENGGUNAAN']);
  coaUsage.push(['']);
  coaUsage.push(['No', 'Kode Akun', 'Nama Akun', 'Kategori', 'Saldo (Rp)', 'Digunakan?', 'Jml Transaksi']);

  const allAccounts = db.queryAll('SELECT * FROM akun ORDER BY kode');
  let coaNo = 1;
  for (const a of allAccounts) {
    const jCount = db.queryOne('SELECT COUNT(*) as cnt FROM jurnal WHERE akun_id = ?', [a.id]);
    const jml = jCount?.cnt || 0;
    const jBalance = db.queryOne('SELECT COALESCE(SUM(j.debit),0) as td, COALESCE(SUM(j.kredit),0) as tk FROM jurnal j WHERE j.akun_id = ?', [a.id]);
    const saldo = a.saldo_normal === 'debit' ? (jBalance?.td || 0) - (jBalance?.tk || 0) : (jBalance?.tk || 0) - (jBalance?.td || 0);

    coaUsage.push([
      coaNo++,
      a.kode,
      a.nama,
      a.kategori || a.tipe,
      Math.round(saldo),
      jml > 0 ? 'YA' : 'TIDAK',
      jml > 0 ? jml : '-'
    ]);
  }

  const coaUsageSheet = XLSX.utils.aoa_to_sheet(coaUsage);
  coaUsageSheet['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, coaUsageSheet, 'COA Usage');

  // === SHEET 6: Ringkasan ===
  const totalJurnal = db.queryOne('SELECT COUNT(*) as cnt FROM jurnal');
  const totalTransaksi = db.queryOne('SELECT COUNT(*) as cnt FROM transaksi');
  const akunAktif = db.queryOne('SELECT COUNT(DISTINCT akun_id) as cnt FROM jurnal');

  const ringkasan = [];
  ringkasan.push(['RINGKASAN AUDIT TRAIL']);
  ringkasan.push(['']);
  ringkasan.push(['TANGGAL GENERATE', waktuCetak]);
  ringkasan.push(['ENTITY', 'PERUSAHAAN DAERAH AIR MINUM KABUPATEN SERUYAN']);
  ringkasan.push(['TOTAL INPUT FILE DIPROSES', inputFiles.length + ' file']);
  ringkasan.push(['TOTAL TRANSAKSI (add_tx)', (totalTransaksi?.cnt || 0) + ' transaksi']);
  ringkasan.push(['TOTAL JURNAL ENTRIES', (totalJurnal?.cnt || 0) + ' entries']);
  ringkasan.push(['TOTAL AKUN BUKU BESAR', (akunAktif?.cnt || 0) + ' dari ' + totalAkun + ' di COA']);
  ringkasan.push(['TOTAL AKUN DIGUNAKAN', akunUsed + ' dari ' + totalAkun + ' akun']);
  ringkasan.push(['TOTAL AKUN TIDAK DIGUNAKAN', akunUnused + ' akun']);
  ringkasan.push(['']);
  ringkasan.push(['STATUS PROSES', 'SEMUA PROSES BERHASIL']);

  const ringkasanSheet = XLSX.utils.aoa_to_sheet(ringkasan);
  ringkasanSheet['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ringkasanSheet, 'Ringkasan');

  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateAuditTrail };
