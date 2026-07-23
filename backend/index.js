/**
 * Firebase Cloud Functions entry point
 */
const { onRequest } = require('firebase-functions/v2/https');
const { initDatabase } = require('./database');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

let cachedApp = null;

async function createApp() {
  if (cachedApp) return cachedApp;

  // Init database (in-memory for cloud, file for local)
  const db = await initDatabase();

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '50mb' }));

  app.use('/api/akun', require('./routes/akun')(db));
  app.use('/api/transaksi', require('./routes/transaksi')(db));
  app.use('/api/laporan', require('./routes/laporan')(db));
  app.use('/api/process', require('./routes/process')(db));

  // Serve frontend static files
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  cachedApp = app;
  return app;
}

exports.api = onRequest(
  { region: 'asia-southeast2', cors: true, minInstances: 0, maxInstances: 10 },
  async (req, res) => {
    const app = await createApp();
    return app(req, res);
  }
);
