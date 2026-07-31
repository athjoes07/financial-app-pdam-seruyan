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

function formatRupiah(val) {
  if (!val || val === 0) return '';
  return val;
}

function generateJournal(db, outputPath) {
  const wb = XLSX.utils.book_new();

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

  // Detect month from transactions
  let bulanNow = '05';
  let bulanNama = 'MEI';
  if (transactions.length > 0) {
    const firstDate = transactions[0].tanggal;
    if (firstDate && firstDate.length >= 7) {
      bulanNow = firstDate.substring(5, 7);
      bulanNama = formatMonthYear(bulanNow);
    }
  }

  function parseJournal(t) {
    try { return JSON.parse('[' + t.jurnal + ']'); } catch (e) { return []; }
  }

  // =========================================================
  // SHEET: BPTRA - Bukti Penerimaan Tagihan Rekening Air
  // =========================================================
  const bptraData = [];
  bptraData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  bptraData.push(['KABUPATEN SERUYAN']);
  bptraData.push([]);
  bptraData.push(['BUKTI PENERIMAAN TAGIHAN REKENING AIR']);
  bptraData.push(['BULAN : ' + bulanNama + ' 2026']);
  bptraData.push([]);
  bptraData.push([null, null, null, null, 'BPTRA/01/' + bulanNow.substring(1) + '/2026']);
  bptraData.push(['NO', 'NAMA PELANGGAN', 'NO. PELANGGAN', 'NO. BUKTI', 'JUMLAH']);
  bptraData.push([1, 'Tidak Ada Transaksi Penerimaan Rek. Air']);
  bptraData.push([2]);
  bptraData.push([3]);
  bptraData.push([4]);
  bptraData.push([]);
  bptraData.push([null, 'JUMLAH', null, null, 0]);
  bptraData.push([]);
  bptraData.push([null, null, null, 'Kuala Pembuang, ... ' + bulanNama + ' 2026']);
  bptraData.push([null, null, null, 'Kasi. Pembukuan']);
  const bptraSheet = XLSX.utils.aoa_to_sheet(bptraData);
  bptraSheet['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bptraSheet, 'BPTRA');

  // =========================================================
  // SHEET: BPTRNA - Bukti Penerimaan Tagihan Rekening Non Air
  // =========================================================
  const bptrnaData = [];
  bptrnaData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  bptrnaData.push(['KABUPATEN SERUYAN']);
  bptrnaData.push([]);
  bptrnaData.push(['BUKTI PENERIMAAN TAGIHAN REKENING NON AIR']);
  bptrnaData.push(['BULAN : ' + bulanNama + ' 2026']);
  bptrnaData.push([]);
  bptrnaData.push([null, null, null, null, 'BPTRNA/01/' + bulanNow.substring(1) + '/2026']);
  bptrnaData.push(['NO', 'NAMA PELANGGAN', 'NO. PELANGGAN', 'NO. BUKTI', 'JUMLAH']);
  const nonAirTx = transactions.filter(t => t.deskripsi && t.deskripsi.includes('Non Air'));
  let noBptrna = 1;
  for (const t of nonAirTx) {
    const journal = parseJournal(t);
    const totalJumlah = journal.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0);
    bptrnaData.push([noBptrna++, t.deskripsi, null, null, totalJumlah || null]);
  }
  if (noBptrna === 1) {
    bptrnaData.push([1, 'Tidak Ada Transaksi']);
    bptrnaData.push([2]);
    bptrnaData.push([3]);
    bptrnaData.push([4]);
  }
  bptrnaData.push([]);
  bptrnaData.push([null, 'JUMLAH', null, null, nonAirTx.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0)]);
  bptrnaData.push([]);
  bptrnaData.push([null, null, null, 'Kuala Pembuang, ... ' + bulanNama + ' 2026']);
  bptrnaData.push([null, null, null, 'Kasi. Pembukuan']);
  const bptrnaSheet = XLSX.utils.aoa_to_sheet(bptrnaData);
  bptrnaSheet['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bptrnaSheet, 'BPTRNA');

  // =========================================================
  // SHEET: BPTDN - Bukti Penerimaan Denda
  // =========================================================
  const bptdnData = [];
  bptdnData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  bptdnData.push(['KABUPATEN SERUYAN']);
  bptdnData.push([]);
  bptdnData.push(['BUKTI PENERIMAAN DENDA']);
  bptdnData.push(['BULAN : ' + bulanNama + ' 2026']);
  bptdnData.push([]);
  bptdnData.push([null, null, null, null, 'BPTDN/01/' + bulanNow.substring(1) + '/2026']);
  bptdnData.push(['NO', 'NAMA PELANGGAN', 'NO. PELANGGAN', 'NO. BUKTI', 'JUMLAH']);
  const dendaTx = transactions.filter(t => t.deskripsi && t.deskripsi.includes('Denda'));
  let noBptdn = 1;
  for (const t of dendaTx) {
    const journal = parseJournal(t);
    const totalJumlah = journal.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0);
    bptdnData.push([noBptdn++, t.deskripsi, null, null, totalJumlah || null]);
  }
  if (noBptdn === 1) {
    bptdnData.push([1, 'Tidak Ada Transaksi Denda']);
    bptdnData.push([2]);
    bptdnData.push([3]);
  }
  bptdnData.push([]);
  bptdnData.push([null, 'JUMLAH', null, null, dendaTx.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0)]);
  bptdnData.push([]);
  bptdnData.push([null, null, null, 'Kuala Pembuang, ... ' + bulanNama + ' 2026']);
  bptdnData.push([null, null, null, 'Kasi. Pembukuan']);
  const bptdnSheet = XLSX.utils.aoa_to_sheet(bptdnData);
  bptdnSheet['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 15 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bptdnSheet, 'BPTDN');

  // =========================================================
  // SHEET: BKM - Bukti Kas Masuk
  // =========================================================
  const bkmData = [];
  bkmData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  bkmData.push(['KABUPATEN SERUYAN']);
  bkmData.push([]);
  bkmData.push(['BUKTI KAS MASUK']);
  bkmData.push(['BULAN : ' + bulanNama + ' 2026']);
  bkmData.push([]);
  bkmData.push(['TGL', 'NO. BUKTI', 'URAIAN', 'DEBET', 'KREDIT']);
  const kasMasuk = transactions.filter(t => {
    const j = parseJournal(t);
    return j.some(e => e.akun_kode === '11.01.00' && parseFloat(e.debit) > 0);
  });
  let noBkm = 1;
  for (const t of kasMasuk) {
    const journal = parseJournal(t);
    const kasEntry = journal.find(e => e.akun_kode === '11.01.00');
    bkmData.push([formatDate(t.tanggal), 'BKM/' + String(noBkm++).padStart(3, '0'), t.deskripsi, kasEntry ? parseFloat(kasEntry.debit) : 0, '']);
  }
  bkmData.push([]);
  bkmData.push([null, null, 'JUMLAH', kasMasuk.reduce((s, t) => {
    const j = parseJournal(t);
    const kas = j.find(e => e.akun_kode === '11.01.00');
    return s + (kas ? parseFloat(kas.debit) : 0);
  }, 0), '']);
  const bkmSheet = XLSX.utils.aoa_to_sheet(bkmData);
  bkmSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bkmSheet, 'BKM');

  // =========================================================
  // SHEET: JPK. RA - Jurnal Penerimaan Kas Rekening Air
  // =========================================================
  const jpkRaData = [];
  jpkRaData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jpkRaData.push(['KABUPATEN SERUYAN']);
  jpkRaData.push([]);
  jpkRaData.push(['JURNAL PENERIMAAN KAS REKENING AIR']);
  jpkRaData.push(['BULAN : ' + bulanNama + ' 2026']);
  jpkRaData.push([]);
  jpkRaData.push(['TGL', 'NO. PERK', 'NAMA PERKIRAAN', '', 'DEBET', 'KREDIT']);
  const rekeningAir = transactions.filter(t => t.deskripsi && (t.deskripsi.includes('Rekening Air') || t.deskripsi.includes('Penerimaan Rek Air')));
  for (const t of rekeningAir) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jpkRaData.push([
        i === 0 ? formatDate(t.tanggal) : '',
        j.akun_kode || '',
        j.akun_nama || '',
        '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  jpkRaData.push([]);
  jpkRaData.push([null, null, 'JUMLAH', '', rekeningAir.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0), rekeningAir.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.kredit) || 0), 0);
  }, 0)]);
  const jpkRaSheet = XLSX.utils.aoa_to_sheet(jpkRaData);
  jpkRaSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jpkRaSheet, 'JPK. RA');

  // =========================================================
  // SHEET: JPK. RNA - Jurnal Penerimaan Kas Rekening Non Air
  // =========================================================
  const jpkRnaData = [];
  jpkRnaData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jpkRnaData.push(['KABUPATEN SERUYAN']);
  jpkRnaData.push([]);
  jpkRnaData.push(['JURNAL PENERIMAAN KAS REKENING NON AIR']);
  jpkRnaData.push(['BULAN : ' + bulanNama + ' 2026']);
  jpkRnaData.push([]);
  jpkRnaData.push(['TGL', 'NO. PERK', 'NAMA PERKIRAAN', '', 'DEBET', 'KREDIT']);
  for (const t of nonAirTx) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jpkRnaData.push([
        i === 0 ? formatDate(t.tanggal) : '',
        j.akun_kode || '',
        j.akun_nama || '',
        '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  jpkRnaData.push([]);
  jpkRnaData.push([null, null, 'JUMLAH', '', nonAirTx.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0), nonAirTx.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.kredit) || 0), 0);
  }, 0)]);
  const jpkRnaSheet = XLSX.utils.aoa_to_sheet(jpkRnaData);
  jpkRnaSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jpkRnaSheet, 'JPK. RNA ');

  // =========================================================
  // SHEET: JU - Jurnal Umum (all transactions)
  // =========================================================
  const juData = [];
  juData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  juData.push(['KABUPATEN SERUYAN']);
  juData.push([]);
  juData.push(['JURNAL UMUM']);
  juData.push(['BULAN : ' + bulanNama + ' 2026']);
  juData.push([]);
  juData.push(['TGL', 'NO. PERK', 'NAMA PERKIRAAN', '', 'DEBET', 'KREDIT']);
  for (const t of transactions) {
    const journal = parseJournal(t);
    const tgl = formatDate(t.tanggal);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      juData.push([
        i === 0 ? tgl : '',
        j.akun_kode || '',
        j.akun_nama || '',
        '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
    juData.push([]);
  }
  juData.push([]);
  juData.push(['', '', 'JUMLAH', '', transactions.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0), transactions.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.kredit) || 0), 0);
  }, 0)]);
  const juSheet = XLSX.utils.aoa_to_sheet(juData);
  juSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, juSheet, 'JU');

  // =========================================================
  // SHEET: JRA - Jurnal Rekening Air (per DRD)
  // =========================================================
  const jraData = [];
  jraData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jraData.push(['KABUPATEN SERUYAN']);
  jraData.push([]);
  jraData.push(['JURNAL REKENING AIR']);
  jraData.push(['BULAN : ' + bulanNama + ' 2026']);
  jraData.push([]);
  jraData.push(['TGL', 'NOMOR DRD', 'NO. PERK', 'NAMA PERKIRAAN', '', 'LEMBAR', 'DEBET', 'KREDIT']);
  const rekeningAirOnly = transactions.filter(t => t.deskripsi && t.deskripsi.includes('Rekening Air'));
  for (const t of rekeningAirOnly) {
    const journal = parseJournal(t);
    const tgl = formatDate(t.tanggal);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jraData.push([
        i === 0 ? tgl : '',
        i === 0 ? 'DRD-' + bulanNow : '',
        j.akun_kode || '',
        j.akun_nama || '',
        '',
        i === 0 ? 1 : '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  jraData.push([]);
  jraData.push([null, null, null, 'JUMLAH', '', '', rekeningAirOnly.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0), rekeningAirOnly.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.kredit) || 0), 0);
  }, 0)]);
  jraData.push([null, null, null, 'JUMLAH SAMPAI BULAN LALU', '', '', 0, 0]);
  jraData.push([null, null, null, 'JUMLAH SAMPAI DESEMBER', '', '', 0, 0]);
  const jraSheet = XLSX.utils.aoa_to_sheet(jraData);
  jraSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 5 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jraSheet, 'JRA');

  // =========================================================
  // SHEET: JRNA2 - Jurnal Rekening Non Air (2)
  // =========================================================
  const jrna2Data = [];
  jrna2Data.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jrna2Data.push(['KABUPATEN SERUYAN']);
  jrna2Data.push([]);
  jrna2Data.push(['JURNAL REKENING NON AIR']);
  jrna2Data.push(['BULAN : ' + bulanNama + ' 2026']);
  jrna2Data.push([]);
  jrna2Data.push(['No', 'Tgl', 'Uraian', '', 'Ref.', 'Debet', 'Kredit']);
  let noJrna2 = 1;
  for (const t of nonAirTx) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jrna2Data.push([
        i === 0 ? noJrna2++ : '',
        i === 0 ? formatDate(t.tanggal) : '',
        i === 0 ? t.deskripsi : j.akun_nama || '',
        '',
        'JRNA',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  const jrna2Sheet = XLSX.utils.aoa_to_sheet(jrna2Data);
  jrna2Sheet['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 35 }, { wch: 5 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jrna2Sheet, 'JRNA2 ');

  // =========================================================
  // SHEET: DVUD(1) - Daftar Voucher Utang Dibayar (variant)
  // =========================================================
  const dvud1Data = [];
  dvud1Data.push(['PERUSAHAAN DAERAH AIR MINUM']);
  dvud1Data.push(['KABUPATEN SERUYAN']);
  dvud1Data.push([]);
  dvud1Data.push(['DAFTAR VOUCHER UTANG YANG HARUS DIBAYAR']);
  dvud1Data.push(['BULAN ' + bulanNama + ' 2026']);
  dvud1Data.push([]);
  dvud1Data.push(['VOUCHER', 'TGL/NO', 'URAIAN', 'DIBAYAR', 'TGL/CEK', 'DEBET', '', '', 'KREDIT', '', '']);
  dvud1Data.push(['', '', '', '', '', 'NO.PERK', 'NAMA', 'JUMLAH', 'NO.PERK', 'NAMA', 'JUMLAH']);
  let noVou1 = 1;
  for (const t of transactions) {
    const journal = parseJournal(t);
    const hasUtang = journal.some(j => j.akun_kode && (j.akun_kode.startsWith('50.')));
    if (!hasUtang) continue;
    const debitEntry = journal.find(j => parseFloat(j.debit) > 0);
    const kreditEntry = journal.find(j => parseFloat(j.kredit) > 0);
    if (debitEntry && kreditEntry) {
      dvud1Data.push([
        'V' + String(noVou1++).padStart(3, '0'),
        formatDate(t.tanggal),
        t.deskripsi,
        '', '',
        debitEntry.akun_kode || '', debitEntry.akun_nama || '', parseFloat(debitEntry.debit) || 0,
        kreditEntry.akun_kode || '', kreditEntry.akun_nama || '', parseFloat(kreditEntry.kredit) || 0
      ]);
    }
  }
  const dvud1Sheet = XLSX.utils.aoa_to_sheet(dvud1Data);
  dvud1Sheet['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, dvud1Sheet, 'DVUD(1)');

  // =========================================================
  // SHEET: DVUD - Daftar Voucher Utang Dibayar
  // =========================================================
  const dvudData = [];
  dvudData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  dvudData.push(['KABUPATEN SERUYAN']);
  dvudData.push([]);
  dvudData.push(['DAFTAR VOUCHER UTANG YANG HARUS DIBAYAR']);
  dvudData.push(['BULAN ' + bulanNama + ' 2026']);
  dvudData.push([]);
  dvudData.push(['VOUCHER', 'TGL/NO', 'URAIAN', 'DIBAYAR', 'TGL/CEK', 'DEBET', '', '', 'KREDIT', '', '']);
  dvudData.push(['', '', '', '', '', 'NO.PERK', 'NAMA', 'JUMLAH', 'NO.PERK', 'NAMA', 'JUMLAH']);
  let noVou = 1;
  for (const t of transactions) {
    const journal = parseJournal(t);
    const hasUtang = journal.some(j => j.akun_kode && (j.akun_kode.startsWith('50.')));
    if (!hasUtang) continue;
    const debitEntry = journal.find(j => parseFloat(j.debit) > 0);
    const kreditEntry = journal.find(j => parseFloat(j.kredit) > 0);
    if (debitEntry && kreditEntry) {
      dvudData.push([
        'V' + String(noVou++).padStart(3, '0'),
        formatDate(t.tanggal),
        t.deskripsi,
        '', '',
        debitEntry.akun_kode || '', debitEntry.akun_nama || '', parseFloat(debitEntry.debit) || 0,
        kreditEntry.akun_kode || '', kreditEntry.akun_nama || '', parseFloat(kreditEntry.kredit) || 0
      ]);
    }
  }
  dvudData.push([]);
  dvudData.push([null, null, 'BKU PENGELUARAN', '', '', null, null, dvudData.reduce((s, r) => s + (parseFloat(r[7]) || 0), 0)]);
  dvudData.push([]);
  dvudData.push([null, null, null, null, null, null, null, null, null, null, 'TRI MURTIANI, S.E.']);
  dvudData.push([null, null, null, null, null, null, null, null, null, null, 'Kasi. Keuangan']);
  const dvudSheet = XLSX.utils.aoa_to_sheet(dvudData);
  dvudSheet['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, dvudSheet, 'DVUD');

  // =========================================================
  // SHEET: JBK - Journal Bayar Kas
  // =========================================================
  const jbkData = [];
  jbkData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jbkData.push(['KABUPATEN SERUYAN']);
  jbkData.push([]);
  jbkData.push(['JOURNAL BAYAR KAS']);
  jbkData.push(['BULAN : ' + bulanNama + ' 2026']);
  jbkData.push([]);
  jbkData.push(['Tgl', 'Voucer No.', 'Tgl', 'Uraian', 'Cek/Giro No.', 'Tgl', 'KREDIT Kas/Bank', 'DEBET Utang Usaha', 'DEBET Utang Non Usaha']);
  jbkData.push(['', '', '', '', '', '', '11.01.00', '50.01.00', '50.02.00']);
  const bayarKas = transactions.filter(t => {
    const j = parseJournal(t);
    return j.some(e => e.akun_kode === '11.01.00' && parseFloat(e.kredit) > 0);
  });
  for (const t of bayarKas) {
    const journal = parseJournal(t);
    const kasEntry = journal.find(e => e.akun_kode === '11.01.00');
    const utangEntry = journal.find(e => e.akun_kode && e.akun_kode.startsWith('50.01'));
    const utangNonEntry = journal.find(e => e.akun_kode && e.akun_kode.startsWith('50.02'));
    jbkData.push([
      formatDate(t.tanggal), '', '', t.deskripsi, '', '',
      kasEntry ? parseFloat(kasEntry.kredit) || 0 : '',
      utangEntry ? parseFloat(utangEntry.debit) || 0 : '',
      utangNonEntry ? parseFloat(utangNonEntry.debit) || 0 : ''
    ]);
  }
  jbkData.push([]);
  jbkData.push([null, null, null, 'JUMLAH', '', '',
    bayarKas.reduce((s, t) => {
      const j = parseJournal(t);
      const kas = j.find(e => e.akun_kode === '11.01.00');
      return s + (kas ? parseFloat(kas.kredit) : 0);
    }, 0),
    bayarKas.reduce((s, t) => {
      const j = parseJournal(t);
      const ut = j.find(e => e.akun_kode && e.akun_kode.startsWith('50.01'));
      return s + (ut ? parseFloat(ut.debit) : 0);
    }, 0),
    bayarKas.reduce((s, t) => {
      const j = parseJournal(t);
      const ut = j.find(e => e.akun_kode && e.akun_kode.startsWith('50.02'));
      return s + (ut ? parseFloat(ut.debit) : 0);
    }, 0)
  ]);
  const jbkSheet = XLSX.utils.aoa_to_sheet(jbkData);
  jbkSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jbkSheet, 'JBK');

  // =========================================================
  // SHEET: JPBIK - Jurnal Pemeliharaan Biaya
  // =========================================================
  const jpbiKData = [];
  jpbiKData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jpbiKData.push(['KABUPATEN SERUYAN']);
  jpbiKData.push([]);
  jpbiKData.push(['JURNAL PEMELIHARAAN / BIAYA']);
  jpbiKData.push(['BULAN : ' + bulanNama + ' 2026']);
  jpbiKData.push([]);
  jpbiKData.push(['Tgl', 'Kode Perkiraan', 'Uraian', '', 'Debet', 'Kredit']);
  const pemeliharaan = transactions.filter(t => t.deskripsi && (t.deskripsi.includes('Pemeliharaan') || t.deskripsi.includes('Beban') || t.deskripsi.includes('Persediaan')));
  for (const t of pemeliharaan) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jpbiKData.push([
        i === 0 ? formatDate(t.tanggal) : '',
        j.akun_kode || '',
        i === 0 ? t.deskripsi : j.akun_nama || '',
        '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  const jpbiKSheet = XLSX.utils.aoa_to_sheet(jpbiKData);
  jpbiKSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jpbiKSheet, 'JPBIK');

  // =========================================================
  // SHEET: JP - Jurnal Pendapatan
  // =========================================================
  const jpData = [];
  jpData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jpData.push(['KABUPATEN SERUYAN']);
  jpData.push([]);
  jpData.push(['JURNAL PENDAPATAN']);
  jpData.push(['BULAN : ' + bulanNama + ' 2026']);
  jpData.push([]);
  jpData.push(['TGL', 'NO. PERK', 'NAMA PERKIRAAN', '', '', 'DEBET', 'KREDIT']);
  const pendapatan = transactions.filter(t => {
    const j = parseJournal(t);
    return j.some(e => e.akun_kode && e.akun_kode.startsWith('81.'));
  });
  for (const t of pendapatan) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jpData.push([
        i === 0 ? formatDate(t.tanggal) : '',
        j.akun_kode || '',
        j.akun_nama || '',
        '',
        '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  jpData.push([]);
  jpData.push([null, null, 'JUMLAH', '', '', pendapatan.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0), pendapatan.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.kredit) || 0), 0);
  }, 0)]);
  const jpSheet = XLSX.utils.aoa_to_sheet(jpData);
  jpSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 5 }, { wch: 5 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jpSheet, 'JP');

  // =========================================================
  // SHEET: J. Pemblk - Jurnal Pembalik
  // =========================================================
  const jpemblkData = [];
  jpemblkData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jpemblkData.push(['KABUPATEN SERUYAN']);
  jpemblkData.push([]);
  jpemblkData.push(['JURNAL PEMBALIK']);
  jpemblkData.push(['BULAN : ' + bulanNama + ' 2026']);
  jpemblkData.push([]);
  jpemblkData.push(['No', 'Tgl', 'Uraian', '', 'Ref.', 'Debet', 'Kredit']);
  const pembalik = transactions.filter(t => t.deskripsi && t.deskripsi.includes('Pembalik'));
  let noPemblk = 1;
  for (const t of pembalik) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jpemblkData.push([
        i === 0 ? noPemblk++ : '',
        i === 0 ? formatDate(t.tanggal) : '',
        i === 0 ? t.deskripsi : j.akun_nama || '',
        '',
        'J.Pemblk',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  const jpemblkSheet = XLSX.utils.aoa_to_sheet(jpemblkData);
  jpemblkSheet['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 40 }, { wch: 5 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jpemblkSheet, 'J. Pemblk');

  // =========================================================
  // SHEET: DUVHD - Daftar Utang Voucher Harus Dibayar
  // =========================================================
  const duvhdData = [];
  duvhdData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  duvhdData.push(['KABUPATEN SERUYAN']);
  duvhdData.push([]);
  duvhdData.push(['DAFTAR UTANG VOUCHER HARUS DIBAYAR']);
  duvhdData.push(['BULAN ' + bulanNama + ' 2026']);
  duvhdData.push([]);
  duvhdData.push(['VOUCHER', 'TGL/NO', 'URAIAN', 'DIBAYAR', 'TGL/CEK', 'PERKIRAAN DI KREDIT', '', '', 'PERKIRAAN DI DEBET', '', '', '', '']);
  duvhdData.push(['', '', '', '', '', 'UTANG USAHA', 'UTANG NON USAHA', 'JUMLAH', 'BAH.KIMIA', 'INSTALASI', 'UANG MUKA KERJA', 'BOP SUMBER', 'LAINNYA']);
  const utangAll = transactions.filter(t => {
    const j = parseJournal(t);
    return j.some(e => e.akun_kode && e.akun_kode.startsWith('50.'));
  });
  let noDuvhd = 1;
  for (const t of utangAll) {
    const journal = parseJournal(t);
    const utangEntries = journal.filter(e => e.akun_kode && e.akun_kode.startsWith('50.'));
    const totalUtang = utangEntries.reduce((s, e) => s + (parseFloat(e.kredit) || 0), 0);
    if (totalUtang > 0) {
      duvhdData.push([
        'V' + String(noDuvhd++).padStart(3, '0'),
        formatDate(t.tanggal),
        t.deskripsi,
        '', '',
        totalUtang, '', totalUtang,
        '', '', '', '', ''
      ]);
    }
  }
  const duvhdSheet = XLSX.utils.aoa_to_sheet(duvhdData);
  duvhdSheet['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, duvhdSheet, 'DUVHD');

  // =========================================================
  // SHEET: J.Koreksi - Jurnal Koreksi
  // =========================================================
  const jKoreksiData = [];
  jKoreksiData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jKoreksiData.push(['KABUPATEN SERUYAN']);
  jKoreksiData.push([]);
  jKoreksiData.push(['JURNAL KOREKSI']);
  jKoreksiData.push(['BULAN : ' + bulanNama + ' 2026']);
  jKoreksiData.push([]);
  jKoreksiData.push(['No', 'Tgl', 'Uraian', '', 'Ref.', 'Debet', 'Kredit']);
  const koreksi = transactions.filter(t => t.deskripsi && t.deskripsi.includes('Koreksi'));
  let noKoreksi = 1;
  for (const t of koreksi) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jKoreksiData.push([
        i === 0 ? noKoreksi++ : '',
        i === 0 ? formatDate(t.tanggal) : '',
        i === 0 ? t.deskripsi : j.akun_nama || '',
        '',
        'J.Koreksi',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  const jKoreksiSheet = XLSX.utils.aoa_to_sheet(jKoreksiData);
  jKoreksiSheet['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 40 }, { wch: 5 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jKoreksiSheet, 'J.Koreksi');

  // =========================================================
  // SHEET: BKU - Buku Kas Umum (empty template)
  // =========================================================
  const bkuData = [];
  bkuData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  bkuData.push(['KABUPATEN SERUYAN']);
  bkuData.push([]);
  bkuData.push(['BUKU KAS UMUM']);
  bkuData.push(['BULAN : ' + bulanNama + ' 2026']);
  bkuData.push([]);
  bkuData.push(['TGL', 'NO. BUKTI', 'URAIAN', 'DEBET', 'KREDIT', 'SALDO']);
  const bkuSheet = XLSX.utils.aoa_to_sheet(bkuData);
  bkuSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bkuSheet, 'BKU');

  // =========================================================
  // SHEET: BKU PM - Buku Kas Umum Penerimaan (empty template)
  // =========================================================
  const bkuPmData = [];
  bkuPmData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  bkuPmData.push(['KABUPATEN SERUYAN']);
  bkuPmData.push([]);
  bkuPmData.push(['BUKU KAS UMUM PENERIMAAN']);
  bkuPmData.push(['BULAN : ' + bulanNama + ' 2026']);
  bkuPmData.push([]);
  bkuPmData.push(['TGL', 'NO. BUKTI', 'URAIAN', 'DEBET', 'KREDIT', 'SALDO']);
  const bkuPmSheet = XLSX.utils.aoa_to_sheet(bkuPmData);
  bkuPmSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, bkuPmSheet, 'BKU PM');

  // =========================================================
  // SHEET: JRNA - Jurnal Rekening Non Air
  // =========================================================
  const jrnaData = [];
  jrnaData.push(['PERUSAHAAN DAERAH AIR MINUM']);
  jrnaData.push(['KABUPATEN SERUYAN']);
  jrnaData.push([]);
  jrnaData.push(['JURNAL REKENING NON AIR']);
  jrnaData.push(['BULAN : ' + bulanNama + ' 2026']);
  jrnaData.push([]);
  jrnaData.push(['TGL', 'NO. PERK', 'NAMA PERKIRAAN', '', 'LEMBAR', 'DEBET', 'KREDIT']);
  for (const t of nonAirTx) {
    const journal = parseJournal(t);
    for (let i = 0; i < journal.length; i++) {
      const j = journal[i];
      jrnaData.push([
        i === 0 ? formatDate(t.tanggal) : '',
        j.akun_kode || '',
        j.akun_nama || '',
        '',
        i === 0 ? 1 : '',
        parseFloat(j.debit) > 0 ? parseFloat(j.debit) : '',
        parseFloat(j.kredit) > 0 ? parseFloat(j.kredit) : ''
      ]);
    }
  }
  jrnaData.push([]);
  jrnaData.push([null, null, 'JUMLAH', '', '', nonAirTx.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.debit) || 0), 0);
  }, 0), nonAirTx.reduce((s, t) => {
    const j = parseJournal(t);
    return s + j.reduce((ss, e) => ss + (parseFloat(e.kredit) || 0), 0);
  }, 0)]);
  const jrnaSheet = XLSX.utils.aoa_to_sheet(jrnaData);
  jrnaSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 35 }, { wch: 5 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, jrnaSheet, 'JRNA');

  const { addTableStyles } = require('./index');
  if (typeof addTableStyles === 'function') addTableStyles(wb);
  XLSX.writeFile(wb, outputPath, { compression: true, bookType: 'xlsx' });
  return outputPath;
}

module.exports = { generateJournal };
