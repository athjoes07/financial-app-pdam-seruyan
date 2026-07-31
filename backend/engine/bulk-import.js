const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx-js-style');

function excelDateToISO(val) {
  if (val === null || val === undefined || val === '') return '2026-01-01';
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const y = d.y || new Date().getFullYear();
      const m = String(d.m || 1).padStart(2, '0');
      const dd = String(d.d || 1).padStart(2, '0');
      return y + '-' + m + '-' + dd;
    }
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06', jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12' };
  const m = s.match(/(\d{1,2})\s+(\w+)/i);
  if (m) {
    const dd = String(m[1]).padStart(2, '0');
    const mon = monthMap[m[2].substring(0, 3).toLowerCase()] || '01';
    return new Date().getFullYear() + '-' + mon + '-' + dd;
  }
  return new Date().getFullYear() + '-01-01';
}

function createTx(db, tanggal, deskripsi, entries, sumber = '') {
  if (!entries || entries.length === 0) return null;
  db.queryRun('INSERT INTO transaksi (tanggal, deskripsi, sumber) VALUES (?, ?, ?)', [tanggal, deskripsi, sumber]);
  const result = db.queryOne('SELECT MAX(id) as id FROM transaksi');
  const tId = result.id;
  
  let totalDebit = 0;
  let totalKredit = 0;

  for (const e of entries) {
    if (!e.kode || (!e.debit && !e.kredit)) continue;
    const akun = db.queryOne('SELECT id FROM akun WHERE kode = ?', [e.kode]);
    if (akun) {
      db.queryRun('INSERT INTO jurnal (transaksi_id, akun_id, debit, kredit) VALUES (?, ?, ?, ?)', [tId, akun.id, e.debit || 0, e.kredit || 0]);
      totalDebit += e.debit || 0;
      totalKredit += e.kredit || 0;
    }
  }

  const status = (totalDebit === totalKredit && totalDebit > 0) ? 'BALANCED' : 'UNBALANCED';
  const detail = `Total Debit: Rp ${totalDebit.toLocaleString('id-ID')} | Total Kredit: Rp ${totalKredit.toLocaleString('id-ID')}`;
  const afterState = {
    transaksi: { id: tId, tanggal, deskripsi, sumber },
    jurnal: entries
  };

  if (typeof db.insertAuditLog === 'function') {
    db.insertAuditLog('TRANSAKSI', sumber || 'Sistem', deskripsi, status, detail, null, afterState);
  }

  return tId;
}

function parseDaftarVoucher(db, filePath, sumberFile) {
  const results = [];
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['DVUD'];
  if (!sheet) return results;
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  let tgl = '', noVoucher = '', uraian = '';
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r || r.length < 5) continue;
    const cell0 = String(r[0] || '').trim();
    if (cell0 === '' && !r[5]) continue;
    if (cell0.match(/^\d+\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/i) || (typeof r[0] === 'number' && r[0] > 40000)) {
      tgl = excelDateToISO(r[0]);
      noVoucher = String(r[1] || '').trim();
      uraian = String(r[2] || '').trim();
      const kodeDebet = String(r[5] || '').trim();
      const namaDebet = String(r[6] || '').trim();
      const jumlahDebet = parseFloat(String(r[7] || '0').replace(/[^0-9.-]/g, '')) || 0;
      const kodeKredit = String(r[8] || '').trim();
      const namaKredit = String(r[9] || '').trim();
      const jumlahKredit = parseFloat(String(r[10] || '0').replace(/[^0-9.-]/g, '')) || 0;

      if (uraian && kodeDebet && jumlahDebet > 0 && kodeKredit && jumlahKredit > 0) {
        const txId = createTx(db, tgl, 'Voucher: ' + uraian, [
          { kode: kodeDebet, debit: jumlahDebet, kredit: 0 },
          { kode: kodeKredit, debit: 0, kredit: jumlahKredit }
        ], sumberFile);
        if (txId) results.push({ id: txId, desc: uraian, total: jumlahDebet });
      }
    }
  }
  return results;
}

function parseJurnalBayar(db, filePath, sumberFile) {
  const results = [];
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['JBK'];
  if (!sheet) return results;
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r || r.length < 7) continue;
    const tgl = excelDateToISO(r[0]);
    const voucerNo = String(r[1] || '').trim();
    const uraian = String(r[3] || '').trim();
    const kas = parseFloat(String(r[6] || '0').replace(/[^0-9.-]/g, '')) || 0;
    const utangUsaha = parseFloat(String(r[7] || '0').replace(/[^0-9.-]/g, '')) || 0;
    const utangNonUsaha = parseFloat(String(r[8] || '0').replace(/[^0-9.-]/g, '')) || 0;

    if (tgl && uraian && (kas > 0 || utangUsaha > 0 || utangNonUsaha > 0)) {
      const entries = [];
      if (utangUsaha > 0) entries.push({ kode: '50.01.00', debit: utangUsaha, kredit: 0 });
      if (utangNonUsaha > 0) entries.push({ kode: '50.02.00', debit: utangNonUsaha, kredit: 0 });
      if (kas > 0) entries.push({ kode: '11.01.00', debit: 0, kredit: kas });
      if (entries.length >= 2) {
        const txId = createTx(db, tgl, 'Bayar: ' + uraian, entries, sumberFile);
        if (txId) results.push({ id: txId, desc: uraian, total: kas || utangUsaha });
      }
    }
  }
  return results;
}

function parseJurnalPembalik(db, filePath) {
  const results = [];
  const wb = XLSX.readFile(filePath);
  for (const sheetName of wb.SheetNames) {
    if (!sheetName.includes('Pemblk')) continue;
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    let tgl = '', entries = [];
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      if (!r) continue;
      const no = String(r[0] || '').trim();
      const tglCell = String(r[1] || '').trim();
      const uraianDebet = String(r[2] || '').trim();
      const ref = String(r[3] || '').trim();
      const debet = parseFloat(String(r[4] || '0').replace(/[^0-9.-]/g, '')) || 0;
      const kredit = parseFloat(String(r[5] || '0').replace(/[^0-9.-]/g, '')) || 0;

      if (tglCell.match(/^\d+\s+\w+/i)) tgl = tglCell;
      if (!tgl) continue;

      if (uraianDebet && debet > 0) {
        const akun = db.queryOne('SELECT id FROM akun WHERE nama LIKE ?', ['%' + uraianDebet.replace(/\(.*\)/, '').trim() + '%']);
        if (akun) entries.push({ kode: akun.kode, debit: debet, kredit: 0 });
      }
      if (ref && kredit > 0) {
        const uraianKredit = String(r[3] || '').trim();
        const akun = db.queryOne('SELECT id, kode FROM akun WHERE nama LIKE ?', ['%' + uraianKredit.replace(/\(.*\)/, '').trim() + '%']);
        if (akun) entries.push({ kode: akun.kode, debit: 0, kredit: kredit });
      }
      if (entries.length >= 2 && i % 3 === 0) {
        const txId = createTx(db, tgl, 'Pembalik: ' + uraianDebet, entries, sumberFile);
        if (txId) results.push({ id: txId, desc: uraianDebet, total: debet });
        entries = [];
      }
    }
  }
  return results;
}

function parseAksesories(db, filePath, sumberFile) {
  const wb = XLSX.readFile(filePath);
  let totalNilai = 0;
  const skipLabels = ['jumlah', 'jml', 'total', 'sub total'];
  for (const sheetName of wb.SheetNames) {
    if (!sheetName.toLowerCase().includes('aksesories') && !sheetName.toLowerCase().includes('water meter') && !sheetName.toLowerCase().includes('persediaan sr')) continue;
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    for (let i = 5; i < data.length; i++) {
      const r = data[i];
      if (!r || r.length < 6) continue;
      const firstCol = String(r[0] || '').toLowerCase().trim();
      const secondCol = String(r[1] || '').toLowerCase().trim();
      if (skipLabels.some(s => firstCol.includes(s)) || skipLabels.some(s => secondCol.includes(s))) continue;
      if (!r[1] || String(r[1]).trim() === '') continue;
      const jumlah = parseFloat(String(r[5] || '0').replace(/[^0-9.-]/g, '')) || 0;
      totalNilai += jumlah;
    }
  }
  return totalNilai;
}

function parsePersediaanKimia(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['REKAP TOTAL'];
  if (!sheet) return { total: 0 };
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  let total = 0;
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!r) continue;
    const jml = parseFloat(String(r[10] || '0').replace(/[^0-9.-]/g, '')) || 0;
    total += jml;
  }
  return { total };
}

function parseRealisasiAnggaran(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['NERACA KOMPARATIF'];
  if (!sheet) return null;
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return { source: 'Realisasi Anggaran', rows: data.length };
}

function bulkImport(db, inputDir) {
  const results = { files_processed: [], transactions: [], errors: [] };
  const files = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f));

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    try {
      if (file.toLowerCase().includes('daftar voucher')) {
        const txs = parseDaftarVoucher(db, filePath, file);
        results.files_processed.push('DaftarVoucher: ' + file + ' (' + txs.length + ' transaksi)');
        results.transactions.push(...txs);
      } else if (file.toLowerCase().includes('jurnal bayar')) {
        const txs = parseJurnalBayar(db, filePath, file);
        results.files_processed.push('JurnalBayar: ' + file + ' (' + txs.length + ' transaksi)');
        results.transactions.push(...txs);
      } else if (file.toLowerCase().includes('aksesories')) {
        const total = parseAksesories(db, filePath, file);
        results.files_processed.push('Aksesories: ' + file + ' (nilai Rp ' + total.toLocaleString() + ')');
        if (total > 0) {
          const txId = createTx(db, new Date().getFullYear() + '-01-01', 'Persediaan Bahan Instalasi (Asesoris & Water Meter)', [
            { kode: '15.03.00', debit: total, kredit: 0 },
            { kode: '71.01.00', debit: 0, kredit: total }
          ], file);
          if (txId) results.transactions.push({ id: txId, desc: 'Persediaan Bahan Instalasi', total });
        }
      } else if (file.toLowerCase().includes('persediaan bahan kimia')) {
        const data = parsePersediaanKimia(filePath);
        results.files_processed.push('PersediaanKimia: ' + file);
        if (data.total > 0) {
          const txId = createTx(db, new Date().getFullYear() + '-01-01', 'Persediaan Bahan Kimia & BBM', [
            { kode: '15.01.00', debit: data.total, kredit: 0 },
            { kode: '71.01.00', debit: 0, kredit: data.total }
          ], file);
          if (txId) results.transactions.push({ id: txId, desc: 'Persediaan Bahan Kimia', total: data.total });
        }
      } else if (file.toLowerCase().includes('realisasi anggaran')) {
        parseRealisasiAnggaran(filePath);
        results.files_processed.push('RealisasiAnggaran: ' + file);
      } else if (file.toLowerCase().includes('aktiva tetap')) {
        results.files_processed.push('AktivaTetap: ' + file + ' (data aset)');
      }
    } catch (err) {
      results.errors.push('Error ' + file + ': ' + err.message);
    }
  }

  return results;
}

module.exports = { bulkImport };
