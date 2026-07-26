const XLSX = require('xlsx');
const coa = require('../engine/coa-lookup');

function generateBukuBesar(db, outputPath) {
  const wb = XLSX.utils.book_new();

  const akun = db.queryAll(`
    SELECT a.* FROM akun a 
    WHERE EXISTS (SELECT 1 FROM jurnal j WHERE j.akun_id = a.id)
    ORDER BY a.kode
  `);

  const now = new Date();
  const waktuCetak = 'Dicetak pada: ' + now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }) + ' WIB';

  for (const a of akun) {
    const entries = db.queryAll(`
      SELECT t.tanggal, t.deskripsi, j.debit, j.kredit
      FROM jurnal j
      JOIN transaksi t ON t.id = j.transaksi_id
      WHERE j.akun_id = ?
      ORDER BY t.tanggal ASC, t.id ASC
    `, [a.id]);

    const data = [];
    data.push(['PERUSAHAAN DAERAH AIR MINUM', '', '', '', '', '']);
    data.push(['KABUPATEN SERUYAN', '', '', '', '', '']);
    data.push(['BUKU BESAR', '', '', '', '', '']);
    data.push(['Nama Perk : ' + a.nama, '', '', 'Kode Perkiraan : ' + a.kode, '', '']);
    data.push([waktuCetak, '', '', '', '', '']);
    data.push(['', '', '', '', '', '']);
    data.push(['Tgl', 'Uraian', 'Ref.', 'Mutasi', '', 'Saldo Akhir']);
    data.push(['', '', '', 'Debet', 'Kredit', '']);

    let saldo = 0;
    for (const e of entries) {
      const debit = parseFloat(e.debit) || 0;
      const kredit = parseFloat(e.kredit) || 0;
      if (a.saldo_normal === 'debit') saldo += debit - kredit;
      else saldo += kredit - debit;

      const tgl = e.tanggal ? new Date(e.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

      data.push([
        tgl,
        e.deskripsi,
        'JPK',
        debit > 0 ? debit : '',
        kredit > 0 ? kredit : '',
        Math.round(saldo * 100) / 100
      ]);
    }

    data.push(['', '', '', '', '', '']);
    data.push(['JUMLAH MUTASI', '', '', entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0), entries.reduce((s, e) => s + (parseFloat(e.kredit) || 0), 0), Math.round(saldo * 100) / 100]);

    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, sheet, a.kode);
  }

  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateBukuBesar };
