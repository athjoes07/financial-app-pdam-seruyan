const path = require('path');
const { generateJournal } = require('./journal-report');
const { generateBukuBesar } = require('./buku-besar-report');
const { generateNeracaLajur } = require('./neraca-lajur-report');
const { generateFinancialStatements } = require('./financial-statements');
const { generateAuditTrail } = require('./audit-trail-report');

function generateAllReports(db, outputDir) {
  const fs = require('fs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results = [];

  try {
    const jPath = path.join(outputDir, 'Journal 2026.xlsx');
    generateJournal(db, jPath);
    results.push({ file: 'Journal 2026.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'Journal 2026.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const bbPath = path.join(outputDir, 'BUKU BESAR 2026.xlsx');
    generateBukuBesar(db, bbPath);
    results.push({ file: 'BUKU BESAR 2026.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'BUKU BESAR 2026.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const nlPath = path.join(outputDir, 'Neraca Lajur 2026.xlsx');
    generateNeracaLajur(db, nlPath);
    results.push({ file: 'Neraca Lajur 2026.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'Neraca Lajur 2026.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const fsPath = path.join(outputDir, 'Neraca, RL, Arus Kas, ekuitas & Rincian 2026.xlsx');
    generateFinancialStatements(db, fsPath);
    results.push({ file: 'Neraca, RL, Arus Kas, ekuitas & Rincian 2026.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'Neraca, RL, Arus Kas, ekuitas & Rincian 2026.xlsx', status: 'ERROR', error: e.message }); }

  try {
    const atPath = path.join(outputDir, 'AUDIT_TRAIL.xlsx');
    generateAuditTrail(db, atPath);
    results.push({ file: 'AUDIT_TRAIL.xlsx', status: 'OK' });
  } catch (e) { results.push({ file: 'AUDIT_TRAIL.xlsx', status: 'ERROR', error: e.message }); }

  // KOMPILASI SELURUH LAPORAN
  try {
    const XLSX = require('xlsx');
    const combinedWb = XLSX.utils.book_new();
    
    // Read all generated files from results and combine them
    for (const res of results) {
      if (res.status === 'OK') {
        const filePath = path.join(outputDir, res.file);
        if (fs.existsSync(filePath)) {
          const wb = XLSX.readFile(filePath);
          for (const sheetName of wb.SheetNames) {
            let newSheetName = sheetName;
            // Shorten sheet name if needed to fit Excel's 31 char limit, though usually it's fine
            let counter = 1;
            while (combinedWb.SheetNames.includes(newSheetName)) {
              newSheetName = `${sheetName.substring(0, 20)} (${counter})`;
              counter++;
            }
            XLSX.utils.book_append_sheet(combinedWb, wb.Sheets[sheetName], newSheetName);
          }
        }
      }
    }
    
    const kompilasiPath = path.join(outputDir, 'Kompilasi Seluruh Laporan 2026.xlsx');
    XLSX.writeFile(combinedWb, kompilasiPath);
    results.push({ file: 'Kompilasi Seluruh Laporan 2026.xlsx', status: 'OK' });
  } catch (e) {
    results.push({ file: 'Kompilasi Seluruh Laporan 2026.xlsx', status: 'ERROR', error: e.message });
  }

  return results;
}

module.exports = { generateAllReports };
