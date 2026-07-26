const XLSX = require('xlsx');

function generateNeracaLajur(db, outputPath) {
  const wb = XLSX.utils.book_new();

  const akun = db.queryAll('SELECT * FROM akun ORDER BY kode');
  const data = [];

  const now = new Date();
  const waktuCetak = 'Dicetak pada: ' + now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }) + ' WIB';

  data.push(['NERACA LAJUR', '', '', '', '', '', '', '', '', '', '']);
  data.push(['PERUSAHAAN UMUM DAERAH AIR MINUM TI', '', '', '', '', '', '', '', '', '', '']);
  data.push(['UNTUK TAHUN YANG BERAKHIR 31 MEI 2026', '', '', '', '', '', '', '', '', '', '']);
  data.push([waktuCetak, '', '', '', '', '', '', '', '', '', '']);
  data.push(['', '', '', '', '', '', '', '', '', '', '']);
  data.push(['URAIAN', '', 'NERACA SALDO AWAL', '', 'MUTASI', '', 'NERACA SALDO', '', 'RUGI/LABA', '', 'NERACA AKHIR']);
  data.push(['', '', 'D', 'K', 'D', 'K', 'D', 'K', 'D', 'K', 'D', 'K']);

  for (const a of akun) {
    const entries = db.queryAll(`
      SELECT COALESCE(SUM(j.debit), 0) as total_debit, COALESCE(SUM(j.kredit), 0) as total_kredit
      FROM jurnal j WHERE j.akun_id = ?
    `, [a.id]);

    const totalD = parseFloat(entries[0].total_debit);
    const totalK = parseFloat(entries[0].total_kredit);

    let saldo = a.saldo_normal === 'debit' ? totalD - totalK : totalK - totalD;
    saldo = Math.round(saldo * 100) / 100;

    if (saldo === 0 && totalD === 0 && totalK === 0) continue;

    const isRL = a.tipe === 'pendapatan' || a.tipe === 'beban';

    let row;
    if (a.saldo_normal === 'debit') {
      if (isRL) {
        row = [a.nama, '', '', '', '', '', '', '', saldo > 0 ? saldo : '', saldo < 0 ? -saldo : '', '', ''];
      } else {
        row = [a.nama, '', '', '', '', '', saldo > 0 ? saldo : '', saldo < 0 ? -saldo : '', '', '', '', ''];
      }
    } else {
      if (isRL) {
        row = [a.nama, '', '', '', '', '', '', '', saldo < 0 ? -saldo : '', saldo > 0 ? saldo : '', '', ''];
      } else {
        row = [a.nama, '', '', '', '', '', saldo < 0 ? -saldo : '', saldo > 0 ? saldo : '', '', '', '', ''];
      }
    }

    data.push(row);
  }

  const sheet = XLSX.utils.aoa_to_sheet(data);
  sheet['!cols'] = [{ wch: 35 }, { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, sheet, 'NERCA LAJUR MEI');

  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateNeracaLajur };
