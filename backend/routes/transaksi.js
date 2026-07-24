const express = require('express');
const router = express.Router();

module.exports = function(db) {
  router.get('/', (req, res) => {
    const transaksi = db.queryAll(`
      SELECT t.*, GROUP_CONCAT(
        '{"akun_id":' || j.akun_id || ',"akun_nama":"' || a.nama || '","debit":' || j.debit || ',"kredit":' || j.kredit || '}'
      ) as jurnal
      FROM transaksi t
      LEFT JOIN jurnal j ON j.transaksi_id = t.id
      LEFT JOIN akun a ON a.id = j.akun_id
      GROUP BY t.id
      ORDER BY t.id DESC
    `);

    const result = transaksi.map(t => ({
      ...t,
      jurnal: t.jurnal ? JSON.parse(`[${t.jurnal}]`) : []
    }));

    res.json(result);
  });

  router.post('/', (req, res) => {
    const { tanggal, deskripsi, entries } = req.body;

    if (!deskripsi || !entries || entries.length < 2) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    const totalDebit = entries.reduce((s, e) => s + (parseFloat(e.debit) || 0), 0);
    const totalKredit = entries.reduce((s, e) => s + (parseFloat(e.kredit) || 0), 0);

    if (Math.abs(totalDebit - totalKredit) > 0.01) {
      return res.status(400).json({ error: 'Total debit dan kredit tidak sama' });
    }

    const tgl = tanggal || new Date().toISOString().slice(0, 10);
    db.run('INSERT INTO transaksi (tanggal, deskripsi) VALUES (?, ?)', [tgl, deskripsi]);

    const result = db.queryOne('SELECT MAX(id) as id FROM transaksi');
    const tId = result.id;

    for (const e of entries) {
      db.run('INSERT INTO jurnal (transaksi_id, akun_id, debit, kredit) VALUES (?, ?, ?, ?)', [
        tId, e.akun_id, parseFloat(e.debit) || 0, parseFloat(e.kredit) || 0
      ]);
    }

    const transaksi = db.queryOne(`
      SELECT t.*, GROUP_CONCAT(
        '{"akun_id":' || j.akun_id || ',"akun_nama":"' || a.nama || '","debit":' || j.debit || ',"kredit":' || j.kredit || '}'
      ) as jurnal
      FROM transaksi t
      LEFT JOIN jurnal j ON j.transaksi_id = t.id
      LEFT JOIN akun a ON a.id = j.akun_id
      WHERE t.id = ?
      GROUP BY t.id
    `, [tId]);

    transaksi.jurnal = JSON.parse(`[${transaksi.jurnal}]`);
    res.status(201).json(transaksi);
  });

  router.delete('/:id', (req, res) => {
    db.run('DELETE FROM jurnal WHERE transaksi_id = ?', [req.params.id]);
    db.run('DELETE FROM transaksi WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transaksi dihapus' });
  });

  return router;
};
