const XLSX = require('xlsx-js-style');

const MONTHS = [
  { name: 'JANUARI', short: 'JAN', endDay: '31' },
  { name: 'FEBRUARI', short: 'FEB', endDay: '28' },
  { name: 'MARET', short: 'MAR', endDay: '31' },
  { name: 'APRIL', short: 'APR', endDay: '30' },
  { name: 'MEI', short: 'MEI', endDay: '31' },
];

function formatMonthYear(bulan) {
  const monthNames = { '01': 'JANUARI', '02': 'FEBRUARI', '03': 'MARET', '04': 'APRIL', '05': 'MEI', '06': 'JUNI', '07': 'JULI', '08': 'AGUSTUS', '09': 'SEPTEMBER', '10': 'OKTOBER', '11': 'NOVEMBER', '12': 'DESEMBER' };
  return monthNames[bulan] || 'MEI';
}

function generateFinancialStatements(db, outputPath) {
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const waktuCetak = 'Dicetak pada: ' + now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Jakarta' }) + ' WIB';

  // Detect month from transactions
  let bulanNama = 'MEI';
  let bulanAkhir = '31';
  const firstTx = db.queryOne('SELECT tanggal FROM transaksi ORDER BY tanggal ASC LIMIT 1');
  if (firstTx && firstTx.tanggal && firstTx.tanggal.length >= 7) {
    const mm = firstTx.tanggal.substring(5, 7);
    bulanNama = formatMonthYear(mm);
    const daysInMonth = { '01': '31', '02': '28', '03': '31', '04': '30', '05': '31', '06': '30', '07': '31', '08': '31', '09': '30', '10': '31', '11': '30', '12': '31' };
    bulanAkhir = daysInMonth[mm] || '31';
  }

  function getBalance(kode) {
    const a = db.queryOne('SELECT id, saldo_normal FROM akun WHERE kode = ?', [kode]);
    if (!a) return 0;
    const j = db.queryOne('SELECT COALESCE(SUM(j.debit), 0) as td, COALESCE(SUM(j.kredit), 0) as tk FROM jurnal j WHERE j.akun_id = ?', [a.id]);
    const saldo = a.saldo_normal === 'debit' ? j.td - j.tk : j.tk - j.td;
    return Math.round(saldo * 100) / 100;
  }

  function getBalanceUpTo(kode, endDate) {
    const a = db.queryOne('SELECT id, saldo_normal FROM akun WHERE kode = ?', [kode]);
    if (!a) return 0;
    const j = db.queryOne('SELECT COALESCE(SUM(j.debit), 0) as td, COALESCE(SUM(j.kredit), 0) as tk FROM jurnal j JOIN transaksi t ON t.id = j.transaksi_id WHERE j.akun_id = ? AND t.tanggal <= ?', [a.id, endDate]);
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

  function getSumByTipeUpTo(tipe, endDate) {
    const akuns = db.queryAll('SELECT id, saldo_normal FROM akun WHERE tipe = ?', [tipe]);
    let total = 0;
    for (const a of akuns) {
      const j = db.queryOne('SELECT COALESCE(SUM(j.debit), 0) as td, COALESCE(SUM(j.kredit), 0) as tk FROM jurnal j JOIN transaksi t ON t.id = j.transaksi_id WHERE j.akun_id = ? AND t.tanggal <= ?', [a.id, endDate]);
      const saldo = a.saldo_normal === 'debit' ? j.td - j.tk : j.tk - j.td;
      total += saldo;
    }
    return Math.round(total * 100) / 100;
  }

  function getAkunByKode(kode) {
    return db.queryOne('SELECT * FROM akun WHERE kode = ?', [kode]);
  }

  function getAkunByTipe(tipe) {
    return db.queryAll('SELECT * FROM akun WHERE tipe = ? ORDER BY kode', [tipe]);
  }

  // =========================================================
  // SHEET: Laba-ETAP - Laporan Laba Rugi SAK ETAP
  // =========================================================
  function buildLabaETAP() {
    const data = [];
    data.push(['2. 1. LAPORAN LABA / (RUGI)']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN LABA RUGI BERDASARKAN SAK - ETAP']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', '', '', 'Tahun 2026', '', 'Tahun 2025']);
    data.push([]);
    data.push(['PENDAPATAN USAHA']);
    data.push(['', 'Pendapatan Penjualan Air']);
    data.push(['', '', 'Pendapatan Harga Air', '', '', getBalance('81.01.10'), '']);
    data.push(['', '', 'Pendapatan Administrasi', '', '', getBalance('81.01.20'), '']);
    data.push(['', '', 'Pendapatan Air Mobil Tangki', '', '', getBalance('81.01.30'), '']);
    data.push(['', '', 'Jumlah Pendapatan Penjualan Air', '', '', getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30'), '']);
    data.push(['', 'Pendapatan Non Air']);
    data.push(['', '', 'Pendapatan Sambungan Baru', '', '', getBalance('81.02.10'), '']);
    data.push(['', '', 'Pendapatan Penyambungan Kembali', '', '', getBalance('81.02.20'), '']);
    data.push(['', '', 'Pendapatan Denda', '', '', getBalance('81.02.50'), '']);
    data.push(['', '', 'Pendapatan Penggantian Meter Rusak', '', '', getBalance('81.02.60'), '']);
    data.push(['', '', 'Pendapatan Penggantian Pipa Persil', '', '', getBalance('81.02.70'), '']);
    data.push(['', '', 'Pendapatan Non Air Lainnya', '', '', getBalance('81.02.90'), '']);
    data.push(['', '', 'Jumlah Pendapatan Non Air', '', '',
      getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90'), '']);
    data.push(['Jumlah Pendapatan Usaha', '', '', '',
      getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30') + getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90'), '']);
    data.push([]);
    data.push(['BEBAN USAHA']);
    data.push(['', 'Beban Operasi']);
    const bebanOpAkuns = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Operasi');
    for (const b of bebanOpAkuns) {
      const sal = getBalance(b.kode);
      data.push(['', '', b.nama, '', sal > 0 ? sal : '', '']);
    }
    const totalBebanOp = bebanOpAkuns.reduce((s, a) => s + Math.max(0, getBalance(a.kode)), 0);
    data.push(['', '', 'Jumlah Beban Operasi', '', totalBebanOp > 0 ? totalBebanOp : '', '']);
    data.push(['', 'Beban Umum dan Administrasi']);
    const bebanUmumAkuns = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Umum & Adm');
    for (const b of bebanUmumAkuns) {
      const sal = getBalance(b.kode);
      data.push(['', '', b.nama, '', sal > 0 ? sal : '', '']);
    }
    const totalBebanUmum = bebanUmumAkuns.reduce((s, a) => s + Math.max(0, getBalance(a.kode)), 0);
    data.push(['', '', 'Jumlah Beban Umum dan Administrasi', '', totalBebanUmum > 0 ? totalBebanUmum : '', '']);
    data.push(['JUMLAH BEBAN USAHA', '', '', '', totalBebanOp + totalBebanUmum, '']);
    data.push([]);
    const totalPendapatan = getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30') + getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90');
    const labaBersih = Math.round((totalPendapatan - totalBebanOp - totalBebanUmum) * 100) / 100;
    data.push(['LABA/(RUGI) BERSIH', '', '', '', labaBersih, '']);
    data.push([]);
    data.push(['Saldo Laba Ditahan', '', '', '', getBalance('76.01.00'), '']);
    data.push(['Saldo Laba Tahun Berjalan', '', '', '', getBalance('77.01.00'), '']);
    return data;
  }
  const labaSheet = XLSX.utils.aoa_to_sheet(buildLabaETAP());
  labaSheet['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 18 }, { wch: 5 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, labaSheet, 'Laba-ETAP');

  // =========================================================
  // SHEET: Laba-OTDA - Laporan Laba Rugi OTDA
  // =========================================================
  function buildLabaOTDA() {
    const data = [];
    data.push(['LAPORAN LABA / (RUGI)']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN LABA RUGI BERDASARKAN SAK - OTDA']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', 'Tahun 2026', '', 'Tahun 2025', '']);
    data.push([]);
    data.push(['PENDAPATAN']);
    data.push(['', 'Pendapatan Usaha']);
    data.push(['', '', 'Pendapatan Harga Air', '', getBalance('81.01.10'), '']);
    data.push(['', '', 'Pendapatan Administrasi', '', getBalance('81.01.20'), '']);
    data.push(['', '', 'Pendapatan Air Mobil Tangki', '', getBalance('81.01.30'), '']);
    data.push(['', 'Pendapatan Non Air']);
    data.push(['', '', 'Pendapatan Sambungan Baru', '', getBalance('81.02.10'), '']);
    data.push(['', '', 'Pendapatan Penyambungan Kembali', '', getBalance('81.02.20'), '']);
    data.push(['', '', 'Pendapatan Denda', '', getBalance('81.02.50'), '']);
    data.push(['', '', 'Pendapatan Penggantian Meter Rusak', '', getBalance('81.02.60'), '']);
    data.push(['', '', 'Pendapatan Penggantian Pipa Persil', '', getBalance('81.02.70'), '']);
    data.push(['', '', 'Pendapatan Non Air Lainnya', '', getBalance('81.02.90'), '']);
    data.push(['Jumlah Pendapatan', '', getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30') + getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90'), '']);
    data.push([]);
    data.push(['BEBAN USAHA']);
    const bebanOp = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Operasi');
    for (const b of bebanOp) {
      data.push(['', b.nama, getBalance(b.kode), '']);
    }
    const totalBebanOp = bebanOp.reduce((s, a) => s + Math.max(0, getBalance(a.kode)), 0);
    data.push(['', 'Jumlah Beban Operasi', totalBebanOp, '']);
    const bebanUmum = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Umum & Adm');
    for (const b of bebanUmum) {
      data.push(['', b.nama, getBalance(b.kode), '']);
    }
    const totalBebanUmum = bebanUmum.reduce((s, a) => s + Math.max(0, getBalance(a.kode)), 0);
    data.push(['', 'Jumlah Beban Umum dan Administrasi', totalBebanUmum, '']);
    data.push(['JUMLAH BEBAN USAHA', '', totalBebanOp + totalBebanUmum, '']);
    data.push([]);
    const totalPendapatan = getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30') + getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90');
    data.push(['LABA/(RUGI) BERSIH', '', Math.round((totalPendapatan - totalBebanOp - totalBebanUmum) * 100) / 100, '']);
    return data;
  }
  const labaOtdaSheet = XLSX.utils.aoa_to_sheet(buildLabaOTDA());
  labaOtdaSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 5 }, { wch: 18 }, { wch: 5 }];
  XLSX.utils.book_append_sheet(wb, labaOtdaSheet, 'Laba-OTDA');

  // =========================================================
  // SHEET: Neraca - Laporan Posisi Keuangan
  // =========================================================
  function buildNeraca() {
    const data = [];
    data.push(['', 'LAPORAN POSISI KEUANGAN']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN POSISI KEUANGAN']);
    data.push(['PER ' + bulanAkhir + ' ' + bulanNama + ' 2026 DAN 31 DESEMBER 2025']);
    data.push([waktuCetak]);
    data.push([]);
    data.push(['Uraian', '', 'Catatan', '', 'Tahun 2026 (Rp.)', 'Tahun 2025 (Rp.)']);
    data.push([]);
    data.push(['ASET']);
    data.push(['ASET LANCAR']);
    data.push(['', 'Kas', '', '', getBalance('11.01.00'), '']);
    data.push(['', 'Deposito', '', '', getBalance('11.03.00'), '']);
    data.push(['', 'Piutang Usaha', '', '', getBalance('13.01.00'), '']);
    data.push(['', 'Piutang Non Air', '', '', getBalance('13.02.00'), '']);
    data.push(['', 'Piutang Mitra', '', '', getBalance('13.03.00'), '']);
    data.push(['', 'Piutang Non Air (Bunga Deposito)', '', '', getBalance('13.04.00'), '']);
    data.push(['', 'Penyisihan Piutang Usaha', '', '', getBalance('14.01.00'), '']);
    data.push(['', 'Persediaan Bahan Kimia', '', '', getBalance('15.01.00'), '']);
    data.push(['', 'Persediaan BBM (Solar)', '', '', getBalance('15.02.00'), '']);
    data.push(['', 'Persediaan Bahan Instalasi', '', '', getBalance('15.03.00'), '']);
    data.push(['', 'Uang Muka Kerja', '', '', getBalance('16.01.00'), '']);
    const asetLancar = getBalance('11.01.00') + getBalance('11.03.00') + getBalance('13.01.00') + getBalance('13.02.00') + getBalance('13.03.00') + getBalance('13.04.00') + getBalance('14.01.00') + getBalance('15.01.00') + getBalance('15.02.00') + getBalance('15.03.00') + getBalance('16.01.00');
    data.push(['', 'Jumlah Aset Lancar', '', '', asetLancar, '']);
    data.push([]);
    data.push(['ASET TETAP']);
    data.push(['', 'Aset Tetap', '', '', getBalance('31.01.00'), '']);
    data.push(['', 'Akumulasi Penyusutan', '', '', getBalance('32.01.00'), '']);
    data.push(['', 'Aset Dalam Penyelesaian', '', '', getBalance('33.01.00'), '']);
    const asetTetap = getBalance('31.01.00') + getBalance('32.01.00') + getBalance('33.01.00');
    data.push(['', 'Jumlah Aset Tetap', '', '', asetTetap, '']);
    data.push([]);
    data.push(['JUMLAH ASET', '', '', '', asetLancar + asetTetap, '']);
    data.push([]);
    data.push([]);
    data.push(['KEWAJIBAN']);
    data.push(['KEWAJIBAN LANCAR']);
    data.push(['', 'Utang Usaha', '', '', Math.abs(getBalance('50.01.00')), '']);
    data.push(['', 'Utang Usaha - Bahan Kimia', '', '', Math.abs(getBalance('50.01.01')), '']);
    const totalKewajiban = Math.abs(getBalance('50.01.00')) + Math.abs(getBalance('50.01.01'));
    data.push(['', 'Jumlah Kewajiban', '', '', totalKewajiban, '']);
    data.push([]);
    data.push(['EKUITAS']);
    data.push(['', 'Kekayaan Pemda Yang Dipisahkan', '', '', getBalance('71.01.00'), '']);
    data.push(['', 'Laba Ditahan', '', '', getBalance('76.01.00'), '']);
    const labaTahunBerjalan = getSumByTipe('pendapatan') - getSumByTipe('beban');
    data.push(['', 'Laba Tahun Berjalan', '', '', Math.round(labaTahunBerjalan * 100) / 100, '']);
    const totalEkuitas = getBalance('71.01.00') + getBalance('76.01.00') + Math.round(labaTahunBerjalan * 100) / 100;
    data.push(['', 'Jumlah Ekuitas', '', '', totalEkuitas, '']);
    data.push([]);
    data.push(['JUMLAH KEWAJIBAN DAN EKUITAS', '', '', '', totalKewajiban + totalEkuitas, '']);
    return data;
  }
  const neracaSheet = XLSX.utils.aoa_to_sheet(buildNeraca());
  neracaSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, neracaSheet, 'Neraca');

  // =========================================================
  // SHEET: ARUS KAS - Laporan Arus Kas
  // =========================================================
  function buildArusKas() {
    const data = [];
    data.push(['LAPORAN ARUS KAS']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN ARUS KAS']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    data.push(['ARUS KAS DARI AKTIVITAS OPERASI']);
    data.push(['', 'Penerimaan dari Pelanggan', getBalance('11.01.00'), '']);
    data.push(['', 'Pembayaran kepada Pemasok', 0, '']);
    data.push(['', 'Pembayaran kepada Pegawai', 0, '']);
    data.push(['', 'Pembayaran Bunga', 0, '']);
    data.push(['', 'Pembayaran Pajak', 0, '']);
    data.push(['', 'Pembayaran Dividen', 0, '']);
    data.push(['', 'Arus Kas Bersih dari Aktivitas Operasi', getBalance('11.01.00'), '']);
    data.push([]);
    data.push(['ARUS KAS DARI AKTIVITAS INVESTASI']);
    data.push(['', 'Pembelian Aset Tetap', 0, '']);
    data.push(['', 'Pendapatan Bunga Deposito', getBalance('11.03.00'), '']);
    data.push(['', 'Arus Kas Bersih dari Aktivitas Investasi', getBalance('11.03.00'), '']);
    data.push([]);
    data.push(['ARUS KAS DARI AKTIVITAS PENDANAAN']);
    data.push(['', 'Penerimaan Pinjaman', 0, '']);
    data.push(['', 'Pembayaran Pinjaman', 0, '']);
    data.push(['', 'Arus Kas Bersih dari Aktivitas Pendanaan', 0, '']);
    data.push([]);
    data.push(['PENINGKATAN/(PENURUNAN) BERSIH KAS', '', getBalance('11.01.00') + getBalance('11.03.00'), '']);
    data.push(['KAS AWAL', '', 0, '']);
    data.push(['KAS AKHIR', '', getBalance('11.01.00') + getBalance('11.03.00'), '']);
    return data;
  }
  const arusKasSheet = XLSX.utils.aoa_to_sheet(buildArusKas());
  arusKasSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, arusKasSheet, 'ARUS KAS');

  // =========================================================
  // SHEET: LAP ARUS KAS - Detail Lap Arus Kas
  // =========================================================
  function buildLapArusKas() {
    const data = [];
    data.push(['LAPORAN ARUS KAS']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN ARUS KAS']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', '', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    data.push(['ARUS KAS DARI AKTIVITAS OPERASI']);
    data.push(['', 'Kas diterima dari pelanggan', '', getBalance('11.01.00'), '']);
    data.push(['', 'Kas dibayar untuk barang dan jasa', '', 0, '']);
    data.push(['', 'Kas dibayar kepada pegawai', '', 0, '']);
    data.push(['', 'Kas dibayar bunga', '', 0, '']);
    data.push(['', 'Kas dibayar pajak', '', 0, '']);
    data.push(['', 'Kas dibayar dividen', '', 0, '']);
    data.push(['', '', 'Jumlah Arus Kas dari Aktivitas Operasi', getBalance('11.01.00'), '']);
    data.push([]);
    data.push(['ARUS KAS DARI AKTIVITAS INVESTASI']);
    data.push(['', 'Kas dibayar untuk investasi', '', 0, '']);
    data.push(['', 'Kas diterima dari investasi', '', 0, '']);
    data.push(['', '', 'Jumlah Arus Kas dari Aktivitas Investasi', 0, '']);
    data.push([]);
    data.push(['ARUS KAS DARI AKTIVITAS PENDANAAN']);
    data.push(['', 'Kas diterima dari pinjaman', '', 0, '']);
    data.push(['', 'Kas dibayar untuk pinjaman', '', 0, '']);
    data.push(['', '', 'Jumlah Arus Kas dari Aktivitas Pendanaan', 0, '']);
    data.push([]);
    data.push(['PENINGKATAN/(PENURUNAN) BERSIH KAS', '', '', getBalance('11.01.00'), '']);
    data.push(['KAS AWAL', '', '', 0, '']);
    data.push(['KAS AKHIR', '', '', getBalance('11.01.00'), '']);
    return data;
  }
  const lapArusKasSheet1 = XLSX.utils.aoa_to_sheet(buildLapArusKas());
  lapArusKasSheet1['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, lapArusKasSheet1, 'LAP ARUS KAS');

  // LAP ARUS KAS (2) - same structure
  const lapArusKasSheet2 = XLSX.utils.aoa_to_sheet(buildLapArusKas());
  lapArusKasSheet2['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, lapArusKasSheet2, 'LAP ARUS KAS (2)');

  // =========================================================
  // SHEET: Lap. Perputaran Uang
  // =========================================================
  function buildLapPerputaranUang() {
    const data = [];
    data.push(['LAPORAN PERPUTARAN UANG']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN PERPUTARAN UANG']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    data.push(['KAS']);
    data.push(['', 'Kas di Hand', '', getBalance('11.01.00'), '']);
    data.push(['', 'Kas di Bank', '', getBalance('11.03.00'), '']);
    data.push(['', 'Jumlah Kas', '', getBalance('11.01.00') + getBalance('11.03.00'), '']);
    data.push([]);
    data.push(['PIUTANG']);
    data.push(['', 'Piutang Usaha', '', getBalance('13.01.00'), '']);
    data.push(['', 'Piutang Non Air', '', getBalance('13.02.00'), '']);
    data.push(['', 'Piutang Mitra', '', getBalance('13.03.00'), '']);
    data.push(['', 'Jumlah Piutang', '', getBalance('13.01.00') + getBalance('13.02.00') + getBalance('13.03.00'), '']);
    data.push([]);
    data.push(['PERSEDIAAN']);
    data.push(['', 'Persediaan Bahan Kimia', '', getBalance('15.01.00'), '']);
    data.push(['', 'Persediaan BBM', '', getBalance('15.02.00'), '']);
    data.push(['', 'Persediaan Bahan Instalasi', '', getBalance('15.03.00'), '']);
    data.push(['', 'Jumlah Persediaan', '', getBalance('15.01.00') + getBalance('15.02.00') + getBalance('15.03.00'), '']);
    data.push([]);
    data.push(['ASET LANCAR LAINNYA']);
    data.push(['', 'Uang Muka Kerja', '', getBalance('16.01.00'), '']);
    data.push(['', 'Jumlah Aset Lancar Lainnya', '', getBalance('16.01.00'), '']);
    data.push([]);
    data.push(['JUMLAH ASET LANCAR', '', '', getBalance('11.01.00') + getBalance('11.03.00') + getBalance('13.01.00') + getBalance('13.02.00') + getBalance('13.03.00') + getBalance('15.01.00') + getBalance('15.02.00') + getBalance('15.03.00') + getBalance('16.01.00'), '']);
    return data;
  }
  const perputaranUangSheet = XLSX.utils.aoa_to_sheet(buildLapPerputaranUang());
  perputaranUangSheet['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, perputaranUangSheet, 'Lap. Perputaran Uang');

  // =========================================================
  // SHEET: Ekuitas
  // =========================================================
  function buildEkuitas() {
    const data = [];
    data.push(['LAPORAN PERUBAHAN EKUITAS']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN PERUBAHAN EKUITAS']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', 'Modal Pemerintah', 'Laba Ditahan', 'Laba Tahun Berjalan', 'Jumlah']);
    data.push([]);
    data.push(['Saldo Awal', '', getBalance('71.01.00'), getBalance('76.01.00'), 0, getBalance('71.01.00') + getBalance('76.01.00')]);
    const labaTahunBerjalan = getSumByTipe('pendapatan') - getSumByTipe('beban');
    data.push(['Laba Tahun Berjalan', '', 0, 0, Math.round(labaTahunBerjalan * 100) / 100, Math.round(labaTahunBerjalan * 100) / 100]);
    data.push(['Saldo Akhir', '', getBalance('71.01.00'), getBalance('76.01.00'), Math.round(labaTahunBerjalan * 100) / 100, getBalance('71.01.00') + getBalance('76.01.00') + Math.round(labaTahunBerjalan * 100) / 100]);
    return data;
  }
  const ekuitasSheet = XLSX.utils.aoa_to_sheet(buildEkuitas());
  ekuitasSheet['!cols'] = [{ wch: 30 }, { wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ekuitasSheet, 'Ekuitas');

  // =========================================================
  // SHEET: NERACA KOMPARATIF
  // =========================================================
  function buildNeracaKomparatif() {
    const data = [];
    data.push(['NERACA KOMPARATIF']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['NERACA KOMPARATIF']);
    data.push(['PER ' + bulanAkhir + ' ' + bulanNama + ' 2026 DAN 31 DESEMBER 2025']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['Uraian', '', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    data.push(['ASET']);
    data.push(['ASET LANCAR']);
    data.push(['', 'Kas', getBalance('11.01.00'), '']);
    data.push(['', 'Deposito', getBalance('11.03.00'), '']);
    data.push(['', 'Piutang Usaha', getBalance('13.01.00'), '']);
    data.push(['', 'Piutang Non Air', getBalance('13.02.00'), '']);
    data.push(['', 'Piutang Mitra', getBalance('13.03.00'), '']);
    data.push(['', 'Penyisihan Piutang Usaha', getBalance('14.01.00'), '']);
    data.push(['', 'Persediaan', getBalance('15.01.00') + getBalance('15.02.00') + getBalance('15.03.00'), '']);
    data.push(['', 'Uang Muka Kerja', getBalance('16.01.00'), '']);
    const asetLancar = getBalance('11.01.00') + getBalance('11.03.00') + getBalance('13.01.00') + getBalance('13.02.00') + getBalance('13.03.00') + getBalance('14.01.00') + getBalance('15.01.00') + getBalance('15.02.00') + getBalance('15.03.00') + getBalance('16.01.00');
    data.push(['', 'Jumlah Aset Lancar', asetLancar, '']);
    data.push([]);
    data.push(['ASET TETAP']);
    data.push(['', 'Aset Tetap', getBalance('31.01.00'), '']);
    data.push(['', 'Akumulasi Penyusutan', getBalance('32.01.00'), '']);
    data.push(['', 'Aset Dalam Penyelesaian', getBalance('33.01.00'), '']);
    const asetTetap = getBalance('31.01.00') + getBalance('32.01.00') + getBalance('33.01.00');
    data.push(['', 'Jumlah Aset Tetap', asetTetap, '']);
    data.push(['JUMLAH ASET', '', asetLancar + asetTetap, '']);
    data.push([]);
    data.push(['KEWAJIBAN']);
    data.push(['', 'Utang Usaha', Math.abs(getBalance('50.01.00')), '']);
    data.push(['', 'Utang Usaha - Bahan Kimia', Math.abs(getBalance('50.01.01')), '']);
    const totalKewajiban = Math.abs(getBalance('50.01.00')) + Math.abs(getBalance('50.01.01'));
    data.push(['', 'Jumlah Kewajiban', totalKewajiban, '']);
    data.push([]);
    data.push(['EKUITAS']);
    data.push(['', 'Kekayaan Pemda Yang Dipisahkan', getBalance('71.01.00'), '']);
    data.push(['', 'Laba Ditahan', getBalance('76.01.00'), '']);
    const labaTahunBerjalanKomp = getSumByTipe('pendapatan') - getSumByTipe('beban');
    data.push(['', 'Laba Tahun Berjalan', Math.round(labaTahunBerjalanKomp * 100) / 100, '']);
    const totalEkuitas = getBalance('71.01.00') + getBalance('76.01.00') + Math.round(labaTahunBerjalanKomp * 100) / 100;
    data.push(['', 'Jumlah Ekuitas', totalEkuitas, '']);
    data.push(['JUMLAH KEWAJIBAN DAN EKUITAS', '', totalKewajiban + totalEkuitas, '']);
    return data;
  }
  const neracaKomparatifSheet = XLSX.utils.aoa_to_sheet(buildNeracaKomparatif());
  neracaKomparatifSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, neracaKomparatifSheet, 'NERACA KOMPARATIF');

  // =========================================================
  // SHEET: RL KOMPARATIF
  // =========================================================
  function buildRLKomparatif() {
    const data = [];
    data.push(['LAPORAN LABA RUGI KOMPARATIF']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['LAPORAN LABA RUGI KOMPARATIF']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', '', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    data.push(['PENDAPATAN USAHA']);
    data.push(['', 'Pendapatan Penjualan Air', getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30'), '']);
    data.push(['', 'Pendapatan Non Air', getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90'), '']);
    data.push(['Jumlah Pendapatan', '', getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30') + getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90'), '']);
    data.push([]);
    data.push(['BEBAN USAHA']);
    const bebanOp = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Operasi');
    for (const b of bebanOp) {
      data.push(['', b.nama, getBalance(b.kode), '']);
    }
    const totalBebanOp = bebanOp.reduce((s, a) => s + Math.max(0, getBalance(a.kode)), 0);
    data.push(['', 'Jumlah Beban Operasi', totalBebanOp, '']);
    const bebanUmum = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Umum & Adm');
    for (const b of bebanUmum) {
      data.push(['', b.nama, getBalance(b.kode), '']);
    }
    const totalBebanUmum = bebanUmum.reduce((s, a) => s + Math.max(0, getBalance(a.kode)), 0);
    data.push(['', 'Jumlah Beban Umum dan Administrasi', totalBebanUmum, '']);
    data.push(['JUMLAH BEBAN USAHA', '', totalBebanOp + totalBebanUmum, '']);
    data.push([]);
    const totalPendapatan = getBalance('81.01.10') + getBalance('81.01.20') + getBalance('81.01.30') + getBalance('81.02.10') + getBalance('81.02.20') + getBalance('81.02.50') + getBalance('81.02.60') + getBalance('81.02.70') + getBalance('81.02.90');
    data.push(['LABA/(RUGI) BERSIH', '', Math.round((totalPendapatan - totalBebanOp - totalBebanUmum) * 100) / 100, '']);
    return data;
  }
  const rlKomparatifSheet = XLSX.utils.aoa_to_sheet(buildRLKomparatif());
  rlKomparatifSheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, rlKomparatifSheet, 'RL KOMPARATIF');

  // =========================================================
  // SHEET: RINCIAN B. LANGSUNG USAHA
  // =========================================================
  function buildRincianBLangsung() {
    const data = [];
    data.push(['RINCIAN BEBAN LANGSUNG USAHA']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['RINCIAN BEBAN LANGSUNG USAHA']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', 'Kode', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    const bebanOp = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Operasi');
    let total = 0;
    for (const b of bebanOp) {
      const sal = getBalance(b.kode);
      total += sal;
      data.push([b.nama, b.kode, sal > 0 ? sal : 0, '']);
    }
    data.push(['JUMLAH BEBAN LANGSUNG USAHA', '', total, '']);
    return data;
  }
  const rincianBLSheet = XLSX.utils.aoa_to_sheet(buildRincianBLangsung());
  rincianBLSheet['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, rincianBLSheet, 'RINCIAN B. LANGSUNG USAHA');

  // =========================================================
  // SHEET: RINCIAN B. TDK LANGSUNG
  // =========================================================
  function buildRincianBTdkLangsung() {
    const data = [];
    data.push(['RINCIAN BEBAN TIDAK LANGSUNG']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['RINCIAN BEBAN TIDAK LANGSUNG']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', 'Kode', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    const bebanUmum = getAkunByTipe('beban').filter(a => a.kategori === 'Beban Umum & Adm');
    let total = 0;
    for (const b of bebanUmum) {
      const sal = getBalance(b.kode);
      total += sal;
      data.push([b.nama, b.kode, sal > 0 ? sal : 0, '']);
    }
    data.push(['JUMLAH BEBAN TIDAK LANGSUNG', '', total, '']);
    return data;
  }
  const rincianBTL = XLSX.utils.aoa_to_sheet(buildRincianBTdkLangsung());
  rincianBTL['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, rincianBTL, 'RINCIAN B. TDK LANGSUNG');

  // =========================================================
  // SHEET: B. NON OPERASIONAL
  // =========================================================
  function buildBebanNonOp() {
    const data = [];
    data.push(['BEBAN NON OPERASIONAL']);
    data.push([]);
    data.push(['PERUMDAM TIRTA SERUYAN']);
    data.push(['BEBAN NON OPERASIONAL']);
    data.push(['Untuk bulan yang berakhir pada tanggal ' + bulanAkhir + ' ' + bulanNama + ' 2026']);
    data.push([waktuCetak]);
    data.push(['(Dalam Rupiah)']);
    data.push([]);
    data.push(['URAIAN', 'Kode', 'Tahun 2026', 'Tahun 2025']);
    data.push([]);
    const bebanNonOp = getAkunByTipe('beban').filter(a => a.kategori !== 'Beban Operasi' && a.kategori !== 'Beban Umum & Adm');
    for (const b of bebanNonOp) {
      data.push([b.nama, b.kode, getBalance(b.kode), '']);
    }
    return data;
  }
  const bebanNonOpSheet = XLSX.utils.aoa_to_sheet(buildBebanNonOp());
  bebanNonOpSheet['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bebanNonOpSheet, 'B. NON OPERASIONAL');

  // =========================================================
  // SHEETS: P-9, P-10 (templates)
  // =========================================================
  function buildP9() {
    const data = [];
    data.push(['PEMERINTAH KABUPATEN SERUYAN']);
    data.push(['PERUSAHAAN UMUM DAERAH AIR MINUM (PERUMDAM', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAMPIRAN 9']);
    data.push(['TIRTA SERUYAN']);
    data.push(['RENCANA BIAYA OPERASI']);
    data.push(['TAHUN ANGGARAN 2026']);
    data.push([waktuCetak]);
    return data;
  }
  const p9Sheet = XLSX.utils.aoa_to_sheet(buildP9());
  XLSX.utils.book_append_sheet(wb, p9Sheet, 'P-9. Beban Operasi');

  function buildP10() {
    const data = [];
    data.push(['PEMERINTAH KABUPATEN SERUYAN']);
    data.push(['PERUSAHAAN UMUM DAERAH AIR MINUM (PERUMDAM', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAMPIRAN 10']);
    data.push(['TIRTA SERUYAN']);
    data.push(['']);
    data.push(['RENCANA BIAYA UMUM DAN ADMINISTRASI']);
    data.push(['TAHUN ANGGARAN 2026']);
    data.push([waktuCetak]);
    return data;
  }
  const p10Sheet = XLSX.utils.aoa_to_sheet(buildP10());
  XLSX.utils.book_append_sheet(wb, p10Sheet, 'P-10. Beban Umum & Adm');

  // =========================================================
  // SHEET: Sheet1 (empty template)
  // =========================================================
  const sheet1Data = [];
  sheet1Data.push(['']);
  const sheet1Sheet = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, sheet1Sheet, 'Sheet1');

  // =========================================================
  // SHEET: P-10. Biaya Operasi
  // =========================================================
  function buildP10BiayaOp() {
    const data = [];
    data.push(['PEMERINTAH KABUPATEN SERUYAN']);
    data.push(['PERUSAHAAN UMUM DAERAH AIR MINUM (PERUMDAM', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAMPIRAN 10']);
    data.push(['TIRTA SERUYAN']);
    data.push(['RENCANA BIAYA OPERASI']);
    data.push(['TAHUN ANGGARAN 2026']);
    data.push([waktuCetak]);
    return data;
  }
  const p10BiayaOpSheet = XLSX.utils.aoa_to_sheet(buildP10BiayaOp());
  XLSX.utils.book_append_sheet(wb, p10BiayaOpSheet, 'P-10. Biaya Operasi');

  // =========================================================
  // SHEET: P-11. Biaya UMUM & ADM
  // =========================================================
  function buildP11() {
    const data = [];
    data.push(['PEMERINTAH KABUPATEN SERUYAN']);
    data.push(['PERUSAHAAN UMUM DAERAH AIR MINUM (PERUMDAM', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAMPIRAN 11']);
    data.push(['TIRTA SERUYAN']);
    data.push(['RENCANA BIAYA UMUM DAN ADMINISTRASI']);
    data.push(['TAHUN ANGGARAN 2026']);
    data.push([waktuCetak]);
    return data;
  }
  const p11Sheet = XLSX.utils.aoa_to_sheet(buildP11());
  XLSX.utils.book_append_sheet(wb, p11Sheet, 'P-11. Biaya UMUM & ADM');

  // =========================================================
  // SHEETS: lama, lama2 (old format - empty templates)
  // =========================================================
  const lamaData = [];
  lamaData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  lamaData.push(['KABUPATEN SERUYAN']);
  lamaData.push(['']);
  lamaData.push(['NERACA']);
  const lamaSheet = XLSX.utils.aoa_to_sheet(lamaData);
  XLSX.utils.book_append_sheet(wb, lamaSheet, 'lama');

  const lama2Data = [];
  lama2Data.push(['PERUSAHAAN DAERAH AIR MINUM']);
  lama2Data.push(['KABUPATEN SERUYAN']);
  lama2Data.push(['']);
  lama2Data.push(['LABA RUGI']);
  const lama2Sheet = XLSX.utils.aoa_to_sheet(lama2Data);
  XLSX.utils.book_append_sheet(wb, lama2Sheet, 'lama2');

  const { addTableStyles } = require('./index');
  if (typeof addTableStyles === 'function') addTableStyles(wb);
  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateFinancialStatements };
