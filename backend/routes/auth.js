const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // POST /api/auth/log-session — Catat sesi login ke database
  router.post('/log-session', async (req, res) => {
    try {
      var email = req.body.email || '';
      var status = req.body.status || 'SUCCESS';
      var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
      var ua = req.headers['user-agent'] || '';

      await db.queryRun(
        'INSERT INTO login_sessions (user_email, ip_address, user_agent, status) VALUES ($1, $2, $3, $4)',
        [email, ip, ua, status]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('Error logging session:', err);
      res.status(500).json({ error: 'Gagal mencatat sesi login' });
    }
  });

  // GET /api/auth/sessions — Ambil riwayat sesi login (untuk audit)
  router.get('/sessions', async (req, res) => {
    try {
      var sessions = await db.queryAll(
        'SELECT * FROM login_sessions ORDER BY login_at DESC LIMIT 50'
      );
      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Gagal mengambil riwayat sesi' });
    }
  });

  return router;
};
