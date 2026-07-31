const XLSX = require('xlsx-js-style');

function formatDate(tanggal) {
  if (!tanggal) return '';
  const s = String(tanggal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const n = parseFloat(s);
  if (!isNaN(n) && n > 40000 && n < 50000) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) {
      const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      return String(d.d).padStart(2, '0') + ' ' + monthNames[(d.m || 1) - 1] + ' ' + (d.y || 2026);
    }
  }
  const m = s.match(/(\d{1,2})\s+(\w+)/i);
  if (m) {
    const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const monthNum = { jan:0, feb:1, mar:2, apr:3, mei:4, jun:5, jul:6, agu:7, sep:8, okt:9, nov:10, des:11 };
    const mi = monthNum[m[2].substring(0, 3).toLowerCase()];
    if (mi !== undefined) return m[1] + ' ' + monthNames[mi] + ' 2026';
  }
  return s;
}

function formatMonthYear(bulan) {
  const monthNames = { '01': 'JANUARI', '02': 'FEBRUARI', '03': 'MARET', '04': 'APRIL', '05': 'MEI', '06': 'JUNI', '07': 'JULI', '08': 'AGUSTUS', '09': 'SEPTEMBER', '10': 'OKTOBER', '11': 'NOVEMBER', '12': 'DESEMBER' };
  return monthNames[bulan] || 'MEI';
}

const GROUPED_ACCOUNTS = [
  { sheetName: '11.01-12.01', title: 'Kas, Kas Kecil & Piutang Kas Kecil', kodeStart: '11.01', kodeEnd: '12.01', kodePattern: /^1[12]\./ },
  { sheetName: '13.00', title: 'Piutang', kodeStart: '13.00', kodeEnd: '13.09', kodePattern: /^13\./ },
  { sheetName: '14.00', title: 'Penyisihan Piutang', kodeStart: '14.00', kodeEnd: '14.09', kodePattern: /^14\./ },
  { sheetName: '15.00-16.00', title: 'Persediaan & Uang Muka', kodeStart: '15.00', kodeEnd: '16.99', kodePattern: /^1[56]\./ },
  { sheetName: '31.01-31.09', title: 'Aset Tetap', kodeStart: '31.01', kodeEnd: '31.09', kodePattern: /^31\.0[1-9]/ },
  { sheetName: '31.10', title: 'Investasi Jangka Panjang', kodeStart: '31.10', kodeEnd: '31.19', kodePattern: /^31\.1/ },
  { sheetName: '35.00-35.01-37.00', title: 'Aset Lainnya', kodeStart: '35.00', kodeEnd: '37.99', kodePattern: /^3[5-7]\./ },
  { sheetName: '50.00', title: 'Utang', kodeStart: '50.00', kodeEnd: '50.99', kodePattern: /^50\./ },
  { sheetName: '70.00', title: 'Kekayaan Perusahaan', kodeStart: '70.00', kodeEnd: '70.99', kodePattern: /^7[0-9]\./ },
  { sheetName: '81.01', title: 'Pendapatan', kodeStart: '81.01', kodeEnd: '81.01', kodePattern: /^81\.01/ },
  { sheetName: '81.02-81.03', title: 'Pendapatan Non Air & Lainnya', kodeStart: '81.02', kodeEnd: '81.03', kodePattern: /^81\.0[2-3]/ },
  { sheetName: '88.00', title: 'Pendapatan Di Luar Usaha', kodeStart: '88.00', kodeEnd: '88.99', kodePattern: /^88\./ },
  { sheetName: '91.00', title: 'Beban Pokok Pendapatan', kodeStart: '91.00', kodeEnd: '91.99', kodePattern: /^91\./ },
  { sheetName: '92.00', title: 'Beban Operasional', kodeStart: '92.00', kodeEnd: '92.99', kodePattern: /^92\./ },
  { sheetName: '93.00  dan 96.00', title: 'Beban Trandis & Beban Umum', kodeStart: '93.00', kodeEnd: '96.99', kodePattern: /^9[3-6]\./ },
  { sheetName: '97.01-97.02', title: 'Beban Pemeliharaan', kodeStart: '97.01', kodeEnd: '97.02', kodePattern: /^97\.0[12]/ },
  { sheetName: '97.03-97.06', title: 'Beban Hubungan Pelanggan & Lainnya', kodeStart: '97.03', kodeEnd: '97.06', kodePattern: /^97\.0[3-6]/ },
  { sheetName: '97.07-97.09', title: 'Beban Lain-lain', kodeStart: '97.07', kodeEnd: '97.09', kodePattern: /^97\.0[7-9]/ },
  { sheetName: '98.00', title: 'Beban Luar Usaha', kodeStart: '98.00', kodeEnd: '98.99', kodePattern: /^98\./ },
];

function generateBukuBesar(db, outputPath) {
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const waktuCetak = 'Dicetak pada: ' + now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }) + ' WIB';

  // Detect month from transactions
  let bulanNama = 'MEI';
  const firstTx = db.queryOne('SELECT tanggal FROM transaksi ORDER BY tanggal ASC LIMIT 1');
  if (firstTx && firstTx.tanggal && firstTx.tanggal.length >= 7) {
    bulanNama = formatMonthYear(firstTx.tanggal.substring(5, 7));
  }

  for (const group of GROUPED_ACCOUNTS) {
    const accounts = db.queryAll(`
      SELECT a.* FROM akun a 
      WHERE a.kode LIKE ? || '%'
      ORDER BY a.kode
    `, [group.kodeStart.split('.')[0]]);

    // Filter accounts that match the group pattern
    const matchingAccounts = accounts.filter(a => group.kodePattern.test(a.kode));

    if (matchingAccounts.length === 0) {
      // Create empty sheet
      const emptyData = [];
      emptyData.push(['PERUSAHAAN DAERAH AIR MINUM']);
      emptyData.push(['KABUPATEN SERUYAN']);
      emptyData.push([]);
      emptyData.push(['BUKU BESAR']);
      emptyData.push(['Nama Perk : ' + group.title, '', '', 'Kode Perkiraan : ' + group.sheetName]);
      emptyData.push([]);
      emptyData.push(['Tgl', 'Uraian', 'Ref.', 'Mutasi', '', 'Saldo Akhir']);
      emptyData.push(['', '', '', 'Debet', 'Kredit', '']);
      emptyData.push([]);
      emptyData.push(['', 'JUMLAH MUTASI', '', 0, 0, 0]);
      emptyData.push(['', 'SALDO AWAL', '', 0, 0, 0]);
      emptyData.push(['', 'JUMLAH MUTASI', '', 0, 0, 0]);
      const sheet = XLSX.utils.aoa_to_sheet(emptyData);
      sheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, sheet, group.sheetName);
      continue;
    }

    // Get all entries for all matching accounts
    const allEntries = [];
    for (const a of matchingAccounts) {
      const entries = db.queryAll(`
        SELECT t.tanggal, t.deskripsi, j.debit, j.kredit, a.kode as akun_kode, a.nama as akun_nama, a.saldo_normal
        FROM jurnal j
        JOIN transaksi t ON t.id = j.transaksi_id
        JOIN akun a ON a.id = j.akun_id
        WHERE j.akun_id = ?
        ORDER BY t.tanggal ASC, t.id ASC
      `, [a.id]);
      allEntries.push(...entries);
    }

    // Sort all entries by date
    allEntries.sort((a, b) => {
      if (a.tanggal < b.tanggal) return -1;
      if (a.tanggal > b.tanggal) return 1;
      return 0;
    });

    const data = [];
    data.push(['PERUSAHAAN DAERAH AIR MINUM']);
    data.push(['KABUPATEN SERUYAN']);
    data.push([]);
    data.push(['BUKU BESAR']);
    data.push(['Nama Perk : ' + group.title, '', '', 'Kode Perkiraan : ' + group.sheetName]);
    data.push(['', '', '', '', '', waktuCetak]);
    data.push([]);
    data.push(['Tgl', 'Uraian', 'Ref.', 'Mutasi', '', 'Saldo Akhir']);
    data.push(['', '', '', 'Debet', 'Kredit', '']);

    // Calculate running saldo per account
    const saldoMap = {};
    for (const a of matchingAccounts) {
      saldoMap[a.kode] = 0;
    }

    let totalDebit = 0;
    let totalKredit = 0;

    for (const e of allEntries) {
      const debit = parseFloat(e.debit) || 0;
      const kredit = parseFloat(e.kredit) || 0;

      if (e.saldo_normal === 'debit') {
        saldoMap[e.akun_kode] = (saldoMap[e.akun_kode] || 0) + debit - kredit;
      } else {
        saldoMap[e.akun_kode] = (saldoMap[e.akun_kode] || 0) + kredit - debit;
      }

      totalDebit += debit;
      totalKredit += kredit;

      const totalSaldo = Object.values(saldoMap).reduce((s, v) => s + v, 0);

      const ref = e.deskripsi && e.deskripsi.includes('Voucher') ? 'DVUD' :
                  e.deskripsi && e.deskripsi.includes('Bayar') ? 'JBK' :
                  e.deskripsi && e.deskripsi.includes('Rekening Air') ? 'DRD' :
                  e.deskripsi && e.deskripsi.includes('Penerimaan') ? 'JPK' : 'JU';

      data.push([
        formatDate(e.tanggal),
        e.deskripsi,
        ref,
        debit > 0 ? debit : '',
        kredit > 0 ? kredit : '',
        Math.round(totalSaldo * 100) / 100
      ]);
    }

    data.push([]);
    data.push(['', 'JUMLAH MUTASI', '', totalDebit, totalKredit, Math.round(Object.values(saldoMap).reduce((s, v) => s + v, 0) * 100) / 100]);
    data.push(['', 'SALDO AWAL', '', 0, 0, 0]);
    data.push(['', 'JUMLAH MUTASI', '', totalDebit, totalKredit, Math.round(Object.values(saldoMap).reduce((s, v) => s + v, 0) * 100) / 100]);

    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, sheet, group.sheetName);
  }

  const { addTableStyles } = require('./index');
  if (typeof addTableStyles === 'function') addTableStyles(wb);
  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateBukuBesar };
