import React, { useEffect, useState } from 'react'
import { getAkun, getTransaksi, createTransaksi, deleteTransaksi } from '../api'

export default function TransaksiPage() {
  const [akun, setAkun] = useState([])
  const [transaksi, setTransaksi] = useState([])
  const [search, setSearch] = useState('')
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
      setError(`Entri jurnal tidak berimbang! Total Debit (Rp ${totalDebit.toLocaleString()}) harus sama dengan Total Kredit (Rp ${totalKredit.toLocaleString()}).`)
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
    if (!confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return
    await deleteTransaksi(id)
    loadTransaksi()
  }

  const filteredTransaksi = transaksi.filter(t => 
    t.deskripsi.toLowerCase().includes(search.toLowerCase()) ||
    t.tanggal.includes(search) ||
    t.jurnal.some(j => j.akun_nama?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a237e', fontFamily: 'Outfit, sans-serif' }}>Jurnal Transaksi Keuangan</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Pencatatan Entri Ganda (Double-Entry Bookkeeping)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✖️ Tutup Form' : '➕ Input Transaksi Baru'}
        </button>
      </div>

      {showForm && (
        <div className="card-modern" style={{ border: '2px solid #6366f1' }}>
          <div className="card-header-row">
            <h3 className="card-title">📝 Form Entri Jurnal Transaksi Baru</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span className={`badge ${isBalanced ? 'badge-debit' : 'badge-kredit'}`} style={{ fontSize: '0.85rem' }}>
                {isBalanced ? '✓ Jurnal Berimbang (Balanced)' : '⚠️ Belum Berimbang'}
              </span>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Tanggal Transaksi</label>
                <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Uraian / Deskripsi Transaksi</label>
                <input placeholder="Contoh: Pembayaran Biaya Pemeliharaan Kendaraan Kantor" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} required />
              </div>
            </div>

            <h4 style={{ margin: '1rem 0 0.75rem 0', color: '#334155', fontSize: '0.9rem', textTransform: 'uppercase' }}>Rincian Pos Debet & Kredit</h4>
            
            {form.entries.map((entry, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>KODE & NAMA AKUN</label>
                  <select value={entry.akun_id} onChange={e => updateEntry(i, 'akun_id', e.target.value)} required style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <option value="">-- Pilih Akun COA --</option>
                    {akun.map(a => (
                      <option key={a.id} value={a.id}>{a.kode} - {a.nama}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>DEBET (RP)</label>
                  <input type="number" min="0" step="0.01" placeholder="0" value={entry.debit} onChange={e => updateEntry(i, 'debit', e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'JetBrains Mono' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626' }}>KREDIT (RP)</label>
                  <input type="number" min="0" step="0.01" placeholder="0" value={entry.kredit} onChange={e => updateEntry(i, 'kredit', e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'JetBrains Mono' }} />
                </div>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry(i)} style={{ height: '38px', width: '38px', padding: 0 }}>✕</button>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.75rem', background: '#eef2ff', borderRadius: '10px' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={addEntry}>
                ➕ Tambah Baris Jurnal
              </button>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.88rem', fontWeight: 700 }}>
                Total D: <span style={{ color: '#2563eb' }}>Rp {totalDebit.toLocaleString()}</span> | Total K: <span style={{ color: '#dc2626' }}>Rp {totalKredit.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                💾 Simpan Transaksi Ke Database
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Transactions List */}
      <div className="card-modern">
        <div className="card-header-row">
          <h3 className="card-title">📜 Daftar Histori Jurnal Transaksi ({filteredTransaksi.length})</h3>
          <div style={{ width: '300px' }}>
            <input
              placeholder="🔍 Cari transaksi / akun..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tanggal</th>
                <th>Deskripsi Transaksi</th>
                <th>Rincian Jurnal (Akun & Nominal)</th>
                <th className="text-right">Total Transaksi</th>
                <th className="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransaksi.map(t => {
                const total = t.jurnal?.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0) || 0
                return (
                  <tr key={t.id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: '#4f46e5' }}>#{t.id}</td>
                    <td className="font-mono">{t.tanggal}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{t.deskripsi}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {t.jurnal?.map((j, idx) => (
                          <div key={idx} style={{ fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            <span><strong>{j.kode}</strong> - {j.akun_nama}</span>
                            <span className="font-mono">
                              {j.debit > 0 && <span className="badge badge-debit">D: Rp {parseFloat(j.debit).toLocaleString()}</span>}
                              {j.kredit > 0 && <span className="badge badge-kredit">K: Rp {parseFloat(j.kredit).toLocaleString()}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="text-right font-mono font-bold" style={{ color: '#0f172a' }}>
                      Rp {total.toLocaleString('id-ID')}
                    </td>
                    <td className="text-center">
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                        🗑️ Hapus
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredTransaksi.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted text-center" style={{ padding: '2rem' }}>
                    Tidak ada transaksi yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
