import React, { useState } from 'react'

export default function ProcessPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleProcess() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/process/run-all', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>Proses Input & Generate Laporan</h2>

      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Tombol ini akan memproses semua file Excel di folder <strong>input/</strong> 
          dan menghasilkan laporan ke folder <strong>output-app/</strong>
        </p>
        <button
          className="btn btn-primary"
          onClick={handleProcess}
          disabled={loading}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
        >
          {loading ? 'Memproses...' : 'PROSES SEMUA INPUT & GENERATE LAPORAN'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div>
          <div className="card">
            <h2>Hasil Proses Input</h2>
            {result.process && (
              <>
                <h3>File Diproses:</h3>
                <ul>
                  {result.process.files_processed.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <h3>Transaksi Dibuat:</h3>
                <table>
                  <thead><tr><th>ID</th><th>Deskripsi</th><th className="text-right">Total</th></tr></thead>
                  <tbody>
                    {result.process.transactions.map(t => (
                      <tr key={t.id}>
                        <td>{t.id}</td>
                        <td>{t.desc}</td>
                        <td className="text-right">Rp {t.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                    {result.process.transactions.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>Tidak ada transaksi baru</td></tr>}
                  </tbody>
                </table>
                {result.process.errors.length > 0 && (
                  <>
                    <h3 className="text-danger">Error:</h3>
                    <ul>{result.process.errors.map((e, i) => <li key={i} className="text-danger">{e}</li>)}</ul>
                  </>
                )}
              </>
            )}
          </div>

          <div className="card">
            <h2>Hasil Generate Laporan</h2>
            <table>
              <thead><tr><th>File</th><th>Status</th></tr></thead>
              <tbody>
                {result.reports?.map((r, i) => (
                  <tr key={i}>
                    <td>{r.file}</td>
                    <td className={r.status === 'OK' ? 'text-success font-bold' : 'text-danger'}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.reports?.every(r => r.status === 'OK') && (
              <p style={{ marginTop: '1rem', color: '#43a047', fontWeight: 600 }}>
                Semua laporan berhasil digenerate di folder output-app/
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
