import React, { useEffect, useState } from 'react'
import { getLabaRugi } from '../api'

export default function LabaRugi() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { 
    getLabaRugi()
      .then(setData)
      .catch((err) => setError(err.message)) 
  }, [])

  if (error) return (
    <div className="page">
      <div className="alert alert-danger" style={{ margin: '2rem' }}>
        <strong>Gagal Memuat Laba Rugi:</strong> {error}
      </div>
    </div>
  )

  if (!data) return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Memuat laporan laba rugi...</p>
    </div>
  )

  const profitMargin = data.totalPendapatan > 0 ? ((data.labaBersih / data.totalPendapatan) * 100).toFixed(1) : 0

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num)
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Laba Rugi</h1>
            <p className="page-subtitle">Laporan laba/rugi tahun berjalan</p>
          </div>
          <span className={`status-pill ${data.labaBersih >= 0 ? 'success' : 'danger'}`}>
            Margin: {profitMargin}%
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="summary-card" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
          <div className="summary-card-label">Pendapatan</div>
          <div className="summary-card-value success">Rp {formatRupiah(data.totalPendapatan)}</div>
        </div>
        <div className="summary-card" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
          <div className="summary-card-label">Total Beban</div>
          <div className="summary-card-value danger">Rp {formatRupiah(data.totalBeban)}</div>
        </div>
        <div className="summary-card" style={{ background: data.labaBersih >= 0 ? 'var(--info-bg)' : 'var(--danger-bg)', border: `1px solid ${data.labaBersih >= 0 ? 'var(--info-border)' : 'var(--danger-border)'}` }}>
          <div className="summary-card-label">Laba/Rugi Bersih</div>
          <div className={`summary-card-value ${data.labaBersih >= 0 ? 'success' : 'danger'}`}>Rp {formatRupiah(data.labaBersih)}</div>
        </div>
      </div>

      {/* Pendapatan Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📈 Pendapatan Usaha & Non-Usaha</h3>
        </div>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th className="text-right">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.pendapatan.map(p => (
                <tr key={p.kode}>
                  <td className="font-mono">{p.kode}</td>
                  <td style={{ fontWeight: 500 }}>{p.nama}</td>
                  <td className="text-right font-mono">Rp {formatRupiah(p.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'var(--success-bg)' }}>
                <td colSpan={2} style={{ color: '#065f46' }}>Total Pendapatan</td>
                <td className="text-right font-mono" style={{ color: '#065f46' }}>Rp {formatRupiah(data.totalPendapatan)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Beban Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📉 Beban Operasional & Administrasi</h3>
        </div>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th className="text-right">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.beban.map(b => (
                <tr key={b.kode}>
                  <td className="font-mono">{b.kode}</td>
                  <td style={{ fontWeight: 500 }}>{b.nama}</td>
                  <td className="text-right font-mono">Rp {formatRupiah(b.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'var(--danger-bg)' }}>
                <td colSpan={2} style={{ color: '#991b1b' }}>Total Beban Operasional</td>
                <td className="text-right font-mono" style={{ color: '#991b1b' }}>Rp {formatRupiah(data.totalBeban)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Laba/Rugi Bersih Banner */}
      <div className="card" style={{ background: data.labaBersih >= 0 ? 'var(--success)' : 'var(--danger)', color: 'white', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>Hasil Akhir Periode</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
              {data.labaBersih >= 0 ? 'Laba Bersih Operasional' : 'Rugi Bersih Operasional'}
            </div>
          </div>
          <div className="font-mono" style={{ fontSize: '1.625rem', fontWeight: 800 }}>
            Rp {formatRupiah(data.labaBersih)}
          </div>
        </div>
      </div>
    </div>
  )
}
