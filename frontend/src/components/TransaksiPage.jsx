import React, { useEffect, useState } from 'react'
import { getAkun, getTransaksi, createTransaksi, deleteTransaksi } from '../api'

export default function TransaksiPage({ initialSearch = '' }) {
  const [akun, setAkun] = useState([])
  const [transaksi, setTransaksi] = useState([])
  const [search, setSearch] = useState(initialSearch)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    deskripsi: '',
    entries: [{ akun_id: '', debit: '', kredit: '' }, { akun_id: '', debit: '', kredit: '' }]
  })

  useEffect(() => {
    getAkun().then(setAkun)
    loadTransaksi()
  }, [])

  function loadTransaksi() {
    getTransaksi().then(setTransaksi)
  }

  function addEntry() {
    setForm(f => ({ ...f, entries: [...f.entries, { akun_id: '', debit: '', kredit: '' }] }))
  }

  function removeEntry(i) {
    if (form.entries.length <= 2) return
    setForm(f => ({ ...f, entries: f.entries.filter((_, idx) => idx !== i) }))
  }

  function updateEntry(i, field, value) {
    const entries = [...form.entries]
    entries[i] = { ...entries[i], [field]: value }
    setForm(f => ({ ...f, entries }))
  }

  const totalDebit = form.entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0)
  const totalKredit = form.entries.reduce((sum, e) => sum + (parseFloat(e.kredit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalKredit) < 0.01 && totalDebit > 0

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!isBalanced) {
      setError(`Jurnal belum berimbang! Debit Rp ${totalDebit.toLocaleString()} ≠ Kredit Rp ${totalKredit.toLocaleString()}`)
      return
    }

    try {
      await createTransaksi(form)
      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        deskripsi: '',
        entries: [{ akun_id: '', debit: '', kredit: '' }, { akun_id: '', debit: '', kredit: '' }]
      })
      setShowForm(false)
      loadTransaksi()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus transaksi ini?')) return
    await deleteTransaksi(id)
    loadTransaksi()
  }

  const filteredTransaksi = Array.isArray(transaksi) ? transaksi.filter(t =>
    String(t.deskripsi || '').toLowerCase().includes(String(search || '').toLowerCase()) ||
    String(t.tanggal || '').includes(search || '') ||
    (Array.isArray(t.jurnal) && t.jurnal.some(j => String(j.akun_nama || '').toLowerCase().includes(String(search || '').toLowerCase())))
  ) : []

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num)
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Transaksi</h1>
            <p className="page-subtitle">Pencatatan jurnal double-entry</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✖ Tutup' : '➕ Transaksi Baru'}
          </button>
        </div>
      </div>

      {/* Form Transaksi Baru */}
      {showForm && (
        <div className="form-card">
          <div className="card-header">
            <h3 className="card-title">Jurnal Transaksi Baru</h3>
            <span className={`status-pill ${isBalanced ? 'success' : 'warning'}`}>
              {isBalanced ? '✓ Berimbang' : '⚠️ Belum Berimbang'}
            </span>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Tanggal</label>
                <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Deskripsi</label>
                <input placeholder="Uraian transaksi" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} required />
              </div>
            </div>

            <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Rincian Debit & Kredit</h4>

            {form.entries.map((entry, i) => (
              <div key={i} className="journal-entry">
                <div className="journal-entry-row">
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Akun</label>
                    <select value={entry.akun_id} onChange={e => updateEntry(i, 'akun_id', e.target.value)} required>
                      <option value="">Pilih akun</option>
                      {akun.map(a => (
                        <option key={a.id} value={a.id}>{a.kode} - {a.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--info)', marginBottom: '0.25rem', display: 'block' }}>Debit (Rp)</label>
                    <input type="number" min="0" step="0.01" placeholder="0" value={entry.debit} onChange={e => updateEntry(i, 'debit', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--danger)', marginBottom: '0.25rem', display: 'block' }}>Kredit (Rp)</label>
                    <input type="number" min="0" step="0.01" placeholder="0" value={entry.kredit} onChange={e => updateEntry(i, 'kredit', e.target.value)} />
                  </div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry(i)} style={{ height: '38px', width: '38px', padding: 0, marginTop: '1.25rem' }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <div className="journal-entry-total">
              <span className="label">Total: Debit <span className="debit">Rp {formatRupiah(totalDebit)}</span> | Kredit <span className="kredit">Rp {formatRupiah(totalKredit)}</span></span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addEntry}>
                ➕ Tambah Baris
              </button>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                💾 Simpan Transaksi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Daftar Transaksi */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Riwayat Transaksi
            <span className="status-pill neutral" style={{ marginLeft: '0.5rem' }}>{filteredTransaksi.length}</span>
          </h3>
          <div style={{ width: '220px' }}>
            <input
              placeholder="Cari transaksi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        {filteredTransaksi.length > 0 ? (
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Tanggal</th>
                  <th>Deskripsi</th>
                  <th className="hide-mobile">Akun</th>
                  <th className="hide-mobile text-right" style={{ color: 'var(--info)', width: '140px' }}>Debit</th>
                  <th className="hide-mobile text-right" style={{ color: 'var(--danger)', width: '140px' }}>Kredit</th>
                  <th className="text-right" style={{ width: '130px' }}>Jumlah</th>
                  <th className="text-center" style={{ width: '60px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransaksi.map(t => {
                  const total = t.jurnal?.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0) || 0
                  const rowCount = t.jurnal?.length || 1
                  return (
                    <tr key={t.id}>
                      <td className="font-mono" rowSpan={1} style={{ verticalAlign: 'top', paddingTop: '0.6rem' }}>
                        {t.tanggal}
                      </td>
                      <td style={{ fontWeight: 500, verticalAlign: 'top', paddingTop: '0.6rem' }}>
                        {t.deskripsi}
                      </td>
                      {/* Akun, Debit, Kredit as sub-rows inside a single cell */}
                      <td className="hide-mobile" style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {t.jurnal?.map((j, idx) => (
                              <tr key={idx} style={{ borderBottom: idx < rowCount - 1 ? '1px dashed var(--border)' : 'none' }}>
                                <td style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{j.kode}</span>
                                  {' '}{j.akun_nama}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td className="hide-mobile" style={{ padding: 0, verticalAlign: 'top' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {t.jurnal?.map((j, idx) => (
                              <tr key={idx} style={{ borderBottom: idx < rowCount - 1 ? '1px dashed var(--border)' : 'none' }}>
                                <td style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textAlign: 'right', fontFamily: 'monospace' }}>
                                  {parseFloat(j.debit) > 0
                                    ? <span style={{ color: 'var(--info)', fontWeight: 600 }}>{formatRupiah(j.debit)}</span>
                                    : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td className="hide-mobile" style={{ padding: 0, verticalAlign: 'top' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            {t.jurnal?.map((j, idx) => (
                              <tr key={idx} style={{ borderBottom: idx < rowCount - 1 ? '1px dashed var(--border)' : 'none' }}>
                                <td style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', textAlign: 'right', fontFamily: 'monospace' }}>
                                  {parseFloat(j.kredit) > 0
                                    ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatRupiah(j.kredit)}</span>
                                    : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                      <td className="text-right font-mono font-bold" style={{ verticalAlign: 'top', paddingTop: '0.6rem' }}>
                        Rp {formatRupiah(total)}
                      </td>
                      <td className="text-center" style={{ verticalAlign: 'top', paddingTop: '0.5rem' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                          🗑
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-text">
              {search ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
