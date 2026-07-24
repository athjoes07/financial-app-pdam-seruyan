import React, { useEffect, useState } from 'react'
import { getNeraca } from '../api'

export default function Neraca() {
  const [data, setData] = useState(null)

  useEffect(() => { getNeraca().then(setData) }, [])

  if (!data) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
      <div style={{ fontSize: '2rem' }}>⚖️</div>
      <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>Memuat Laporan Posisi Keuangan (Neraca)...</p>
    </div>
  )

  const totalPasiva = (data.totalKewajiban || 0) + (data.totalEkuitas || 0)
  const isBalance = Math.abs((data.totalAset || 0) - totalPasiva) < 1

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1a237e', fontFamily: 'Outfit, sans-serif' }}>Laporan Posisi Keuangan (Neraca)</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>PERUMDAM TIRTA SERUYAN • Aset = Kewajiban + Ekuitas</p>
        </div>
        <div className={`badge ${isBalance ? 'badge-debit' : 'badge-kredit'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          {isBalance ? '✓ Keseimbangan Neraca 100% Balanced' : '⚠️ Neraca Belum Seimbang'}
        </div>
      </div>

      {/* Top Total Summary Cards */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card-modern" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>Total Aktiva / Aset</div>
          <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>
            Rp {data.totalAset?.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="card-modern" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)', border: '1px solid #ddd6fe' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>Total Pasiva (Kewajiban + Ekuitas)</div>
          <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#5b21b6', marginTop: '0.25rem' }}>
            Rp {totalPasiva?.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Left Side: ASET */}
        <div className="card-modern">
          <h3 className="card-title" style={{ color: '#1e40af' }}>🔷 Aktiva / Aset Perusahaan</h3>
          <div className="table-wrap">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Akun Aset</th>
                  <th className="text-right">Saldo (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {data.aset.map(a => (
                  <tr key={a.kode}>
                    <td className="font-mono font-bold" style={{ color: '#2563eb' }}>{a.kode}</td>
                    <td style={{ fontWeight: 600 }}>{a.nama}</td>
                    <td className="text-right font-mono font-bold">Rp {a.saldo.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
                <tr style={{ background: '#eff6ff', fontWeight: 800 }}>
                  <td colSpan={2} style={{ color: '#1e40af', fontSize: '0.95rem' }}>TOTAL AKTIVA / ASET</td>
                  <td className="text-right font-mono" style={{ color: '#1e40af', fontSize: '1.05rem' }}>
                    Rp {data.totalAset.toLocaleString('id-ID')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: KEWAJIBAN & EKUITAS */}
        <div>
          {/* Kewajiban */}
          <div className="card-modern">
            <h3 className="card-title" style={{ color: '#dc2626' }}>🔴 Kewajiban / Liabilitas</h3>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Akun Kewajiban</th>
                    <th className="text-right">Saldo (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kewajiban.map(k => (
                    <tr key={k.kode}>
                      <td className="font-mono font-bold" style={{ color: '#dc2626' }}>{k.kode}</td>
                      <td style={{ fontWeight: 600 }}>{k.nama}</td>
                      <td className="text-right font-mono font-bold">Rp {k.saldo.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#fef2f2', fontWeight: 800 }}>
                    <td colSpan={2} style={{ color: '#991b1b', fontSize: '0.95rem' }}>TOTAL KEWAJIBAN</td>
                    <td className="text-right font-mono" style={{ color: '#991b1b', fontSize: '1rem' }}>
                      Rp {data.totalKewajiban.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Ekuitas */}
          <div className="card-modern">
            <h3 className="card-title" style={{ color: '#0891b2' }}>🟩 Ekuitas & Modal</h3>
            <div className="table-wrap">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Nama Akun Ekuitas</th>
                    <th className="text-right">Saldo (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ekuitas.map((e, idx) => (
                    <tr key={e.kode || idx}>
                      <td className="font-mono font-bold" style={{ color: '#0891b2' }}>{e.kode || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{e.nama}</td>
                      <td className="text-right font-mono font-bold">
                        Rp {e.saldo.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#ecfeff', fontWeight: 800 }}>
                    <td colSpan={2} style={{ color: '#0e7490', fontSize: '0.95rem' }}>TOTAL EKUITAS</td>
                    <td className="text-right font-mono" style={{ color: '#0e7490', fontSize: '1rem' }}>
                      Rp {data.totalEkuitas.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Total Pasiva Verification Card */}
          <div className="card-modern" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc' }}>VERIFIKASI NERACA</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  TOTAL PASIVA (KEWAJIBAN + EKUITAS)
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: '#38bdf8' }}>
                Rp {totalPasiva.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
