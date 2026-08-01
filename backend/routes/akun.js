const express = require('express');
const router = express.Router();

module.exports = function(db) {
  router.get('/', async (req, res) => {
    const akun = await db.queryAll('SELECT * FROM akun ORDER BY kode');
    res.json(akun);
  });

  return router;
};
