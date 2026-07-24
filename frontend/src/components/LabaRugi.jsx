import React, { useEffect, useState } from 'react'
import { getLabaRugi } from '../api'

export default function LabaRugi() {
  const [data, setData] = useState(null)

  useEffect(() => { getLabaRugi().then(setData) }, [])

  if (!data) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
      <div style={{ fontSize: '2rem' }}>⚡</div>
      <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>Memuat Laporan Laba Rugi...</p>
    </div>
  )

  const profitMargin = data.totalPendapatan > 0 ? ((data.labaBersih / data.totalPendapatan) * 100).toFixed(1) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a237e', fontFamily: 'Outfit, sans-serif' }}>Laporan Laba Rugi (Profit & Loss Statement)</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>PERUMDAM TIRTA SERUYAN • Standar Akuntansi ETAP</p>
        </div>
        <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PROFIT MARGIN</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: data.labaBersih >= 0 ? '#059669' : '#dc2626' }}>{profitMargin}%</div>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card-modern" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Total Pendapatan Usaha</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065f46', marginTop: '0.25rem' }}>
            Rp {data.totalPendapatan?.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="card-modern" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>Total Beban Operasional</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#991b1b', marginTop: '0.25rem' }}>
            Rp {data.totalBeban?.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="card-modern" style={{ background: data.labaBersih >= 0 ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' : 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)', border: data.labaBersih >= 0 ? '1px solid #bfdbfe' : '1px solid #fecdd3' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: data.labaBersih >= 0 ? '#1d4ed8' : '#be123c', textTransform: 'uppercase' }}>Laba / Rugi Bersih</div>
          <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: data.labaBersih >= 0 ? '#1e40af' : '#9f1239', marginTop: '0.25rem' }}>
            Rp {data.labaBersih?.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Pendapatan Table */}
      <div className="card-modern">
        <h3 className="card-title" style={{ color: '#047857' }}>📈 Pendapatan Usaha & Non-Usaha</h3>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode Akun</th>
                <th>Nama Akun Perkiraan</th>
                <th className="text-right">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.pendapatan.map(p => (
                <tr key={p.kode}>
                  <td className="font-mono font-bold" style={{ color: '#047857' }}>{p.kode}</td>
                  <td style={{ fontWeight: 600 }}>{p.nama}</td>
                  <td className="text-right font-mono font-bold">Rp {p.saldo.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              <tr style={{ background: '#ecfdf5', fontWeight: 800 }}>
                <td colSpan={2} style={{ color: '#065f46', fontSize: '0.95rem' }}>TOTAL PENDAPATAN</td>
                <td className="text-right font-mono" style={{ color: '#065f46', fontSize: '1.05rem' }}>
                  Rp {data.totalPendapatan.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Beban Table */}
      <div className="card-modern">
        <h3 className="card-title" style={{ color: '#b91c1c' }}>📉 Beban Operasional & Administrasi</h3>
        <div className="table-wrap">
          <table className="table-modern">
            <thead>
              <tr>
                <th>Kode Akun</th>
                <th>Nama Akun Perkiraan</th>
                <th className="text-right">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {data.beban.map(b => (
                <tr key={b.kode}>
                  <td className="font-mono font-bold" style={{ color: '#b91c1c' }}>{b.kode}</td>
                  <td style={{ fontWeight: 600 }}>{b.nama}</td>
                  <td className="text-right font-mono font-bold">Rp {b.saldo.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              <tr style={{ background: '#fef2f2', fontWeight: 800 }}>
                <td colSpan={2} style={{ color: '#991b1b', fontSize: '0.95rem' }}>TOTAL BEBAN OPERASIONAL</td>
                <td className="text-right font-mono" style={{ color: '#991b1b', fontSize: '1.05rem' }}>
                  Rp {data.totalBeban.toLocaleString('id-ID')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Final Net Profit Banner */}
      <div className="card-modern" style={{ background: data.labaBersih >= 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>HASIL AKHIR PERIODE</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 800 }}>
              {data.labaBersih >= 0 ? '🎉 SURPLUS / LABA BERSIH OPERASIONAL' : '⚠️ DEFISIT / RUGI BERSIH OPERASIONAL'}
            </div>
          </div>
          <div className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800 }}>
            Rp {data.labaBersih.toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  )
}
