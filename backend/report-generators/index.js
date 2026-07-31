const path = require('path');
const { generateJournal } = require('./journal-report');
const { generateBukuBesar } = require('./buku-besar-report');
const { generateNeracaLajur } = require('./neraca-lajur-report');
const { generateFinancialStatements } = require('./financial-statements');
const { generateAuditTrail } = require('./audit-trail-report');

const addTableStyles = (wb) => {
  const xlsxStyle = require('xlsx-js-style');
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) continue;
    const range = xlsxStyle.utils.decode_range(ws['!ref']);
    
    // Find where the table starts
    let tableStartRow = -1;
    for (let r = range.s.r; r <= Math.min(range.e.r, 15); r++) {
      let isHeaderRow = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = xlsxStyle.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell && cell.v) {
          const v = String(cell.v).toUpperCase().trim();
          if (['NO', 'TGL', 'NOMOR DRD', 'VOUCHER', 'NO.', 'KODE', 'KETERANGAN', 'URAIAN', 'NAMA PELANGGAN'].includes(v)) {
            tableStartRow = r;
            isHeaderRow = true;
            break;
          }
        }
      }
      if (isHeaderRow) break;
    }

    if (tableStartRow === -1) tableStartRow = 6;
    
    for (let r = range.s.r; r <= range.e.r; r++) {
      // Check if row is a signature block
      let isSignatureRow = false;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = xlsxStyle.utils.encode_cell({ r, c });
        if (ws[addr] && ws[addr].v && typeof ws[addr].v === 'string') {
          const v = ws[addr].v;
          if (v.includes('Kuala Pembuang') || v.includes('Kasi.') || v.includes('TRI MURTIANI') || v.includes('Direktur')) {
            isSignatureRow = true;
            break;
          }
        }
      }

      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = xlsxStyle.utils.encode_cell({ r, c });
        if (!ws[addr]) continue;
        if (!ws[addr].s) ws[addr].s = {};
        
        if (r < tableStartRow || isSignatureRow) {
           ws[addr].s.font = { bold: true, name: 'Arial', sz: 11 };
           ws[addr].s.border = {}; // No border
           continue; 
        }
        
        if (r >= tableStartRow) {
           ws[addr].s.border = {
             top: { style: 'thin', color: { auto: 1 } },
             bottom: { style: 'thin', color: { auto: 1 } },
             left: { style: 'thin', color: { auto: 1 } },
             right: { style: 'thin', color: { auto: 1 } }
           };
           ws[addr].s.font = { name: 'Arial', sz: 10 };
           
           if (r === tableStartRow) {
               ws[addr].s.font.bold = true;
               ws[addr].s.alignment = { horizontal: 'center', vertical: 'center' };
           } else {
               // Number formatting for numeric values
               if (typeof ws[addr].v === 'number') {
                   ws[addr].z = '#,##0.00';
               }
           }
        }
      }
    }
  }
};

function generateAllReports(db, outputDir) {
  const fs = require('fs');
  const path = require('path');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  } else {
    // Clear old files
    const oldFiles = fs.readdirSync(outputDir);
    for (const f of oldFiles) {
      if (f.endsWith('.xlsx')) {
        fs.unlinkSync(path.join(outputDir, f));
      }
    }
  }

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
