import React, { useEffect, useState } from 'react'
import { getNeracaSaldo, getLabaRugi, getTransaksi } from '../api'

export default function Dashboard({ setPage }) {
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
    getTransaksi().then(t => setTransaksi(t.slice(0, 6))).catch(() => {})
  }, [])

  const totalKas = saldo.filter(s => s.kode?.startsWith('10') || s.kode?.startsWith('11')).reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalAset = saldo.filter(s => s.tipe === 'aset').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalKewajiban = saldo.filter(s => s.tipe === 'kewajiban').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)
  const totalEkuitas = saldo.filter(s => s.tipe === 'ekuitas').reduce((sum, s) => sum + (parseFloat(s.saldo) || 0), 0)

  const pendapatan = labaRugi?.totalPendapatan || 0
  const beban = labaRugi?.totalBeban || 0
  const labaBersih = labaRugi?.labaBersih || 0
  const profitMargin = pendapatan > 0 ? ((labaBersih / pendapatan) * 100).toFixed(1) : 0

  return (
    <div className="dashboard">
      {/* Banking Executive Header */}
      <div className="dash-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.15rem 0.55rem', borderRadius: '12px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
              💳 COMMERCIAL BANKING VAULT
            </span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#64748b' }}>• PERUMDAM TIRTA SERUYAN</span>
          </div>
          <h1 className="dash-title">Corporate Treasury Dashboard</h1>
          <p className="dash-subtitle">Ringkasan Rekening Kas Utama, Total Aset & Arus Kas Corporate • {date}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '10px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#0f172a' }}>
            NET MARGIN: <strong style={{ color: '#059669' }}>{profitMargin}%</strong>
          </div>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '10px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#0f172a' }}>
            TIER-1 CAPITAL: <strong style={{ color: '#2563eb' }}>94/100</strong>
          </div>
          <button className="btn btn-primary" onClick={() => setPage && setPage('process')}>
            ⚡ RUN ETL AUTOMATION
          </button>
        </div>
      </div>

      {/* Banking Virtual Account Cards Grid (3 Metallic Cards) */}
      <div className="banking-cards-grid">
        {/* Card 1: Operating Treasury Account */}
        <div className="bank-card-virtual sapphire">
          <div className="bank-card-top">
            <span className="bank-card-type">OPERATING TREASURY ACCOUNT</span>
            <div className="bank-chip" />
          </div>
          <div>
            <div className="bank-card-balance-label">KAS & SETARA KAS UTAMA</div>
            <div className="bank-card-balance">Rp {totalKas.toLocaleString('id-ID')}</div>
          </div>
          <div className="bank-card-bottom">
            <span className="bank-card-no">•••• •••• •••• 8810</span>
            <span className="bank-card-holder">PDAM OPERATIONAL</span>
          </div>
        </div>

        {/* Card 2: Total Asset Reserve */}
        <div className="bank-card-virtual emerald">
          <div className="bank-card-top">
            <span className="bank-card-type">TOTAL ASSET CAPITAL RESERVE</span>
            <div className="bank-chip" />
          </div>
          <div>
            <div className="bank-card-balance-label">TOTAL ASET PERUSAHAAN</div>
            <div className="bank-card-balance">Rp {totalAset.toLocaleString('id-ID')}</div>
          </div>
          <div className="bank-card-bottom">
            <span className="bank-card-no">•••• •••• •••• 9920</span>
            <span className="bank-card-holder">CAPITAL ASSET</span>
          </div>
        </div>

        {/* Card 3: Regional Equity Reserve */}
        <div className="bank-card-virtual gold">
          <div className="bank-card-top">
            <span className="bank-card-type">REGIONAL GOVERNMENT EQUITY</span>
            <div className="bank-chip" />
          </div>
          <div>
            <div className="bank-card-balance-label">EKUITAS PEMDA SERUYAN</div>
            <div className="bank-card-balance">Rp {totalEkuitas.toLocaleString('id-ID')}</div>
          </div>
          <div className="bank-card-bottom">
            <span className="bank-card-no">•••• •••• •••• 1001</span>
            <span className="bank-card-holder">PEMDA EQUITY</span>
          </div>
        </div>
      </div>

      {/* Banking Cash Flow & Quick Banking Actions */}
      <div className="dash-row">
        {/* Cash Flow Statement Breakdown */}
        <div className="card-modern">
          <div className="card-header-row">
            <h3 className="card-title">📊 Cash Inflow & Outflow Analytics</h3>
            <span className="badge badge-debit">Solvabilitas Ratio: Tier 1</span>
          </div>

          <div className="chart-bar-container">
            <div className="chart-bar-row">
              <div className="chart-bar-label">
                <span style={{ color: '#059669', fontWeight: 700 }}>Cash Inflow (Pendapatan Usaha)</span>
                <span className="font-mono font-bold">Rp {pendapatan.toLocaleString('id-ID')}</span>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: '100%', background: '#10b981' }} />
              </div>
            </div>

            <div className="chart-bar-row">
              <div className="chart-bar-label">
                <span style={{ color: '#dc2626', fontWeight: 700 }}>Cash Outflow (Total Beban Operasional)</span>
                <span className="font-mono font-bold">Rp {beban.toLocaleString('id-ID')}</span>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: `${pendapatan > 0 ? Math.min(100, (beban / pendapatan) * 100) : 35}%`, background: '#ef4444' }} />
              </div>
            </div>

            <div className="chart-bar-row">
              <div className="chart-bar-label">
                <span style={{ color: '#1d4ed8', fontWeight: 700 }}>Net Operating Surplus</span>
                <span className="font-mono font-bold" style={{ color: labaBersih >= 0 ? '#059669' : '#dc2626' }}>
                  Rp {labaBersih.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill" style={{ width: `${pendapatan > 0 ? Math.max(10, (Math.abs(labaBersih) / pendapatan) * 100) : 25}%`, background: 'var(--bank-gradient)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Banking Actions Hub */}
        <div className="card-modern">
          <h3 className="card-title">⚡ Quick Banking Actions Hub</h3>
          <div className="quick-actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="qa-btn" onClick={() => setPage && setPage('transaksi')}>
              <span className="qa-icon">💳</span>
              <span>Transfer / New Journal</span>
            </div>
            <div className="qa-btn" onClick={() => setPage && setPage('process')}>
              <span className="qa-icon">⚡</span>
              <span>Run Automated ETL</span>
            </div>
            <div className="qa-btn" onClick={() => setPage && setPage('laba-rugi')}>
              <span className="qa-icon">📈</span>
              <span>Income Statement</span>
            </div>
            <div className="qa-btn" onClick={() => setPage && setPage('neraca')}>
              <span className="qa-icon">⚖️</span>
              <span>Balance & Reserves</span>
            </div>
          </div>
        </div>
      </div>

      {/* Banking Recent Activity Feed */}
      <div className="card-modern">
        <div className="card-header-row">
          <h3 className="card-title">📜 Banking Activity & Journal Feed</h3>
          <button className="btn btn-sm btn-outline" onClick={() => setPage && setPage('transaksi')}>
            View All Banking Activity ➔
          </button>
        </div>

        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>TRANSACTION ID</th>
                <th>POSTING DATE</th>
                <th>TRANSACTION DESCRIPTION</th>
                <th>JOURNAL ENTRIES</th>
                <th className="text-right">AMOUNT (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {transaksi.map(t => {
                const total = t.jurnal?.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0) || 0
                return (
                  <tr key={t.id}>
                    <td className="font-mono font-bold" style={{ color: '#1d4ed8' }}>#{t.id}</td>
                    <td className="font-mono">{t.tanggal}</td>
                    <td style={{ fontWeight: 600 }}>{t.deskripsi}</td>
                    <td>
                      <span className="badge badge-debit">
                        {t.jurnal?.length || 0} ENTRIES
                      </span>
                    </td>
                    <td className="text-right font-mono font-bold" style={{ color: '#0f172a' }}>
                      Rp {total.toLocaleString('id-ID')}
                    </td>
                  </tr>
                )
              })}
              {transaksi.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted text-center" style={{ padding: '2rem' }}>
                    No banking transaction entries recorded in vault.
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
