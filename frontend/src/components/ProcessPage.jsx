import React, { useState, useEffect } from 'react'
const API_URL = import.meta.env.VITE_API_URL || '';

export default function ProcessPage() {
  const [loading, setLoading] = useState(false)
  const [inputFiles, setInputFiles] = useState([])
  const [outputFiles, setOutputFiles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [viewMode, setViewMode] = useState('input')
  const [trashFiles, setTrashFiles] = useState([])
  const [downloadFormat, setDownloadFormat] = useState('xls')
  const [processTab, setProcessTab] = useState('input')

  useEffect(() => {
    fetchFileList()
    fetchTrashList()
  }, [])

  async function fetchTrashList() {
    try {
      const res = await fetch(`${API_URL}/api/process/trash-files`)
      const data = await res.json()
      if (Array.isArray(data)) setTrashFiles(data)
    } catch (err) {
      console.error('Error fetching trash list:', err)
    }
  }

  async function fetchFileList() {
    try {
      const [resIn, resOut] = await Promise.all([
        fetch(`${API_URL}/api/process/input-files`),
        fetch(`${API_URL}/api/process/output-files`)
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
        const res = await fetch(`${API_URL}/api/process/upload-input`, {
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
      const res = await fetch(`${API_URL}/api/process/run-all`, { method: 'POST' })
      const data = await res.json()
      setResult(data)
      fetchFileList()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  async function handleDeleteInput(filename) {
    if (!window.confirm(`Yakin ingin menghapus ${filename}?`)) return
    try {
      const res = await fetch(`${API_URL}/api/process/delete-input/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      const data = await res.json()
      window.alert(data.message)
      fetchFileList()
      fetchTrashList()
    } catch (err) {
      window.alert('Gagal menghapus file: ' + err.message)
    }
  }

  async function handleRestoreTrash(filename) {
    if (!window.confirm(`Yakin ingin memulihkan ${filename}?`)) return
    try {
      const res = await fetch(`${API_URL}/api/process/restore-trash/${encodeURIComponent(filename)}`, { method: 'POST' })
      const data = await res.json()
      window.alert(data.message)
      fetchFileList()
      fetchTrashList()
    } catch (err) {
      window.alert('Gagal memulihkan file: ' + err.message)
    }
  }

  async function handleDownloadOutput(filename, format) {
    const endpoint = format === 'pdf'
      ? `${API_URL}/api/process/download-pdf/${encodeURIComponent(filename)}`
      : `${API_URL}/api/process/download/${encodeURIComponent(filename)}`
    
    const downloadName = format === 'pdf'
      ? filename.replace(/\.xlsx?$/i, '.pdf')
      : filename

    try {
      const res = await fetch(endpoint)
      if (!res.ok) {
        const text = await res.text()
        window.alert('Gagal download: ' + text)
        return
      }
      const buffer = await res.arrayBuffer()
      const mimeType = format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const blob = new Blob([buffer], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      window.alert('Gagal download: ' + err.message)
    }
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Proses ETL</h1>
            <p className="page-subtitle">Pengolahan input → generate 5 laporan output</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button
              className="btn btn-primary"
              onClick={handleProcess}
              disabled={loading || viewMode === 'trash'}
            >
              {loading ? '⚡ Memproses...' : '🚀 Proses Sekarang'}
            </button>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => setViewMode(viewMode === 'input' ? 'trash' : 'input')}
            >
              {viewMode === 'input' ? '🗑️ Lihat Tempat Sampah' : '📁 Lihat File Aktif'}
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'input' && (
        <>
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

      {/* Mobile Toggle for Input/Output */}
      <div className="process-toggle-group">
        <button
          className={`dash-toggle-btn${processTab === 'input' ? ' active' : ''}`}
          onClick={() => setProcessTab('input')}
        >
          📂 Input ({inputFiles.length})
        </button>
        <button
          className={`dash-toggle-btn${processTab === 'output' ? ' active' : ''}`}
          onClick={() => setProcessTab('output')}
        >
          📥 Output (5)
        </button>
      </div>

      {/* Input & Output Files */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-2">
        {/* Input Files */}
        <div className={`card process-card-input${processTab === 'input' ? ' process-card-active' : ''}`}>
          <div className="card-header">
            <h3 className="card-title">📂 Input ({inputFiles.length})</h3>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              ➕ Upload
              <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {uploadStatus && <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>{uploadStatus}</div>}

          {inputFiles.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="table-wrap process-desktop-table" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>Nama File</th>
                      <th>Tgl Upload</th>
                      <th className="text-right">Ukuran</th>
                      <th className="text-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inputFiles.map((f, i) => (
                      <tr key={i}>
                        <td>📄 {f.filename}</td>
                        <td style={{ fontSize: '0.8rem' }}>{new Date(f.modified).toLocaleDateString('id-ID')}</td>
                        <td className="text-right font-mono" style={{ fontSize: '0.8rem' }}>{(f.size / 1024).toFixed(1)} KB</td>
                        <td className="text-center" style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <a 
                            href={f.downloadUrl || `${API_URL}/api/process/download-input/${encodeURIComponent(f.filename)}`} 
                            download 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Unduh File"
                          >
                            ⬇️
                          </a>
                          <button 
                            onClick={() => handleDeleteInput(f.filename)}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Hapus File"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="process-mobile-list">
                {inputFiles.map((f, i) => (
                  <div className="process-file-item" key={i}>
                    <div className="process-file-icon input">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div className="process-file-info">
                      <span className="process-file-name">{f.filename}</span>
                      <span className="process-file-meta">
                        {(f.size / 1024).toFixed(1)} KB · {new Date(f.modified).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="process-file-actions">
                      <a 
                        href={f.downloadUrl || `${API_URL}/api/process/download-input/${encodeURIComponent(f.filename)}`} 
                        download 
                        className="process-file-action-btn download"
                        title="Unduh"
                      >
                        ⬇️
                      </a>
                      <button 
                        onClick={() => handleDeleteInput(f.filename)}
                        className="process-file-action-btn delete"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-text">Belum ada file input</div>
            </div>
          )}
        </div>

        {/* Output Files */}
        <div className={`card process-card-output${processTab === 'output' ? ' process-card-active' : ''}`}>
          <div className="card-header">
            <h3 className="card-title">📥 Output (5 Laporan)</h3>
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-subtle)', padding: '0.2rem', borderRadius: '0.5rem' }}>
              <button
                onClick={() => setDownloadFormat('xls')}
                className={`btn btn-sm ${downloadFormat === 'xls' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                📊 XLS
              </button>
              <button
                onClick={() => setDownloadFormat('pdf')}
                className={`btn btn-sm ${downloadFormat === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                📄 PDF
              </button>
            </div>
          </div>

          {/* Desktop list */}
          <div className="process-desktop-table">
          {[
            { file: 'Journal.xlsx', label: 'Journal' },
            { file: 'BUKU BESAR.xlsx', label: 'Buku Besar' },
            { file: 'Neraca Lajur.xlsx', label: 'Neraca Lajur' },
            { file: 'Neraca, RL, Arus Kas, ekuitas & Rincian.xlsx', label: 'Neraca, RL, Arus Kas, Ekuitas & Rincian' },
            { file: 'AUDIT_TRAIL.xlsx', label: 'Audit Trail' }
          ].map((item, i) => {
            const existing = outputFiles.find(of => of.filename === item.file)
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.label}</div>
                  {existing && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {(existing.size / 1024).toFixed(1)} KB · Diperbarui: {new Date(existing.modified).toLocaleDateString('id-ID')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDownloadOutput(item.file, downloadFormat)}
                  className="btn btn-primary btn-sm"
                  style={{ minWidth: '80px', textAlign: 'center' }}
                >
                  ⬇️ {downloadFormat.toUpperCase()}
                </button>
              </div>
            )
          })}
          </div>

          {/* Mobile list */}
          <div className="process-mobile-list">
          {[
            { file: 'Journal.xlsx', label: 'Journal', icon: '📒' },
            { file: 'BUKU BESAR.xlsx', label: 'Buku Besar', icon: '📗' },
            { file: 'Neraca Lajur.xlsx', label: 'Neraca Lajur', icon: '📘' },
            { file: 'Neraca, RL, Arus Kas, ekuitas & Rincian.xlsx', label: 'Neraca, RL, Arus Kas, Ekuitas & Rincian', icon: '📕' },
            { file: 'AUDIT_TRAIL.xlsx', label: 'Audit Trail', icon: '📋' }
          ].map((item, i) => {
            const existing = outputFiles.find(of => of.filename === item.file)
            return (
              <div className="process-file-item" key={i}>
                <div className="process-file-icon output">
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                </div>
                <div className="process-file-info">
                  <span className="process-file-name">{item.label}</span>
                  <span className="process-file-meta">
                    {existing ? `${(existing.size / 1024).toFixed(1)} KB` : 'Belum diproses'}
                  </span>
                </div>
                <button
                  onClick={() => handleDownloadOutput(item.file, downloadFormat)}
                  className="process-file-action-btn download"
                  title={`Download ${downloadFormat.toUpperCase()}`}
                >
                  ⬇️
                </button>
              </div>
            )
          })}
          </div>
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
        </>
      )}

      {viewMode === 'trash' && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header">
            <h3 className="card-title">🗑️ Tempat Sampah ({trashFiles.length})</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Daftar file input yang telah dihapus.
            </p>
          </div>
          {trashFiles.length > 0 ? (
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Nama File</th>
                    <th>Waktu Dihapus</th>
                    <th className="text-right">Ukuran</th>
                    <th className="text-center" style={{ width: '120px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {trashFiles.map((f, i) => (
                    <tr key={i}>
                      <td>📄 {f.filename}</td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(f.modified).toLocaleString('id-ID')}</td>
                      <td className="text-right font-mono" style={{ fontSize: '0.8rem' }}>{(f.size / 1024).toFixed(1)} KB</td>
                      <td className="text-center">
                        <button 
                          onClick={() => handleRestoreTrash(f.filename)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          ♻️ Pulihkan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🗑️</div>
              <div className="empty-state-text">Tempat sampah kosong</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
