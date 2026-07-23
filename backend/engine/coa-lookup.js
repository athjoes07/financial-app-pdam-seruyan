const COA = require('../coa-master');

function findByKode(kode) {
  return COA.find(a => a.kode === kode) || null;
}

function findByNama(nama) {
  return COA.find(a => a.nama.toLowerCase() === nama.toLowerCase()) || null;
}

function kategori(kode) {
  const a = findByKode(kode);
  return a ? a.kategori : 'Lain-lain';
}

function tipe(kode) {
  const a = findByKode(kode);
  return a ? a.tipe : 'beban';
}

module.exports = { findByKode, findByNama, kategori, tipe, COA };
