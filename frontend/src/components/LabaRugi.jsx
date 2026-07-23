import React, { useEffect, useState } from 'react'
import { getLabaRugi } from '../api'

export default function LabaRugi() {
  const [data, setData] = useState(null)

  useEffect(() => { getLabaRugi().then(setData) }, [])

  if (!data) return <p>Memuat...</p>

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>Laporan Laba Rugi</h2>

      <div className="card">
        <h2>Pendapatan</h2>
        <table>
          <thead><tr><th>Akun</th><th className="text-right">Jumlah</th></tr></thead>
          <tbody>
            {data.pendapatan.map(p => (
              <tr key={p.kode}>
                <td>{p.kode} - {p.nama}</td>
                <td className="text-right">Rp {p.saldo.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-top-2 font-bold">
              <td>Total Pendapatan</td>
              <td className="text-right">Rp {data.totalPendapatan.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Beban</h2>
        <table>
          <thead><tr><th>Akun</th><th className="text-right">Jumlah</th></tr></thead>
          <tbody>
            {data.beban.map(b => (
              <tr key={b.kode}>
                <td>{b.kode} - {b.nama}</td>
                <td className="text-right">Rp {b.saldo.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-top-2 font-bold">
              <td>Total Beban</td>
              <td className="text-right">Rp {data.totalBeban.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <table>
          <tbody>
            <tr className="font-bold" style={{ fontSize: '1.1rem' }}>
              <td>Laba / Rugi Bersih</td>
              <td className={`text-right ${data.labaBersih >= 0 ? 'text-success' : 'text-danger'}`}>
                Rp {data.labaBersih.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
