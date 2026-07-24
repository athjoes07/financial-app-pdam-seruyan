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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a237e' }}>Engine Keuangan (Input → Output Pipeline)</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>Otomatisasi pengolahan berkas mentah input menjadi 5 laporan keuangan formal</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleProcess}
          disabled={loading}
          style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', fontWeight: 600, boxShadow: '0 4px 12px rgba(26,35,126,0.3)' }}
        >
          {loading ? '⚡ Memproses ETL & Generasi Laporan...' : '🚀 PROSES ALL INPUT & GENERATE 5 OUTPUT EXCEL'}
        </button>
      </div>

      {/* Visual Correlation Flow Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', color: '#fff', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#9fa8da', marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>🌐 ALUR ALGORITMA INTEGRASI DATA</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '1.8rem' }}>📁</div>
            <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>FOLDER INPUT</div>
            <div style={{ fontSize: '0.85rem', color: '#c5cae9', marginTop: '0.25rem' }}>{inputFiles.length} File Mentah (DRD, LPP, Voucher, Persediaan, Asset)</div>
          </div>
          <div style={{ fontSize: '1.5rem', color: '#9fa8da' }}>➔</div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1.25rem 1rem', borderRadius: '8px', border: '1px solid #7986cb' }}>
            <div style={{ fontSize: '1.8rem' }}>⚙️</div>
            <div style={{ fontWeight: 700, color: '#e8eaf6', marginTop: '0.5rem' }}>ENGINE ETL & LEDGER</div>
            <div style={{ fontSize: '0.85rem', color: '#c5cae9', marginTop: '0.25rem' }}>Parsing → Normalisasi COA → Balance Debet=Kredit → Trial Balance</div>
          </div>
          <div style={{ fontSize: '1.5rem', color: '#9fa8da' }}>➔</div>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '1.8rem' }}>📊</div>
            <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>FOLDER OUTPUT</div>
            <div style={{ fontSize: '0.85rem', color: '#c5cae9', marginTop: '0.25rem' }}>5 Laporan Formatted Excel (.xlsx)</div>
          </div>
        </div>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1.5rem' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Input Files Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#1a237e' }}>📂 Berkas di Folder Input ({inputFiles.length})</h3>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              ➕ Upload File Input
              <input type="file" accept=".xls,.xlsx" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
          {uploadStatus && <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', padding: '0.5rem', borderRadius: '4px', background: '#e8eaf6', color: '#1a237e' }}>{uploadStatus}</div>}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama File</th>
                  <th className="text-right">Ukuran</th>
                </tr>
              </thead>
              <tbody>
                {inputFiles.map((f, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{ marginRight: '0.5rem' }}>📄</span>
                      <strong style={{ fontSize: '0.9rem' }}>{f.filename}</strong>
                    </td>
                    <td className="text-right" style={{ fontSize: '0.85rem', color: '#666' }}>
                      {(f.size / 1024).toFixed(1)} KB
                    </td>
                  </tr>
                ))}
                {inputFiles.length === 0 && (
                  <tr><td colSpan={2} style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>Belum ada file di folder input</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Output Download Center Card */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem 0', color: '#1a237e' }}>📥 Download Center (5 Output Reports)</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nama File Laporan</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {[
                  'Journal 2026.xlsx',
                  'BUKU BESAR 2026.xlsx',
                  'Neraca Lajur 2026.xlsx',
                  'Neraca, RL, Arus Kas, ekuitas & Rincian 2026.xlsx',
                  'AUDIT_TRAIL.xlsx'
                ].map((name, i) => {
                  const existing = outputFiles.find(of => of.filename === name)
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#2c3e50', fontSize: '0.9rem' }}>{name}</div>
                        {existing && (
                          <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
                            Ukuran: {(existing.size / 1024).toFixed(1)} KB
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <a
                          href={`/api/process/download/${encodeURIComponent(name)}`}
                          download
                          className="btn btn-primary"
                          style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-block' }}
                        >
                          ⬇️ Unduh Excel
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Execution Details Result */}
      {result && (
        <div className="card">
          <h3 style={{ marginTop: 0, color: '#2e7d32' }}>✅ Hasil Eksekusi Pipeline ETL</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h4>Log Pemrosesan File Input:</h4>
              <ul>
                {result.process?.files_processed.map((f, i) => <li key={i}>{f}</li>)}
                {result.bulk?.files_processed.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div>
              <h4>Status Generasi Laporan Output:</h4>
              <ul>
                {result.reports?.map((r, i) => (
                  <li key={i} style={{ color: r.status === 'OK' ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                    {r.file}: {r.status}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
