const express = require('express');
const path = require('path');
const { processInputFiles } = require('../engine/process-input');
const { bulkImport } = require('../engine/bulk-import');
const { generateAllReports } = require('../report-generators');
const { initDatabase } = require('../database');

module.exports = function(db) {
  const router = express.Router();

  router.post('/input', async (req, res) => {
    try {
      const inputDir = path.join(__dirname, '..', '..', 'input');
      const result = processInputFiles(db, inputDir);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/generate', async (req, res) => {
    try {
      const outputDir = path.join(__dirname, '..', '..', 'output-app');
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
      const inputDir = path.join(__dirname, '..', '..', 'input');
      const result = bulkImport(db, inputDir);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/run-all', async (req, res) => {
    try {
      const inputDir = path.join(__dirname, '..', '..', 'input');
      const outputDir = path.join(__dirname, '..', '..', 'output-app');

      const processResult = processInputFiles(db, inputDir);
      const reportResults = generateAllReports(db, outputDir);

      res.json({
        process: processResult,
        reports: reportResults
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
