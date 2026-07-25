import React, { useEffect, useState } from 'react'
import { getNeraca } from '../api'

export default function Neraca() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { 
    getNeraca()
      .then(setData)
      .catch((err) => setError(err.message)) 
  }, [])

  if (error) return (
    <div className="page">
      <div className="alert alert-danger" style={{ margin: '2rem' }}>
        <strong>Gagal Memuat Neraca:</strong> {error}
      </div>
    </div>
  )

  if (!data) return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Memuat laporan neraca...</p>
    </div>
  )

  const totalPasiva = (data.totalKewajiban || 0) + (data.totalEkuitas || 0)
  const isBalance = Math.abs((data.totalAset || 0) - totalPasiva) < 1

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num)
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Neraca</h1>
            <p className="page-subtitle">Laporan posisi keuangan (ASET = KEWAJIBAN + EKUITAS)</p>
          </div>
          <span className={`status-pill ${isBalance ? 'success' : 'warning'}`}>
            {isBalance ? '✓ Neraca Seimbang' : '⚠️ Belum Seimbang'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="summary-card" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
          <div className="summary-card-label">Total Aktiva (Aset)</div>
          <div className="summary-card-value" style={{ color: 'var(--info)' }}>Rp {formatRupiah(data.totalAset)}</div>
        </div>
        <div className="summary-card" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
          <div className="summary-card-label">Total Pasiva (Kewajiban + Ekuitas)</div>
          <div className="summary-card-value" style={{ color: '#b45309' }}>Rp {formatRupiah(totalPasiva)}</div>
        </div>
      </div>

      {/* Aset Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔵 Aktiva / Aset Perusahaan</h3>
        </div>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th className="text-right">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.aset.map(a => (
                <tr key={a.kode}>
                  <td className="font-mono" style={{ color: 'var(--info)', fontWeight: 600 }}>{a.kode}</td>
                  <td style={{ fontWeight: 500 }}>{a.nama}</td>
                  <td className="text-right font-mono">Rp {formatRupiah(a.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'var(--info-bg)' }}>
                <td colSpan={2} style={{ color: 'var(--info-dark, #1e40af)' }}>Total Aktiva</td>
                <td className="text-right font-mono" style={{ color: 'var(--info-dark, #1e40af)' }}>Rp {formatRupiah(data.totalAset)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Kewajiban Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔴 Kewajiban / Liabilitas</h3>
        </div>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th className="text-right">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.kewajiban.map(k => (
                <tr key={k.kode}>
                  <td className="font-mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>{k.kode}</td>
                  <td style={{ fontWeight: 500 }}>{k.nama}</td>
                  <td className="text-right font-mono">Rp {formatRupiah(k.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'var(--danger-bg)' }}>
                <td colSpan={2} style={{ color: '#991b1b' }}>Total Kewajiban</td>
                <td className="text-right font-mono" style={{ color: '#991b1b' }}>Rp {formatRupiah(data.totalKewajiban)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Ekuitas Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🟢 Ekuitas & Modal</h3>
        </div>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th className="text-right">Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.ekuitas.map((e, idx) => (
                <tr key={e.kode || idx}>
                  <td className="font-mono" style={{ color: 'var(--success)', fontWeight: 600 }}>{e.kode || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{e.nama}</td>
                  <td className="text-right font-mono">Rp {formatRupiah(e.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, background: 'var(--success-bg)' }}>
                <td colSpan={2} style={{ color: '#065f46' }}>Total Ekuitas</td>
                <td className="text-right font-mono" style={{ color: '#065f46' }}>Rp {formatRupiah(data.totalEkuitas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Verification Banner */}
      <div className="card" style={{ background: isBalance ? 'var(--success)' : 'var(--warning)', color: isBalance ? 'white' : 'var(--text-primary)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>Verifikasi Neraca</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700 }}>
              Total Pasiva (Kewajiban + Ekuitas)
            </div>
          </div>
          <div className="font-mono" style={{ fontSize: '1.375rem', fontWeight: 800 }}>
            Rp {formatRupiah(totalPasiva)}
          </div>
        </div>
      </div>
    </div>
  )
}
