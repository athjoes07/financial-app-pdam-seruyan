import React, { useState, useEffect } from 'react'

export default function ProcessPage() {
  const [loading, setLoading] = useState(false)
  const [inputFiles, setInputFiles] = useState([])
  const [outputFiles, setOutputFiles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')

  useEffect(() => {
    fetchFileList()
  }, [])

  async function fetchFileList() {
    try {
      const [resIn, resOut] = await Promise.all([
        fetch('/api/process/input-files'),
        fetch('/api/process/output-files')
      ])
      const dataIn = await resIn.json()
      const dataOut = await resOut.json()
      if (Array.isArray(dataIn)) setInputFiles(dataIn)
      if (Array.isArray(dataOut)) setOutputFiles(dataOut)
    } catch (err) {
      console.error('Error fetching file list:', err)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadStatus('Mengunggah file ' + file.name + '...')

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result
      try {
        const res = await fetch('/api/process/upload-input', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentBase64: base64 })
        })
        const data = await res.json()
        if (res.ok) {
          setUploadStatus('✓ Berhasil mengunggah: ' + file.name)
          fetchFileList()
        } else {
          setUploadStatus('❌ Gagal: ' + (data.error || 'Terjadi kesalahan'))
        }
      } catch (err) {
        setUploadStatus('❌ Error: ' + err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleProcess() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/process/run-all', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      fetchFileList()
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
            <h1 className="page-title">Proses ETL</h1>
            <p className="page-subtitle">Pengolahan input → generate 5 laporan output</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleProcess}
            disabled={loading}
          >
            {loading ? '⚡ Memproses...' : '🚀 Proses Sekarang'}
          </button>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Pipeline</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.875rem 0.5rem' }}>
            <div style={{ fontSize: '1.5rem' }}>📁</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem' }}>Input</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inputFiles.length} file</div>
          </div>
          <span style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>→</span>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.875rem 0.5rem', background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
            <div style={{ fontSize: '1.5rem' }}>⚙️</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '0.25rem' }}>ETL</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--primary-dark)' }}>Parse → Jurnal</div>
          </div>
          <span style={{ color: 'var(--primary)', fontSize: '1.125rem' }}>→</span>
          <div className="summary-card" style={{ textAlign: 'center', padding: '0.875rem 0.5rem' }}>
            <div style={{ fontSize: '1.5rem' }}>📊</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem' }}>Output</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>5 Laporan</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Input & Output Files */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2">
        {/* Input Files */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📂 Input ({inputFiles.length})</h3>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              ➕ Upload
              <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {uploadStatus && <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>{uploadStatus}</div>}

          {inputFiles.length > 0 ? (
            <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Nama File</th>
                    <th className="text-right">Ukuran</th>
                    <th className="text-center" style={{ width: '80px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {inputFiles.map((f, i) => (
                    <tr key={i}>
                      <td>📄 {f.filename}</td>
                      <td className="text-right font-mono" style={{ fontSize: '0.8rem' }}>{(f.size / 1024).toFixed(1)} KB</td>
                      <td className="text-center">
                        <a 
                          href={f.downloadUrl || `/api/process/download-input/${encodeURIComponent(f.filename)}`} 
                          download 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          title="Unduh File Asli"
                        >
                          ⬇️ Unduh
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-text">Belum ada file input</div>
            </div>
          )}
        </div>

        {/* Output Files */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📥 Output (5 Laporan)</h3>
          </div>
          {[
            'Journal 2026.xlsx',
            'BUKU BESAR 2026.xlsx',
            'Neraca Lajur 2026.xlsx',
            'Neraca, RL, Arus Kas, ekuitas & Rincian 2026.xlsx',
            'AUDIT_TRAIL.xlsx'
          ].map((name, i) => {
            const existing = outputFiles.find(of => of.filename === name)
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{name}</div>
                  {existing && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {(existing.size / 1024).toFixed(1)} KB
                    </div>
                  )}
                </div>
                <a
                  href={`/api/process/download/${encodeURIComponent(name)}`}
                  download
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  ⬇️
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* Execution Result */}
      {result && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">✅ Hasil Eksekusi</h3>
            <span className={`status-pill ${result.reports?.every(r => r.status === 'OK') ? 'success' : 'warning'}`}>
              {result.reports?.filter(r => r.status === 'OK').length || 0} / {result.reports?.length || 0} Berhasil
            </span>
          </div>

          {result.reports?.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.85rem' }}>{r.file}</div>
              <span className={`status-pill ${r.status === 'OK' ? 'success' : 'danger'}`}>
                {r.status === 'OK' ? '✓ OK' : '✕ Gagal'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
