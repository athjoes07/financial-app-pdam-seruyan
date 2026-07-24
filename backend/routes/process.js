const express = require('express');
const path = require('path');
const fs = require('fs');
const { processInputFiles } = require('../engine/process-input');
const { bulkImport } = require('../engine/bulk-import');
const { generateAllReports } = require('../report-generators');
const { initDatabase } = require('../database');

module.exports = function(db) {
  const router = express.Router();
  const inputDir = path.join(__dirname, '..', '..', 'input');
  const outputDir = path.join(__dirname, '..', '..', 'output-app');
  const sampleOutputDir = path.join(__dirname, '..', '..', 'output');

  router.get('/input-files', (req, res) => {
    try {
      if (!fs.existsSync(inputDir)) return res.json([]);
      const files = fs.readdirSync(inputDir).filter(f => /\.xlsx?$/i.test(f)).map(f => {
        const stat = fs.statSync(path.join(inputDir, f));
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

  return router;
};
