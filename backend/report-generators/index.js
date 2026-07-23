const path = require('path');
const { generateJournal } = require('./journal-report');
const { generateBukuBesar } = require('./buku-besar-report');
const { generateNeracaLajur } = require('./neraca-lajur-report');
const { generateFinancialStatements } = require('./financial-statements');

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

  return results;
}

module.exports = { generateAllReports };
