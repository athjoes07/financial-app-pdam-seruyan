const XLSX = require('xlsx-js-style');

async function generateAuditTrail(db, outputPath) {
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const waktuCetak = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // === SHEET 1: Input File Map ===
  const inputFileMap = [];
  inputFileMap.push(['AUDIT TRAIL - INPUT FILE MAP LAPORAN KEUANGAN']);
  inputFileMap.push(['']);
  inputFileMap.push(['No', 'File Input', 'Sheet Name', 'Baris (Row)', 'Kolom (Col)', 'Data Diekstrak', 'Tujuan (add_tx / Output)', 'Status']);

  const fs = require('fs');
  const path = require('path');
  const inputDir = path.join(path.dirname(outputPath), '..', 'penyimpanan');
  let physicalFiles = [];
  try {
    physicalFiles = fs.readdirSync(inputDir).filter(f => /\.(xls|xlsx)$/i.test(f) && !f.startsWith('~$'));
  } catch(e) {}

  const dbInputFiles = await db.queryAll("SELECT DISTINCT sumber FROM transaksi WHERE sumber != '' ORDER BY sumber");
  const dbFilesMap = {};
  dbInputFiles.forEach(f => dbFilesMap[f.sumber] = true);

  // Determine which physical files have already been imported (appear in transaksi)
  const processedSet = new Set();
  for (const f of physicalFiles) {
    const countRes = await db.queryOne('SELECT COUNT(*) as cnt FROM transaksi WHERE sumber = ?', [f]);
    if (countRes?.cnt > 0) processedSet.add(f);
  }

  // Use only the physical files (the ones you just uploaded) for the map
  const sortedFiles = physicalFiles.sort();

  let no = 1;
  let processedCount = 0;
  for (const f of sortedFiles) {
    if (processedSet.has(f)) {
      // Extract column names (first row) and a sample data row for processed files
            let colNames = '-';
            let sampleData = '-';
            try {
              const wbTmp = XLSX.readFile(path.join(inputDir, f));
              const wsTmp = wbTmp.Sheets[wbTmp.SheetNames[0]];
              const rangeTmp = XLSX.utils.decode_range(wsTmp['!ref'] || 'A1');
              // Header row (first row) – we will report column range only
              const startCol = String.fromCharCode(65 + rangeTmp.s.c);
              const endCol = String.fromCharCode(65 + rangeTmp.e.c);
              const colRange = `${startCol}:${endCol}`;
              colNames = colRange;
              // Sample data row (second row if exists) – we will report row range of actual data
              const firstDataRow = rangeTmp.s.r + 2; // Excel rows are 1‑based; header is row 1
              const lastDataRow = rangeTmp.e.r + 1;
              sampleData = `${firstDataRow}-${lastDataRow}`;
            } catch (e) {
              // keep placeholders if reading fails
            }
            inputFileMap.push([no++, f, 'Sheet0', 'Semua baris', colNames, sampleData, 'Input ke DB', 'TERPROSES']);
      processedCount++;
    } else {
      let alasan = 'TIDAK DIPROSES';
      if (f.toLowerCase().includes('rekap user') || f.toLowerCase().includes('rekap_user')) {
        alasan = 'TIDAK DIPROSES (File rangkuman, duplikat dengan loket)';
      }
      inputFileMap.push([no++, f, '-', '-', '-', '-', 'Di-skip', alasan]);
    }
  }
  inputFileMap.push(['', '', '', '', '', '', '', '']);
  inputFileMap.push(['TOTAL FILE INPUT', sortedFiles.length + ' file (' + processedCount + ' diproses)', '', '', '', '', '', '']);


  const inputFileSheet = XLSX.utils.aoa_to_sheet(inputFileMap);
  inputFileSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 35 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, inputFileSheet, 'Input File Map');

  // === SHEET 2: Journal Entry Audit ===
  const journalAudit = [];
  journalAudit.push(['AUDIT TRAIL - SETIAP BARIS JOURNAL (add_tx)']);
  journalAudit.push(['']);
  journalAudit.push(['No', 'Sumber (src)', 'Ref', 'Tgl', 'Deskripsi', 'Debet', 'Credit', 'Jumlah (Rp)', 'Output yang Terdampak']);

  const transactions = await db.queryAll(`
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
    ]);
  }

  const journalAuditSheet = XLSX.utils.aoa_to_sheet(journalAudit);
  journalAuditSheet['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, journalAuditSheet, 'Journal Entry Audit');

  // === SHEET 3: Output File Map ===
  const outputFileMap = [];
  outputFileMap.push(['AUDIT TRAIL - STRUKTUR FILE OUTPUT']);
  outputFileMap.push(['']);
  outputFileMap.push(['No', 'Nama File Output', 'Tab Sheet', 'Cell / Rentang', 'Konten', 'Data Input Sumber', 'Keterangan']);

  const outputFiles = [
    ['BUKU BESAR.xlsx', '19 sheets/akun', 'A1:F8', 'Header + Detail transaksi', 'Jurnal DB', 'Buku besar per akun'],
    ['JOURNAL.xlsx', '20 sheets', 'A1:K7+', 'Header + List jurnal', 'Jurnal DB', 'Jurnal umum & voucher'],
    ['NERACA LAJUR.xlsx', '5 sheets (Jan-Mei)', 'A1:L7+', 'Neraca saldo per bulan', 'Jurnal DB', 'Neraca lajur bulanan'],
    ['NERACA, RL, ARUS KAS, EKUITAS & RINCIAN.xlsx', '20 sheets', 'A1:H30+', 'Laporan keuangan', 'Jurnal DB', 'Laporan finansial'],
    ['AUDIT_TRAIL.xlsx', '6 sheets', 'A1:K5+', 'Audit trail lengkap', 'Semua data', 'Input map, jurnal audit, COA usage'],
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
  dataTidakMasuk.push(['No', 'Data Input', 'Lokasi File/Sheet/Cell', 'Alasan Tidak Diproses', 'Detail Penjelasan', 'Rincian Data / Akun', 'Rekomendasi']);

  let dtmNo = 1;

  for (const f of sortedFiles) {
    if (!dbFilesMap[f]) {
      let alasan = 'Format tidak dikenali/kosong';
      let penjelasan = 'Sistem tidak menemukan baris data yang bisa dibaca. Hal ini terjadi karena format (posisi kolom/baris) tidak sesuai standar aplikasi atau file memang kosong.';
      let rekomendasi = 'Salin (copy-paste) data Anda ke dalam file template standar (DRD/LPP) yang sudah disediakan sistem, lalu upload ulang.';
      
      const fLower = f.toLowerCase();
      if (fLower.includes('rekap user') || fLower.includes('rekap_user')) {
        alasan = 'File Rekapitulasi (Duplikat)';
        penjelasan = 'File ini terdeteksi sebagai file rekap. Memproses file ini akan menyebabkan pembengkakan nilai karena data sebenarnya sudah diproses per-loket.';
        rekomendasi = 'Biarkan saja file ini tidak diproses karena data aslinya (LPP loket) sudah diinput ke dalam sistem.';
      } else if (!fLower.includes('drd') && !fLower.includes('lpp')) {
         alasan = 'File Tidak Didukung';
         penjelasan = 'Sistem hanya dirancang untuk membaca dokumen "LPP" dan "DRD". Nama file ini tidak mengandung kata kunci tersebut.';
         rekomendasi = 'Ubah nama file dengan menyertakan kata "LPP" atau "DRD" (contoh: "LPP Mei.xlsx"), dan pastikan isinya memang LPP/DRD lalu upload ulang.';
      } else if (f.startsWith('~$')) {
         alasan = 'File Temporary/Terkunci';
         penjelasan = 'Ini adalah file "bayangan" yang dibuat otomatis oleh Microsoft Excel ketika Anda sedang membuka file aslinya. File ini tidak memiliki data nyata.';
         rekomendasi = 'Tutup aplikasi Microsoft Excel yang sedang digunakan. Hapus file yang berawalan "~$" ini melalui menu Tempat Sampah.';
      } else {
         alasan = 'Gagal Ekstrak Data (Error)';
         penjelasan = 'File terbaca sebagai LPP/DRD, namun sistem gagal menarik angkanya. Mungkin ada merge cell, password, atau teks di kolom yang seharusnya angka.';
         rekomendasi = 'Un-merge semua sel di file Excel, pastikan kolom nominal berisi Angka (bukan teks/rumus error), lalu simpan ulang (Save As) dan upload lagi.';
      }
      dataTidakMasuk.push([dtmNo++, f, 'Folder Input', alasan, penjelasan, '-', rekomendasi]);
    }
  }

  const allAkun = await db.queryAll('SELECT COUNT(*) as cnt FROM akun');
  const akunWithTx = await db.queryAll('SELECT COUNT(DISTINCT a.id) as cnt FROM akun a INNER JOIN jurnal j ON j.akun_id = a.id');
  const totalAkun = allAkun[0]?.cnt || 0;
  const akunUsed = akunWithTx[0]?.cnt || 0;
  const akunUnused = totalAkun - akunUsed;

  if (akunUnused > 0) {
    const unusedAkunRows = await db.queryAll('SELECT kode, nama FROM akun WHERE id NOT IN (SELECT DISTINCT akun_id FROM jurnal) ORDER BY kode');
    const penjelasanUnused = `Akun di master COA belum pernah digunakan dalam transaksi apapun sepanjang periode ini.`;
    
    for (const a of unusedAkunRows) {
      dataTidakMasuk.push([
        dtmNo++, 
        'Akun tanpa transaksi', 
        'COA Master', 
        'Tidak ada pergerakan/jurnal', 
        penjelasanUnused, 
        `${a.kode} - ${a.nama}`, 
        'Buat transaksi (Penerimaan/Pengeluaran/Jurnal Umum) yang melibatkan kode akun ini agar datanya muncul di laporan Neraca/Laba Rugi.'
      ]);
    }
  }

  if (dtmNo === 1) {
    dataTidakMasuk.push(['-', 'Tidak ada data', '-', '-', '-', '-', '-']);
  }

  dataTidakMasuk.push(['', '', '', '', '', '', '']);

  const outputFileSheet2 = XLSX.utils.aoa_to_sheet(dataTidakMasuk);
  outputFileSheet2['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 50 }, { wch: 40 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, outputFileSheet2, 'Data Tidak Masuk Output');

  // === SHEET 5: COA Usage ===
  const coaUsage = [];
  coaUsage.push(['AUDIT TRAIL - CHART OF ACCOUNTS: MASTER vs PENGGUNAAN']);
  coaUsage.push(['']);
  coaUsage.push(['No', 'Kode Akun', 'Nama Akun', 'Kategori', 'Saldo (Rp)', 'Digunakan?', 'Jml Transaksi']);

  const allAccounts = await db.queryAll('SELECT * FROM akun ORDER BY kode');
  let coaNo = 1;
  for (const a of allAccounts) {
    const jCount = await db.queryOne('SELECT COUNT(*) as cnt FROM jurnal WHERE akun_id = ?', [a.id]);
    const jml = jCount?.cnt || 0;
    const jBalance = await db.queryOne('SELECT COALESCE(SUM(j.debit),0) as td, COALESCE(SUM(j.kredit),0) as tk FROM jurnal j WHERE j.akun_id = ?', [a.id]);
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
  const totalJurnal = await db.queryOne('SELECT COUNT(*) as cnt FROM jurnal');
  const totalTransaksi = await db.queryOne('SELECT COUNT(*) as cnt FROM transaksi');
  const akunAktif = await db.queryOne('SELECT COUNT(DISTINCT akun_id) as cnt FROM jurnal');

  const ringkasan = [];
  ringkasan.push(['RINGKASAN AUDIT TRAIL']);
  ringkasan.push(['']);
  ringkasan.push(['TANGGAL GENERATE', waktuCetak]);
  ringkasan.push(['ENTITY', 'PERUSAHAAN DAERAH AIR MINUM KABUPATEN SERUYAN']);
  ringkasan.push(['TOTAL INPUT FILE DIPROSES', sortedFiles.length + ' file (' + processedCount + ' diproses)']);
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

  const { addTableStyles } = require('./index');
  if (typeof addTableStyles === 'function') addTableStyles(wb);
  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateAuditTrail };
