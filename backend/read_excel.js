const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function dumpFile(filePath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FILE: ${filePath}`);
  console.log(`SIZE: ${fs.statSync(filePath).size} bytes`);
  console.log(`EXT: ${path.extname(filePath)}`);
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(filePath, { cellDates: true, raw: false });
    console.log(`SHEETS: ${workbook.SheetNames.join(', ')}`);

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const ref = sheet['!ref'];
      if (!ref) {
        console.log(`  [${sheetName}] - (empty)`);
        continue;
      }
      const range = XLSX.utils.decode_range(ref);
      console.log(`\n  [${sheetName}] (rows: ${range.e.r - range.s.r + 1}, cols: ${range.e.c - range.s.c + 1}, ref: ${ref})`);

      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (data.length > 30) {
        console.log(`  (menampilkan ${data.length} baris penuh)`);
      }
      for (let i = 0; i < data.length; i++) {
        const row = data[i].map(v => String(v).substring(0, 60)).join(' | ');
        console.log(`    ${String(i+1).padStart(3)}: ${row}`);
      }
    }
  } catch (err) {
    console.error(`  ERROR membaca file: ${err.message}`);
  }
}

const inputDir = path.join(__dirname, '..', 'penyimpanan');
const outputDir = path.join(__dirname, '..', 'output');

if (fs.existsSync(inputDir)) {
  const files = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f));
  for (const f of files) {
    dumpFile(path.join(inputDir, f));
  }
}

if (fs.existsSync(outputDir)) {
  const files = fs.readdirSync(outputDir).filter(f => /\.xlsx?$/i.test(f));
  for (const f of files) {
    dumpFile(path.join(outputDir, f));
  }
}
