import React, { useState } from 'react'

export default function FirebasePage() {
  const [syncResult, setSyncResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSync() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/process/sync-firestore', { method: 'POST' })
      const data = await res.json()
      setSyncResult(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>Firebase Sync</h2>

      <div className="card">
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Sinkronkan data dari SQLite lokal ke Firestore cloud.
          Pastikan file <strong>service-account-key.json</strong> sudah ada di folder backend/.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={loading}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
        >
          {loading ? 'Menyinkronkan...' : 'SYNC KE FIRESTORE'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {syncResult && (
        <div className="card">
          <h2>Hasil Sinkronisasi</h2>
          {syncResult.success === false ? (
            <p className="text-danger">{syncResult.error || 'Gagal sinkronisasi'}</p>
          ) : (
            <table>
              <thead><tr><th>Koleksi</th><th className="text-right">Jumlah</th></tr></thead>
              <tbody>
                <tr><td>Akun</td><td className="text-right">{syncResult.results?.akun || 0}</td></tr>
                <tr><td>Transaksi</td><td className="text-right">{syncResult.results?.transaksi || 0}</td></tr>
                <tr><td>Jurnal</td><td className="text-right">{syncResult.results?.jurnal || 0}</td></tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="card">
        <h2>Setup Firebase</h2>
        <ol style={{ marginLeft: '1.25rem', lineHeight: '2' }}>
          <li>Buka <a href="https://console.firebase.google.com/project/financial-app-pdam-seruyan/settings/serviceaccounts/adminsdk" target="_blank" rel="noopener noreferrer">Firebase Console → Service Accounts</a></li>
          <li>Klik <strong>Generate new private key</strong></li>
          <li>Simpan file sebagai <code>backend/service-account-key.json</code></li>
          <li>Klik tombol <strong>SYNC KE FIRESTORE</strong> di atas</li>
        </ol>
      </div>
    </div>
  )
}
