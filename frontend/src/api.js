const BASE = '/api';

export async function getAkun() {
  const res = await fetch(`${BASE}/akun`);
  return res.json();
}

export async function getTransaksi() {
  const res = await fetch(`${BASE}/transaksi`);
  return res.json();
}

export async function createTransaksi(data) {
  const res = await fetch(`${BASE}/transaksi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error);
  }
  return res.json();
}

export async function deleteTransaksi(id) {
  await fetch(`${BASE}/transaksi/${id}`, { method: 'DELETE' });
}

export async function getNeracaSaldo() {
  const res = await fetch(`${BASE}/laporan/neraca-saldo`);
  return res.json();
}

export async function getLabaRugi() {
  const res = await fetch(`${BASE}/laporan/laba-rugi`);
  return res.json();
}

export async function getNeraca() {
  const res = await fetch(`${BASE}/laporan/neraca`);
  return res.json();
}
