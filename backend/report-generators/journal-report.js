const XLSX = require('xlsx');
const coa = require('../engine/coa-lookup');

function generateJournal(db, outputPath) {
  const wb = XLSX.utils.book_new();

  // === SHEET 1: JU (Jurnal Umum) ===
  const transactions = db.queryAll(`
    SELECT t.*, GROUP_CONCAT(
      '{"akun_id":' || j.akun_id || ',"akun_nama":"' || a.nama || '","akun_kode":"' || a.kode || '","debit":' || j.debit || ',"kredit":' || j.kredit || '}'
    ) as jurnal
    FROM transaksi t
    LEFT JOIN jurnal j ON j.transaksi_id = t.id
    LEFT JOIN akun a ON a.id = j.akun_id
    GROUP BY t.id
    ORDER BY t.tanggal ASC, t.id ASC
  `);

  const now = new Date();
  const waktuCetak = 'Dicetak pada: ' + now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }) + ' WIB';

  const juData = [];
  // Header
  juData.push(['PERUSAHAAN DAERAH AIR MINUM', '', '', '', '', '']);
  juData.push(['KABUPATEN SERUYAN', '', '', '', '', '']);
  juData.push([waktuCetak, '', '', '', '', '']);
  juData.push(['', '', '', '', '', '']);
  juData.push(['JURNAL UMUM', '', '', '', '', '']);
  juData.push(['BULAN : MEI 2026', '', '', '', '', '']);
  juData.push(['TGL', 'NO. PERK', 'NAMA PERKIRAAN', 'KETERANGAN', 'DEBET', 'KREDIT']);

  for (const t of transactions) {
    let journal;
    try {
      journal = JSON.parse('[' + t.jurnal + ']');
    } catch (e) { continue; }

    const tgl = t.tanggal ? new Date(t.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      const kode = j.akun_kode || '';
      const nama = j.akun_nama || '';
      const ket = i === 0 ? t.deskripsi : '';
      const dbt = parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '';
      const krt = parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : '';
      // TGL only on first entry
      juData.push([i === 0 ? tgl : '', kode, nama, ket, dbt, krt]);
    }
  }

  const juSheet = XLSX.utils.aoa_to_sheet(juData);
  juSheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, juSheet, 'JU');

  // === SHEET 2: DVUD (Daftar Voucher Utang Dibayar) ===
  const dvudData = [];
  dvudData.push(['PERUSAHAAN DAERAH AIR MINUM', '', '', '', '', '', '', '', '', '', '']);
  dvudData.push(['KABUPATEN SERUYAN', '', '', '', '', '', '', '', '', '', '']);
  dvudData.push(['DAFTAR VOUCHER UTANG YANG HARUS DIBAYAR', '', '', '', '', '', '', '', '', '', '']);
  dvudData.push(['BULAN MEI 2026', '', '', '', '', '', '', '', '', '', '']);
  dvudData.push([waktuCetak, '', '', '', '', '', '', '', '', '', '']);
  dvudData.push(['', '', '', '', '', '', '', '', '', '', '']);
  dvudData.push(['TGL', 'NO', 'URAIAN', 'TGL BAYAR', 'CARA', 'NO.PERK', 'NAMA PERKIRAAN', 'JUMLAH(Rp)', 'NO.PERK KREDIT', 'NAMA PERKIRAAN KREDIT', 'JUMLAH(Rp)']);

  // Filter transactions with utang
  for (const t of transactions) {
    let journal;
    try {
      journal = JSON.parse('[' + t.jurnal + ']');
    } catch (e) { continue; }

    const hasUtang = journal.some(j => j.akun_kode && j.akun_kode.startsWith('50.'));
    if (!hasUtang) continue;

    const tgl = t.tanggal || '';
    const debitEntry = journal.find(j => parseFloat(j.debit) > 0);
    const kreditEntry = journal.find(j => parseFloat(j.kredit) > 0 && j.akun_kode && j.akun_kode.startsWith('50.'));

    if (debitEntry && kreditEntry) {
      dvudData.push([
        tgl, '', t.deskripsi, '', '',
        debitEntry.akun_kode || '', debitEntry.akun_nama || '', parseFloat(debitEntry.debit) || 0,
        kreditEntry.akun_kode || '', kreditEntry.akun_nama || '', parseFloat(kreditEntry.kredit) || 0
      ]);
    }
  }

  const dvudSheet = XLSX.utils.aoa_to_sheet(dvudData);
  dvudSheet['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 35 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, dvudSheet, 'DVUD');

  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateJournal };
