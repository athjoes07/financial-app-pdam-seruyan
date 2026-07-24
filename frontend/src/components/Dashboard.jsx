import React, { useEffect, useState } from 'react'
import { getNeracaSaldo, getLabaRugi, getTransaksi } from '../api'

export default function Dashboard() {
  const [saldo, setSaldo] = useState([])
  const [labaRugi, setLabaRugi] = useState(null)
  const [transaksi, setTransaksi] = useState([])
  const [date, setDate] = useState('')

  useEffect(() => {
    const now = new Date()
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    setDate(`${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`)
    getNeracaSaldo().then(setSaldo).catch(() => {})
    getLabaRugi().then(setLabaRugi).catch(() => {})
    getTransaksi().then(t => setTransaksi(t.slice(0, 5))).catch(() => {})
  }, [])

  const totalKas = saldo.filter(s => s.kode?.startsWith('10') || s.kode?.startsWith('11')).reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalAset = saldo.filter(s => s.tipe === 'aset').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalKewajiban = saldo.filter(s => s.tipe === 'kewajiban').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalEkuitas = saldo.filter(s => s.tipe === 'ekuitas').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)

  const stats = [
    {
      label: 'Kas & Bank',
      value: `Rp ${totalKas.toLocaleString()}`,
      icon: '\u{1F4B0}',
      gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
      change: '+12.5%'
    },
    {
      label: 'Total Aset',
      value: `Rp ${totalAset.toLocaleString()}`,
      icon: '\u{1F4C8}',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    },
    {
      label: 'Kewajiban',
      value: `Rp ${totalKewajiban.toLocaleString()}`,
      icon: '\u{1F4B5}',
      gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
    },
    {
      label: 'Ekuitas',
      value: `Rp ${totalEkuitas.toLocaleString()}`,
      icon: '\u{1F4BC}',
      gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    },
  ]

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <p className="dash-date">{date}</p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-primary" onClick={() => window.location.hash = '#/transaksi'}>+ Transaksi Baru</button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card-modern" style={{ background: s.gradient }}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      {labaRugi && (
        <div className="dash-row">
          <div className="card-modern">
            <h3 className="card-title">Ringkasan Laba Rugi</h3>
            <div className="pl-summary">
              <div className="pl-item">
                <span>Pendapatan</span>
                <span className="text-success font-bold">Rp {labaRugi.totalPendapatan?.toLocaleString()}</span>
              </div>
              <div className="pl-item">
                <span>Beban</span>
                <span className="text-danger font-bold">Rp {labaRugi.totalBeban?.toLocaleString()}</span>
              </div>
              <div className="pl-item pl-divider">
                <span className="font-bold">Laba / Rugi Bersih</span>
                <span className={`font-bold ${labaRugi.labaBersih >= 0 ? 'text-success' : 'text-danger'}`}>
                  Rp {labaRugi.labaBersih?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="card-modern">
            <h3 className="card-title">Quick Actions</h3>
            <div className="quick-actions">
              <button className="qa-btn" onClick={() => window.location.hash = '#/neraca'}>
                <span className="qa-icon">{'\u{1F4CA}'}</span>
                <span>Neraca</span>
              </button>
              <button className="qa-btn" onClick={() => window.location.hash = '#/laba-rugi'}>
                <span className="qa-icon">{'\u{1F4C9}'}</span>
                <span>Laba Rugi</span>
              </button>
              <button className="qa-btn" onClick={() => window.location.hash = '#/process'}>
                <span className="qa-icon">{'\u{2699}\u{FE0F}'}</span>
                <span>Proses</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-modern">
        <div className="card-header-row">
          <h3 className="card-title">Transaksi Terbaru</h3>
          <button className="btn btn-sm btn-outline" onClick={() => window.location.hash = '#/transaksi'}>Lihat Semua</button>
        </div>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr><th>Tanggal</th><th>Deskripsi</th><th className="text-right">Total</th></tr>
            </thead>
            <tbody>
              {transaksi.map(t => {
                const total = t.jurnal?.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0) || 0
                return (
                  <tr key={t.id}>
                    <td>{t.tanggal}</td>
                    <td>{t.deskripsi}</td>
                    <td className="text-right font-bold">Rp {total.toLocaleString()}</td>
                  </tr>
                )
              })}
              {transaksi.length === 0 && <tr><td colSpan={3} className="text-muted" style={{ textAlign: 'center' }}>Belum ada transaksi</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
