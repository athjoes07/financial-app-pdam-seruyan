const XLSX = require('xlsx');
const fs = require('fs');

function readExcelDetail(filePath, maxRows = 30) {
  try {
    const wb = XLSX.readFile(filePath);
    const result = { sheets: {} };
    
    for (const sn of wb.SheetNames) {
      const sheet = wb.Sheets[sn];
      if (!sheet['!ref']) { result.sheets[sn] = { rows: 0, cols: 0, data: [] }; continue; }
      const range = XLSX.utils.decode_range(sheet['!ref']);
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      result.sheets[sn] = {
        rows: range.e.r + 1,
        cols: range.e.c + 1,
        data: data.slice(0, maxRows).map(r => r.map(c => String(c).substring(0, 80)))
      };
    }
    result.sheetNames = wb.SheetNames;
    return result;
  } catch (e) {
    return { error: e.message };
  }
}

// Read all template files
const files = [
  '_Excel/E.g Laporan Keuangan/e.g. Journal 2026.xlsx',
  '_Excel/E.g Laporan Keuangan/e.g. BUKU BESAR 2026.xlsx',
  '_Excel/E.g Laporan Keuangan/e.g. Neraca Lajur 2026.xlsx',
  '_Excel/E.g Laporan Keuangan/e.g. Neraca, RL,Arus Kas, ekuitas & Rincian 2026.xlsx',
];

for (const f of files) {
  console.log('\n' + '='.repeat(100));
  console.log('FILE: ' + f.split('/').pop());
  console.log('='.repeat(100));
  
  const data = readExcelDetail(f, 25);
  if (data.error) { console.log('ERROR:', data.error); continue; }
  
  console.log('Sheets:', data.sheetNames.join(', '));
  
  for (const sn of data.sheetNames) {
    const s = data.sheets[sn];
    console.log('\n--- Sheet: "' + sn + '" (' + s.rows + ' rows x ' + s.cols + ' cols) ---');
    s.data.forEach((row, i) => {
      console.log('  R' + (i+1) + ': ' + JSON.stringify(row));
    });
    if (s.rows > 25) console.log('  ... (' + (s.rows - 25) + ' more rows)');
  }
}
