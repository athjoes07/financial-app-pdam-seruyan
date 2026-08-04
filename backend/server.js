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
  app.use('/api/auth', require('./routes/auth')(db));

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

function startSetupMode(errorMsg) {
  const setupExpress = require('express');
  const setupPath = require('path');
  const fs = require('fs');
  const setupApp = setupExpress();

  setupApp.use(setupExpress.urlencoded({ extended: true }));
  setupApp.use(setupExpress.json());

  setupApp.get('*', (req, res) => {
    const html = '<!DOCTYPE html>' +
      '<html lang="id">' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>Setup Koneksi Database (Raw Editor)</title>' +
      '<style>' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }' +
      '.card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); width: 100%; max-width: 500px; }' +
      'h1 { margin-top: 0; color: #111827; font-size: 1.5rem; margin-bottom: 0.5rem; }' +
      'p.error { color: #dc2626; background: #fef2f2; padding: 1rem; border-radius: 6px; font-size: 0.875rem; border: 1px solid #f87171; overflow-wrap: break-word; }' +
      'label { display: block; font-weight: 500; margin-bottom: 0.5rem; color: #374151; font-size: 0.875rem; }' +
      'input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 1.25rem; font-family: monospace; font-size: 0.875rem; box-sizing: border-box; }' +
      'input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }' +
      'button { background: #2563eb; color: white; border: none; padding: 0.875rem; width: 100%; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s; }' +
      'button:hover { background: #1d4ed8; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="card">' +
      '<h1>Konfigurasi Database</h1>' +
      '<p>Aplikasi gagal terhubung ke database. Silakan atur konfigurasi Anda.</p>' +
      '<p class="error"><strong>Pesan Error:</strong> ' + errorMsg + '</p>' +
      '<form method="POST" action="/setup">' +
      '<label>DATABASE_URL (Koneksi PostgreSQL)</label>' +
      '<input type="text" name="DATABASE_URL" placeholder="postgresql://postgres:password@host:5432/postgres" required>' +
      '<label>SUPABASE_URL</label>' +
      '<input type="text" name="SUPABASE_URL" placeholder="https://xxxx.supabase.co" required>' +
      '<label>SUPABASE_KEY (Anon/Service Key)</label>' +
      '<input type="text" name="SUPABASE_KEY" placeholder="eyJhbG..." required>' +
      '<button type="submit">Simpan & Restart Server</button>' +
      '</form>' +
      '</div>' +
      '</body>' +
      '</html>';
    res.send(html);
  });

  setupApp.post('/setup', (req, res) => {
    const dbUrl = req.body.DATABASE_URL;
    const sbUrl = req.body.SUPABASE_URL;
    const sbKey = req.body.SUPABASE_KEY;
    const envContent = 'SUPABASE_URL=' + sbUrl + '\nSUPABASE_KEY=' + sbKey + '\nDATABASE_URL=' + dbUrl + '\n';
    const envPath = setupPath.join(__dirname, '..', '.env');

    try {
      fs.writeFileSync(envPath, envContent);
      res.send(
        '<div style="font-family:sans-serif;text-align:center;margin-top:50px;">' +
        '<h2 style="color:#059669;">Konfigurasi berhasil disimpan ke file .env!</h2>' +
        '<p>Server akan direstart dalam beberapa detik...</p>' +
        '<p>Silakan <a href="/">Klik disini untuk memuat ulang aplikasi</a>.</p>' +
        '</div>'
      );
      console.log('Konfigurasi .env diperbarui via Setup Mode. Merestart server...');
      setTimeout(function() { process.exit(1); }, 1500);
    } catch(e) {
      res.status(500).send('Gagal menyimpan file .env: ' + e.message);
    }
  });

  var setupPort = process.env.PORT || 3000;
  setupApp.listen(setupPort, '0.0.0.0', function() {
    console.log('\n====================================================');
    console.log('  WARNING: SERVER BERJALAN DALAM "SETUP MODE" (RAW EDITOR)');
    console.log('====================================================');
    console.log('  Buka http://localhost:' + setupPort + ' untuk mengatur .env');
    console.log('====================================================\n');
  });
}

// Start server locally
if (!process.env.VERCEL) {
  main().then(function(app) {
    var PORT = process.env.PORT || 3000;
    var server = http.createServer(app);

    // Listen on all interfaces (0.0.0.0) so other devices on same network can connect
    server.listen(PORT, '0.0.0.0', function() {
      var os = require('os');

      // Get local IP addresses
      var nets = os.networkInterfaces();
      var localIPs = [];
      for (var name of Object.keys(nets)) {
        for (var net of nets[name]) {
          // Only show IPv4 and non-internal
          if (net.family === 'IPv4' && !net.internal) {
            localIPs.push(net.address);
          }
        }
      }

      console.log('\n====================================================');
      console.log('  SERVER KEUANGAN PDAM SERUYAN AKTIF');
      console.log('====================================================');
      console.log('  Lokal     : http://localhost:' + PORT);
      for (var i = 0; i < localIPs.length; i++) {
        console.log('  Jaringan  : http://' + localIPs[i] + ':' + PORT + '  <- akses dari HP/tablet');
      }
      console.log('====================================================');
      console.log('  Semua perangkat di jaringan Wi-Fi/LAN yang sama');
      console.log('  dapat mengakses aplikasi lewat URL Jaringan di atas.');
      console.log('====================================================\n');
    });
  }).catch(function(err) {
    console.error('Gagal menjalankan server, beralih ke SETUP MODE:', err.message);
    startSetupMode(err.message);
  });
}
