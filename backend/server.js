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
    
    // Listen on all interfaces (0.0.0.0) so other devices on same network can connect
    server.listen(PORT, '0.0.0.0', () => {
      const os = require('os');
      
      // Get local IP addresses
      const nets = os.networkInterfaces();
      const localIPs = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          // Only show IPv4 and non-internal
          if (net.family === 'IPv4' && !net.internal) {
            localIPs.push(net.address);
          }
        }
      }
      
      console.log('\n====================================================');
      console.log('  🚀  SERVER KEUANGAN PDAM SERUYAN AKTIF');
      console.log('====================================================');
      console.log(`  ✅  Lokal     : http://localhost:${PORT}`);
      for (const ip of localIPs) {
        console.log(`  🌐  Jaringan  : http://${ip}:${PORT}  ← akses dari HP/tablet`);
      }
      console.log('====================================================');
      console.log('  Semua perangkat di jaringan Wi-Fi/LAN yang sama');
      console.log('  dapat mengakses aplikasi lewat URL Jaringan di atas.');
      console.log('====================================================\n');
    });
  }).catch(err => {
    console.error('Gagal menjalankan server:', err);
    process.exit(1);
  });
}
