import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import TransaksiPage from './components/TransaksiPage'
import LabaRugi from './components/LabaRugi'
import Neraca from './components/Neraca'
import ProcessPage from './components/ProcessPage'
import FirebasePage from './components/FirebasePage'
import './style.css'

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="app">
      <nav className="navbar">
        <h1 className="nav-title">Aplikasi Keuangan - PERUMDAM TIRTA SERUYAN</h1>
        <div className="nav-links">
          <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
          <button className={page === 'transaksi' ? 'active' : ''} onClick={() => setPage('transaksi')}>Transaksi</button>
          <button className={page === 'laba-rugi' ? 'active' : ''} onClick={() => setPage('laba-rugi')}>Laba Rugi</button>
          <button className={page === 'neraca' ? 'active' : ''} onClick={() => setPage('neraca')}>Neraca</button>
          <button className={page === 'process' ? 'active' : ''} onClick={() => setPage('process')}>Proses</button>
          <button className={page === 'firebase' ? 'active' : ''} onClick={() => setPage('firebase')}>Firebase</button>
          <a href="/research" target="_blank" rel="noopener noreferrer" className="nav-link-ext">Research Skills</a>
        </div>
      </nav>
      <main className="main">
        {page === 'dashboard' && <Dashboard />}
        {page === 'transaksi' && <TransaksiPage />}
        {page === 'laba-rugi' && <LabaRugi />}
        {page === 'neraca' && <Neraca />}
        {page === 'process' && <ProcessPage />}
        {page === 'firebase' && <FirebasePage />}
      </main>
    </div>
  )
}
