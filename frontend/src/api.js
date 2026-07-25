const API_URL = import.meta.env.VITE_API_URL || '';
const BASE = `${API_URL}/api`;

export async function getAkun() {
  const res = await fetch(`${BASE}/akun`);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return data;
}

export async function getTransaksi() {
  const res = await fetch(`${BASE}/transaksi`);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return data;
}

export async function createTransaksi(data) {
  const res = await fetch(`${BASE}/transaksi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'API Error');
  }
  return res.json();
}

export async function deleteTransaksi(id) {
  const res = await fetch(`${BASE}/transaksi/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('API Error');
}

export async function getNeracaSaldo() {
  const res = await fetch(`${BASE}/laporan/neraca-saldo`);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return data;
}

export async function getLabaRugi() {
  const res = await fetch(`${BASE}/laporan/laba-rugi`);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return data;
}

export async function getNeraca() {
  const res = await fetch(`${BASE}/laporan/neraca`);
  if (!res.ok) throw new Error('API Error');
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return data;
}
