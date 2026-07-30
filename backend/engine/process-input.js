const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const drdParser = require('../input-processors/drd-parser');
const lppParser = require('../input-processors/lpp-parser');

function processInputFiles(db, inputDir) {
  const results = { files_processed: [], transactions: [], errors: [] };

  if (!fs.existsSync(inputDir)) {
    results.errors.push('Input directory not found: ' + inputDir);
    return results;
  }

  const files = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f));

  const monthMap = { januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06', juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12' };

  for (const file of files) {
    const filePath = path.join(inputDir, file);

    try {
      if (file.toLowerCase().includes('rekap drd') || file.toLowerCase().includes('drd')) {
        const parsed = drdParser.parse(filePath);
        results.files_processed.push(parsed.source + ': ' + file);

        if (parsed.rows.length > 0) {
          const bulanNum = monthMap[(parsed.bulan || 'mei').toLowerCase()] || '05';
          const tgl = '2026-' + bulanNum + '-18';
          const totalHA = parsed.summary.total_ha;
          const totalAdm = parsed.summary.total_adm;
          const totalDM = parsed.summary.total_dm;

          if (totalHA > 0) {
            const desc = 'Rekening Air ' + parsed.bulan + ' 2026';
            const txId = createTx(db, tgl, desc, [
              { kode: '13.01.00', debit: totalHA + totalAdm, kredit: 0 },
              { kode: '81.01.10', debit: 0, kredit: totalHA },
              { kode: '81.01.20', debit: 0, kredit: totalAdm },
            ], file);
            results.transactions.push({ id: txId, desc, total: totalHA + totalAdm });
          }

          if (totalDM > 0) {
            const desc = 'Dana Meter ' + parsed.bulan + ' 2026';
            const txId = createTx(db, tgl, desc, [
              { kode: '13.01.40', debit: totalDM, kredit: 0 },
              { kode: '81.01.20', debit: 0, kredit: totalDM },
            ], file);
            results.transactions.push({ id: txId, desc, total: totalDM });
          }
        }
      }

      if (file.toLowerCase().includes('lpp tgl')) {
        const parsed = lppParser.parse(filePath);
        results.files_processed.push(parsed.source + ': ' + file);

        const tgl = parsed.tgl_transaksi || '2026-05-18';
        const total = parsed.total_air + parsed.total_adm;

        if (parsed.total_terima > 0 || total > 0) {
          const desc = 'Penerimaan Rek Air (' + parsed.sumber + ')';
          let txId;

          if (parsed.total_denda > 0) {
            txId = createTx(db, tgl, desc, [
              { kode: '11.01.00', debit: parsed.total_terima || total + parsed.total_denda, kredit: 0 },
              { kode: '13.01.00', debit: 0, kredit: total },
              { kode: '81.02.50', debit: 0, kredit: parsed.total_denda },
            ], file);
          } else {
            txId = createTx(db, tgl, desc, [
              { kode: '11.01.00', debit: total, kredit: 0 },
              { kode: '13.01.00', debit: 0, kredit: total },
            ], file);
          }
          results.transactions.push({ id: txId, desc, total: parsed.total_terima || total });
        }
      }
    } catch (err) {
      results.errors.push('Error processing ' + file + ': ' + err.message);
    }
  }

  return results;
}

function createTx(db, tanggal, deskripsi, entries, sumber = '') {
  if (!entries || entries.length === 0) return null;
  db.run('INSERT INTO transaksi (tanggal, deskripsi, sumber) VALUES (?, ?, ?)', [tanggal, deskripsi, sumber]);
  const result = db.queryOne('SELECT MAX(id) as id FROM transaksi');
  const tId = result.id;

  let totalDebit = 0;
  let totalKredit = 0;

  for (const e of entries) {
    const akun = db.queryOne('SELECT id FROM akun WHERE kode = ?', [e.kode]);
    if (akun) {
      db.run('INSERT INTO jurnal (transaksi_id, akun_id, debit, kredit) VALUES (?, ?, ?, ?)', [
        tId, akun.id, e.debit, e.kredit
      ]);
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

module.exports = { processInputFiles };
