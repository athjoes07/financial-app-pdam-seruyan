const express = require('express');
const router = express.Router();

module.exports = function(db) {
  router.get('/', (req, res) => {
    const akun = db.queryAll('SELECT * FROM akun ORDER BY kode');
    res.json(akun);
  });

  return router;
};
