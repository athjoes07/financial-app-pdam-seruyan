const express = require('express');
const path = require('path');
const fs = require('fs');
const { processInputFiles } = require('../engine/process-input');
const { bulkImport } = require('../engine/bulk-import');
const { generateAllReports } = require('../report-generators');
const { initDatabase } = require('../database');
const { supabase } = require('../supabase-client');

module.exports = function (db) {
  const router = express.Router();
  const isServerless = process.env.K_SERVICE || process.env.VERCEL;
  const baseDir = isServerless ? '/tmp' : path.join(__dirname, '..', '..');
  const inputDir = isServerless ? '/tmp' : path.join(baseDir, 'penyimpanan');
  const inputTrashDir = isServerless ? '/tmp/trash' : path.join(baseDir, 'penyimpanan-trash');
  const outputDir = isServerless ? '/tmp' : path.join(baseDir, 'output-app');
  const sampleOutputDir = isServerless ? '/tmp' : path.join(baseDir, 'output');

  if (!fs.existsSync(inputTrashDir)) fs.mkdirSync(inputTrashDir, { recursive: true });
  if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  router.delete('/delete-input/:filename', async (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      const filePath = path.join(inputDir, fname);

      // 1. Delete jurnal terkait file ini terlebih dahulu (ON DELETE CASCADE juga akan hapus otomatis)
      const jurnalResult = await db.queryRun('DELETE FROM jurnal WHERE transaksi_id IN (SELECT id FROM transaksi WHERE sumber = ?)', [fname]);
      const jurnalDeleted = jurnalResult ? jurnalResult.rowCount : 0;

      // 2. Delete transaksi (jurnal akan ikut terhapus via CASCADE jika ada yang tersisa)
      const txResult = await db.queryRun('DELETE FROM transaksi WHERE sumber = ?', [fname]);
      const txDeleted = txResult ? txResult.rowCount : 0;

      console.log(`[DELETE] File: ${fname} | Transaksi dihapus: ${txDeleted} | Jurnal dihapus: ${jurnalDeleted}`);

      // 3. Hapus dari Supabase Storage (jika gagal, beri respons error)
      const { error: rmError } = await supabase.storage.from('pdam-storage').remove([`excel/${fname}`]);
      if (rmError) {
        console.error('[DELETE] Supabase Storage error:', rmError.message);
        // Rollback DB deletions if needed (optional)
        return res.status(500).json({ error: 'Gagal menghapus file dari Supabase Storage: ' + rmError.message });
      }

      // 4. Hapus file lokal jika ada
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch(e) {}
      }

      res.json({
        message: `File "${fname}" berhasil dihapus permanen dari sistem.`,
        deleted: true,
        dbDeleted: { transaksi: txDeleted, jurnal: jurnalDeleted }
      });
    } catch (err) {
      console.error('[DELETE] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/delete-all-input', async (req, res) => {
    try {
      // 1. Get all files from Supabase Storage
      const { data: storageFiles, error: listError } = await supabase.storage.from('pdam-storage').list('excel');
      if (listError) throw new Error('Gagal list Supabase: ' + listError.message);

      const filenames = (storageFiles || [])
        .filter(f => f.name !== '.emptyFolderPlaceholder' && /\.xlsx?$/i.test(f.name))
        .map(f => f.name);

      // 2. Delete ALL transactions & journals from database
      await db.queryRun('DELETE FROM jurnal');
      await db.queryRun('DELETE FROM transaksi');

      // 3. Permanently delete all files from Supabase Storage
      const deleteResults = [];
      for (const fname of filenames) {
        const { error } = await supabase.storage.from('pdam-storage').remove([`excel/${fname}`]);
        deleteResults.push({ file: fname, success: !error, error: error?.message });
      }

      // 4. Delete all local files if any
      if (fs.existsSync(inputDir)) {
        const localFiles = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f));
        for (const f of localFiles) {
          try { fs.unlinkSync(path.join(inputDir, f)); } catch(e) {}
        }
      }

      const failed = deleteResults.filter(r => !r.success);
      res.json({
        message: `Berhasil menghapus ${filenames.length - failed.length} dari ${filenames.length} file input secara permanen.`,
        count: filenames.length,
        failed
      });
    } catch (err) {
      console.error('[DELETE-ALL] Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
  router.get('/trash-files', async (req, res) => {
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

  router.post('/restore-trash/:filename', async (req, res) => {
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
      
      // Also restore to Supabase
      const buffer = fs.readFileSync(inputPath);
      await supabase.storage.from('pdam-storage').upload(`excel/${fname}`, buffer, { upsert: true });

      res.json({ message: 'File berhasil dipulihkan ke folder input' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/delete-trash/:filename', async (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      const trashPath = path.join(inputTrashDir, fname);

      // Just to be absolutely sure, delete transactions AND related jurnal from database
      try {
        await db.queryRun('PRAGMA foreign_keys = ON');
      } catch (e) {}
      
      await db.queryRun('DELETE FROM jurnal WHERE transaksi_id IN (SELECT id FROM transaksi WHERE sumber = ?)', [fname]);
      await db.queryRun('DELETE FROM transaksi WHERE sumber = ?', [fname]);
      await db.queryRun('DELETE FROM jurnal WHERE transaksi_id NOT IN (SELECT id FROM transaksi)');
      
      // Sync DB state to Supabase
      if (typeof db.saveDbAsync === 'function') {
        await db.saveDbAsync();
      }

      // Delete from Supabase Storage just in case it wasn't deleted
      const { error: rmError } = await supabase.storage.from('pdam-storage').remove([`excel/${fname}`]);
      if (rmError) {
        console.error("Failed to remove from Supabase in delete-trash:", rmError);
      }

      // Permanently delete local file from trash
      if (fs.existsSync(trashPath)) {
        fs.unlinkSync(trashPath);
      }

      res.json({ message: 'File dan seluruh data terkait telah dihapus secara permanen dari sistem.', deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/input-files', async (req, res) => {
    try {
      // List from Supabase directly so it's accurate across serverless instances
      const { data, error } = await supabase.storage.from('pdam-storage').list('excel');
      if (error) throw error;
      
      const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder' && /\.xlsx?$/i.test(f.name)).map(f => {
        return {
          filename: f.name,
          size: f.metadata ? f.metadata.size : 0,
          modified: f.created_at,
          downloadUrl: `/api/process/download-input/${encodeURIComponent(f.name)}`
        };
      });
      res.json(files);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/download-input/:filename', async (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      const { data, error } = await supabase.storage.from('pdam-storage').download(`excel/${fname}`);
      
      if (error) {
        return res.status(404).send('File tidak ditemukan di Supabase');
      }
      
      const buffer = Buffer.from(await data.arrayBuffer());
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
      res.send(buffer);
    } catch (err) {
      res.status(500).send('Error downloading file: ' + err.message);
    }
  });

  router.get('/output-files', async (req, res) => {
    try {
      // Show only generated reports – if none exist, return empty list
      const targetDir = fs.existsSync(outputDir) ? outputDir : null;
      if (!targetDir) return res.json([]);
      const files = fs.readdirSync(targetDir)
        .filter(f => /\.xlsx?$/i.test(f))
        .map(f => {
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

  router.get('/audit-logs', async (req, res) => {
    try {
      const logs = await db.queryAll('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200');
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/download/:filename', async (req, res) => {
    try {
      const fname = decodeURIComponent(req.params.filename);
      // Always serve the reference file from the static sample output folder if it exists
      let filePath = path.join(sampleOutputDir, fname);
      if (!fs.existsSync(filePath)) {
        // Fallback to the generated file (in case a new file does not have a static counterpart)
        filePath = path.join(outputDir, fname);
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

  router.post('/upload-input', async (req, res) => {
    try {
      const { filename, contentBase64 } = req.body;
      if (!filename || !contentBase64) {
        return res.status(400).json({ error: 'Nama file dan konten base64 wajib diisi' });
      }

      const cleanBase64 = contentBase64.replace(/^data:.*;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('pdam-storage')
        .upload(`excel/${filename}`, buffer, { upsert: true });

      if (error) throw error;

      // Also save locally for immediate processing if needed
      if (!fs.existsSync(inputDir)) {
        fs.mkdirSync(inputDir, { recursive: true });
      }
      const filePath = path.join(inputDir, filename);
      fs.writeFileSync(filePath, buffer);

      res.json({ message: 'File berhasil diunggah ke Supabase', filename, size: buffer.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper function to download all excel files from Supabase to local /tmp before processing
  async function syncExcelFilesFromSupabase() {
    const { data, error } = await supabase.storage.from('pdam-storage').list('excel');
    if (error) return;
    
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
    
    for (const f of data || []) {
      if (f.name === '.emptyFolderPlaceholder' || !/\.xlsx?$/i.test(f.name)) continue;
      const { data: fileData, error: dlError } = await supabase.storage.from('pdam-storage').download(`excel/${f.name}`);
      if (fileData && !dlError) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(path.join(inputDir, f.name), buffer);
      }
    }
  }

  router.post('/input', async (req, res) => {
    try {
      // Optional list of filenames to process (e.g., the 5 files you just uploaded)
      const { files } = req.body || {};
      await syncExcelFilesFromSupabase();
      // If a whitelist is provided, prune the local input folder to keep only those files
      if (Array.isArray(files) && files.length > 0) {
        const localFiles = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f));
        const missing = files.filter(f => !localFiles.includes(f));
        if (missing.length) {
          return res.status(400).json({ error: `Requested file(s) not found after sync: ${missing.join(', ')}` });
        }
        for (const f of localFiles) {
          if (!files.includes(f)) {
            try { fs.unlinkSync(path.join(inputDir, f)); } catch (e) {}
          }
        }
      }
      const result1 = await processInputFiles(db, inputDir);
      const result2 = await bulkImport(db, inputDir);

      const combined = {
        files_processed: [...result1.files_processed, ...result2.files_processed],
        transactions: [...result1.transactions, ...result2.transactions],
        errors: [...result1.errors, ...result2.errors]
      };

      if (typeof db.saveDbAsync === 'function') {
        await db.saveDbAsync();
      }

      res.json(combined);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/generate', async (req, res) => {
    try {
      const { exportDate } = req.body || {};
      const results = await generateAllReports(db, outputDir, exportDate);
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
      await syncExcelFilesFromSupabase();
      const result = await bulkImport(db, inputDir);
      
      if (typeof db.saveDbAsync === 'function') {
        await db.saveDbAsync();
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/run-all', async (req, res) => {
    try {
      const { exportDate } = req.body || {};
      await syncExcelFilesFromSupabase();
      
      const bulkResult = await bulkImport(db, inputDir);
      const processResult = await processInputFiles(db, inputDir);
      const reportResults = await generateAllReports(db, outputDir, exportDate);

      if (typeof db.saveDbAsync === 'function') {
        await db.saveDbAsync();
      }

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
  router.get('/preview/:source/:filename', async (req, res) => {
    try {
      const XLSX = require('xlsx-js-style');
      const fname = decodeURIComponent(req.params.filename);
      const source = req.params.source; // 'input' or 'output'
      const maxRows = parseInt(req.query.rows) || 50;

      let filePath;
      if (source === 'input') {
        filePath = path.join(inputDir, fname);
        // Ensure file exists locally if trying to preview input
        if (!fs.existsSync(filePath)) {
           const { data, error } = await supabase.storage.from('pdam-storage').download(`excel/${fname}`);
           if (data && !error) {
             const buffer = Buffer.from(await data.arrayBuffer());
             if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
             fs.writeFileSync(filePath, buffer);
           }
        }
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
  router.post('/upload-multiple', async (req, res) => {
    try {
      const { files } = req.body; // Array of { filename, contentBase64 }
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Tidak ada file yang dikirim' });
      }

      const results = [];
      for (const file of files) {
        const cleanBase64 = file.contentBase64.replace(/^data:.*;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        
        const { error } = await supabase.storage
          .from('pdam-storage')
          .upload(`excel/${file.filename}`, buffer, { upsert: true });
          
        if (error) {
          results.push({ filename: file.filename, size: buffer.length, status: 'ERROR', message: error.message });
        } else {
          results.push({ filename: file.filename, size: buffer.length, status: 'OK' });
        }
      }

      res.json({ message: `${results.length} file berhasil diunggah`, files: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
