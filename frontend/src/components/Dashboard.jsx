import React, { useEffect, useState } from 'react'
import { getNeracaSaldo, getLabaRugi, getTransaksi } from '../api'

export default function Dashboard() {
  const [saldo, setSaldo] = useState([])
  const [labaRugi, setLabaRugi] = useState(null)
  const [transaksi, setTransaksi] = useState([])

  useEffect(() => {
    getNeracaSaldo().then(setSaldo)
    getLabaRugi().then(setLabaRugi)
    getTransaksi().then(t => setTransaksi(t.slice(0, 5)))
  }, [])

  const totalKas = saldo.filter(s => s.kode.startsWith('10')).reduce((sum, s) => sum + s.saldo, 0)
  const totalAset = saldo.filter(s => s.tipe === 'aset').reduce((sum, s) => sum + s.saldo, 0)
  const totalKewajiban = saldo.filter(s => s.tipe === 'kewajiban').reduce((sum, s) => sum + s.saldo, 0)

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>Dashboard</h2>
      <div className="grid-3">
        <div className="stat-card">
          <div className="label">Total Kas & Bank</div>
          <div className="value text-success">Rp {totalKas.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Aset</div>
          <div className="value">Rp {totalAset.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Kewajiban</div>
          <div className="value text-danger">Rp {totalKewajiban.toLocaleString()}</div>
        </div>
      </div>

      {labaRugi && (
        <div className="grid-2" style={{ marginTop: '1.5rem' }}>
          <div className="stat-card">
            <div className="label">Pendapatan</div>
            <div className="value text-success">Rp {labaRugi.totalPendapatan.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Laba / Rugi Bersih</div>
            <div className={`value ${labaRugi.labaBersih >= 0 ? 'text-success' : 'text-danger'}`}>
              Rp {labaRugi.labaBersih.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h2>Transaksi Terbaru</h2>
        <table>
          <thead>
            <tr><th>Tanggal</th><th>Deskripsi</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {transaksi.map(t => {
              const total = t.jurnal.reduce((s, j) => s + (parseFloat(j.debit) || 0), 0)
              return (
                <tr key={t.id}>
                  <td>{t.tanggal}</td>
                  <td>{t.deskripsi}</td>
                  <td className="text-right">Rp {total.toLocaleString()}</td>
                </tr>
              )
            })}
            {transaksi.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999' }}>Belum ada transaksi</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
