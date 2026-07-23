const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

async function main() {
  const db = await initDatabase();
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.use('/api/akun', require('./routes/akun')(db));
  app.use('/api/transaksi', require('./routes/transaksi')(db));
  app.use('/api/laporan', require('./routes/laporan')(db));
  app.use('/api/process', require('./routes/process')(db));

  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath));

  // Serve Research-Agent-Skills-Collection at /research
  const researchPath = path.join(__dirname, '..', 'Research-Agent-Skills-Collection-main');
  app.use('/research', express.static(researchPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`API proses input: POST /api/process/input`);
    console.log(`API generate output: POST /api/process/generate`);
    console.log(`API run all: POST /api/process/run-all`);
  });
}

main().catch(err => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
