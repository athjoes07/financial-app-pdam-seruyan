import React, { useEffect, useState } from 'react'
import { getNeraca } from '../api'

export default function Neraca() {
  const [data, setData] = useState(null)

  useEffect(() => { getNeraca().then(setData) }, [])

  if (!data) return <p>Memuat...</p>

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', color: '#1a237e' }}>Neraca</h2>

      <div className="grid-2">
        <div className="card">
          <h2>Aset</h2>
          <table>
            <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {data.aset.map(a => (
                <tr key={a.kode}>
                  <td>{a.kode} - {a.nama}</td>
                  <td className="text-right">Rp {a.saldo.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-top-2 font-bold">
                <td>Total Aset</td>
                <td className="text-right">Rp {data.totalAset.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <div className="card">
            <h2>Kewajiban</h2>
            <table>
              <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {data.kewajiban.map(k => (
                  <tr key={k.kode}>
                    <td>{k.kode} - {k.nama}</td>
                    <td className="text-right">Rp {k.saldo.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-top-2 font-bold">
                  <td>Total Kewajiban</td>
                  <td className="text-right">Rp {data.totalKewajiban.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Ekuitas</h2>
            <table>
              <thead><tr><th>Akun</th><th className="text-right">Saldo</th></tr></thead>
              <tbody>
                {data.ekuitas.map(e => (
                  <tr key={e.kode || 'laba'}>
                    <td>{e.kode ? `${e.kode} - ` : ''}{e.nama}</td>
                    <td className={`text-right ${e.is_laba ? 'text-success' : e.is_rugi ? 'text-danger' : ''}`}>
                      Rp {e.saldo.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-top-2 font-bold">
                  <td>Total Ekuitas</td>
                  <td className="text-right">Rp {data.totalEkuitas.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <table>
              <tbody>
                <tr className="font-bold" style={{ fontSize: '1.1rem' }}>
                  <td>Total Kewajiban & Ekuitas</td>
                  <td className="text-right">
                    Rp {(data.totalKewajiban + data.totalEkuitas).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
