const path = require('path');
const { generateJournal } = require('./journal-report');
const { generateBukuBesar } = require('./buku-besar-report');
const { generateNeracaLajur } = require('./neraca-lajur-report');
const { generateFinancialStatements } = require('./financial-statements');
const { generateAuditTrail } = require('./audit-trail-report');

const addTableStyles = (wb) => {
  // Basic table styling for xlsx-js-style
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) continue;
    const range = require('xlsx-js-style').utils.decode_range(ws['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = require('xlsx-js-style').utils.encode_cell({ r, c });
        if (!ws[addr]) continue;
        if (!ws[addr].s) ws[addr].s = {};
        
        ws[addr].s.border = {
          top: { style: 'thin', color: { auto: 1 } },
          bottom: { style: 'thin', color: { auto: 1 } },
          left: { style: 'thin', color: { auto: 1 } },
          right: { style: 'thin', color: { auto: 1 } }
        };
        
        if (r < 8) { // Assuming top 8 rows are headers/titles
          ws[addr].s.font = { bold: true };
        }
      }
    }
  }
};

function generateAllReports(db, outputDir) {
  const fs = require('fs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results = [];

  try {
    const jPath = path.join(outputDir, 'JURNAL.xlsx');
    generateJournal(db, jPath);
    results.push({ file: 'JURNAL.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'JURNAL.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const bbPath = path.join(outputDir, 'BUKU BESAR.xlsx');
    generateBukuBesar(db, bbPath);
    results.push({ file: 'BUKU BESAR.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'BUKU BESAR.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const nlPath = path.join(outputDir, 'NERACA LAJUR.xlsx');
    generateNeracaLajur(db, nlPath);
    results.push({ file: 'NERACA LAJUR.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'NERACA LAJUR.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const fsPath = path.join(outputDir, 'LAPORAN KEUANGAN.xlsx');
    generateFinancialStatements(db, fsPath);
    results.push({ file: 'LAPORAN KEUANGAN.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'LAPORAN KEUANGAN.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const atPath = path.join(outputDir, 'AUDIT TRAIL.xlsx');
    generateAuditTrail(db, atPath);
    results.push({ file: 'AUDIT TRAIL.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'AUDIT TRAIL.xlsx', status: 'ERROR', error: e.message }); }

  return results;
}

module.exports = { generateAllReports, addTableStyles };
