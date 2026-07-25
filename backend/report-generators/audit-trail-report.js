const XLSX = require('xlsx');

function generateAuditTrail(db, outputPath) {
  const wb = XLSX.utils.book_new();

  let logs = [];
  try {
    logs = db.queryAll(`
      SELECT timestamp, kategori, sumber_file, deskripsi, status, detail
      FROM audit_log
      ORDER BY id DESC
    `);
  } catch (e) {
    logs = [];
  }

  // If audit_log is empty, gather audit info from transactions
  if (!logs || logs.length === 0) {
    const txs = db.queryAll(`
      SELECT t.id, t.tanggal, t.deskripsi, t.sumber, t.created_at,
        SUM(j.debit) as total_debit, SUM(j.kredit) as total_kredit
      FROM transaksi t
      LEFT JOIN jurnal j ON j.transaksi_id = t.id
      GROUP BY t.id
      ORDER BY t.id ASC
    `);

    logs = txs.map(t => ({
      timestamp: t.created_at || new Date().toISOString(),
      kategori: t.sumber || 'TRANSAKSI',
      sumber_file: t.sumber || 'Sistem Keuangan',
      deskripsi: t.deskripsi,
      status: (t.total_debit === t.total_kredit && t.total_debit > 0) ? 'BALANCED' : 'UNBALANCED',
      detail: `Total Debit: Rp ${(t.total_debit || 0).toLocaleString('id-ID')} | Total Kredit: Rp ${(t.total_kredit || 0).toLocaleString('id-ID')}`
    }));
  }

  const data = [];
  data.push(['PERUMDAM TIRTA SERUYAN - KABUPATEN SERUYAN', '', '', '', '', '']);
  data.push(['AUDIT TRAIL & LOG PEMROSESAN DATA KEUANGAN', '', '', '', '', '']);
  data.push(['Tanggal Cetak: ' + new Date().toLocaleString('id-ID'), '', '', '', '', '']);
  data.push(['', '', '', '', '', '']);
  data.push(['No', 'Waktu / Timestamp', 'Kategori / Sumber', 'File Input / Ref', 'Deskripsi Operasi', 'Status', 'Detail Mutasi / Ringkasan']);

  logs.forEach((l, idx) => {
    data.push([
      idx + 1,
      l.timestamp,
      l.kategori,
      l.sumber_file,
      l.deskripsi,
      l.status,
      l.detail
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 20 },
    { wch: 30 },
    { wch: 45 },
    { wch: 15 },
    { wch: 50 }
  ];

  XLSX.utils.book_append_sheet(wb, sheet, 'AUDIT LOG');
  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateAuditTrail };
