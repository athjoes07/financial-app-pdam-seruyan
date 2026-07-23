# Setup Firebase untuk Aplikasi Keuangan

## 1. Download Service Account Key

1. Buka https://console.firebase.google.com/project/financial-app-pdam-seruyan/settings/serviceaccounts/adminsdk
2. Klik **Generate new private key** → Download JSON
3. Simpan file sebagai: `backend/service-account-key.json`

## 2. Jalankan Migrasi

```bash
cd backend
node migrate-to-firestore.js
```

Ini akan memindahkan semua data dari SQLite ke Firestore.

## 3. Update Server

Setelah migrasi sukses, edit `server.js`:
- Ganti `const { initDatabase } = require('./database')`
- Jadi `const { initDatabase } = require('./firestore-db')`

## Struktur Firestore

```
akun/          → { kode, nama, tipe, saldo_normal, kategori }
transaksi/     → { tanggal, deskripsi, sumber }
jurnal/        → { transaksi_id, akun_id, debit, kredit }
```

## Catatan

- Firestore masih dalam mode uji coba
- SQLite tetap berjalan sebagai fallback
- Untuk rollback, kembalikan require ke `./database`
