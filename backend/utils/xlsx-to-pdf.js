const XLSX = require('xlsx');

/**
 * Converts an Excel file (.xlsx) to a pdfmake document definition.
 * Returns content for each sheet as a separate section.
 */
function xlsxToPdfDefinition(xlsxFilePath) {
  const PdfPrinter = require('pdfmake');
  const fs = require('fs');

  const workbook = XLSX.readFile(xlsxFilePath);
  const content = [];

  const fonts = {
    Roboto: {
      normal: require('path').join(__dirname, 'fonts', 'Roboto-Regular.ttf'),
      bold: require('path').join(__dirname, 'fonts', 'Roboto-Medium.ttf'),
      italics: require('path').join(__dirname, 'fonts', 'Roboto-Italic.ttf'),
      bolditalics: require('path').join(__dirname, 'fonts', 'Roboto-MediumItalic.ttf'),
    }
  };

  for (let si = 0; si < workbook.SheetNames.length; si++) {
    const sheetName = workbook.SheetNames[si];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (si > 0) content.push({ text: '', pageBreak: 'before' });

    // Sheet title
    content.push({
      text: sheetName,
      style: 'sheetHeader',
      margin: [0, 0, 0, 8]
    });

    if (rows.length === 0) {
      content.push({ text: '(Tidak ada data)', italics: true, color: '#888', margin: [0, 0, 0, 10] });
      continue;
    }

    // Determine max cols
    const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);

    // Build table body
    const tableBody = rows.map((row, ri) => {
      const cells = [];
      for (let ci = 0; ci < maxCols; ci++) {
        const cell = row[ci];
        const cellText = cell !== null && cell !== undefined ? String(cell) : '';
        // Format numbers as Indonesian currency style if numeric
        let displayText = cellText;
        if (typeof cell === 'number' && Math.abs(cell) >= 1000) {
          displayText = new Intl.NumberFormat('id-ID').format(Math.round(cell));
        }
        cells.push({
          text: displayText,
          fontSize: 7,
          bold: ri === 0,
          fillColor: ri === 0 ? '#1e40af' : (ri % 2 === 0 ? '#f0f4ff' : '#ffffff'),
          color: ri === 0 ? '#ffffff' : '#111827',
          margin: [2, 2, 2, 2],
          border: [false, false, false, true],
          borderColor: ['#e5e7eb', '#e5e7eb', '#e5e7eb', '#d1d5db'],
        });
      }
      return cells;
    });

    content.push({
      table: {
        headerRows: 1,
        widths: Array(maxCols).fill('*'),
        body: tableBody,
        dontBreakRows: false,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => '#d1d5db',
        paddingLeft: () => 3,
        paddingRight: () => 3,
        paddingTop: () => 2,
        paddingBottom: () => 2,
      },
      margin: [0, 0, 0, 20],
    });
  }

  return {
    content,
    styles: {
      sheetHeader: {
        fontSize: 11,
        bold: true,
        color: '#1e3a8a',
      }
    },
    pageSize: 'A3',
    pageOrientation: 'landscape',
    pageMargins: [20, 30, 20, 30],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 7,
    },
    info: {
      title: require('path').basename(xlsxFilePath, '.xlsx'),
      author: 'PERUMDAM Tirta Seruyan',
    }
  };
}

module.exports = { xlsxToPdfDefinition };
