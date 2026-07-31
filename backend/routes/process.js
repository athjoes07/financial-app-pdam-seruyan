const express = require('express');
const path = require('path');
const fs = require('fs');
const { processInputFiles } = require('../engine/process-input');
const { bulkImport } = require('../engine/bulk-import');
const { generateAllReports } = require('../report-generators');
const { initDatabase } = require('../database');

module.exports = function(db) {
  const router = express.Router();
  const isServerless = process.env.K_SERVICE || process.env.VERCEL;
  const baseDir = isServerless ? '/tmp' : path.join(__dirname, '..', '..');
  const inputDir = isServerless ? '/tmp' : path.join(baseDir, 'penyimpanan');
  const inputTrashDir = isServerless ? '/tmp/trash' : path.join(baseDir, 'penyimpanan-trash');
  const outputDir = isServerless ? '/tmp' : path.join(baseDir, 'output-app');
  const sampleOutputDir = isServerless ? '/tmp' : path.join(baseDir, 'output');

  if (!fs.existsSync(inputTrashDir)) fs.mkdirSync(inputTrashDir, { recursive: true });

  router.delete('/delete-input/:filename', (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      const filePath = path.join(inputDir, fname);
      const trashPath = path.join(inputTrashDir, fname);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File tidak ditemukan' });
      }

      const stat = fs.statSync(filePath);
      const fileDate = new Date(stat.mtime).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      // Move to trash
      fs.renameSync(filePath, trashPath);

      // Record Before State for Audit Trail
      const beforeTxs = db.queryAll('SELECT * FROM transaksi WHERE sumber = ?', [fname]);
      const beforeState = [];
      for (const tx of beforeTxs) {
        const jurnal = db.queryAll('SELECT * FROM jurnal WHERE transaksi_id = ?', [tx.id]);
        beforeState.push({ transaksi: tx, jurnal });
      }

      // Delete transactions AND related jurnal from database
      // First enable FK support (SQLite needs this explicitly)
      db.queryRun('PRAGMA foreign_keys = ON');
      // Delete orphan jurnal entries tied to this file's transactions
      db.queryRun('DELETE FROM jurnal WHERE transaksi_id IN (SELECT id FROM transaksi WHERE sumber = ?)', [fname]);
      db.queryRun('DELETE FROM transaksi WHERE sumber = ?', [fname]);
      // Also clean up any remaining orphan journal entries just in case
      db.queryRun('DELETE FROM jurnal WHERE transaksi_id NOT IN (SELECT id FROM transaksi)');
      
      if (typeof db.insertAuditLog === 'function' && beforeTxs.length > 0) {
        db.insertAuditLog('DELETE', fname, 'Hapus Data ' + fname, 'SUCCESS', 'Dihapus ' + beforeTxs.length + ' transaksi', beforeState, null);
      }

      res.json({ message: 'File dihapus dan transaksi terkait dibatalkan dari sistem.', deletedFromDb: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/trash-files', (req, res) => {
    try {
      if (!fs.existsSync(inputTrashDir)) return res.json([]);
      const files = fs.readdirSync(inputTrashDir).filter(f => /\.xlsx?$/i.test(f)).map(f => {
        const stat = fs.statSync(path.join(inputTrashDir, f));
        return {
          filename: f,
          size: stat.size,
          modified: stat.mtime
        };
      });
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/restore-trash/:filename', (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      const trashPath = path.join(inputTrashDir, fname);
      const inputPath = path.join(inputDir, fname);
      
      if (!fs.existsSync(trashPath)) {
        return res.status(404).json({ error: 'File tidak ditemukan di tempat sampah' });
      }
      
      if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
      }

      fs.renameSync(trashPath, inputPath);
      res.json({ message: 'File berhasil dipulihkan ke folder input' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/input-files', (req, res) => {
    try {
      if (!fs.existsSync(inputDir)) return res.json([]);
      const files = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f)).map(f => {
        const stat = fs.statSync(path.join(inputDir, f));
        return {
          filename: f,
          size: stat.size,
          modified: stat.mtime,
          downloadUrl: `/api/process/download-input/${encodeURIComponent(f)}`
        };
      });
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/download-input/:filename', (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      const filePath = path.join(inputDir, fname);
      if (fs.existsSync(filePath)) {
        res.download(filePath);
      } else {
        res.status(404).send('File tidak ditemukan');
      }
    } catch (err) {
      res.status(500).send('Error downloading file: ' + err.message);
    }
  });

  router.get('/output-files', (req, res) => {
    try {
      const targetDir = fs.existsSync(outputDir) ? outputDir : sampleOutputDir;
      if (!fs.existsSync(targetDir)) return res.json([]);
      const files = fs.readdirSync(targetDir).filter(f => /\.xlsx?$/i.test(f)).map(f => {
        const stat = fs.statSync(path.join(targetDir, f));
        return {
          filename: f,
          size: stat.size,
          modified: stat.mtime,
          downloadUrl: `/api/process/download/${encodeURIComponent(f)}`
        };
      });
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/audit-logs', (req, res) => {
    try {
      const logs = db.queryAll('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200');
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/download/:filename', (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      let filePath = path.join(outputDir, fname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(sampleOutputDir, fname);
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File tidak ditemukan');
      }

      res.download(filePath, fname);
    } catch (err) {
      res.status(500).send('Error downloading file: ' + err.message);
    }
  });

  router.get('/download-pdf/:filename', async (req, res) => {
    try {
      const PdfPrinter = require('pdfmake');
      const XLSX = require('xlsx-js-style');
      const fname = decodeURIComponent(req.params.filename);
      
      let filePath = path.join(outputDir, fname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(sampleOutputDir, fname);
      }
      if (!fs.existsSync(filePath)) {
        return res.status(404).send('File tidak ditemukan');
      }

      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const content = [];

      for (let si = 0; si < workbook.SheetNames.length; si++) {
        const sheetName = workbook.SheetNames[si];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (si > 0) content.push({ text: '', pageBreak: 'before' });

        content.push({
          text: sheetName,
          fontSize: 11,
          bold: true,
          color: '#1e3a8a',
          margin: [0, 0, 0, 6]
        });

        if (rows.length === 0) {
          content.push({ text: '(Tidak ada data)', italics: true, color: '#888', margin: [0, 0, 0, 10] });
          continue;
        }

        const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0);
        if (maxCols === 0) continue;

        const tableBody = rows.map((row, ri) => {
          const cells = [];
          for (let ci = 0; ci < maxCols; ci++) {
            const cell = row[ci];
            let displayText = '';
            if (cell !== null && cell !== undefined && cell !== '') {
              if (typeof cell === 'number') {
                displayText = Number.isInteger(cell) ? 
                  new Intl.NumberFormat('id-ID').format(cell) :
                  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cell);
              } else {
                displayText = String(cell);
              }
            }
            const isHeader = ri === 0;
            cells.push({
              text: displayText,
              fontSize: 6.5,
              bold: isHeader,
              fillColor: isHeader ? '#1e40af' : (ri % 2 === 0 ? '#f0f4ff' : '#ffffff'),
              color: isHeader ? '#ffffff' : '#111827',
              margin: [2, 2, 2, 2],
            });
          }
          return cells;
        });

        content.push({
          table: {
            headerRows: 1,
            widths: Array(maxCols).fill('*'),
            body: tableBody,
          },
          layout: {
            hLineWidth: (i) => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#d1d5db',
            paddingLeft: () => 3,
            paddingRight: () => 3,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
          margin: [0, 0, 0, 16],
        });
      }

      const fonts = {
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      const printer = new PdfPrinter(fonts);

      const docDef = {
        content,
        pageSize: 'A3',
        pageOrientation: 'landscape',
        pageMargins: [20, 30, 20, 30],
        defaultStyle: { font: 'Helvetica', fontSize: 7 },
        footer: (currentPage, pageCount) => ({
          text: `PERUMDAM Tirta Seruyan  |  ${fname.replace('.xlsx', '')}  |  Halaman ${currentPage} dari ${pageCount}`,
          alignment: 'center', fontSize: 6, color: '#6b7280', margin: [0, 5, 0, 0]
        }),
        info: {
          title: fname.replace('.xlsx', ''),
          author: 'PERUMDAM Tirta Seruyan',
        }
      };

      const pdfName = fname.replace(/\.xlsx?$/i, '.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfName}"`);

      const pdfDoc = printer.createPdfKitDocument(docDef);
      pdfDoc.pipe(res);
      pdfDoc.end();

    } catch (err) {
      res.status(500).send('Error generating PDF: ' + err.message);
    }
  });

  router.post('/upload-input', (req, res) => {
    try {
      const { filename, contentBase64 } = req.body;
      if (!filename || !contentBase64) {
        return res.status(400).json({ error: 'Nama file dan konten base64 wajib diisi' });
      }

      if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
      }

      const cleanBase64 = contentBase64.replace(/^data:.*;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const filePath = path.join(inputDir, filename);

      fs.writeFileSync(filePath, buffer);
      res.json({ message: 'File berhasil diunggah ke folder input', filename, size: buffer.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/input', async (req, res) => {
    try {
      const result = processInputFiles(db, inputDir);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/generate', async (req, res) => {
    try {
      const results = generateAllReports(db, outputDir);
      res.json({ output_dir: outputDir, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/sync-firestore', async (req, res) => {
    try {
      const { syncToFirestore } = require('../engine/sync-firestore');
      const result = await syncToFirestore(db);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/bulk-import', async (req, res) => {
    try {
      const result = bulkImport(db, inputDir);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/run-all', async (req, res) => {
    try {
      const bulkResult = bulkImport(db, inputDir);
      const processResult = processInputFiles(db, inputDir);
      const reportResults = generateAllReports(db, outputDir);

      res.json({
        bulk: bulkResult,
        process: processResult,
        reports: reportResults
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Preview Excel file content (all sheets, first N rows)
  router.get('/preview/:source/:filename', (req, res) => {
    try {
      const XLSX = require('xlsx-js-style');
      const fname = decodeURIComponent(req.params.filename);
      const source = req.params.source; // 'input' or 'output'
      const maxRows = parseInt(req.query.rows) || 50;

      let filePath;
      if (source === 'input') {
        filePath = path.join(inputDir, fname);
      } else {
        filePath = path.join(outputDir, fname);
        if (!fs.existsSync(filePath)) {
          filePath = path.join(sampleOutputDir, fname);
        }
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File tidak ditemukan: ' + fname });
      }

      const wb = XLSX.readFile(filePath, { type: 'buffer' });
      const sheets = {};

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const rows = [];
        const totalRows = Math.min(range.e.r + 1, maxRows);

        for (let r = 0; r < totalRows; r++) {
          const row = [];
          for (let c = 0; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            let val = cell ? cell.v : null;
            if (cell && cell.t === 'd' && cell.w) val = cell.w;
            if (val === undefined || val === null) val = null;
            row.push(val);
          }
          rows.push(row);
        }

        sheets[sheetName] = {
          rows,
          totalRows: range.e.r + 1,
          totalCols: range.e.c + 1,
          hasMore: range.e.r + 1 > maxRows
        };
      }

      res.json({
        filename: fname,
        sheetNames: wb.SheetNames,
        sheets,
        totalSheets: wb.SheetNames.length
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upload multiple files
  router.post('/upload-multiple', (req, res) => {
    try {
      const { files } = req.body; // Array of { filename, contentBase64 }
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim' });
      }

      if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
      }

      const results = [];
      for (const file of files) {
        const cleanBase64 = file.contentBase64.replace(/^data:.*;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const filePath = path.join(inputDir, file.filename);
        fs.writeFileSync(filePath, buffer);
        results.push({ filename: file.filename, size: buffer.length, status: 'OK' });
      }

      res.json({ message: `${results.length} file berhasil diunggah`, files: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
