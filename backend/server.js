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

  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  const researchPath = path.join(__dirname, '..', 'Research-Agent-Skills-Collection-main');
  app.use('/research', express.static(researchPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });

  if (process.env.VERCEL) {
    return app;
  }

  const PORT = 3000;

  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`\nPort aktif: ${PORT}`);
    console.log(`API proses input: POST /api/process/input`);
    console.log(`API generate output: POST /api/process/generate`);
    console.log(`API run all: POST /api/process/run-all`);
  });
}

if (!process.env.VERCEL) {
  main().catch(err => {
    console.error('Gagal menjalankan server:', err);
    process.exit(1);
  });
} else {
  let appInstance;
  module.exports = async (req, res) => {
    if (!appInstance) {
      appInstance = await main();
    }
    return appInstance(req, res);
  };
}
