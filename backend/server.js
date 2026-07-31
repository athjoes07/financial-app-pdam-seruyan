const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initDatabase } = require('./database');

async function main() {
  const db = await initDatabase();
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use('/api/akun', require('./routes/akun')(db));
  app.use('/api/transaksi', require('./routes/transaksi')(db));
  app.use('/api/laporan', require('./routes/laporan')(db));
  app.use('/api/process', require('./routes/process')(db));

  // Serve frontend static files only on local (not Vercel — Vercel serves from outputDirectory)
  if (!process.env.VERCEL) {
    const distPath = path.join(__dirname, '..', 'frontend', 'dist');
    const fs = require('fs');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        setHeaders: (res, path) => {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }));
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API route not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  return app;
}

// Export for Vercel and api/index.js
module.exports = { main };

// Start server locally
if (!process.env.VERCEL) {
  main().then(app => {
    const PORT = process.env.PORT || 3000;
    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Server berjalan di http://localhost:${PORT}`);
      console.log(`\nPort aktif: ${PORT}`);
      console.log(`API proses input: POST /api/process/input`);
      console.log(`API generate output: POST /api/process/generate`);
      console.log(`API run all: POST /api/process/run-all`);
    });
  }).catch(err => {
    console.error('Gagal menjalankan server:', err);
    process.exit(1);
  });
}
