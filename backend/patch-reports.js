const fs = require('fs');
const path = require('path');

const files = [
  'audit-trail-report.js',
  'buku-besar-report.js',
  'financial-statements.js',
  'journal-report.js',
  'neraca-lajur-report.js'
];

for (const file of files) {
  const filePath = path.join(__dirname, 'report-generators', file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/require\('xlsx'\)/g, "require('xlsx-js-style')");
  
  // Need to export addTableStyles in index.js to use it here
  if (!content.includes('addTableStyles(wb)')) {
    content = content.replace(/XLSX\.writeFile\(wb, outputPath/g, "const { addTableStyles } = require('./index');\n  if (typeof addTableStyles === 'function') addTableStyles(wb);\n  XLSX.writeFile(wb, outputPath");
  }
  
  // Replace 2026 with new Date().getFullYear() string if in quotes, or dynamic
  content = content.replace(/'2026'/g, "new Date().getFullYear()");
  content = content.replace(/ 2026/g, " " + new Date().getFullYear());
  content = content.replace(/\/2026/g, "/" + new Date().getFullYear());
  
  fs.writeFileSync(filePath, content);
  console.log('Patched', file);
}
