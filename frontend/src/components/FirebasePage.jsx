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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a237e', fontFamily: 'Outfit, sans-serif' }}>Firebase Cloud Firestore Sync</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Sinkronisasi Database SQLite Lokal ke Cloud Storage Firebase</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={loading}
          style={{ padding: '0.85rem 2rem', fontSize: '1rem', fontWeight: 700 }}
        >
          {loading ? '⚡ Menyinkronkan ke Cloud...' : '☁️ SINKRONKAN KE FIRESTORE'}
        </button>
      </div>

      {/* Cloud Status Card */}
      <div className="card-modern" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PROJECT ID</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.35rem', fontWeight: 800, marginTop: '0.2rem' }}>financial-app-pdam-seruyan</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Status Integrasi: Firestore Service Active</div>
          </div>
          <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            ● Firestore Connected
          </div>
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {syncResult && (
        <div className="card-modern">
          <h3 className="card-title">📊 Hasil Sinkronisasi Real-Time</h3>
          {syncResult.success === false ? (
            <p className="text-danger font-bold">{syncResult.error || 'Gagal sinkronisasi ke cloud'}</p>
          ) : (
            <div className="grid-3">
              <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8' }}>KOLEKSI AKUN</div>
                <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>
                  {syncResult.results?.akun || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.25rem' }}>Dokumen Tersinkron</div>
              </div>

              <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857' }}>KOLEKSI TRANSAKSI</div>
                <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#065f46', marginTop: '0.25rem' }}>
                  {syncResult.results?.transaksi || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>Dokumen Tersinkron</div>
              </div>

              <div style={{ background: '#f5f3ff', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', border: '1px solid #ddd6fe' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9' }}>KOLEKSI JURNAL</div>
                <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: '#5b21b6', marginTop: '0.25rem' }}>
                  {syncResult.results?.jurnal || 0}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8b5cf6', marginTop: '0.25rem' }}>Dokumen Tersinkron</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup Guide */}
      <div className="card-modern">
        <h3 className="card-title">📖 Panduan Setup Credential Firestore Admin SDK</h3>
        <ol style={{ marginLeft: '1.25rem', lineHeight: '2.2', color: '#334155', fontSize: '0.92rem' }}>
          <li>Buka Firebase Console: <a href="https://console.firebase.google.com/project/financial-app-pdam-seruyan/settings/serviceaccounts/adminsdk" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 700 }}>Firebase Service Accounts ➔</a></li>
          <li>Klik tombol <strong>Generate new private key</strong> untuk mengunduh kredensial JSON.</li>
          <li>Simpan file kredensial sebagai <code>backend/service-account-key.json</code>.</li>
          <li>Klik tombol <strong>☁️ SINKRONKAN KE FIRESTORE</strong> di atas untuk mencadangkan database.</li>
        </ol>
      </div>
    </div>
  )
}
