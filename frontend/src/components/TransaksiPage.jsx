import React, { useEffect, useState } from 'react'
import { getAkun, getTransaksi, createTransaksi, deleteTransaksi } from '../api'

export default function TransaksiPage() {
  const [akun, setAkun] = useState([])
  const [transaksi, setTransaksi] = useState([])
  const [error, setError] = useState('')

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await createTransaksi(form)
      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        deskripsi: '',
        entries: [{ akun_id: '', debit: '', kredit: '' }, { akun_id: '', debit: '', kredit: '' }]
      })
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

  const akunOptions = akun.map(a => (
    <option key={a.id} value={a.id}>{a.kode} - {a.nama}</option>
  ))

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>Transaksi</h2>

      <div className="card">
        <h2>Transaksi Baru</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label>Tanggal</label>
              <input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Deskripsi</label>
              <input placeholder="Deskripsi transaksi" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} required />
            </div>
          </div>

          <h3>Jurnal Entri</h3>
          {form.entries.map((entry, i) => (
            <div className="entry-row" key={i}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888' }}>Akun</label>
                <select value={entry.akun_id} onChange={e => updateEntry(i, 'akun_id', e.target.value)} required>
                  <option value="">-- Pilih Akun --</option>
                  {akunOptions}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888' }}>Debit (Rp)</label>
                <input type="number" min="0" step="0.01" placeholder="0" value={entry.debit} onChange={e => updateEntry(i, 'debit', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#888' }}>Kredit (Rp)</label>
                <input type="number" min="0" step="0.01" placeholder="0" value={entry.kredit} onChange={e => updateEntry(i, 'kredit', e.target.value)} />
              </div>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry(i)} style={{ marginTop: '1.25rem' }}>X</button>
            </div>
          ))}
          <button type="button" className="btn" style={{ background: '#e0e0e0', marginTop: '0.5rem' }} onClick={addEntry}>+ Tambah Baris</button>
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">Simpan Transaksi</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Riwayat Transaksi</h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Deskripsi</th><th>Jurnal</th><th className="text-right">Total</th><th></th></tr>
          </thead>
          <tbody>
            {transaksi.map(t => {
              const total = t.jurnal.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0)
              return (
                <tr key={t.id}>
                  <td>{t.tanggal}</td>
                  <td>{t.deskripsi}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {t.jurnal.map((j, idx) => (
                      <div key={idx}>
                        {j.akun_nama}: {j.debit > 0 ? `Rp ${parseFloat(j.debit).toLocaleString()} (D)` : ''}{j.kredit > 0 ? `Rp ${parseFloat(j.kredit).toLocaleString()} (K)` : ''}
                      </div>
                    ))}
                  </td>
                  <td className="text-right">Rp {total.toLocaleString()}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Hapus</button></td>
                </tr>
              )
            })}
            {transaksi.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Belum ada transaksi</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
