const coa = require('./coa-lookup');

function hitungSaldo(akunKode, totalDebit, totalKredit) {
  const akun = coa.findByKode(akunKode);
  if (!akun) return totalDebit - totalKredit;
  if (akun.saldo_normal === 'debit') return totalDebit - totalKredit;
  return totalKredit - totalDebit;
}

function debit(akunKode, saldo) {
  const akun = coa.findByKode(akunKode);
  if (!akun) return saldo > 0 ? saldo : 0;
  if (akun.saldo_normal === 'debit') return saldo > 0 ? saldo : 0;
  return saldo < 0 ? -saldo : 0;
}

function kredit(akunKode, saldo) {
  const akun = coa.findByKode(akunKode);
  if (!akun) return saldo < 0 ? -saldo : 0;
  if (akun.saldo_normal === 'kredit') return saldo > 0 ? saldo : 0;
  return saldo < 0 ? -saldo : 0;
}

module.exports = { hitungSaldo, debit, kredit };
