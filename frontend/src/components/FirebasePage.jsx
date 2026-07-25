import React, { useState } from 'react'
const API_URL = import.meta.env.VITE_API_URL || '';

export default function FirebasePage() {
  const [syncResult, setSyncResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSync() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/process/sync-firestore`, { method: 'POST' })
      const data = await res.json()
      setSyncResult(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Cloud Sync</h1>
            <p className="page-subtitle">Sinkronisasi SQLite → Firebase Firestore</p>
          </div>
          <button className="btn btn-primary" onClick={handleSync} disabled={loading}>
            {loading ? '⏳ Menyinkronkan...' : '☁️ Sync Sekarang'}
          </button>
        </div>
      </div>

      {/* Cloud Status Card */}
      <div className="balance-card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="balance-card-label">Project ID</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>financial-app-pdam-seruyan</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>Firestore Service Active</div>
          </div>
          <span className="status-pill success">● Firestore Connected</span>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Sync Results */}
      {syncResult && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Hasil Sinkronisasi</h3>
            {syncResult.success !== false && <span className="status-pill success">Berhasil</span>}
          </div>

          {syncResult.success === false ? (
            <div className="alert alert-danger">
              {syncResult.error || 'Gagal sinkronisasi ke cloud'}
            </div>
          ) : (
            <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="summary-card" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', textAlign: 'center' }}>
                <div className="summary-card-label">Akun</div>
                <div className="summary-card-value" style={{ color: 'var(--info)', fontSize: '1.5rem' }}>
                  {syncResult.results?.akun || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--info)' }}>Dokumen</div>
              </div>
              <div className="summary-card" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', textAlign: 'center' }}>
                <div className="summary-card-label">Transaksi</div>
                <div className="summary-card-value success" style={{ fontSize: '1.5rem' }}>
                  {syncResult.results?.transaksi || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Dokumen</div>
              </div>
              <div className="summary-card" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', textAlign: 'center' }}>
                <div className="summary-card-label">Jurnal</div>
                <div className="summary-card-value" style={{ color: '#7c3aed', fontSize: '1.5rem' }}>
                  {syncResult.results?.jurnal || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7c3aed' }}>Dokumen</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup Guide */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📖 Panduan Setup</h3>
        </div>
        <div style={{ lineHeight: '2', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          <ol style={{ marginLeft: '1.25rem' }}>
            <li>Buka Firebase Console → Service Accounts</li>
            <li>Klik <strong>Generate new private key</strong> untuk mengunduh credential JSON</li>
            <li>Simpan sebagai <code style={{ background: 'var(--bg-surface-hover)', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.85rem' }}>backend/service-account-key.json</code></li>
            <li>Klik tombol <strong>Sync Sekarang</strong> di atas</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
