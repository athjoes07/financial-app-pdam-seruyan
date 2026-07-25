const XLSX = require('xlsx');

function generateFinancialStatements(db, outputPath) {
  const wb = XLSX.utils.book_new();

  const akun = db.queryAll('SELECT * FROM akun ORDER BY kode');

  // Helper: get balance for an account
  function getBalance(kode) {
    const a = db.queryOne('SELECT id, saldo_normal FROM akun WHERE kode = ?', [kode]);
    if (!a) return 0;
    const j = db.queryOne('SELECT COALESCE(SUM(j.debit), 0) as td, COALESCE(SUM(j.kredit), 0) as tk FROM jurnal j WHERE j.akun_id = ?', [a.id]);
    const saldo = a.saldo_normal === 'debit' ? j.td - j.tk : j.tk - j.td;
    return Math.round(saldo * 100) / 100;
  }

  function getSumByTipe(tipe) {
    const akuns = db.queryAll('SELECT id, saldo_normal FROM akun WHERE tipe = ?', [tipe]);
    let total = 0;
    for (const a of akuns) {
      const j = db.queryOne('SELECT COALESCE(SUM(j.debit), 0) as td, COALESCE(SUM(j.kredit), 0) as tk FROM jurnal j WHERE j.akun_id = ?', [a.id]);
      const saldo = a.saldo_normal === 'debit' ? j.td - j.tk : j.tk - j.td;
      total += saldo;
    }
    return Math.round(total * 100) / 100;
  }

  // === SHEET: Laba-ETAP ===
  const labaData = [];
  labaData.push(['2. 1. LAPORAN LABA / (RUGI)', '', '', '', '', '', '', '']);
  labaData.push(['', '', '', '', '', '', '', '']);
  labaData.push(['PERUMDAM TIRTA SERUYAN', '', '', '', '', '', '', '']);
  labaData.push(['LAPORAN LABA RUGI BERDASARKAN SAK - ETAP', '', '', '', '', '', '', '']);
  labaData.push(['Untuk bulan yang berakhir pada tanggal 31 MEI 2026', '', '', '', '', '', '', '']);
  labaData.push(['(Dalam Rupiah)', '', '', '', '', '', '', '']);
  labaData.push(['', '', '', '', '', '', '', '']);
  labaData.push(['URAIAN', '', '', '', 'Tahun 2026', '', 'Tahun 2025']);
  labaData.push(['', '', '', '', '', '', '']);
  labaData.push(['PENDAPATAN USAHA', '', '', '', '', '', '']);
  labaData.push(['', 'Pendapatan Penjualan Air', '', '', '', '', '']);
  labaData.push(['', '', 'Pendapatan Harga Air', '', '', getBalance('81.01.10'), '']);
  labaData.push(['', '', 'Pendapatan Administrasi', '', '', getBalance('81.01.20'), '']);
  labaData.push(['', '', 'Pendapatan Air Mobil Tangki', '', '', getBalance('81.01.30'), '']);
  labaData.push(['', '', 'Jumlah Pendapatan Penjualan Air', '', '', 0, '']);
  labaData.push(['', 'Pendapatan Non Air', '', '', '', '', '']);
  labaData.push(['', '', 'Pendapatan Sambungan Baru', '', '', getBalance('81.02.10'), '']);
  labaData.push(['', '', 'Pendapatan Penyambungan Kembali', '', '', getBalance('81.02.20'), '']);
  labaData.push(['', '', 'Pendapatan Denda', '', '', getBalance('81.02.50'), '']);
  labaData.push(['', '', 'Pendapatan Penggantian Meter Rusak', '', '', getBalance('81.02.60'), '']);
  labaData.push(['', '', 'Pendapatan Penggantian Pipa Persil', '', '', getBalance('81.02.70'), '']);
  labaData.push(['', '', 'Pendapatan Non Air Lainnya', '', '', getBalance('81.02.90'), '']);
  labaData.push(['', '', 'Jumlah Pendapatan Non Air', '', '', 0, '']);
  labaData.push(['Jumlah Pendapatan Usaha', '', '', '', getSumByTipe('pendapatan'), '', '']);

  labaData.push(['BEBAN USAHA', '', '', '', '', '', '']);
  // Group beban by kategori
  const bebanOperasi = db.queryAll("SELECT * FROM akun WHERE tipe='beban' AND kategori='Beban Operasi' ORDER BY kode");
  const bebanUmum = db.queryAll("SELECT * FROM akun WHERE tipe='beban' AND kategori='Beban Umum & Adm' ORDER BY kode");

  let totalBebanOperasi = 0;
  for (const b of bebanOperasi) {
    const sal = getBalance(b.kode);
    totalBebanOperasi += sal;
  }
  labaData.push(['', 'Beban Operasi', '', '', totalBebanOperasi > 0 ? totalBebanOperasi : '', '', '']);

  let totalBebanUmum = 0;
  for (const b of bebanUmum) {
    const sal = getBalance(b.kode);
    totalBebanUmum += sal;
  }
  labaData.push(['', 'Beban Umum dan Administrasi', '', '', totalBebanUmum > 0 ? totalBebanUmum : '', '', '']);
  labaData.push(['JUMLAH BEBAN USAHA', '', '', '', totalBebanOperasi + totalBebanUmum, '', '']);
  labaData.push(['', '', '', '', '', '', '']);

  const totalPendapatan = getSumByTipe('pendapatan');
  const totalBeban = totalBebanOperasi + totalBebanUmum;
  const labaBersih = Math.round((totalPendapatan - totalBeban) * 100) / 100;

  labaData.push(['LABA/(RUGI) BERSIH', '', '', '', labaBersih, '', '']);

  const labaSheet = XLSX.utils.aoa_to_sheet(labaData);
  labaSheet['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 18 }, { wch: 5 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, labaSheet, 'Laba-ETAP');

  // === SHEET: Neraca ===
  const neracaData = [];
  neracaData.push(['', 'LAPORAN POSISI KEUANGAN', '', '', '', '', '', '']);
  neracaData.push(['', '', '', '', '', '', '', '']);
  neracaData.push(['PERUMDAM TIRTA SERUYAN', '', '', '', '', '', '', '']);
  neracaData.push(['LAPORAN POSISI KEUANGAN', '', '', '', '', '', '', '']);
  neracaData.push(['PER 31 MEI 2026 DAN 31 DESEMBER 2025', '', '', '', '', '', '', '']);
  neracaData.push(['', '', '', '', '', '', '', '']);
  neracaData.push(['Uraian', '', '', '', 'Catatan', '', 'Tahun 2026 (Rp.)', 'Tahun 2025 (Rp.)']);
  neracaData.push(['', '', '', '', '', '', '', '']);
  neracaData.push(['ASET', '', '', '', '', '', '', '']);
  neracaData.push(['ASET LANCAR', '', '', '', '', '', '', '']);
  neracaData.push(['', 'Kas', '', '', '', '', getBalance('11.01.00'), '']);
  neracaData.push(['', 'Deposito', '', '', '', '', getBalance('11.03.00'), '']);
  neracaData.push(['', 'Piutang Usaha', '', '', '', '', getBalance('13.01.00'), '']);
  neracaData.push(['', 'Piutang Non Air', '', '', '', '', getBalance('13.02.00'), '']);
  neracaData.push(['', 'Piutang Mitra', '', '', '', '', getBalance('13.03.00'), '']);
  neracaData.push(['', 'Persediaan Bahan Kimia', '', '', '', '', getBalance('15.01.00'), '']);
  neracaData.push(['', 'Persediaan BBM (Solar)', '', '', '', '', getBalance('15.02.00'), '']);
  neracaData.push(['', 'Uang Muka Kerja', '', '', '', '', getBalance('16.01.00'), '']);
  neracaData.push(['', 'Jumlah Aset Lancar', '', '', '', '', 0, '']);
  neracaData.push(['ASET TETAP', '', '', '', '', '', '', '']);
  neracaData.push(['', 'Aset Tetap', '', '', '', '', getBalance('31.01.00'), '']);
  neracaData.push(['', 'Akumulasi Penyusutan', '', '', '', '', getBalance('32.01.00'), '']);
  neracaData.push(['', 'Jumlah Aset Tetap', '', '', '', '', 0, '']);
  neracaData.push(['JUMLAH ASET', '', '', '', '', '', 0, '']);
  neracaData.push(['', '', '', '', '', '', '', '']);
  neracaData.push(['KEWAJIBAN', '', '', '', '', '', '', '']);
  neracaData.push(['', 'Utang Usaha', '', '', '', '', Math.abs(getBalance('50.01.00')), '']);
  neracaData.push(['', 'Utang Usaha - Bahan Kimia', '', '', '', '', Math.abs(getBalance('50.01.01')), '']);
  neracaData.push(['', 'Jumlah Kewajiban', '', '', '', '', 0, '']);
  neracaData.push(['', '', '', '', '', '', '', '']);
  neracaData.push(['EKUITAS', '', '', '', '', '', '', '']);
  neracaData.push(['', 'Kekayaan Pemda Yang Dipisahkan', '', '', '', '', getBalance('71.01.00'), '']);
  neracaData.push(['', 'Laba Ditahan', '', '', '', '', getBalance('76.01.00'), '']);
  const labaTahunBerjalan = getSumByTipe('pendapatan') - getSumByTipe('beban');
  neracaData.push(['', 'Laba Tahun Berjalan', '', '', '', '', Math.round(labaTahunBerjalan * 100) / 100, '']);
  neracaData.push(['', 'Jumlah Ekuitas', '', '', '', '', 0, '']);
  neracaData.push(['JUMLAH KEWAJIBAN DAN EKUITAS', '', '', '', '', '', 0, '']);

  const neracaSheet = XLSX.utils.aoa_to_sheet(neracaData);
  neracaSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 5 }, { wch: 5 }, { wch: 10 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, neracaSheet, 'Neraca');

  // === SHEET: P-9 Beban Operasi (Template) ===
  const opData = [
    ['PEMERINTAH KABUPATEN SERUYAN', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PERUSAHAAN UMUM DAERAH AIR MINUM (PERUMDAM', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAMPIRAN 9'],
    ['TIRTA SERUYAN', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['RENCANA BIAYA OPERASI', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['TAHUN ANGGARAN 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const opSheet = XLSX.utils.aoa_to_sheet(opData);
  XLSX.utils.book_append_sheet(wb, opSheet, 'P-9. Beban Operasi');

  // === SHEET: P-10 Beban Umum & Adm (Template) ===
  const admData = [
    ['PEMERINTAH KABUPATEN SERUYAN', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['PERUSAHAAN UMUM DAERAH AIR MINUM (PERUMDAM', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAMPIRAN 10'],
    ['TIRTA SERUYAN', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['RENCANA BIAYA UMUM DAN ADMINISTRASI', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['TAHUN ANGGARAN 2026', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const admSheet = XLSX.utils.aoa_to_sheet(admData);
  XLSX.utils.book_append_sheet(wb, admSheet, 'P-10. Beban Umum & Adm');

  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateFinancialStatements };
